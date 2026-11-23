import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import HomePage from './page';

describe('홈 라우트', () => {
  it('주요 랜딩 섹션과 견적 요청 이동 경로를 렌더링한다', () => {
    render(<HomePage />);

    expect(
      screen.getByRole('heading', {
        name: '브랜드와 고객을 연결하는 웹사이트',
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole('navigation')).toBeInTheDocument();
    const inquiryLinks = screen.getAllByRole('link', { name: '견적 요청' });
    expect(inquiryLinks).toHaveLength(2);
    inquiryLinks.forEach((link) =>
      expect(link).toHaveAttribute('href', '#inquiry'),
    );

    for (const sectionId of [
      'philosophy',
      'process',
      'portfolio',
      'pricing',
      'faq',
      'inquiry',
    ]) {
      expect(document.getElementById(sectionId)).toBeInTheDocument();
    }

    expect(screen.getAllByText(/합성 포트폴리오/)).toHaveLength(1);
  });
});
