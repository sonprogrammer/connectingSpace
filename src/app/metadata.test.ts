import { describe, expect, it } from 'vitest';

import { siteMetadata } from './metadata';

describe('공개 랜딩 metadata', () => {
  it('기본 검색 정보와 Open Graph 구조를 제공한다', () => {
    expect(siteMetadata.title).toContain('Connecting Space');
    expect(siteMetadata.description).toBeTruthy();
    expect(siteMetadata.openGraph).toEqual(
      expect.objectContaining({
        title: expect.any(String),
        description: expect.any(String),
        type: 'website',
      }),
    );
  });
});
