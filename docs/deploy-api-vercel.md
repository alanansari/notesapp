# Deploying the API on Vercel

The API (`apps/api`) runs on Vercel through its zero-config Fastify support. The whole app becomes a single Vercel Function.

## Project settings

| Setting | Value |
| --- | --- |
| Framework Preset | **Fastify** |
| Root Directory | `apps/api` |
| Include files outside the root directory in the Build Step | **Enabled**. The API imports `packages/shared`. |
| Build Command | Default (`turbo run build`) |
| Output Directory | Default (N/A) |
| Install Command | `pnpm install --frozen-lockfile --filter @noted/api...` |

The filtered install covers only the API and its workspace dependencies, so Electron and Next.js aren't downloaded on every deploy. Keep the trailing `...`.

## Environment variables

Enable each variable for **Production** (and Preview if you use it), then redeploy. Existing deployments don't pick up new variables.

| Name | Value |
| --- | --- |
| `MONGODB_URI` | MongoDB Atlas connection string. In Atlas → Network Access, allow `0.0.0.0/0`, because Vercel has no fixed IPs. URL-encode special characters in the password. |
| `JWT_SECRET` | A random string of at least 32 characters, e.g. `openssl rand -hex 32` |
| `CORS_ORIGINS` | `https://<web-domain>,app://noted` (the web app's origin, with no trailing slash, plus the desktop app) |
| `RESEND_API_KEY` | API key from [Resend](https://resend.com), used to email sign-up verification codes. |
| `EMAIL_FROM` | Sender for those emails, e.g. `Noted <no-reply@your-domain.com>`. The domain must be verified in Resend. |
| `ENABLE_EXPERIMENTAL_COREPACK` | `1`. Makes Vercel use the pnpm version pinned in the root `package.json`, which matches the lockfile. |

## Code rules this setup depends on

Vercel doesn't bundle the API. It compiles each TypeScript file separately and runs the result as native Node ESM. The codebase follows four rules because of this:

1. **Relative imports end in `.js`** (`import { x } from './lib/tokens.js'`). `apps/api/tsconfig.json` uses `NodeNext`, so a missing extension fails `pnpm typecheck` instead of failing at runtime.
2. **`@noted/shared` ships compiled JavaScript.** Its `prepare` script builds `dist/` on every `pnpm install`, including Vercel's filtered install. Node then loads plain JS instead of TypeScript source.
3. **`src/index.ts` is the only entry-named file, and it imports `fastify` itself.** Vercel treats the first `src/app.*`, `src/index.*` or `src/server.*` it finds as the server, and rejects it unless that file imports `fastify` directly.
   - The routes and plugins live in `src/create-app.ts`, which isn't an entry name.
   - `src/index.ts` creates the instance with `Fastify(serverOptions(env))` and registers `databasePlugin` and `appPlugin` on it.
4. **No top-level `await` in `src/index.ts`, and `listen()` isn't awaited.** Vercel waits for the entry module to finish loading, so awaiting at the top level can hang the function. The MongoDB connection is a Fastify plugin (`src/plugins/database.ts`), so Fastify opens it before serving; startup errors go to the `listen()` callback.
   - Don't add files with entry names in `src/` or at the `apps/api` root.

## Checking a deployment

```bash
API=https://<api-domain>

curl -i $API/health
# 200 {"ok":true}

curl -i -X POST $API/auth/signup -H 'content-type: application/json' \
  -d '{"name":"Test","email":"test+1@example.com","password":"Sup3r-secret!","platform":"web"}'
# 202 {"email":…,"resendAfter":…}, and a 6-digit code is emailed (409 if the account already exists)

curl -i -X POST $API/auth/signup/verify -H 'content-type: application/json' \
  -d '{"email":"test+1@example.com","code":"<code from the email>","platform":"web"}'
# 201 with user, accessToken, refreshToken

TOKEN=$(curl -s -X POST $API/auth/login -H 'content-type: application/json' \
  -d '{"email":"test+1@example.com","password":"Sup3r-secret!","platform":"web"}' \
  | node -pe 'JSON.parse(require("fs").readFileSync(0)).accessToken')

curl -i $API/me -H "authorization: Bearer $TOKEN"
curl -i -X POST $API/sync -H "authorization: Bearer $TOKEN" \
  -H 'content-type: application/json' -d '{"cursor":0,"notes":[],"tasks":[]}'
# both 200

curl -i -X OPTIONS $API/sync \
  -H 'Origin: https://<web-domain>' \
  -H 'Access-Control-Request-Method: POST' \
  -H 'Access-Control-Request-Headers: content-type,authorization'
# 204 with access-control-allow-origin: https://<web-domain>

curl -i -X DELETE $API/me -H "authorization: Bearer $TOKEN"
# 204, removes the test account
```

Then set `NEXT_PUBLIC_API_URL` in the web project (and `VITE_API_URL` for desktop builds) to the API URL.

## Troubleshooting

`FUNCTION_INVOCATION_FAILED` means the function crashed. The error itself is in the project's **Logs**: open the failed request and read the lines before `Node.js process exited`. You can also run `npx vercel logs <api-domain>`.

A healthy start logs `Connecting to MongoDB at <host>`, then `Connected to MongoDB`, then `Server listening at …`. The last of these that appears shows how far startup got.

| Log message | Fix |
| --- | --- |
| `Cannot find module '/var/task/apps/api/src/...'` | A relative import is missing its `.js` extension (rule 1). |
| `Cannot find module '@noted/shared'` or `.../dist/index.js` | The shared package didn't build during install. The build log should show `packages/shared prepare: ✔ Build complete`. |
| `Invalid export found in module ".../src/app.js"` | Vercel picked the wrong entry file (rule 3). |
| `No entrypoint found which imports fastify` | The entry file must import `fastify` itself (rule 3). |
| `Invalid environment` … `JWT_SECRET`, `MONGODB_URI`, `CORS_ORIGINS`, `RESEND_API_KEY` or `EMAIL_FROM` | The variable is missing, too short, or not enabled for this environment. All of them are required in production. Redeploy after fixing it. |
| `Email provider rejected a message` | Check the logged Resend error. Usually the `EMAIL_FROM` domain isn't verified in Resend or the API key is wrong. |
| `MongoParseError` / `Password contains unescaped characters` | URL-encode the special characters in the Atlas password. |
| `querySrv ENOTFOUND` / `bad auth` | The connection string or the database user's credentials are wrong. |
| `Could not connect to MongoDB at <host>` followed by `Server failed to start` (after about 10 s) | Atlas isn't reachable from Vercel. In Atlas → Network Access, add `0.0.0.0/0`. Also check the cluster is running and the host in the message is your cluster. |
| Browser reports a CORS error | Add the web origin, exactly as it appears in the browser, to `CORS_ORIGINS` and redeploy. |

## Notes

- Rate limits on the auth routes are counted per function instance, so on Vercel they're looser than on a single server.
- The MongoDB connection is opened once per instance and reused across requests.
