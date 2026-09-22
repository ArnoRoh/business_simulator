# ADR-0013 — Short introduction with access to all chapters

**Status:** Proposed
**Date:** 2026-09-22
**Deciders:** Project owner (improvement and deployment authority); Codex (implementation)
**Related:** [ADR-0012](./0012-play-first-business-journey.md), [D-057](../../memory/DECISIONS.md)

## Context

The inherited five-day prototype replaced the four chapters. It removed working
Kiswahili, access to saved attempts and useful financial consequences. Timed tapping
rewarded phone speed. A grant button claimed an entry route that was not connected
to the programme service. These behaviours conflict with the project requirements.

The owner asked for a review, authorised improvements and requested deployment.
The short format can reduce the effort needed to start. It does not establish a
valid selection signal or replace the existing programme completion contract.

## Decision

Serve thirteen untimed steps across five sample days at the main game address.
Keep all four chapters at `practice.html`, with their existing IndexedDB records,
profiles, recovery, exports and programme interface. Offer this route throughout
the introduction. Keep the full offline file and add a smaller introduction file.

Use a separate introduction record and calculation model. Store the content snapshot,
choices, cash transactions, before/after balances and optional next-step note locally.
A completed decision and its result are one saved state. Reload must not repeat it.
The two self-chosen directions describe preferences, not measured founder types.
The optional note is an unverified plan, not an execution result or grant condition.

Keep amounts neutral in authored text and use the configured currency at rendering.
Both English and Kiswahili are present. Mark prices and translation as samples that
need local review. Show cash, stock, receivables and debt without a composite score.
Model credit as a liability, borrowing as cash with debt, and withdrawals separately.
A customer who did not get a credit sale cannot cause a late-payment event.

The introduction does not create a portal completion claim. It does not offer a
live grant application or send learner records. The existing four-chapter portal
contract remains unchanged. Static hosting cannot operate the portal backend.

## Consequences

The learner can start with a small exercise and then use the deeper simulation.
Existing records remain accessible. Every result explains its specific trade-off.
The short model omits tax, equipment and long-term operations; those remain in the
chapters. Its five days contain selected events, not full daily accounts.

The introduction retains one active attempt per browser. Download is available at
any step. Replacing it requires confirmation and explains the need to download first.
This limit must be reviewed before using the introduction for programme assessment.
Full-game learner profiles and separate attempts retain their existing behaviour.
Older prototype saves remain untouched and can be downloaded. Their effects cannot
be reliably converted because the prototype did not record decisions.

## Alternatives considered

Keep only the five-day prototype: short, but it discards working features and cannot
support the claims it makes. Keep only the four chapters: retains depth but loses
the opportunity to offer a smaller first session. Implement a new grant gate: needs
an approved programme policy, service deployment and validated evidence contract.

## Revisit if

Learner trials show that the introduction causes confusion or adds friction. Revisit
its record contract before accepting it for any selection or funding decision.
