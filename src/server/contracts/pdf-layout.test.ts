import { describe, expect, it } from 'vitest';
import { wrapPdfText } from './pdf-layout';

describe('wrapPdfText', () => {
  it('줄바꿈을 넣어도 모든 원문 문자를 보존한다', () => {
    const text = '가나다라마바사아자차카타파하';
    const font = {
      widthOfTextAtSize: (value: string) => Array.from(value).length,
    };

    const lines = wrapPdfText(text, font, 11, 5);

    expect(lines).toEqual(['가나다라마', '바사아자차', '카타파하']);
    expect(lines.join('')).toBe(text);
  });

  it('기존 문단 줄바꿈을 유지한다', () => {
    const font = { widthOfTextAtSize: (value: string) => value.length };

    expect(wrapPdfText('첫째 문단\n\n둘째', font, 11, 20)).toEqual([
      '첫째 문단',
      '',
      '둘째',
    ]);
  });
});
