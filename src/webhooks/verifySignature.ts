/**
 * Inputs for {@link verifyWebhookSignature}.
 *
 * The signature schema follows the HMAC-SHA256 pattern documented for
 * Flute webhooks: the signed payload is `${idHeader}.${timestampHeader}.${rawRequestBody}`
 * and the comparison MUST be timing-safe.
 *
 * @public
 */
export interface VerifyWebhookSignatureInput {
  /** Value of the `Flute-Signature` (or vendor equivalent) header. Hex-encoded. */
  readonly signatureHeader: string;
  /** Value of the event id header (typically the webhook delivery id). */
  readonly idHeader: string;
  /** Value of the timestamp header in seconds since epoch. */
  readonly timestampHeader: string;
  /** Raw request body bytes / string. MUST NOT be the parsed JSON. */
  readonly rawRequestBody: string | Uint8Array;
  /** Shared secret previously generated when the webhook endpoint was created. */
  readonly signatureSecret: string;
}

/**
 * Tunables for {@link verifyWebhookSignature}.
 *
 * @public
 */
export interface VerifyWebhookSignatureOptions {
  /**
   * Maximum drift (in seconds) between the timestamp header and the local
   * clock. Defaults to 300 (5 minutes), the same window used by major
   * payment processors. Set to `Infinity` to disable replay protection.
   */
  readonly toleranceSeconds?: number;
}

/**
 * Verify the HMAC signature of an incoming webhook request.
 *
 * The Phase 0 stub throws to make accidental "it returned true" surprises
 * impossible. Phase 1 wires the real HMAC-SHA256 + timing-safe compare.
 *
 * @public
 */
export function verifyWebhookSignature(
  _input: VerifyWebhookSignatureInput,
  _options: VerifyWebhookSignatureOptions = {},
): boolean {
  throw new Error(
    'verifyWebhookSignature() is not implemented yet. The Flute SDK is currently in Phase 0 (scaffolding). Track progress in ARISE-1845.',
  );
}
