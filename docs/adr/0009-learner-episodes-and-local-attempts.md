# ADR-0009 — Short learning episodes and durable local attempts

**Status:** Accepted — project owner approved the implementation plan on 2026-09-07.
**Date:** 2026-09-08

## Context

The audit reproduced incorrect cash results and loss of chapter records. The screen
placed financial panels before the decision. The owner asked for a simpler interface
for adults who read short text and may need help with numbers.

## Decision

Keep four unlocked chapters, each with twenty authored decisions. Group each chapter
into four episodes of five decisions. Recovery turns do not consume that count.
Use a decision view with an editable action and forecast, then a result view.
Commit the action and forecast together. Optional help is free and recorded separately
from business research, which can cost simulated money or time.

Replace two record-keeping choices with cash-book exercises. Record the entered balance,
the exercise transactions and the correction. An answer never changes actual cash.
Use live facts for the factory capacity-versus-demand diagnosis. Keep all assessments
descriptive: no ranks, inferred improvement or predictions of real business performance.

Use one pure turn calculation for forecasts, results, cash reconciliation and records.
Keep the existing declining-balance depreciation approximation, and state its limit.
`assetLifeWeeks` remains the legacy divisor name; it is not a fixed asset lifetime.

Use native IndexedDB for local profiles and separate attempts, including their scenario
snapshots. Archive replays. Export records with schema, scenario and calculation versions.
Retain original legacy saves during migration. Explicit learner deletion may remove them.
A local profile is not verified identity and profiles have no access lock.

Make partial records available locally. This supersedes only the restriction on the
local record view in the proposed ADR-0008. No portal, upload service or AI judge is
approved by this record. Completion remains the gate under ADR-0005.

Keep runtime code dependency-free. Playwright is a development-only dependency for
browser checks. Shell updates wait for open tabs; downloaded scenarios survive updates.

## Consequences

This supersedes ADR-0007's closed list of controls and the former multi-screen turn
sequence. It preserves its chapter openings, unlocked access and six carried flags.
Older observations keep unknown provenance where a version was never recorded. They
are not recalculated as if they came from the corrected engine.

Software verification does not establish local accuracy or learner acceptance. Native
language, local business and physical-device review remain required. Audio is optional
future content, outside the initial download budget.
