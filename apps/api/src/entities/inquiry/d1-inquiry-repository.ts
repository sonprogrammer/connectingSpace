import type { InquiryCreateInput } from '@connecting-space/shared';
import {
  inquiryRowToRecord,
  type InquiryRecord,
  type InquiryListOptions,
  type InquiryUpdateInput,
  type InquiryRepository,
  type InquiryRow,
} from './repository';

export class D1InquiryRepository implements InquiryRepository {
  constructor(
    private readonly db: D1Database,
    private readonly now: () => string = () => new Date().toISOString(),
    private readonly idFactory: () => string = () => crypto.randomUUID(),
  ) {}

  private buildRecord(input: InquiryCreateInput): InquiryRecord {
    const timestamp = this.now();
    return {
      ...input,
      id: this.idFactory(),
      status: '신규',
      createdAt: timestamp,
      updatedAt: timestamp,
    };
  }

  async create(input: InquiryCreateInput) {
    const record = this.buildRecord(input);

    await this.db
      .prepare(
        `INSERT INTO inquiries (
          id, business_name, contact_name, email, phone, type, message,
          desired_schedule, budget, current_site_url, reference_site_url,
          preferred_contact_method, status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        record.id,
        record.businessName,
        record.contactName,
        record.email,
        record.phone,
        record.type,
        record.message,
        record.desiredSchedule ?? null,
        record.budget ?? null,
        record.currentSiteUrl ?? null,
        record.referenceSiteUrl ?? null,
        record.preferredContactMethod ?? null,
        record.status,
        record.createdAt,
        record.updatedAt,
      )
      .run();

    return record;
  }

  async list() {
    const result = await this.db
      .prepare('SELECT * FROM inquiries ORDER BY created_at DESC')
      .all<InquiryRow>();

    return result.results.map(inquiryRowToRecord);
  }

  async listAdmin(options: InquiryListOptions = {}) {
    const page = options.page ?? 1;
    const pageSize = options.pageSize ?? 20;
    const conditions: string[] = [];
    const bindings: (string | number)[] = [];

    if (options.status) {
      conditions.push('status = ?');
      bindings.push(options.status);
    }
    if (options.type) {
      conditions.push('type = ?');
      bindings.push(options.type);
    }
    if (options.search?.trim()) {
      const search = options.search
        .trim()
        .replaceAll('\\', '\\\\')
        .replaceAll('%', '\\%')
        .replaceAll('_', '\\_');
      conditions.push(
        "(business_name LIKE ? ESCAPE '\\' OR contact_name LIKE ? ESCAPE '\\' OR email LIKE ? ESCAPE '\\' OR phone LIKE ? ESCAPE '\\')",
      );
      const pattern = `%${search}%`;
      bindings.push(pattern, pattern, pattern, pattern);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const count = await this.db
      .prepare(`SELECT COUNT(*) AS total FROM inquiries ${where}`)
      .bind(...bindings)
      .first<{ total: number }>();
    const result = await this.db
      .prepare(
        `SELECT * FROM inquiries ${where}
         ORDER BY created_at DESC
         LIMIT ? OFFSET ?`,
      )
      .bind(...bindings, pageSize, (page - 1) * pageSize)
      .all<InquiryRow>();

    return {
      items: result.results.map(inquiryRowToRecord),
      page,
      pageSize,
      total: count?.total ?? 0,
    };
  }

  async findById(id: string) {
    const row = await this.db
      .prepare('SELECT * FROM inquiries WHERE id = ?')
      .bind(id)
      .first<InquiryRow>();

    return row ? inquiryRowToRecord(row) : null;
  }

  async update(id: string, input: InquiryUpdateInput) {
    const assignments: string[] = [];
    const bindings: string[] = [];

    if (input.status !== undefined) {
      assignments.push('status = ?');
      bindings.push(input.status);
    }
    if (input.adminMemo !== undefined) {
      assignments.push('admin_memo = ?');
      bindings.push(input.adminMemo);
    }
    if (!assignments.length) return this.findById(id);

    await this.db
      .prepare(
        `UPDATE inquiries
         SET ${assignments.join(', ')}, updated_at = ?
         WHERE id = ?`,
      )
      .bind(...bindings, this.now(), id)
      .run();

    return this.findById(id);
  }

  async findDuplicate(input: InquiryCreateInput, since: string) {
    const row = await this.db
      .prepare(
        `SELECT * FROM inquiries
         WHERE business_name = ?
           AND contact_name = ?
           AND email = ?
           AND phone = ?
           AND type = ?
           AND message = ?
           AND created_at >= ?
         ORDER BY created_at DESC
         LIMIT 1`,
      )
      .bind(
        input.businessName,
        input.contactName,
        input.email,
        input.phone,
        input.type,
        input.message,
        since,
      )
      .first<InquiryRow>();

    return row ? inquiryRowToRecord(row) : null;
  }

  async createIfNotDuplicate(input: InquiryCreateInput, since: string) {
    const record = this.buildRecord(input);
    const result = await this.db
      .prepare(
        `INSERT INTO inquiries (
          id, business_name, contact_name, email, phone, type, message,
          desired_schedule, budget, current_site_url, reference_site_url,
          preferred_contact_method, status, created_at, updated_at
        )
        SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
        WHERE NOT EXISTS (
          SELECT 1 FROM inquiries
          WHERE business_name = ?
            AND contact_name = ?
            AND email = ?
            AND phone = ?
            AND type = ?
            AND message = ?
            AND created_at >= ?
        )`,
      )
      .bind(
        record.id,
        record.businessName,
        record.contactName,
        record.email,
        record.phone,
        record.type,
        record.message,
        record.desiredSchedule ?? null,
        record.budget ?? null,
        record.currentSiteUrl ?? null,
        record.referenceSiteUrl ?? null,
        record.preferredContactMethod ?? null,
        record.status,
        record.createdAt,
        record.updatedAt,
        record.businessName,
        record.contactName,
        record.email,
        record.phone,
        record.type,
        record.message,
        since,
      )
      .run();

    return result.meta.changes > 0 ? record : null;
  }
}
