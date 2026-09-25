import {
  type AuthResponse,
  authResponseSchema,
  type ChangePasswordInput,
  type DeviceSession,
  deviceSessionSchema,
  type LoginInput,
  type PendingSignup,
  pendingSignupSchema,
  type ResendSignupCodeInput,
  type SignupInput,
  type SyncRequest,
  type SyncResponse,
  syncResponseSchema,
  tokenPairSchema,
  type UpdateProfileInput,
  type User,
  userSchema,
  type VerifySignupInput,
} from '@noted/shared';
import * as z from 'zod';
import { withLock } from './lock';
import type { Session, SessionStore } from './session';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export class NetworkError extends Error {
  constructor() {
    super('You appear to be offline.');
    this.name = 'NetworkError';
  }
}

interface RequestOptions<T> {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  auth?: boolean;
  schema?: z.ZodType<T>;
}

export function createApiClient(baseUrl: string, sessions: SessionStore) {
  const root = baseUrl.replace(/\/$/, '');

  async function send(path: string, method: string, body: unknown, token?: string): Promise<Response> {
    const headers: Record<string, string> = {};
    if (body !== undefined) headers['content-type'] = 'application/json';
    if (token) headers.authorization = `Bearer ${token}`;
    try {
      return await fetch(`${root}${path}`, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
      });
    } catch {
      throw new NetworkError();
    }
  }

  async function toError(res: Response): Promise<ApiError> {
    const data = (await res.json().catch(() => null)) as { message?: string } | null;
    return new ApiError(res.status, data?.message ?? `Request failed (${res.status})`);
  }

  async function refresh(staleToken: string): Promise<Session | null> {
    return withLock('noted-auth-refresh', async () => {
      const current = await sessions.get();
      if (!current) return null;
      if (current.accessToken !== staleToken) return current;
      const res = await send('/auth/refresh', 'POST', { refreshToken: current.refreshToken });
      if (res.status === 401) {
        await sessions.clear();
        return null;
      }
      if (!res.ok) throw await toError(res);
      const next = { ...current, ...tokenPairSchema.parse(await res.json()) };
      await sessions.set(next);
      return next;
    });
  }

  async function request<T>(path: string, options: RequestOptions<T> = {}): Promise<T> {
    const { method = 'GET', body, auth = true, schema } = options;
    let session = auth ? await sessions.get() : undefined;
    if (auth && !session) throw new ApiError(401, 'Not signed in.');

    let res = await send(path, method, body, session?.accessToken);
    if (res.status === 401 && session) {
      session = (await refresh(session.accessToken)) ?? undefined;
      if (!session) throw new ApiError(401, 'Your session has ended. Log in again.');
      res = await send(path, method, body, session.accessToken);
    }
    if (!res.ok) throw await toError(res);
    if (res.status === 204 || !schema) return undefined as T;
    return schema.parse(await res.json());
  }

  return {
    signup: (input: SignupInput): Promise<PendingSignup> =>
      request('/auth/signup', { method: 'POST', body: input, auth: false, schema: pendingSignupSchema }),
    verifySignup: (input: VerifySignupInput): Promise<AuthResponse> =>
      request('/auth/signup/verify', {
        method: 'POST',
        body: input,
        auth: false,
        schema: authResponseSchema,
      }),
    resendSignupCode: (input: ResendSignupCodeInput): Promise<PendingSignup> =>
      request('/auth/signup/resend', {
        method: 'POST',
        body: input,
        auth: false,
        schema: pendingSignupSchema,
      }),
    login: (input: LoginInput): Promise<AuthResponse> =>
      request('/auth/login', { method: 'POST', body: input, auth: false, schema: authResponseSchema }),
    logout: (): Promise<void> => request('/auth/logout', { method: 'POST' }),
    me: (): Promise<User> => request('/me', { schema: userSchema }),
    updateMe: (input: UpdateProfileInput): Promise<User> =>
      request('/me', { method: 'PATCH', body: input, schema: userSchema }),
    changePassword: (input: ChangePasswordInput): Promise<User> =>
      request('/me/password', { method: 'POST', body: input, schema: userSchema }),
    deleteAccount: (): Promise<void> => request('/me', { method: 'DELETE' }),
    sessions: (): Promise<DeviceSession[]> =>
      request('/me/sessions', { schema: z.array(deviceSessionSchema) }),
    revokeSession: (id: string): Promise<void> => request(`/me/sessions/${id}`, { method: 'DELETE' }),
    sync: (input: SyncRequest): Promise<SyncResponse> =>
      request('/sync', { method: 'POST', body: input, schema: syncResponseSchema }),
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;
