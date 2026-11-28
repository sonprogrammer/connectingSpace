CREATE TABLE IF NOT EXISTS contracts (
  id TEXT PRIMARY KEY NOT NULL,
  inquiry_id TEXT NOT NULL REFERENCES inquiries(id),
  version INTEGER NOT NULL CHECK (version > 0),
  status TEXT NOT NULL CHECK (status IN ('작성 중', '전송됨', '승인됨', '만료됨', '취소됨')),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  scope TEXT NOT NULL,
  total_amount INTEGER NOT NULL CHECK (total_amount >= 0),
  schedule TEXT NOT NULL,
  revision_scope TEXT NOT NULL,
  payment_terms TEXT NOT NULL,
  production_method TEXT NOT NULL,
  external_costs TEXT,
  special_notes TEXT,
  viewed_version INTEGER,
  viewed_at TEXT,
  approval_identity TEXT,
  approved_at TEXT,
  sent_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (inquiry_id, version)
);

CREATE INDEX IF NOT EXISTS contracts_inquiry_version_idx ON contracts (inquiry_id, version DESC);

CREATE TABLE IF NOT EXISTS contract_access_links (
  id TEXT PRIMARY KEY NOT NULL,
  contract_id TEXT NOT NULL REFERENCES contracts(id),
  token_hash TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT '활성' CHECK (status IN ('활성', '차단')),
  created_at TEXT NOT NULL,
  revoked_at TEXT
);

CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY NOT NULL,
  inquiry_id TEXT NOT NULL UNIQUE REFERENCES inquiries(id),
  contract_id TEXT NOT NULL UNIQUE REFERENCES contracts(id),
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT '준비 중' CHECK (status IN ('준비 중', '제작 중', '고객 검수', '수정 중', '완료', '보류')),
  production_method TEXT,
  start_date TEXT,
  expected_end_date TEXT,
  internal_memo TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS project_access_links (
  id TEXT PRIMARY KEY NOT NULL,
  project_id TEXT NOT NULL REFERENCES projects(id),
  token_hash TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT '활성' CHECK (status IN ('활성', '차단')),
  created_at TEXT NOT NULL,
  revoked_at TEXT
);

CREATE INDEX IF NOT EXISTS project_access_links_project_status_idx ON project_access_links (project_id, status);

CREATE TABLE IF NOT EXISTS project_updates (
  id TEXT PRIMARY KEY NOT NULL,
  project_id TEXT NOT NULL REFERENCES projects(id),
  status TEXT NOT NULL CHECK (status IN ('준비 중', '제작 중', '고객 검수', '수정 중', '완료', '보류')),
  message TEXT NOT NULL,
  created_at TEXT NOT NULL
);
