import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';

import { ThemeToggle } from './ThemeToggle';

describe('테마 전환', () => {
  beforeEach(() => {
    delete document.documentElement.dataset.theme;
  });

  it('다크 모드로 시작하고 버튼으로 라이트 모드로 전환한다', async () => {
    const user = userEvent.setup();
    render(<ThemeToggle />);

    const toggle = screen.getByRole('button', { name: /라이트 모드/ });
    expect(toggle).toHaveAttribute('aria-pressed', 'false');
    expect(document.documentElement.dataset.theme).toBe('dark');

    await user.click(toggle);

    expect(screen.getByRole('button', { name: /다크 모드/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(document.documentElement.dataset.theme).toBe('light');
  });
});
