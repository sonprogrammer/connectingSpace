import { env } from 'cloudflare:workers';
import {
  createAdminAuthProvider,
  type AdminAuthBindings,
} from '@/server/auth/admin-auth-provider';
import {
  createAdminAuthGuard,
  ADMIN_INQUIRIES_PERMISSION,
  isSameOriginRequest,
} from '@/server/auth/admin-auth';
type Context = { params: Promise<{ projectId: string }> };
const guard = createAdminAuthGuard(
  createAdminAuthProvider(env as unknown as AdminAuthBindings),
  ADMIN_INQUIRIES_PERMISSION,
);
export const PATCH = async (request: Request, context: Context) => {
  if (!isSameOriginRequest(request))
    return Response.json(
      { code: 'FORBIDDEN', message: '허용되지 않은 출처의 요청입니다.' },
      { status: 403 },
    );
  const auth = await guard(request);
  if (!auth.ok) return auth.response;
  let input: unknown;
  try {
    input = await request.json();
  } catch {
    return Response.json(
      { code: 'VALIDATION_ERROR', message: '요청 내용을 확인해 주세요.' },
      { status: 400 },
    );
  }
  if (
    !input ||
    typeof input !== 'object' ||
    !('status' in input) ||
    !['준비 중', '제작 중', '고객 검수', '수정 중', '완료', '보류'].includes(
      String(input.status),
    )
  )
    return Response.json(
      { code: 'VALIDATION_ERROR', message: '요청 내용을 확인해 주세요.' },
      { status: 400 },
    );
  const { projectId } = await context.params;
  const status = String(input.status);
  const timestamp = new Date().toISOString();
  const results = await env.DB.batch([
    env.DB.prepare(
      "UPDATE projects SET status=?, completed_at=CASE WHEN ?='완료' THEN COALESCE(completed_at, ?) ELSE completed_at END, updated_at=? WHERE id=?",
    ).bind(status, status, timestamp, timestamp, projectId),
    env.DB.prepare(
      "UPDATE project_access_links SET status='차단',revoked_at=? WHERE project_id=? AND status='활성' AND (SELECT status FROM projects WHERE id=?)='완료'",
    ).bind(timestamp, projectId, projectId),
    env.DB.prepare(
      "UPDATE contract_access_links SET status='차단',revoked_at=? WHERE status='활성' AND contract_id=(SELECT contract_id FROM projects WHERE id=? AND status='완료')",
    ).bind(timestamp, projectId),
  ]);
  if (!results[0]?.meta.changes)
    return Response.json(
      { code: 'NOT_FOUND', message: '프로젝트를 찾을 수 없습니다.' },
      { status: 404 },
    );
  return Response.json(
    { id: projectId, status, updatedAt: timestamp },
    { status: 200, headers: { 'Cache-Control': 'no-store' } },
  );
};
