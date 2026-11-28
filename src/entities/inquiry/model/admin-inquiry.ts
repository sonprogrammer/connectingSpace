import type { InquiryStatus, InquiryType } from '../../../shared/model/inquiry';

export type AdminInquirySummary = {
  id: string;
  businessName: string;
  contactName: string;
  type: InquiryType;
  status: InquiryStatus;
  receivedAt: string;
};

export type AdminInquiryDetail = AdminInquirySummary & {
  email: string;
  phone: string;
  message: string;
  desiredSchedule?: string;
  budget?: string;
  currentSiteUrl?: string;
  referenceSiteUrl?: string;
  preferredContactMethod?: string;
  adminMemo?: string;
  updatedAt: string;
};

export type AdminInquiryListResult = {
  items: AdminInquirySummary[];
  page: number;
  pageSize: number;
  total: number;
};

export type AdminInquiryListParams = {
  page?: number;
  pageSize?: number;
  status?: InquiryStatus;
  type?: InquiryType;
  search?: string;
};

export type AdminInquiryUpdateInput = {
  status?: InquiryStatus;
  adminMemo?: string;
};
