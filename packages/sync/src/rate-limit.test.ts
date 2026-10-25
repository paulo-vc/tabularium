import { describe, expect, it } from 'vitest';
import { RateLimiter } from './rate-limit';

describe('RateLimiter', () => {
  it('conta por participante e libera de novo quando a janela passa', () => {
    let now = 0;
    const limiter = new RateLimiter(2, 1000, () => now);
    expect([limiter.allow('ana'), limiter.allow('ana'), limiter.allow('ana')]).toEqual([
      true,
      true,
      false,
    ]);
    expect(limiter.allow('bia')).toBe(true);
    now = 1000;
    expect(limiter.allow('ana')).toBe(true);
    limiter.forget('bia');
    expect([limiter.allow('bia'), limiter.allow('bia')]).toEqual([true, true]);
  });
});
