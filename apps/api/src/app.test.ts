import { describe, expect, it } from 'vitest';
import { app } from './app';

describe('API foundation', () => {
  it('returns a health response', async () => {
    const response = await app.request('/health');

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      status: 'ok',
      service: 'api',
    });
  });

  it('returns a safe JSON response for unknown routes', async () => {
    const response = await app.request('/unknown');

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({
      code: 'NOT_FOUND',
      message: '요청한 경로를 찾을 수 없습니다.',
    });
  });
});
