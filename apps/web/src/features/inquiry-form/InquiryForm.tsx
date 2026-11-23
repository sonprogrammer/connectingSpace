'use client';

import { useState } from 'react';

import { InquiryApiError, submitInquiry } from '../../shared/api/inquiries';
import {
  inquiryFormDefaults,
  inquiryFormSchema,
  inquiryTypeOptions,
  preferredContactOptions,
  toInquiryPayload,
  type InquiryFormValues,
} from './model/form';

type FormErrors = Partial<Record<keyof InquiryFormValues, string>>;

const getFormErrors = (values: InquiryFormValues): FormErrors => {
  const result = inquiryFormSchema.safeParse(values);

  if (result.success) return {};

  return result.error.issues.reduce<FormErrors>((errors, issue) => {
    const field = issue.path[0] as keyof InquiryFormValues | undefined;
    if (field && !errors[field]) errors[field] = issue.message;
    return errors;
  }, {});
};

export function InquiryForm() {
  const [values, setValues] = useState<InquiryFormValues>(inquiryFormDefaults);
  const [errors, setErrors] = useState<FormErrors>({});
  const [status, setStatus] = useState<
    'idle' | 'submitting' | 'success' | 'error'
  >('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const updateValue = (field: keyof InquiryFormValues, value: string) => {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
    if (status === 'error') setStatus('idle');
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const nextErrors = getFormErrors(values);
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setStatus('submitting');
    setErrorMessage('');

    try {
      await submitInquiry(toInquiryPayload(values));
      setStatus('success');
    } catch (error) {
      setStatus('error');
      setErrorMessage(
        error instanceof InquiryApiError
          ? error.message
          : '문의 접수 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.',
      );
    }
  };

  if (status === 'success') {
    return (
      <div className="inquiry-success" role="status">
        <span className="eyebrow">REQUEST RECEIVED</span>
        <h3>문의가 접수되었습니다.</h3>
        <p>
          선택한 연락 방법으로 상담 안내를 드리겠습니다. 확인 후 순서대로
          연락드릴게요.
        </p>
      </div>
    );
  }

  const renderError = (field: keyof InquiryFormValues) =>
    errors[field] ? (
      <span className="field-error" id={`${field}-error`}>
        {errors[field]}
      </span>
    ) : null;

  return (
    <form className="inquiry-form" onSubmit={handleSubmit} noValidate>
      {status === 'error' && (
        <p className="form-alert" role="alert">
          {errorMessage}
        </p>
      )}

      <div className="form-grid">
        <label className="form-field">
          업체명
          <input
            name="businessName"
            value={values.businessName}
            required
            aria-invalid={Boolean(errors.businessName)}
            aria-describedby={
              errors.businessName ? 'businessName-error' : undefined
            }
            onChange={(event) =>
              updateValue('businessName', event.target.value)
            }
          />
          {renderError('businessName')}
        </label>
        <label className="form-field">
          담당자명
          <input
            name="contactName"
            value={values.contactName}
            required
            aria-invalid={Boolean(errors.contactName)}
            aria-describedby={
              errors.contactName ? 'contactName-error' : undefined
            }
            onChange={(event) => updateValue('contactName', event.target.value)}
          />
          {renderError('contactName')}
        </label>
        <label className="form-field">
          이메일
          <input
            name="email"
            type="email"
            value={values.email}
            required
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? 'email-error' : undefined}
            onChange={(event) => updateValue('email', event.target.value)}
          />
          {renderError('email')}
        </label>
        <label className="form-field">
          연락처
          <input
            name="phone"
            type="tel"
            value={values.phone}
            required
            aria-invalid={Boolean(errors.phone)}
            aria-describedby={errors.phone ? 'phone-error' : undefined}
            onChange={(event) => updateValue('phone', event.target.value)}
          />
          {renderError('phone')}
        </label>
        <label className="form-field">
          문의 유형
          <select
            name="type"
            value={values.type}
            required
            aria-invalid={Boolean(errors.type)}
            aria-describedby={errors.type ? 'type-error' : undefined}
            onChange={(event) => updateValue('type', event.target.value)}
          >
            {inquiryTypeOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          {renderError('type')}
        </label>
        <label className="form-field">
          선호 연락 방법
          <select
            name="preferredContactMethod"
            value={values.preferredContactMethod}
            aria-invalid={Boolean(errors.preferredContactMethod)}
            aria-describedby={
              errors.preferredContactMethod
                ? 'preferredContactMethod-error'
                : undefined
            }
            onChange={(event) =>
              updateValue('preferredContactMethod', event.target.value)
            }
          >
            <option value="">선택해 주세요</option>
            {preferredContactOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          {renderError('preferredContactMethod')}
        </label>
        <label className="form-field">
          희망 일정
          <input
            name="desiredSchedule"
            value={values.desiredSchedule}
            onChange={(event) =>
              updateValue('desiredSchedule', event.target.value)
            }
          />
          {renderError('desiredSchedule')}
        </label>
        <label className="form-field">
          예상 예산
          <input
            name="budget"
            value={values.budget}
            onChange={(event) => updateValue('budget', event.target.value)}
          />
          {renderError('budget')}
        </label>
        <label className="form-field form-field-wide">
          문의 내용
          <textarea
            name="message"
            value={values.message}
            required
            rows={6}
            aria-invalid={Boolean(errors.message)}
            aria-describedby={errors.message ? 'message-error' : undefined}
            onChange={(event) => updateValue('message', event.target.value)}
          />
          {renderError('message')}
        </label>
        <label className="form-field form-field-wide">
          현재 사이트 URL <span className="field-optional">선택</span>
          <input
            name="currentSiteUrl"
            type="url"
            value={values.currentSiteUrl}
            aria-invalid={Boolean(errors.currentSiteUrl)}
            aria-describedby={
              errors.currentSiteUrl ? 'currentSiteUrl-error' : undefined
            }
            onChange={(event) =>
              updateValue('currentSiteUrl', event.target.value)
            }
          />
          {renderError('currentSiteUrl')}
        </label>
        <label className="form-field form-field-wide">
          참고 사이트 URL <span className="field-optional">선택</span>
          <input
            name="referenceSiteUrl"
            type="url"
            value={values.referenceSiteUrl}
            aria-invalid={Boolean(errors.referenceSiteUrl)}
            aria-describedby={
              errors.referenceSiteUrl ? 'referenceSiteUrl-error' : undefined
            }
            onChange={(event) =>
              updateValue('referenceSiteUrl', event.target.value)
            }
          />
          {renderError('referenceSiteUrl')}
        </label>
      </div>

      <button
        className="button inquiry-submit"
        type="submit"
        disabled={status === 'submitting'}
      >
        {status === 'submitting' ? '문의 접수 중…' : '견적 요청 보내기'}
      </button>
    </form>
  );
}
