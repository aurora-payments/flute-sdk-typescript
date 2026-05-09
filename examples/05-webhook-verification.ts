/**
 * Verifying a webhook signature.
 *
 * Run with: `npx tsx examples/05-webhook-verification.ts`
 *
 * Phase 0: this file documents the intended shape; the underlying
 * verifier throws `not implemented`. Phase 1 wires HMAC-SHA256 +
 * timing-safe compare and replay protection.
 */

import { verifyWebhookSignature } from '../src/index.js';

const headers = {
  'flute-signature': 'placeholder',
  'flute-event-id': 'evt_demo',
  'flute-timestamp': String(Math.floor(Date.now() / 1000)),
};

const rawBody = JSON.stringify({ type: 'transaction.succeeded', id: 'tx_demo' });

try {
  const ok = verifyWebhookSignature({
    signatureHeader: headers['flute-signature'],
    idHeader: headers['flute-event-id'],
    timestampHeader: headers['flute-timestamp'],
    rawRequestBody: rawBody,
    signatureSecret: process.env['FLUTE_WEBHOOK_SECRET'] ?? 'whsec_placeholder',
  });
  console.log('signature ok?', ok);
} catch (err) {
  console.error('Webhook verification failed:', err);
}
