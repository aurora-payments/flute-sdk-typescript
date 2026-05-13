---
'@flute-payments/sdk': patch
---

CI publish + provenance bootstrap validation. No runtime changes.

The first release (`0.1.0`) was published manually from a workstation
because the very first `npm publish` against a brand-new npm scope with
provenance enabled is rejected by the registry with an opaque
`E404 Not Found` (a long-standing quirk where the registry has no
package container yet to attach the OIDC attestation to). This patch
release exists to validate that, now that the scope `@flute-payments`
is bootstrapped on the registry, the GitHub Actions release workflow
can publish with full sigstore provenance via the `id-token: write`
OIDC flow as designed.

If you're verifying the SDK end-to-end, install `0.1.1` (or later) to
get the version with provenance signature visible on the npm web UI
and at the transparency log
(<https://search.sigstore.dev/?logIndex=...>).
