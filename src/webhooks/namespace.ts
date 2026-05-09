import { verifyWebhookSignature } from './verifySignature.js';
import type {
  VerifyWebhookSignatureInput,
  VerifyWebhookSignatureOptions,
} from './verifySignature.js';

/**
 * `flute.webhooks.*` — stateless webhook utilities.
 *
 * @public
 */
export class WebhooksNamespace {
  /**
   * Verify the HMAC-SHA256 signature of an incoming webhook request.
   *
   * @example
   * ```ts
   * const ok = flute.webhooks.verifySignature({
   *   signatureHeader: req.headers['flute-signature'] as string,
   *   idHeader: req.headers['flute-event-id'] as string,
   *   timestampHeader: req.headers['flute-timestamp'] as string,
   *   rawRequestBody: rawBuffer, // MUST be the raw bytes, NOT the parsed JSON
   *   signatureSecret: process.env.FLUTE_WEBHOOK_SECRET!,
   * });
   * ```
   */
  public verifySignature(
    input: VerifyWebhookSignatureInput,
    options?: VerifyWebhookSignatureOptions,
  ): boolean {
    return verifyWebhookSignature(input, options);
  }
}
