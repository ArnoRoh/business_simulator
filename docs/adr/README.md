# Architecture Decision Records

An ADR records a decision that is expensive to reverse: what was decided, why, what it
trades away, and what would make us reconsider.

## What gets an ADR

- Technology, platform and hosting choices
- Data model and learner-record schema
- Pedagogy, scoring or selection-signal changes
- Licensing and distribution
- Anything affecting what we claim the evidence trail means

Smaller decisions go straight into
[`../../memory/DECISIONS.md`](../../memory/DECISIONS.md) with no ADR. When in doubt, ask
whether someone would need the reasoning in a year. If yes, write the ADR.

## How

1. Copy [`template.md`](./template.md).
2. Take the next number. Never reuse one.
3. Open it as `Proposed`; mark `Accepted` when agreed.
4. Add a one-line pointer in `../../memory/DECISIONS.md`.

## Immutability

**A merged ADR is never edited** beyond fixing its status line. Superseding a decision
means writing a new ADR that says so, and marking the old one
`Superseded by ADR-NNNN`. The old reasoning stays readable — knowing why we once
believed something is how we avoid drifting back into it by accident.

## Records

| # | Title | Status |
|---|---|---|
| [0001](./0001-record-architecture-decisions.md) | Record architecture decisions | Accepted |
| [0002](./0002-mobile-first-offline-pwa.md) | Deliver as a mobile-first, offline-capable PWA | Accepted |
| [0003](./0003-dual-licensing.md) | MIT for code, CC BY-SA 4.0 for content | Accepted |
| [0004](./0004-simulator-as-selection-instrument.md) | Simulator as selection instrument, not business-plan trainer | Accepted |
