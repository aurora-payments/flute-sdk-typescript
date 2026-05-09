import { describe, expect, it } from 'vitest';

import {
  Flute,
  FluteApiError,
  FluteAuthenticationError,
  FluteConfigurationError,
  FluteError,
  FluteIdempotencyError,
  FluteNetworkError,
  FluteRateLimitError,
  FluteValidationError,
  MemoryTokenStorage,
  Sessions,
  getVersion,
} from '../src/index.js';

describe('Construction', () => {
  it('exports Flute as a constructor', () => {
    expect(typeof Flute).toBe('function');
  });

  it('refuses to construct without a clientId', () => {
    expect(
      () =>
        new Flute({
          clientId: '',
          clientSecret: 'shh',
        }),
    ).toThrow(FluteConfigurationError);
  });

  it('refuses to construct without a clientSecret', () => {
    expect(
      () =>
        new Flute({
          clientId: 'cid',
          clientSecret: '',
        }),
    ).toThrow(FluteConfigurationError);
  });

  it('defaults to sandbox environment', () => {
    const flute = new Flute({ clientId: 'cid', clientSecret: 'shh' });
    expect(flute.environment).toBe('sandbox');
    expect(flute.baseUrls.isvApi).toContain('api.uat.arise');
    expect(flute.baseUrls.oauth).toContain('api.uat.arise');
  });

  it('respects the explicit environment', () => {
    const flute = new Flute({
      clientId: 'cid',
      clientSecret: 'shh',
      environment: 'production',
    });
    expect(flute.environment).toBe('production');
    expect(flute.baseUrls.isvApi).not.toContain('uat');
  });

  it('honours per-environment URL overrides', () => {
    const flute = new Flute({
      clientId: 'cid',
      clientSecret: 'shh',
      baseUrls: {
        isvApi: 'https://example.test/isv-api/',
      },
    });
    expect(flute.baseUrls.isvApi).toBe('https://example.test/isv-api');
  });

  it('exposes all five namespaces as public properties', () => {
    const flute = new Flute({ clientId: 'cid', clientSecret: 'shh' });
    expect(flute.sessions).toBeInstanceOf(Sessions);
    expect(flute.transactions).toBeDefined();
    expect(flute.paymentSessions).toBeDefined();
    expect(flute.settings).toBeDefined();
    expect(flute.webhooks).toBeDefined();
  });
});

describe('Error hierarchy', () => {
  it('every subclass is instanceof FluteError', () => {
    expect(new FluteConfigurationError('x')).toBeInstanceOf(FluteError);
    expect(new FluteAuthenticationError('x')).toBeInstanceOf(FluteError);
    expect(new FluteApiError('x', undefined)).toBeInstanceOf(FluteError);
    expect(new FluteValidationError('x', undefined)).toBeInstanceOf(FluteError);
    expect(new FluteNetworkError('x')).toBeInstanceOf(FluteError);
    expect(new FluteRateLimitError('x', undefined)).toBeInstanceOf(FluteError);
    expect(new FluteIdempotencyError('x')).toBeInstanceOf(FluteError);
  });

  it('preserves request and correlation ids', () => {
    const err = new FluteApiError('Boom', { errorCode: 'X1' }, {
      httpStatus: 500,
      requestId: 'req_1',
      correlationId: 'corr_1',
    });
    expect(err.httpStatus).toBe(500);
    expect(err.requestId).toBe('req_1');
    expect(err.correlationId).toBe('corr_1');
    expect(err.errorCode).toBe('X1');
  });
});

describe('MemoryTokenStorage', () => {
  it('round-trips a token', async () => {
    const store = new MemoryTokenStorage();
    await store.set('k', { accessToken: 't', expiresAt: Date.now() + 60_000 });
    expect(await store.get('k')).toMatchObject({ accessToken: 't' });
    await store.delete('k');
    expect(await store.get('k')).toBeUndefined();
  });

  it('keeps expired tokens — TokenManager owns lifetime decisions', async () => {
    // The storage is intentionally a dumb container so a refresh_token
    // remains accessible even after the access_token has expired.
    const store = new MemoryTokenStorage();
    await store.set('k', { accessToken: 't', expiresAt: Date.now() - 1 });
    expect(await store.get('k')).toMatchObject({ accessToken: 't' });
  });
});

describe('Version', () => {
  it('reports a non-empty SDK version', () => {
    const v = getVersion();
    expect(typeof v).toBe('string');
    expect(v.length).toBeGreaterThan(0);
  });
});
