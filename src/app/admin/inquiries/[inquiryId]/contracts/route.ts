import { env } from 'cloudflare:workers';
import {
  createAdminAuthProvider,
  type AdminAuthBindings,
} from '@/server/auth/admin-auth-provider';
import { createContractHandlers } from '@/server/contracts/contract-handler';
type Context = { params: Promise<{ inquiryId: string }> };
const handlers = createContractHandlers({
  db: env.DB,
  authProvider: createAdminAuthProvider(env as unknown as AdminAuthBindings),
});
export const POST = async (request: Request, context: Context) =>
  handlers.createDraft(request, (await context.params).inquiryId);
