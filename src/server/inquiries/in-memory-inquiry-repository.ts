import type { InquiryCreateInput } from './schema';
import type {
  InquiryListOptions,
  InquiryRecord,
  InquiryRepository,
  InquiryUpdateInput,
} from './repository';

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

const newestFirst = (a: InquiryRecord, b: InquiryRecord) =>
  b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id);

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
    return [...this.records.values()].sort(newestFirst);
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
      .sort(newestFirst);

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
      ...(input.status === undefined ? {} : { status: input.status }),
      ...(input.adminMemo === undefined
        ? {}
        : { adminMemo: input.adminMemo ?? undefined }),
      updatedAt: this.now(),
    };
    this.records.set(id, updated);
    return updated;
  }
}
