import type { InquiryCreateInput } from '@connecting-space/shared';
import type { InquiryRecord, InquiryRepository } from './repository';

type InMemoryInquiryRepositoryOptions = {
  now?: () => string;
  idFactory?: () => string;
};

export class InMemoryInquiryRepository implements InquiryRepository {
  private readonly records = new Map<string, InquiryRecord>();
  private readonly now: () => string;
  private readonly idFactory: () => string;

  constructor(options: InMemoryInquiryRepositoryOptions = {}) {
    this.now = options.now ?? (() => new Date().toISOString());
    this.idFactory = options.idFactory ?? (() => crypto.randomUUID());
  }

  async create(input: InquiryCreateInput): Promise<InquiryRecord> {
    const timestamp = this.now();
    const record: InquiryRecord = {
      ...input,
      id: this.idFactory(),
      status: '신규',
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    this.records.set(record.id, record);
    return record;
  }

  async list(): Promise<InquiryRecord[]> {
    return [...this.records.values()].sort((a, b) =>
      b.createdAt.localeCompare(a.createdAt),
    );
  }

  async findById(id: string): Promise<InquiryRecord | null> {
    return this.records.get(id) ?? null;
  }

  async findDuplicate(
    input: InquiryCreateInput,
    since: string,
  ): Promise<InquiryRecord | null> {
    return (
      [...this.records.values()].find(
        (record) =>
          record.createdAt >= since &&
          record.businessName === input.businessName &&
          record.contactName === input.contactName &&
          record.email === input.email &&
          record.phone === input.phone &&
          record.type === input.type &&
          record.message === input.message,
      ) ?? null
    );
  }

  async createIfNotDuplicate(
    input: InquiryCreateInput,
    since: string,
  ): Promise<InquiryRecord | null> {
    const duplicate = [...this.records.values()].find(
      (record) =>
        record.createdAt >= since &&
        record.businessName === input.businessName &&
        record.contactName === input.contactName &&
        record.email === input.email &&
        record.phone === input.phone &&
        record.type === input.type &&
        record.message === input.message,
    );
    if (duplicate) return null;

    const timestamp = this.now();
    const record: InquiryRecord = {
      ...input,
      id: this.idFactory(),
      status: '신규',
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    this.records.set(record.id, record);
    return record;
  }
}
