import { env } from 'cloudflare:workers';
import {
  createAdminAuthProvider,
  type AdminAuthBindings,
} from '@/server/auth/admin-auth-provider';
import { createContractHandlers } from '@/server/contracts/contract-handler';
type Context = { params: Promise<{ contractId: string }> };
const handlers = createContractHandlers({
  db: env.DB,
  authProvider: createAdminAuthProvider(env as unknown as AdminAuthBindings),
});
export const GET = async (request: Request, context: Context) =>
  handlers.getAdmin(request, (await context.params).contractId);
export const PATCH = async (request: Request, context: Context) =>
  handlers.updateDraft(request, (await context.params).contractId);
