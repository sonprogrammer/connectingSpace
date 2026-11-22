import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import HomePage from './page';

describe('홈 라우트', () => {
  it('기본 페이지 제목과 설명을 렌더링한다', () => {
    render(<HomePage />);

    expect(
      screen.getByRole('heading', { name: 'Connecting Space' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Web application foundation')).toBeInTheDocument();
  });
});
