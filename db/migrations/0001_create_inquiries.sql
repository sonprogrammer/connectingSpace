CREATE TABLE IF NOT EXISTS inquiries (
  id TEXT PRIMARY KEY NOT NULL,
  business_name TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN (
    '견적 문의',
    '홈페이지 제작 상담',
    '기존 사이트 리뉴얼',
    '유지보수·수정 문의',
    '아임웹 제작 문의',
    '자체 코드 제작 문의',
    '기타'
  )),
  message TEXT NOT NULL,
  desired_schedule TEXT,
  budget TEXT,
  current_site_url TEXT,
  reference_site_url TEXT,
  preferred_contact_method TEXT,
  status TEXT NOT NULL DEFAULT '신규' CHECK (status IN ('신규', '상담 예정', '상담 완료', '보류')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS inquiries_created_at_idx ON inquiries (created_at DESC);
CREATE INDEX IF NOT EXISTS inquiries_status_idx ON inquiries (status);
