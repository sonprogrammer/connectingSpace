type FontMetrics = {
  widthOfTextAtSize: (text: string, size: number) => number;
};

export const wrapPdfText = (
  text: string,
  font: FontMetrics,
  fontSize: number,
  maxWidth: number,
) =>
  text.split('\n').flatMap((paragraph) => {
    if (!paragraph) return [''];
    const lines: string[] = [];
    let line = '';
    for (const character of Array.from(paragraph)) {
      const candidate = line + character;
      if (line && font.widthOfTextAtSize(candidate, fontSize) > maxWidth) {
        lines.push(line);
        line = character;
      } else {
        line = candidate;
      }
    }
    lines.push(line);
    return lines;
  });
