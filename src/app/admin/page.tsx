import Link from 'next/link';

import { AdminInquiryManager } from '../../features/admin-inquiries/AdminInquiryManager';

export default function AdminPage() {
  return (
    <main className="admin-page">
      <header className="admin-page-header">
        <Link className="admin-brand" href="/">
          Connecting Space
        </Link>
        <div>
          <span className="eyebrow">ADMIN</span>
          <h1>관리자 문의 관리</h1>
          <p>접수된 문의를 확인하고 상담 상태와 내부 메모를 관리합니다.</p>
        </div>
      </header>
      <AdminInquiryManager />
    </main>
  );
}
