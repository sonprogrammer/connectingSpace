import { describe, expect, it } from 'vitest';

import { landingSections } from './content';

describe('랜딩 정적 콘텐츠', () => {
  it('문의 API 없이 모든 공개 섹션의 콘텐츠를 제공한다', () => {
    expect(landingSections).toEqual(
      expect.objectContaining({
        philosophy: expect.anything(),
        process: expect.anything(),
        portfolio: expect.anything(),
        pricing: expect.anything(),
        faq: expect.anything(),
      }),
    );
    expect(landingSections.portfolio.notice).toContain('합성');
    expect(landingSections.pricing.isProvisional).toBe(true);
  });
});
