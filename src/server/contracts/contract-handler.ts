import { z } from 'zod';
import {
  createAdminAuthGuard,
  ADMIN_INQUIRIES_PERMISSION,
  isSameOriginRequest,
} from '../auth/admin-auth';
import type { AdminAuthProvider } from '../auth/admin-auth';

const createSchema = z
  .object({
    title: z.string().trim().min(1).max(200),
    scope: z.string().trim().min(1).max(10_000),
    totalAmount: z.number().int().min(0),
    schedule: z.string().trim().min(1).max(1000),
    revisionScope: z.string().trim().min(1).max(2000),
    paymentTerms: z.string().trim().min(1).max(2000),
    productionMethod: z.string().trim().min(1).max(100),
    externalCosts: z.string().max(2000).optional(),
    specialNotes: z.string().max(5000).optional(),
  })
  .strict();
const approvalSchema = z
  .object({
    customerName: z.string().trim().min(1).max(50),
    consent: z.literal(true),
  })
  .strict();
const json = (body: object, status: number) =>
  Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
const error = (code: string, message: string) => ({ code, message });
const digest = async (value: string) => {
  const bytes = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(value),
  );
  return [...new Uint8Array(bytes)]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
};
const token = () => {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('');
};
const contractBody = (input: z.infer<typeof createSchema>) =>
  [
    input.title,
    `제작 범위: ${input.scope}`,
    `총 금액: ${input.totalAmount}`,
    `일정: ${input.schedule}`,
    `수정 범위: ${input.revisionScope}`,
    `결제 조건: ${input.paymentTerms}`,
    `제작 방식: ${input.productionMethod}`,
    input.externalCosts ? `외부 비용: ${input.externalCosts}` : '',
    input.specialNotes ? `특이사항: ${input.specialNotes}` : '',
  ]
    .filter(Boolean)
    .join('\n\n');

