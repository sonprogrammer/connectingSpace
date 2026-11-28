import { z } from 'zod';

export const adminLoginRequestSchema = z.object({
  email: z.email().max(254),
  password: z.string().min(1).max(256),
});

export const adminAuthenticatedResponseSchema = z.object({
  authenticated: z.literal(true),
  expiresAt: z.iso.datetime(),
});

export const adminLoggedOutResponseSchema = z.object({
  authenticated: z.literal(false),
});

export type AdminLoginRequest = z.infer<typeof adminLoginRequestSchema>;
export type AdminAuthenticatedResponse = z.infer<
  typeof adminAuthenticatedResponseSchema
>;
export type AdminLoggedOutResponse = z.infer<
  typeof adminLoggedOutResponseSchema
>;
