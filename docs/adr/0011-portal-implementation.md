# ADR-0011 — Implement the application and reporting portal

**Status:** Accepted for local implementation — owner instruction, 2026-09-12.
**Date:** 2026-09-12
**Related:** [D-054](../../memory/DECISIONS.md),
[portal design](../MV-BS-PLAN-002-programme-follow-up.md),
[ADR-0010](./0010-progress-reports-and-assessment-integrity.md)

## Context

The owner instructed implementation after reviewing the simple application journey,
two-month reports, six-month reflection and integrity penalties. The browser game is
local-first. Application data and money decisions need a separate server boundary.
Earlier ADR-0008 remains a historical proposal; its per-install record replacement,
anonymity and causal-comparison claims are not part of this implementation.

## Decision

Use the existing vanilla JavaScript frontend with a separate portal and a Node HTTP
service. Use native SQLite (Node 22.13 or newer) for transactional claims, applications,
immutable submissions, grading runs and review decisions. No runtime dependency is added.
Keep service data outside the static app directory, in a private ignored directory.
Bind to loopback by default. Deployment and real participant collection remain separate.

Require all four chapters by default, without a performance threshold. Validate submitted
records against server-owned chapter definitions and supported versions. A valid record
is a client assertion, not proof of identity or unaided play. Never trust uploaded scores
or answer keys. Each claim keeps its submitted attempts; an install is not a person.

Use cryptographic claim codes, single-use redemption and a separate return credential.
Retries must be idempotent. Admin recovery rotates the credential after an independently
verified recovery request; do not pretend that an unverified contact field proves identity.
Preserve shared-phone sign-out, data export and deletion. Explicit consent precedes
record and financial-data submission. Define recipient/retention in service configuration.

Save drafts locally and queue only explicitly submitted work. Never cache authenticated
API responses in a service worker. Fixed application snapshots precede two practical
follow-ups. Keep initial grading blind to game records and identity. Store immutable
submissions, report corrections and original forecasts for months 2, 4 and 6.

Deterministic financial checks run locally and on the server. A configurable server-side
AI service grades reasoning with a fixed, evidence-citing rubric. A durable leased job
survives restart. Provider failure remains pending/unavailable, not a fabricated grade.
Keep each grading run and validate its output. The grader cannot execute tools or award
money. AI integrity findings are proposals; a reviewer confirms penalties with evidence.
Confirmed outsourcing removes affected credit; reversal restores it. Progression decisions
remain explicit reviewer actions with reasons. No automatic payment or grant transfer.

Use short bilingual steps, familiar money questions, worked help, clear saved/sent
states and conditional detail. Reports use matching two-month periods. Grade substance,
not schooling, spelling, length, speed or permitted assistance. Sample settings and
unreviewed Kiswahili remain labelled. Real-world usability and judge validity are unproven.

## Consequences

One portable service and database can support the pilot and be backed up independently.
Credentials, recovery, backups, retention and pending reviews now require an operator.
Node's native SQLite must be checked when the supported runtime changes. Low-volume
synchronous database access is sufficient initially; revisit if measured load exceeds it.

## Alternatives considered

Copying the MV hiring stack adds unrelated candidate workflows and dependencies.
A browser-only code cannot enforce redemption or securely hold a grader key.
Silent telemetry would violate the game's explicit-sharing boundary.

## Revisit if

Claim recovery fails in field use, SQLite blocks measured traffic, provider failures
prevent timely review, or learner testing shows the reporting burden is too high.
