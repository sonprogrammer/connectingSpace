import type { InquiryCreateInput } from '@connecting-space/shared';
import type {
  InquiryRecord,
  InquiryRepository,
  InquiryListOptions,
  InquiryUpdateInput,
} from './repository';

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

  async listAdmin(options: InquiryListOptions = {}) {
    const page = options.page ?? 1;
    const pageSize = options.pageSize ?? 20;
    const search = options.search?.trim().toLocaleLowerCase('ko-KR');
    const filtered = [...this.records.values()]
      .filter((record) => !options.status || record.status === options.status)
      .filter((record) => !options.type || record.type === options.type)
      .filter(
        (record) =>
          !search ||
          [record.businessName, record.contactName, record.email, record.phone]
            .join(' ')
            .toLocaleLowerCase('ko-KR')
            .includes(search),
      )
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    return {
      items: filtered.slice((page - 1) * pageSize, page * pageSize),
      page,
      pageSize,
      total: filtered.length,
    };
  }

  async findById(id: string): Promise<InquiryRecord | null> {
    return this.records.get(id) ?? null;
  }

  async update(id: string, input: InquiryUpdateInput) {
    const record = this.records.get(id);
    if (!record) return null;

    const updated: InquiryRecord = {
      ...record,
      ...input,
      updatedAt: this.now(),
    };
    this.records.set(id, updated);
    return updated;
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
