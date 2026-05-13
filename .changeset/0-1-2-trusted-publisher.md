---
'@flute-payments/sdk': patch
---

Internal release plumbing: migrate npm publishing to OIDC Trusted
Publisher (no runtime changes).

Before this release the GitHub Actions release workflow authenticated
to npm with a long-lived `NPM_TOKEN` granular access token. Two
practical limits surfaced when publishing under that model:

1. The token had to be rotated periodically (90-day expiration), which
   introduced a recurring operational task and a window where releases
   could silently start failing if rotation was missed.
2. With provenance enabled, `npm publish --provenance` from CI was
   rejected by the registry with an opaque `E404 Not Found` even
   though the OIDC attestation was correctly signed and uploaded to
   the public Sigstore transparency log. The same publish without
   provenance from a workstation succeeded, which isolated the failure
   to the token + provenance + registry interaction.

Switching to npm Trusted Publishers solves both: GitHub Actions
authenticates to npm via short-lived OIDC tokens scoped to a specific
`{org, repo, workflow}` triple; no `NPM_TOKEN` secret lives in the
repository; provenance attestations are accepted natively because the
OIDC identity is the same one signing the attestation.

The publisher is registered at
<https://www.npmjs.com/package/@flute-payments/sdk/access>:

- Provider: GitHub Actions
- Organization: `aurora-payments`
- Repository: `flute-sdk-typescript`
- Workflow filename: `release.yml`

This is the first release expected to land on npm with full OIDC
provenance signature visible on the package web UI.
