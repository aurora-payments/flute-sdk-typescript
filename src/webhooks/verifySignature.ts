import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Inputs for {@link verifyWebhookSignature}.
 *
 * Header names follow the Flute Notifications Service conventions:
 *
 * - `Flute-Webhook-ID` — unique delivery identifier.
 * - `Flute-Webhook-Timestamp` — UNIX timestamp in **seconds**.
 * - `Flute-Webhook-Signature` — `v1,<base64(hmac-sha256)>`.
 *
 * The signed payload is `${idHeader}.${timestampHeader}.${rawRequestBody}`.
 *
 * @public
 */
export interface VerifyWebhookSignatureInput {
  /** Value of the `Flute-Webhook-Signature` header (e.g. `v1,SGVsbG8=`). */
  readonly signatureHeader: string;
  /** Value of the `Flute-Webhook-ID` header. */
  readonly idHeader: string;
  /** Value of the `Flute-Webhook-Timestamp` header (UNIX seconds, as a string). */
  readonly timestampHeader: string;
  /**
   * Raw request body **bytes or original string** — NOT the parsed JSON.
   * Re-serialising the JSON breaks the HMAC because key order and
   * whitespace differ.
   */
  readonly rawRequestBody: string | Uint8Array;
  /**
   * Shared HMAC secret returned when the webhook endpoint was created
   * (it is shown to the merchant exactly once at that moment).
   */
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
   * clock. Defaults to 300 (5 minutes). Set to `Infinity` to disable
   * replay protection — strongly discouraged in production.
   */
  readonly toleranceSeconds?: number;
  /**
   * Override the current time used for replay validation. Useful in tests.
   * @internal
   */
  readonly nowEpochSeconds?: number;
}

const DEFAULT_TOLERANCE_SECONDS = 300;
const SUPPORTED_SCHEME = 'v1';

/**
 * Verify the HMAC signature of an incoming webhook request.
 *
 * Returns `true` when:
 *
 * 1. The `Flute-Webhook-Signature` header parses as `v1,<base64>`.
 * 2. `HMAC-SHA256(secret, "${id}.${timestamp}.${body}")` matches the
 *    decoded signature byte-for-byte (timing-safe compare).
 * 3. The timestamp is within `toleranceSeconds` of the current clock.
 *
 * Returns `false` otherwise — never throws on adversarial input. This
 * matches the contract documented for the iOS SDK and lets ISVs treat
 * verification as a pure boolean.
 *
 * @public
 */
export function verifyWebhookSignature(
  input: VerifyWebhookSignatureInput,
  options: VerifyWebhookSignatureOptions = {},
): boolean {
  const expectedSignature = parseSignatureHeader(input.signatureHeader);
  if (expectedSignature === undefined) return false;

  const tolerance = options.toleranceSeconds ?? DEFAULT_TOLERANCE_SECONDS;
  if (!isTimestampFresh(input.timestampHeader, tolerance, options.nowEpochSeconds)) {
    return false;
  }

  const bodyBuffer =
    typeof input.rawRequestBody === 'string'
      ? Buffer.from(input.rawRequestBody, 'utf8')
      : Buffer.from(input.rawRequestBody);

  const signedContent = Buffer.concat([
    Buffer.from(`${input.idHeader}.${input.timestampHeader}.`, 'utf8'),
    bodyBuffer,
  ]);

  const computed = createHmac('sha256', input.signatureSecret).update(signedContent).digest();

  return safeCompare(computed, expectedSignature);
}

function parseSignatureHeader(header: string): Buffer | undefined {
  if (typeof header !== 'string' || header.length === 0) return undefined;
  const commaIndex = header.indexOf(',');
  if (commaIndex <= 0) return undefined;
  const scheme = header.slice(0, commaIndex);
  if (scheme !== SUPPORTED_SCHEME) return undefined;
  const encoded = header.slice(commaIndex + 1);
  if (encoded.length === 0) return undefined;
  try {
    const decoded = Buffer.from(encoded, 'base64');
    // Buffer.from with base64 silently ignores invalid characters; verify
    // the encoded text is a valid base64 round-trip so we don't accept
    // garbage like `v1,not-base64`.
    if (decoded.toString('base64').replace(/=+$/u, '') !== encoded.replace(/=+$/u, '')) {
      return undefined;
    }
    return decoded;
  } catch {
    return undefined;
  }
}

function isTimestampFresh(
  timestampHeader: string,
  toleranceSeconds: number,
  nowOverride: number | undefined,
): boolean {
  if (toleranceSeconds === Number.POSITIVE_INFINITY) return true;
  const ts = Number(timestampHeader);
  if (!Number.isFinite(ts)) return false;
  const now = nowOverride ?? Math.floor(Date.now() / 1000);
  return Math.abs(now - ts) <= toleranceSeconds;
}

function safeCompare(a: Buffer, b: Buffer): boolean {
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
