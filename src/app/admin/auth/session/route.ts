import { env } from 'cloudflare:workers';
import { createAdminAuthHandlers } from '@/server/auth/admin-auth-handler';
import {
  readAdminAuthConfig,
  type AdminAuthBindings,
} from '@/server/auth/admin-auth-provider';

const handlers = createAdminAuthHandlers({
  getConfig: () => readAdminAuthConfig(env as unknown as AdminAuthBindings),
});

export const GET = handlers.session;
