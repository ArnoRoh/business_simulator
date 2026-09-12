# ADR-0012 — Play through actions and visible business consequences

**Status:** Proposed; implementation authorised by the owner and prepared for review.
**Date:** 2026-09-12
**Related:** [ADR-0009](./0009-learner-episodes-and-local-attempts.md)

## Context

The owner found the standalone game too wordy and difficult. Asking for a price and a
profit estimate in the same turn would make learners leave. They asked for more work
on animation and usability, authorised changes to the whole game, and identified weak
chapter transitions. Successful earlier software checks did not establish ease of play.

## Decision implemented for review

Use a short situation, one action, an animated result and one short takeaway. A choice
runs the simulated period immediately. Numeric decisions offer a few labelled amounts;
free entry remains available. Cash-book exercises still require an entered balance.
Allocation and diagnosis remain practical tasks. Retain four chapters and twenty choices
per chapter, in four named missions of five choices.

Remove forecasting from normal play. New decision observations carry
`interactionVersion: 2`, `forecast: "not-requested"`, and `inputMethod` to distinguish
preset amounts, typed amounts, ordinary choices and allocations. An older confirmed
draft can carry `inputMethod: "legacy-draft"`. No forecast observation is invented and
no omitted forecast becomes an incorrect answer. Existing records and their forecasts
remain intact. Forecast tallies describe only the older observations that exist; they
cannot be compared with all decisions in the new interaction.

Use the existing dependency-free SVG renderer for four distinct business scenes. Show
cash, units sold and owner time next to the task. Animate actual cash movement and the
transition between businesses. Decorative customers, coins, stock and ships are not
one-to-one counts. Controls remain usable during animation; reduced-motion preferences
show the final state without the movement.

Put fuller context, arithmetic help, choice details, research and accounts behind clear
controls. Record opened arithmetic help as assistance. Author concise English and
Kiswahili situations and takeaways; do not truncate text at runtime. Scenario versions
advance while existing attempts keep their saved snapshots.

End a chapter with a story bridge and an optional route to the next business. A new
business uses its authored opening budget; the art does not imply that the previous
business bought it. The existing carried flags can alter context, but do not gate entry.
Keep the full record available as a separate action. Bank completion once, so reopening
an earlier completed attempt does not change a later chapter's carried context.

## Consequences

This replaces ADR-0009's mandatory action-and-forecast sequence in the review build.
It also changes how numeric input is elicited: a preset selection is recognition among
offered values, not independent calculation. The record states that difference.
Completion remains the gate. There is no entrepreneur score, ranking, timer or reward
for a supposed personal trait. A bookkeeping flag still describes the simulation and
can follow an exercise with an incorrect first answer.

The design aims to reduce reading and make consequences easier to see. These are design
intentions until tested with intended learners. Native-language, local commercial and
physical-device review remain required. No claim of fun, learning gain or real business
performance follows from a browser test. Portal policy and deployment are separate work.

## Alternatives considered

- Restyle the existing mandatory estimate: rejected after the owner's explicit concern.
- Offer forecasting as an optional extra: considered, then removed from ordinary play
  after the owner repeated the need for a simpler interaction.
- Use points, ranks or time pressure: these do not support the project's evidence rules.
- Replace the engine or add an animation library: the current engine and SVGs suffice.

## Revisit if

Learners still cannot start unaided, do not connect choices with results, or find the
figures too difficult. Use observation to decide whether to change mission length,
amount choices or the number of displayed figures. Do not restore a compulsory estimate
without first showing that it serves learners and produces useful evidence.
