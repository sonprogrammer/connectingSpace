import type { InquiryCreateInput } from '@connecting-space/shared';
import {
  inquiryRowToRecord,
  type InquiryRepository,
  type InquiryRow,
} from './repository';

export class D1InquiryRepository implements InquiryRepository {
  constructor(
    private readonly db: D1Database,
    private readonly now: () => string = () => new Date().toISOString(),
    private readonly idFactory: () => string = () => crypto.randomUUID(),
  ) {}

  async create(input: InquiryCreateInput) {
    const timestamp = this.now();
    const record = {
      ...input,
      id: this.idFactory(),
      status: '신규' as const,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

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

  async findById(id: string) {
    const row = await this.db
      .prepare('SELECT * FROM inquiries WHERE id = ?')
      .bind(id)
      .first<InquiryRow>();

    return row ? inquiryRowToRecord(row) : null;
  }
}
