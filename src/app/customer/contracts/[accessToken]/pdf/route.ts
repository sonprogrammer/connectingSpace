import { env } from 'cloudflare:workers';
import fontkit from '@pdf-lib/fontkit';
import { PDFDocument } from 'pdf-lib';
import koreanFontUrl from '@fontsource/noto-sans-kr/files/noto-sans-kr-korean-400-normal.woff?inline';
import { wrapPdfText } from '@/server/contracts/pdf-layout';
import {
  createAdminAuthProvider,
  type AdminAuthBindings,
} from '@/server/auth/admin-auth-provider';
import { createContractHandlers } from '@/server/contracts/contract-handler';

type Context = { params: Promise<{ accessToken: string }> };

export const GET = async (request: Request, context: Context) => {
  const handlers = createContractHandlers({
    db: env.DB,
    authProvider: createAdminAuthProvider(env as unknown as AdminAuthBindings),
  });
  const { accessToken } = await context.params;
  const response = await handlers.customerView(request, accessToken);
  if (!response.ok) return response;
  const contract = (await response.json()) as {
    contractId: string;
    title: string;
    body: string;
    totalAmount: number;
    schedule: string;
  };
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  const encodedFont = koreanFontUrl.slice(koreanFontUrl.indexOf(',') + 1);
  const fontBytes = Uint8Array.from(atob(encodedFont), (character) =>
    character.charCodeAt(0),
  );
  const font = await pdf.embedFont(fontBytes, { subset: true });
  let page = pdf.addPage();
  const fontSize = 11;
  let y = page.getHeight() - 48;
  const content = [
    contract.title,
    `Contract: ${contract.contractId}`,
    `Amount: ${contract.totalAmount}`,
    `Schedule: ${contract.schedule}`,
    '',
    ...contract.body.split('\n'),
  ].join('\n');
  const lines = wrapPdfText(content, font, fontSize, page.getWidth() - 96);
  for (const line of lines) {
    if (y < 48) {
      page = pdf.addPage();
      y = page.getHeight() - 48;
    }
    page.drawText(line, {
      x: 48,
      y,
      size: fontSize,
      font,
      maxWidth: page.getWidth() - 96,
    });
    y -= fontSize + 7;
  }
  const pdfBytes = Uint8Array.from(await pdf.save());
  return new Response(pdfBytes.buffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="contract-${contract.contractId}.pdf"`,
      'Cache-Control': 'no-store',
    },
  });
};
