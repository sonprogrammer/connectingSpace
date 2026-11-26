import type { InquiryCreateInput } from './schema';
import type { InquiryRecord, InquiryRepository } from './repository';

type InMemoryInquiryRepositoryOptions = {
  now?: () => string;
  idFactory?: () => string;
};

const isDuplicate = (
  record: InquiryRecord,
  input: InquiryCreateInput,
  since: string,
) =>
  record.createdAt >= since &&
  record.businessName === input.businessName &&
  record.contactName === input.contactName &&
  record.email === input.email &&
  record.phone === input.phone &&
  record.type === input.type &&
  record.message === input.message;

export class InMemoryInquiryRepository implements InquiryRepository {
  private readonly records = new Map<string, InquiryRecord>();
  private readonly now: () => string;
  private readonly idFactory: () => string;

  constructor(options: InMemoryInquiryRepositoryOptions = {}) {
    this.now = options.now ?? (() => new Date().toISOString());
    this.idFactory = options.idFactory ?? (() => crypto.randomUUID());
  }

  async createIfNotDuplicate(
    input: InquiryCreateInput,
    since: string,
  ): Promise<InquiryRecord | null> {
    const duplicate = [...this.records.values()].find((record) =>
      isDuplicate(record, input, since),
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

  async list(): Promise<InquiryRecord[]> {
    return [...this.records.values()].sort((a, b) =>
      b.createdAt.localeCompare(a.createdAt),
    );
  }
}
