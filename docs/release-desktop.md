# Releasing the desktop app

The desktop app (`apps/desktop`) ships as installers attached to a GitHub Release:
- a `.dmg` and `.zip` for macOS, Apple silicon and Intel
- an NSIS `.exe` for Windows, x64 and arm64

The landing page's download buttons point to `github.com/alanansari/notesapp/releases/latest`.

Installers are built by `.github/workflows/desktop-release.yml` on real macOS and Windows runners. Pushing a `v*` tag builds both and uploads them to a draft release.

## One-time setup

The API and website URLs are compiled into the app, so set them as repository variables:

```bash
gh variable set VITE_API_URL --body "https://noted-server-mu.vercel.app"
gh variable set VITE_WEBSITE_URL --body "https://<your-web-domain>"
```

The API's `CORS_ORIGINS` must include `app://noted`, which is the origin of every desktop request.

## Releasing a version

1. Bump `version` in `apps/desktop/package.json` (e.g. `1.0.1`) and commit.
2. Tag that commit with the same version and push:

   ```bash
   git tag v1.0.1
   git push origin main v1.0.1
   ```

3. Wait for the **Desktop release** workflow in the Actions tab (about 10 minutes). It uploads the installers to a **draft** release named `v1.0.1`.
4. Open GitHub → Releases, check the draft, add notes, and click **Publish**. Only published releases count as "latest" for the download buttons.

The tag must match the `package.json` version. electron-builder publishes to the release for `v<version>`.

To test a build without releasing, run the workflow manually (Actions → Desktop release → Run workflow). The installers appear as downloadable artifacts on the run instead of a release.

## Building locally

On a Mac, the macOS installers can be built locally:

```bash
cd apps/desktop
VITE_API_URL=https://noted-server-mu.vercel.app VITE_WEBSITE_URL=https://<your-web-domain> pnpm dist:mac
```

The output goes to `apps/desktop/release/`. If you run this from a VS Code terminal, run `unset ELECTRON_RUN_AS_NODE` first.

## Code signing (optional, recommended)

Without signing, the installers work, but the OS warns people the first time they open them:

- **macOS:** "Noted can't be opened because Apple cannot check it for malicious software." Right-click the app → **Open**, or System Settings → Privacy & Security → **Open Anyway**.
- **Windows:** SmartScreen shows "Windows protected your PC". Click **More info** → **Run anyway**.

To remove these warnings, add the credentials as repository secrets. The workflow already passes them to electron-builder, which signs (and on macOS notarizes) when they're present.

| Secret | What it is |
| --- | --- |
| `MAC_CERTIFICATE` | Base64 of your "Developer ID Application" `.p12` (`base64 -i cert.p12 \| pbcopy`). Requires an Apple Developer account. |
| `MAC_CERTIFICATE_PASSWORD` | Password of that `.p12` |
| `APPLE_ID` | Apple ID email used for notarization |
| `APPLE_APP_SPECIFIC_PASSWORD` | App-specific password from account.apple.com |
| `APPLE_TEAM_ID` | Your 10-character team ID |
| `WIN_CERTIFICATE` | Base64 of a Windows code-signing `.pfx` |
| `WIN_CERTIFICATE_PASSWORD` | Password of that `.pfx` |

## Not included yet

- **Auto-update:** the app doesn't check for new versions. Adding `electron-updater` would let it update itself from these GitHub Releases.
