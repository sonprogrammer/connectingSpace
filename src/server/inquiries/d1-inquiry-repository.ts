import type { InquiryCreateInput } from './schema';
import type { InquiryRecord, InquiryRepository } from './repository';

export class D1InquiryRepository implements InquiryRepository {
  constructor(
    private readonly db: D1Database,
    private readonly now: () => string = () => new Date().toISOString(),
    private readonly idFactory: () => string = () => crypto.randomUUID(),
  ) {}

  async createIfNotDuplicate(input: InquiryCreateInput, since: string) {
    const timestamp = this.now();
    const record: InquiryRecord = {
      ...input,
      id: this.idFactory(),
      status: '신규',
      createdAt: timestamp,
      updatedAt: timestamp,
    };
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
