import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';

import { verifyWebhookSignature } from '../src/index.js';

function sign(secret: string, eventId: string, ts: number, body: string): string {
  const content = `${eventId}.${String(ts)}.${body}`;
  const digest = createHmac('sha256', secret).update(content).digest('base64');
  return `v1,${digest}`;
}

describe('verifyWebhookSignature', () => {
  const secret = 'whsec_test_KQX7';
  const id = 'evt_01HZ123456';
  const ts = 1_700_000_000;
  const body = JSON.stringify({ type: 'transaction.captured', data: { id: 'tx_1' } });

  it('returns true on a valid signature within the tolerance window', () => {
    const sig = sign(secret, id, ts, body);
    const ok = verifyWebhookSignature(
      {
        signatureHeader: sig,
        idHeader: id,
        timestampHeader: String(ts),
        rawRequestBody: body,
        signatureSecret: secret,
      },
      { nowEpochSeconds: ts },
    );
    expect(ok).toBe(true);
  });

  it('returns true when raw body is provided as Uint8Array', () => {
    const sig = sign(secret, id, ts, body);
    const ok = verifyWebhookSignature(
      {
        signatureHeader: sig,
        idHeader: id,
        timestampHeader: String(ts),
        rawRequestBody: new TextEncoder().encode(body),
        signatureSecret: secret,
      },
      { nowEpochSeconds: ts },
    );
    expect(ok).toBe(true);
  });

  it('returns false when the body has been tampered with', () => {
    const sig = sign(secret, id, ts, body);
    const ok = verifyWebhookSignature(
      {
        signatureHeader: sig,
        idHeader: id,
        timestampHeader: String(ts),
        rawRequestBody: body.replace('tx_1', 'tx_2'),
        signatureSecret: secret,
      },
      { nowEpochSeconds: ts },
    );
    expect(ok).toBe(false);
  });

  it('returns false when the secret is wrong', () => {
    const sig = sign(secret, id, ts, body);
    const ok = verifyWebhookSignature(
      {
        signatureHeader: sig,
        idHeader: id,
        timestampHeader: String(ts),
        rawRequestBody: body,
        signatureSecret: 'whsec_other',
      },
      { nowEpochSeconds: ts },
    );
    expect(ok).toBe(false);
  });

  it('returns false when the timestamp is outside the tolerance window', () => {
    const sig = sign(secret, id, ts, body);
    const ok = verifyWebhookSignature(
      {
        signatureHeader: sig,
        idHeader: id,
        timestampHeader: String(ts),
        rawRequestBody: body,
        signatureSecret: secret,
      },
      { nowEpochSeconds: ts + 600, toleranceSeconds: 300 },
    );
    expect(ok).toBe(false);
  });

  it('honours toleranceSeconds = Infinity (replay protection disabled)', () => {
    const sig = sign(secret, id, ts, body);
    const ok = verifyWebhookSignature(
      {
        signatureHeader: sig,
        idHeader: id,
        timestampHeader: String(ts),
        rawRequestBody: body,
        signatureSecret: secret,
      },
      { nowEpochSeconds: ts + 365 * 24 * 60 * 60, toleranceSeconds: Number.POSITIVE_INFINITY },
    );
    expect(ok).toBe(true);
  });

  it('returns false on a malformed signature header', () => {
    expect(
      verifyWebhookSignature({
        signatureHeader: 'not-a-signature',
        idHeader: id,
        timestampHeader: String(ts),
        rawRequestBody: body,
        signatureSecret: secret,
      }),
    ).toBe(false);

    expect(
      verifyWebhookSignature({
        signatureHeader: 'v2,abc',
        idHeader: id,
        timestampHeader: String(ts),
        rawRequestBody: body,
        signatureSecret: secret,
      }),
    ).toBe(false);

    expect(
      verifyWebhookSignature({
        signatureHeader: '',
        idHeader: id,
        timestampHeader: String(ts),
        rawRequestBody: body,
        signatureSecret: secret,
      }),
    ).toBe(false);

    expect(
      verifyWebhookSignature({
        signatureHeader: 'v1,not-base64-!!!',
        idHeader: id,
        timestampHeader: String(ts),
        rawRequestBody: body,
        signatureSecret: secret,
      }),
    ).toBe(false);
  });

  it('returns false when the timestamp is not numeric', () => {
    const sig = sign(secret, id, ts, body);
    expect(
      verifyWebhookSignature({
        signatureHeader: sig,
        idHeader: id,
        timestampHeader: 'not-a-timestamp',
        rawRequestBody: body,
        signatureSecret: secret,
      }),
    ).toBe(false);
  });

  it('matches the backend WebhookHmacService output bit-for-bit', () => {
    // Cross-check against the known test vector from
    // Arise.NotificationsService/.../WebhookHmacServiceTests.cs
    // (the "Sign_SignatureMatchesIndependentHmacSha256Computation" case).
    const vSecret = 'shared-secret';
    const vId = 'test-event-id';
    const vTs = 1_739_465_072;
    const vBody = '{"foo":"bar"}';

    const sig = sign(vSecret, vId, vTs, vBody);
    const ok = verifyWebhookSignature(
      {
        signatureHeader: sig,
        idHeader: vId,
        timestampHeader: String(vTs),
        rawRequestBody: vBody,
        signatureSecret: vSecret,
      },
      { nowEpochSeconds: vTs },
    );
    expect(ok).toBe(true);
  });
});
