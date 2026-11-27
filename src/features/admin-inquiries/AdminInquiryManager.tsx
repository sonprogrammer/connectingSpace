'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import type { AdminInquiryListParams } from '../../entities/inquiry/model/admin-inquiry';
import {
  inquiryStatusSchema,
  inquiryTypeSchema,
} from '../../shared/model/inquiry';
import type { InquiryStatus, InquiryType } from '../../shared/model/inquiry';
import {
  AdminInquiryApiError,
  getAdminInquiry,
  listAdminInquiries,
  updateAdminInquiry,
} from '../../shared/api/admin-inquiries';

const PAGE_SIZE = 20;

const formatDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('ko-KR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
};

const getErrorMessage = (error: unknown) =>
  error instanceof AdminInquiryApiError
    ? error.message
    : '문의 정보를 불러오지 못했습니다.';

const isAccessError = (error: unknown) =>
  error instanceof AdminInquiryApiError &&
  (error.code === 'AUTH_REQUIRED' || error.code === 'FORBIDDEN');

export function AdminInquiryManager() {
  const queryClient = useQueryClient();
  const [searchInput, setSearchInput] = useState('');
  const [statusInput, setStatusInput] = useState<InquiryStatus | ''>('');
  const [typeInput, setTypeInput] = useState<InquiryType | ''>('');
  const [filters, setFilters] = useState<AdminInquiryListParams>({
    page: 1,
    pageSize: PAGE_SIZE,
  });
  const [selectedId, setSelectedId] = useState<string>();
  const [status, setStatus] = useState<InquiryStatus>('신규');
  const [adminMemo, setAdminMemo] = useState('');
  const [saveMessage, setSaveMessage] = useState('');

  const listQuery = useQuery({
    queryKey: ['admin-inquiries', filters],
    queryFn: () => listAdminInquiries(filters),
    retry: false,
  });

  const detailQuery = useQuery({
    queryKey: ['admin-inquiry', selectedId],
    queryFn: () => getAdminInquiry(selectedId!),
    enabled: Boolean(selectedId),
    retry: false,
  });

  useEffect(() => {
    if (!detailQuery.data) return;
    setStatus(detailQuery.data.status);
    setAdminMemo(detailQuery.data.adminMemo ?? '');
  }, [detailQuery.data]);

  const updateMutation = useMutation({
    mutationFn: () =>
      updateAdminInquiry(selectedId!, {
        status,
        adminMemo,
      }),
    onSuccess: (updated) => {
      queryClient.setQueryData(['admin-inquiry', updated.id], updated);
      void queryClient.invalidateQueries({ queryKey: ['admin-inquiries'] });
      setStatus(updated.status);
      setAdminMemo(updated.adminMemo ?? '');
      setSaveMessage('변경사항을 저장했습니다.');
    },
    onError: (error) => setSaveMessage(getErrorMessage(error)),
  });

  const applyFilters = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSelectedId(undefined);
    setFilters({
      page: 1,
      pageSize: PAGE_SIZE,
      status: statusInput || undefined,
      type: typeInput || undefined,
      search: searchInput.trim() || undefined,
    });
  };

  if (listQuery.isPending) {
    return (
      <div className="admin-state" role="status">
        문의를 불러오는 중입니다.
      </div>
    );
  }

  if (isAccessError(listQuery.error)) {
    return (
      <div className="admin-state admin-state-error" role="alert">
        <strong>{getErrorMessage(listQuery.error)}</strong>
        <p>관리자 세션을 확인한 뒤 다시 접근해 주세요.</p>
      </div>
    );
  }

  if (listQuery.isError) {
    return (
      <div className="admin-state admin-state-error" role="alert">
        <strong>{getErrorMessage(listQuery.error)}</strong>
        <button
          className="button button-small"
          type="button"
          onClick={() => void listQuery.refetch()}
        >
          다시 시도
        </button>
      </div>
    );
  }

  const totalPages = Math.max(
    1,
    Math.ceil(listQuery.data.total / listQuery.data.pageSize),
  );

  return (
    <section className="admin-inquiry-manager" aria-label="문의 관리">
      <form className="admin-filters" onSubmit={applyFilters}>
        <label>
          문의 검색
          <input
            value={searchInput}
            maxLength={100}
            placeholder="업체명, 담당자명, 이메일"
            onChange={(event) => setSearchInput(event.target.value)}
          />
        </label>
        <label>
          상태 필터
          <select
            value={statusInput}
            onChange={(event) =>
              setStatusInput(event.target.value as InquiryStatus | '')
            }
          >
            <option value="">전체 상태</option>
            {inquiryStatusSchema.options.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <label>
          문의 유형 필터
          <select
            value={typeInput}
            onChange={(event) =>
              setTypeInput(event.target.value as InquiryType | '')
            }
          >
            <option value="">전체 유형</option>
            {inquiryTypeSchema.options.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <button className="button button-small" type="submit">
          필터 적용
        </button>
      </form>

      <div className="admin-workspace">
        <section
          className="admin-list-panel"
          aria-labelledby="admin-list-title"
        >
          <div className="admin-panel-heading">
            <div>
              <span className="eyebrow">INQUIRIES</span>
              <h2 id="admin-list-title">문의 목록</h2>
            </div>
            <span>{listQuery.data.total}건</span>
          </div>

          {listQuery.data.items.length === 0 ? (
            <div className="admin-empty">조건에 맞는 문의가 없습니다.</div>
          ) : (
            <ul className="admin-inquiry-list">
              {listQuery.data.items.map((inquiry) => (
                <li key={inquiry.id}>
                  <button
                    type="button"
                    aria-label={`${inquiry.businessName} ${inquiry.contactName} 문의 보기`}
                    aria-pressed={selectedId === inquiry.id}
                    onClick={() => {
                      setSaveMessage('');
                      setSelectedId(inquiry.id);
                    }}
                  >
                    <span className="admin-list-topline">
                      <strong>{inquiry.businessName}</strong>
                      <span className="admin-status-badge">
                        {inquiry.status}
                      </span>
                    </span>
                    <span>{inquiry.contactName}</span>
                    <span>{inquiry.type}</span>
                    <time dateTime={inquiry.receivedAt}>
                      {formatDate(inquiry.receivedAt)}
                    </time>
                  </button>
                </li>
              ))}
            </ul>
          )}

          <nav className="admin-pagination" aria-label="문의 목록 페이지">
            <button
              type="button"
              disabled={listQuery.data.page <= 1}
              onClick={() => {
                setSelectedId(undefined);
                setFilters((current) => ({
                  ...current,
                  page: Math.max(1, (current.page ?? 1) - 1),
                }));
              }}
            >
              이전
            </button>
            <span>
              {listQuery.data.page} / {totalPages}
            </span>
            <button
              type="button"
              disabled={listQuery.data.page >= totalPages}
              onClick={() => {
                setSelectedId(undefined);
                setFilters((current) => ({
                  ...current,
                  page: Math.min(totalPages, (current.page ?? 1) + 1),
                }));
              }}
            >
              다음
            </button>
          </nav>
        </section>

        <aside className="admin-detail-panel" aria-live="polite">
          {!selectedId ? (
            <div className="admin-empty">목록에서 문의를 선택해 주세요.</div>
          ) : detailQuery.isPending ? (
            <div className="admin-state" role="status">
              문의 상세를 불러오는 중입니다.
            </div>
          ) : detailQuery.isError ? (
            <div className="admin-state admin-state-error" role="alert">
              {getErrorMessage(detailQuery.error)}
            </div>
          ) : (
            <div className="admin-detail-content">
              <div className="admin-panel-heading">
                <div>
                  <span className="eyebrow">DETAIL</span>
                  <h2>{detailQuery.data.businessName}</h2>
                </div>
                <span className="admin-status-badge">
                  {detailQuery.data.status}
                </span>
              </div>

              <dl className="admin-contact-grid">
                <div>
                  <dt>담당자</dt>
                  <dd>{detailQuery.data.contactName}</dd>
                </div>
                <div>
                  <dt>이메일</dt>
                  <dd>
                    <a href={`mailto:${detailQuery.data.email}`}>
                      {detailQuery.data.email}
                    </a>
                  </dd>
                </div>
                <div>
                  <dt>연락처</dt>
                  <dd>
                    <a href={`tel:${detailQuery.data.phone}`}>
                      {detailQuery.data.phone}
                    </a>
                  </dd>
                </div>
                <div>
                  <dt>문의 유형</dt>
                  <dd>{detailQuery.data.type}</dd>
                </div>
                <div>
                  <dt>희망 일정</dt>
                  <dd>{detailQuery.data.desiredSchedule || '미입력'}</dd>
                </div>
                <div>
                  <dt>예상 예산</dt>
                  <dd>{detailQuery.data.budget || '미입력'}</dd>
                </div>
              </dl>

              <section
                className="admin-customer-message"
                aria-labelledby="customer-message-title"
              >
                <h3 id="customer-message-title">고객 문의 내용</h3>
                <p>{detailQuery.data.message}</p>
              </section>

              <form
                className="admin-update-form"
                onSubmit={(event) => {
                  event.preventDefault();
                  setSaveMessage('');
                  updateMutation.mutate();
                }}
              >
                <label>
                  상담 상태
                  <select
                    value={status}
                    onChange={(event) =>
                      setStatus(event.target.value as InquiryStatus)
                    }
                  >
                    {inquiryStatusSchema.options.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  관리자 내부 메모 (고객에게 노출되지 않음)
                  <textarea
                    value={adminMemo}
                    rows={7}
                    maxLength={10_000}
                    onChange={(event) => setAdminMemo(event.target.value)}
                  />
                </label>
                {saveMessage && (
                  <p
                    className={
                      updateMutation.isError
                        ? 'form-alert'
                        : 'admin-save-success'
                    }
                    role={updateMutation.isError ? 'alert' : 'status'}
                  >
                    {saveMessage}
                  </p>
                )}
                <button
                  className="button"
                  type="submit"
                  disabled={updateMutation.isPending}
                >
                  {updateMutation.isPending ? '저장 중…' : '변경사항 저장'}
                </button>
              </form>
            </div>
          )}
        </aside>
      </div>
    </section>
  );
}
