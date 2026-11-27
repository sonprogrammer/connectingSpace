// @vitest-environment node

import { describe, expect, it } from 'vitest';
import { escapeD1LikePattern } from './d1-inquiry-repository';

describe('D1 관리자 문의 검색', () => {
  it('LIKE 와일드카드와 이스케이프 문자를 일반 검색 문자로 처리한다', () => {
    expect(escapeD1LikePattern('50%_\\완료')).toBe('50\\%\\_\\\\완료');
  });
});
