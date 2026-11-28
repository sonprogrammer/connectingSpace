import { SignedCookieAdminAuthProvider } from './admin-auth';
import type { AdminAuthConfig } from './admin-auth-handler';

export type AdminAuthBindings = {
  ADMIN_EMAIL?: string;
  ADMIN_PASSWORD?: string;
  ADMIN_SESSION_SECRET?: string;
};

export const readAdminAuthConfig = (
  bindings: AdminAuthBindings,
): AdminAuthConfig | null => {
  const email = bindings.ADMIN_EMAIL?.trim();
  const password = bindings.ADMIN_PASSWORD;
  const sessionSecret = bindings.ADMIN_SESSION_SECRET;
  if (!email || !password || !sessionSecret || sessionSecret.length < 32) {
    return null;
  }
  return { email, password, sessionSecret };
};

export const createAdminAuthProvider = (
  bindings: AdminAuthBindings,
  now: () => number = Date.now,
) =>
  new SignedCookieAdminAuthProvider({
    getSecret: () => readAdminAuthConfig(bindings)?.sessionSecret,
    now,
  });
