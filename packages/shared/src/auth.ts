import * as z from 'zod';

export const AVATAR_COLORS = ['#86CFFA', '#EDE9A6', '#D6EAC3', '#F5D4DB', '#DDD9F3'] as const;
export const CLIENT_PLATFORMS = ['web', 'macos', 'windows', 'linux'] as const;

export type ClientPlatform = (typeof CLIENT_PLATFORMS)[number];

const email = z.email().trim().toLowerCase().max(254);
const password = z.string().min(8, 'Use at least 8 characters.').max(128);

export const signupSchema = z.object({
  name: z.string().trim().min(1, 'Enter your name.').max(80),
  email,
  password,
  platform: z.enum(CLIENT_PLATFORMS),
});

export const loginSchema = z.object({
  email,
  password: z.string().min(1).max(128),
  platform: z.enum(CLIENT_PLATFORMS),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

export const userSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  avatar: z.string(),
  createdAt: z.number(),
  passwordChangedAt: z.number(),
});

export const authResponseSchema = z.object({
  user: userSchema,
  accessToken: z.string(),
  refreshToken: z.string(),
});

export const tokenPairSchema = authResponseSchema.pick({ accessToken: true, refreshToken: true });

export const updateProfileSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  email: email.optional(),
  avatar: z.enum(AVATAR_COLORS).optional(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(128),
  newPassword: password,
});

export const deviceSessionSchema = z.object({
  id: z.string(),
  platform: z.enum(CLIENT_PLATFORMS),
  userAgent: z.string(),
  createdAt: z.number(),
  lastSeenAt: z.number(),
  current: z.boolean(),
});

export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type User = z.infer<typeof userSchema>;
export type AuthResponse = z.infer<typeof authResponseSchema>;
export type TokenPair = z.infer<typeof tokenPairSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type DeviceSession = z.infer<typeof deviceSessionSchema>;
