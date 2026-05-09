import { describe, expect, it } from 'vitest';

import {
  Flute,
  FluteAuthenticationError,
  FluteConfigurationError,
  FluteError,
  MemoryTokenStorage,
  getVersion,
} from '../src/index.js';

describe('Phase 0 smoke tests', () => {
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
  });

  it('respects the explicit environment', () => {
    const flute = new Flute({
      clientId: 'cid',
      clientSecret: 'shh',
      environment: 'production',
    });
    expect(flute.environment).toBe('production');
  });

  it('exposes the four namespaces as public properties', () => {
    const flute = new Flute({ clientId: 'cid', clientSecret: 'shh' });
    expect(flute.transactions).toBeDefined();
    expect(flute.paymentSessions).toBeDefined();
    expect(flute.settings).toBeDefined();
    expect(flute.webhooks).toBeDefined();
  });

  it('error subclasses are instanceof FluteError', () => {
    const cfg = new FluteConfigurationError('bad');
    const auth = new FluteAuthenticationError('401');
    expect(cfg).toBeInstanceOf(FluteError);
    expect(auth).toBeInstanceOf(FluteError);
  });

  it('reports a non-empty SDK version', () => {
    const v = getVersion();
    expect(typeof v).toBe('string');
    expect(v.length).toBeGreaterThan(0);
  });

  it('MemoryTokenStorage round-trips a token', async () => {
    const store = new MemoryTokenStorage();
    await store.set('k', { accessToken: 't', expiresAt: Date.now() + 60_000 });
    expect(await store.get('k')).toMatchObject({ accessToken: 't' });
    await store.delete('k');
    expect(await store.get('k')).toBeUndefined();
  });

  it('MemoryTokenStorage evicts expired tokens lazily', async () => {
    const store = new MemoryTokenStorage();
    await store.set('k', { accessToken: 't', expiresAt: Date.now() - 1 });
    expect(await store.get('k')).toBeUndefined();
  });

  it('Phase 0 placeholder methods reject with a clear message', async () => {
    const flute = new Flute({ clientId: 'cid', clientSecret: 'shh' });
    await expect(flute.transactions.list()).rejects.toThrow(/not implemented/i);
    await expect(flute.paymentSessions.create()).rejects.toThrow(/not implemented/i);
    await expect(flute.settings.getPaymentSettings()).rejects.toThrow(/not implemented/i);
  });

  it('verifyWebhookSignature throws not-implemented in Phase 0', () => {
    const flute = new Flute({ clientId: 'cid', clientSecret: 'shh' });
    expect(() =>
      flute.webhooks.verifySignature({
        signatureHeader: 'sig',
        idHeader: 'id',
        timestampHeader: '0',
        rawRequestBody: '',
        signatureSecret: 's',
      }),
    ).toThrow(/not implemented/i);
  });
});
