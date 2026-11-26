import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import HomePage from '../../app/page';

describe('공개 랜딩 위젯', () => {
  it('서비스 소개와 탐색 가능한 섹션을 제공한다', () => {
    render(<HomePage />);

    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.getByRole('contentinfo')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', {
        name: '브랜드와 고객을 연결하는 웹사이트',
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: '자주 묻는 질문' }),
    ).toBeInTheDocument();
    expect(screen.getAllByText(/합성 포트폴리오/).length).toBeGreaterThan(0);
    expect(screen.getByRole('link', { name: '상담 시작하기' })).toHaveAttribute(
      'href',
      '#inquiry-form',
    );
    expect(screen.getByLabelText('업체명')).toBeInTheDocument();
    expect(screen.getByLabelText('담당자명')).toBeInTheDocument();
    expect(screen.getByLabelText('이메일')).toBeInTheDocument();
    expect(screen.getByLabelText('연락처')).toBeInTheDocument();
    expect(screen.getByLabelText('문의 유형')).toBeInTheDocument();
    expect(screen.getByLabelText('문의 내용')).toBeInTheDocument();
    expect(
      screen.getByText(
        '문의 내용을 남겨주시면 확인 후 선택한 연락 방법으로 상담 안내를 드립니다.',
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/문의 폼은 다음 단계에서 연결됩니다/),
    ).not.toBeInTheDocument();
  });

  it('FAQ 항목을 키보드로 펼칠 수 있는 disclosure로 제공한다', () => {
    render(<HomePage />);

    expect(screen.getAllByRole('group')).toHaveLength(3);
    expect(screen.getAllByText(/어떤 웹사이트|제작 기간|문의 후/)).toHaveLength(
      3,
    );
  });
});
