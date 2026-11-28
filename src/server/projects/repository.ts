export type ProjectStatus =
  '준비 중' | '제작 중' | '고객 검수' | '수정 중' | '완료' | '보류';

export type ProjectRecord = {
  id: string;
  inquiryId: string;
  contractId: string;
  name: string;
  status: ProjectStatus;
  productionMethod: string | null;
  startDate: string | null;
  expectedEndDate: string | null;
  internalMemo: string;
  createdAt: string;
  updatedAt: string;
};

export type ProjectAccessLinkRecord = {
  id: string;
  projectId: string;
  tokenHash: string;
  status: '활성' | '차단';
  createdAt: string;
  revokedAt: string | null;
};

export type CreateProjectInput = {
  project: ProjectRecord;
  link: ProjectAccessLinkRecord;
};

/** D1 batch runs the statements atomically; callers can compose this with contract approval. */
export class D1ProjectRepository {
  constructor(private readonly db: D1Database) {}

  async findByInquiryOrApprovedContract(inquiryId: string, contractId: string) {
    return this.db
      .prepare(
        `SELECT p.* FROM projects p JOIN contracts c ON c.id = p.contract_id
        WHERE p.inquiry_id = ? AND p.contract_id = ? AND c.status = '승인됨' LIMIT 1`,
      )
      .bind(inquiryId, contractId)
      .first<ProjectRecord>();
  }

  async createProjectAndLink(input: CreateProjectInput) {
    const existing = await this.findByInquiryOrApprovedContract(
      input.project.inquiryId,
      input.project.contractId,
    );
    if (existing) return existing;
    const { project, link } = input;
    await this.db.batch([
      this.db
        .prepare(
          `INSERT INTO projects
        (id, inquiry_id, contract_id, name, status, production_method, start_date, expected_end_date, internal_memo, created_at, updated_at)
        SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ? WHERE EXISTS (
          SELECT 1 FROM contracts WHERE id = ? AND inquiry_id = ? AND status = '승인됨'
        ) AND NOT EXISTS (SELECT 1 FROM projects WHERE inquiry_id = ? OR contract_id = ?)`,
        )
        .bind(
          project.id,
          project.inquiryId,
          project.contractId,
          project.name,
          project.status,
          project.productionMethod,
          project.startDate,
          project.expectedEndDate,
          project.internalMemo,
          project.createdAt,
          project.updatedAt,
          project.contractId,
          project.inquiryId,
          project.inquiryId,
          project.contractId,
        ),
      this.db
        .prepare(
          `INSERT INTO project_access_links (id, project_id, token_hash, status, created_at, revoked_at)
        SELECT ?, ?, ?, ?, ?, ? WHERE EXISTS (SELECT 1 FROM projects WHERE id = ?)`,
        )
        .bind(
          link.id,
          link.projectId,
          link.tokenHash,
          link.status,
          link.createdAt,
          link.revokedAt,
          project.id,
        ),
    ]);
    return this.findByInquiryOrApprovedContract(
      project.inquiryId,
      project.contractId,
    );
  }

  async completeProjectAndRevokeLinks(projectId: string, updatedAt: string) {
    const results = await this.db.batch([
      this.db
        .prepare(
          `UPDATE projects SET status = '완료', completed_at = COALESCE(completed_at, ?), updated_at = ? WHERE id = ?`,
        )
        .bind(updatedAt, updatedAt, projectId),
      this.db
        .prepare(
          `UPDATE project_access_links SET status = '차단', revoked_at = ?
        WHERE project_id = ? AND status = '활성'`,
        )
        .bind(updatedAt, projectId),
      this.db
        .prepare(
          "UPDATE contract_access_links SET status='차단', revoked_at=? WHERE status='활성' AND contract_id=(SELECT contract_id FROM projects WHERE id=? AND status='완료')",
        )
        .bind(updatedAt, projectId),
    ]);
    return results[0]?.meta.changes > 0;
  }
}