export const createContractHandlers = (options: {
  db: D1Database;
  authProvider: AdminAuthProvider;
  now?: () => string;
  id?: () => string;
}) => {
  const now = options.now ?? (() => new Date().toISOString());
  const id = options.id ?? (() => crypto.randomUUID());
  const guard = createAdminAuthGuard(
    options.authProvider,
    ADMIN_INQUIRIES_PERMISSION,
  );

  const createDraft = async (request: Request, inquiryId: string) => {
    const auth = await guard(request);
    if (!auth.ok) return auth.response;
    let input: unknown;
    try {
      input = await request.json();
    } catch {
      return json(error('VALIDATION_ERROR', '요청 내용을 확인해 주세요.'), 400);
    }
    const parsed = createSchema.safeParse(input);
    if (!parsed.success)
      return json(error('VALIDATION_ERROR', '요청 내용을 확인해 주세요.'), 400);
    const inquiry = await options.db
      .prepare('SELECT id, business_name FROM inquiries WHERE id = ?')
      .bind(inquiryId)
      .first<{ id: string; business_name: string }>();
    if (!inquiry)
      return json(error('NOT_FOUND', '문의를 찾을 수 없습니다.'), 404);
    const existing = await options.db
      .prepare(
        'SELECT MAX(version) AS version FROM contracts WHERE inquiry_id = ?',
      )
      .bind(inquiryId)
      .first<{ version: number | null }>();
    const version = (existing?.version ?? 0) + 1;
    const contractId = id();
    const timestamp = now();
    const accessToken = token();
    const accessHash = await digest(accessToken);
    const body = contractBody(parsed.data);
    await options.db
      .prepare(
        `INSERT INTO contracts (id,inquiry_id,version,status,title,body,scope,total_amount,schedule,revision_scope,payment_terms,production_method,external_costs,special_notes,created_at,updated_at) VALUES (?,?,?,'작성 중',?,?,?,?,?,?,?,?,?,?,?,?)`,
      )
      .bind(
        contractId,
        inquiryId,
        version,
        parsed.data.title,
        body,
        parsed.data.scope,
        parsed.data.totalAmount,
        parsed.data.schedule,
        parsed.data.revisionScope,
        parsed.data.paymentTerms,
        parsed.data.productionMethod,
        parsed.data.externalCosts ?? null,
        parsed.data.specialNotes ?? null,
        timestamp,
        timestamp,
      )
      .run();
    await options.db
      .prepare(
        "INSERT INTO contract_access_links (id,contract_id,token_hash,status,created_at) VALUES (?,?,?,'활성',?)",
      )
      .bind(id(), contractId, accessHash, timestamp)
      .run();
    const saved = await options.db
      .prepare('SELECT * FROM contracts WHERE id = ?')
      .bind(contractId)
      .first();
    return json({ contract: saved, accessToken }, 201);
  };

  const getAdmin = async (request: Request, contractId: string) => {
    const auth = await guard(request);
    if (!auth.ok) return auth.response;
    const contract = await options.db
      .prepare('SELECT * FROM contracts WHERE id = ?')
      .bind(contractId)
      .first();
    return contract
      ? json(contract as object, 200)
      : json(error('NOT_FOUND', '계약서를 찾을 수 없습니다.'), 404);
  };

  const updateDraft = async (request: Request, contractId: string) => {
    if (!isSameOriginRequest(request))
      return json(error('FORBIDDEN', '허용되지 않은 출처의 요청입니다.'), 403);
    const auth = await guard(request);
    if (!auth.ok) return auth.response;
    let input: unknown;
    try {
      input = await request.json();
    } catch {
      return json(error('VALIDATION_ERROR', '요청 내용을 확인해 주세요.'), 400);
    }
    const parsed = createSchema.safeParse(input);
    if (!parsed.success)
      return json(error('VALIDATION_ERROR', '요청 내용을 확인해 주세요.'), 400);
    const contract = await options.db
      .prepare('SELECT * FROM contracts WHERE id = ?')
      .bind(contractId)
      .first<{
        id: string;
        inquiry_id: string;
        version: number;
        status: string;
        viewed_at: string | null;
      }>();
    if (!contract || !['작성 중', '전송됨'].includes(contract.status))
      return json(error('CONFLICT', '수정할 수 없는 계약입니다.'), 409);
    const body = contractBody(parsed.data);
    const timestamp = now();
    if (contract.viewed_at) {
      const nextId = id();
      const nextToken = token();
      await options.db.batch([
        options.db
          .prepare(
            "UPDATE contract_access_links SET status='차단',revoked_at=? WHERE contract_id=? AND status='활성'",
          )
          .bind(timestamp, contractId),
        options.db
          .prepare(
            "INSERT INTO contracts (id,inquiry_id,version,status,title,body,scope,total_amount,schedule,revision_scope,payment_terms,production_method,external_costs,special_notes,created_at,updated_at) VALUES (?,?,?,'작성 중',?,?,?,?,?,?,?,?,?,?,?,?)",
          )
          .bind(
            nextId,
            contract.inquiry_id,
            contract.version + 1,
            parsed.data.title,
            body,
            parsed.data.scope,
            parsed.data.totalAmount,
            parsed.data.schedule,
            parsed.data.revisionScope,
            parsed.data.paymentTerms,
            parsed.data.productionMethod,
            parsed.data.externalCosts ?? null,
            parsed.data.specialNotes ?? null,
            timestamp,
            timestamp,
          ),
        options.db
          .prepare(
            "INSERT INTO contract_access_links (id,contract_id,token_hash,status,created_at) VALUES (?,?,?,'활성',?)",
          )
          .bind(id(), nextId, await digest(nextToken), timestamp),
      ]);
      return json(
        {
          contract: await options.db
            .prepare('SELECT * FROM contracts WHERE id=?')
            .bind(nextId)
            .first(),
          accessToken: nextToken,
        },
        201,
      );
    }
    await options.db
      .prepare(
        'UPDATE contracts SET title=?,body=?,scope=?,total_amount=?,schedule=?,revision_scope=?,payment_terms=?,production_method=?,external_costs=?,special_notes=?,updated_at=? WHERE id=? AND viewed_at IS NULL',
      )
      .bind(
        parsed.data.title,
        body,
        parsed.data.scope,
        parsed.data.totalAmount,
        parsed.data.schedule,
        parsed.data.revisionScope,
        parsed.data.paymentTerms,
        parsed.data.productionMethod,
        parsed.data.externalCosts ?? null,
        parsed.data.specialNotes ?? null,
        timestamp,
        contractId,
      )
      .run();
    return getAdmin(request, contractId);
  };

  const customerView = async (_request: Request, accessToken: string) => {
    const hash = await digest(accessToken);
    const timestamp = now();
    const result = await options.db.batch([
      options.db
        .prepare(
          `UPDATE contracts SET viewed_at=COALESCE(viewed_at,?), viewed_version=COALESCE(viewed_version,version), status=CASE WHEN status='작성 중' THEN '전송됨' ELSE status END, sent_at=COALESCE(sent_at,?), updated_at=? WHERE id=(SELECT contract_id FROM contract_access_links WHERE token_hash=? AND status='활성') AND status IN ('작성 중','전송됨')`,
        )
        .bind(timestamp, timestamp, timestamp, hash),
      options.db
        .prepare(
          `SELECT c.id AS contractId,c.title,c.body,c.total_amount AS totalAmount,c.schedule,CASE WHEN c.status='승인됨' THEN '승인 완료' ELSE '승인 대기' END AS status FROM contracts c JOIN contract_access_links l ON l.contract_id=c.id LEFT JOIN projects p ON p.contract_id=c.id WHERE l.token_hash=? AND l.status='활성' AND c.status IN ('전송됨','승인됨') AND p.completed_at IS NULL`,
        )
        .bind(hash),
    ]);
    const view = result[1]?.results?.[0];
    if (view) return json(view as object, 200);
    const knownLink = await options.db
      .prepare('SELECT id FROM contract_access_links WHERE token_hash=?')
      .bind(hash)
      .first();
    return knownLink
      ? json(
          error('LINK_EXPIRED', '계약 링크가 만료되었거나 차단되었습니다.'),
          410,
        )
      : json(error('NOT_FOUND', '계약서를 찾을 수 없습니다.'), 404);
  };

  const approve = async (request: Request, accessToken: string) => {
    if (!isSameOriginRequest(request))
      return json(error('FORBIDDEN', '허용되지 않은 출처의 요청입니다.'), 403);
    let input: unknown;
    try {
      input = await request.json();
    } catch {
      return json(error('VALIDATION_ERROR', '요청 내용을 확인해 주세요.'), 400);
    }
    const parsed = approvalSchema.safeParse(input);
    if (!parsed.success)
      return json(error('VALIDATION_ERROR', '요청 내용을 확인해 주세요.'), 400);
    const hash = await digest(accessToken);
    const timestamp = now();
    const projectId = id();
    const contract = await options.db
      .prepare(
        `SELECT c.id,c.inquiry_id,c.version,c.production_method,i.business_name FROM contracts c JOIN contract_access_links l ON l.contract_id=c.id JOIN inquiries i ON i.id=c.inquiry_id WHERE l.token_hash=? AND l.status='활성' AND c.status IN ('전송됨','승인됨')`,
      )
      .bind(hash)
      .first<{
        id: string;
        inquiry_id: string;
        version: number;
        production_method: string;
        business_name: string;
      }>();
    if (!contract)
      return json(error('NOT_FOUND', '계약서를 찾을 수 없습니다.'), 404);
    const result = await options.db.batch([
      options.db
        .prepare(
          "UPDATE contracts SET status='승인됨',approval_identity=COALESCE(approval_identity,?),approved_at=COALESCE(approved_at,?),updated_at=CASE WHEN status='전송됨' THEN ? ELSE updated_at END WHERE id=? AND status IN ('전송됨','승인됨')",
        )
        .bind(parsed.data.customerName, timestamp, timestamp, contract.id),
      options.db
        .prepare(
          "INSERT OR IGNORE INTO projects (id,inquiry_id,contract_id,name,status,production_method,internal_memo,created_at,updated_at) SELECT ?,?,?,?,?,?,'',?,? WHERE NOT EXISTS (SELECT 1 FROM projects WHERE inquiry_id=? OR contract_id=?)",
        )
        .bind(
          projectId,
          contract.inquiry_id,
          contract.id,
          contract.business_name,
          '준비 중',
          contract.production_method,
          timestamp,
          timestamp,
          contract.inquiry_id,
          contract.id,
        ),
    ]);
    if (
      !result[0]?.meta.changes &&
      !(await options.db
        .prepare('SELECT id FROM projects WHERE contract_id=?')
        .bind(contract.id)
        .first())
    )
      return json(error('CONFLICT', '승인할 수 없는 계약서입니다.'), 409);
    const project = await options.db
      .prepare('SELECT id FROM projects WHERE contract_id=?')
      .bind(contract.id)
      .first<{ id: string }>();
    if (!project)
      return json(error('CONFLICT', '프로젝트를 생성할 수 없습니다.'), 409);
    // 승인한 계약 링크와 프로젝트 링크는 같은 고객 capability를 공유한다.
    // 원문 토큰을 저장하거나 DB 해시로부터 재구성하지 않아 재시도에도 안전하다.
    const projectAccessToken = accessToken;
    const projectAccessHash = hash;
    await options.db.batch([
      options.db
        .prepare(
          "UPDATE project_access_links SET status='차단',revoked_at=? WHERE project_id=? AND status='활성' AND token_hash<>?",
        )
        .bind(timestamp, project.id, projectAccessHash),
      options.db
        .prepare(
          "INSERT OR IGNORE INTO project_access_links (id,project_id,token_hash,status,created_at) VALUES (?,?,?,'활성',?)",
        )
        .bind(id(), project.id, projectAccessHash, timestamp),
    ]);
    const approvedAt = await options.db
      .prepare('SELECT approved_at FROM contracts WHERE id=?')
      .bind(contract.id)
      .first<{ approved_at: string | null }>();
    return json(
      {
        approvedAt: approvedAt?.approved_at ?? timestamp,
        projectId: project.id,
        projectAccessToken,
      },
      200,
    );
  };

  return { createDraft, getAdmin, updateDraft, customerView, approve };
};
