# Changelog

All notable changes to `@flute-payments/sdk` are documented here. Format
follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and
this project adheres to [Semantic Versioning](https://semver.org/).

Generated entries below this point come from the
[changesets](https://github.com/changesets/changesets) workflow on
release. Manual edits should stay above the auto-generated section.

## [Unreleased]

### Added — Phase 0 (scaffolding)
- Repository bootstrap: TypeScript 5, ESM + CJS dual build via tsup,
  vitest, eslint v9 flat config, prettier, husky + lint-staged + commitlint,
  changesets, GitHub Actions CI/CD with npm provenance.
- Public API surface locked: `Flute` constructor, four namespaces
  (`transactions`, `paymentSessions`, `settings`, `webhooks`), error
  hierarchy, `TokenStorage` interface, and `MemoryTokenStorage` default.
- Documentation skeleton: README with quick start, public API surface
  list, configuration reference, and environment table.
- Contribution and security policies (CONTRIBUTING, SECURITY,
  CODE_OF_CONDUCT, CODEOWNERS).

> Phase 0 ships the scaffolding only. All resource methods throw
> `not implemented` and will be wired up in Phase 1 (transport, OAuth,
> token manager, real HTTP calls) and Phase 2 (full API coverage,
> integration tests, docs site).
