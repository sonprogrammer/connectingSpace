import { env } from 'cloudflare:workers';
import {
  createAdminAuthProvider,
  type AdminAuthBindings,
} from '@/server/auth/admin-auth-provider';
import { createContractHandlers } from '@/server/contracts/contract-handler';
type Context = { params: Promise<{ accessToken: string }> };
const handlers = createContractHandlers({
  db: env.DB,
  authProvider: createAdminAuthProvider(env as unknown as AdminAuthBindings),
});
export const GET = async (request: Request, context: Context) =>
  handlers.customerView(request, (await context.params).accessToken);
export const POST = async (request: Request, context: Context) =>
  handlers.approve(request, (await context.params).accessToken);
