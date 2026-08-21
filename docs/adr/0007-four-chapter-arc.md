# ADR-0007 — A four-chapter arc with bounded starts and carried flags

**Status:** Accepted
**Date:** 2026-08-08
**Deciders:** Project owner, session 008
**Related:** [D-016](../../memory/DECISIONS.md), [D-017](../../memory/DECISIONS.md),
[ADR-0004](./0004-simulator-as-selection-instrument.md),
[ADR-0005](./0005-simulator-as-stage-zero-gate.md),
[Q-004](../../memory/OPEN_QUESTIONS.md), [Q-006](../../memory/OPEN_QUESTIONS.md),
[`docs/arc.md`](../arc.md)

## Context

One scenario exists: a mandazi stall, 20 turns. It teaches a learner to see their own
numbers, which is the right first job and — for a livelihood firm — close to the whole
job.

It is not the job this project exists to do. `AGENTS.md` §2 commits us to the
livelihood/transformational distinction, to teaching bottleneck thinking, to modelling
the real cost of formality, and to modelling the failure of *a founder who cannot build
beyond themselves*. A stall cannot teach any of those, because a stall never demands
them. Financing an asset, managing working capital, delegating with authority, meeting a
standard someone else sets — these only become real when the business is large enough to
be destroyed by getting them wrong.

Three further constraints bear on this:

- **A second scenario is already the precondition** for transfer testing, pre/post and
  delayed retest — all named as unimplemented in `memory/PROJECT_STATE.md`. Whatever we
  build has to serve that as well as teaching.
- **[Q-004](../../memory/OPEN_QUESTIONS.md) (playthrough length) is still open and
  blocking.** Anything that only works as one long unbroken engagement makes it worse.
- **`validate-scenario.mjs` walks paths from a known opening state.** It has already
  missed two whole-business failures. A design that removes its fixed starting point
  removes the only automated check on scenario viability we have.

The owner asked for a deeper dive into advanced business management, across a
progression — bakery, then factory, then export — while keeping the interaction itself
simpler than it is today.

## Decision

We will build **four chapters following one character, each a self-contained 20-turn
playthrough with an authored `startState`**, connected by narrative and a **closed set of
six carried flags** rather than by carrying simulation state.

Specifically:

1. **Chapters are independent and unlocked.** Any chapter is playable alone, in any
   order, without having played the others. Every chapter must read correctly with an
   empty carry.
2. **Carry is six flags, and the list is closed** — `keepsRecords`, `formality`,
   `tookCredit`, `builtTeam`, `heldStandard`, `concentrated`. Adding a seventh requires
   an entry in `DECISIONS.md`.
3. **Flags tint, they do not gate.** A carried flag may change opening narrative and at
   most two turns per chapter, and may never make a chapter unplayable.
4. **Advanced concepts are added to the engine, not to the interface.** New mechanics —
   product mix, depreciation, debt, working capital, FX, landed cost — surface as lines
   in the ledger the learner already reads. No new control types. The `workout` phase
   becomes opt-in per turn.
5. **No aggregate across chapters.** No composite score, no completion percentage, no
   rank. The behavioural record stays three-layer and per-chapter, per ADR-0004.
6. **Progression is not a claim.** Reaching chapter 4 says nothing about anyone's real
   firm, and the product will not imply otherwise.

## Consequences

**What this gets us.** The capabilities `AGENTS.md` §2 actually names become teachable,
because a business exists that can be broken by neglecting them. Four scenarios give
transfer testing four instruments instead of zero. Each chapter stays a single sitting,
which keeps Q-004 open rather than pre-emptively answering it with a four-hour
engagement. And `validate-scenario.mjs` keeps working unchanged, because every chapter
still starts from a fixed authored state.

**What this costs us.** Roughly 60 new turns of bilingual content — about three times the
content that exists today, all of it needing local review, and much of it touching
regulatory specifics that `AGENTS.md` §6 forbids us to invent. The Kiswahili will be a
first draft by the same route that produced [Q-015](../../memory/OPEN_QUESTIONS.md), and
carries the same banner and the same caveat. The engine roughly doubles in surface area,
including a change to the single most load-bearing line in it (`cash += profit` becomes
`cash += cashFlow`).

**What it forecloses.** A genuinely continuous campaign, where the business a learner
ends chapter 1 with is the one they open chapter 2 with. That is the more satisfying
design and we are not building it. It would make each chapter's opening state
unbounded, which removes the automated viability check, makes content unauthorable
against a known position, and makes a bad chapter 1 into an unrecoverable chapter 2.

## Alternatives considered

**Full state carry-forward — a single continuous campaign.** Attractive because
consequence spanning chapters is the strongest version of the lesson this project
teaches: a bakery built on bad supplier habits *should* struggle at factory scale, and a
learner feeling that is worth a great deal. It lost on testability. Content cannot be
authored against an opening state that varies without bound, `validate-scenario.mjs`
loses its fixed walk, and prediction windows — which session 007 proved are a
data-integrity concern, not a cosmetic one ([D-015](../../memory/DECISIONS.md)) — cannot
be sized against a state nobody can enumerate. The hybrid keeps most of the felt
continuity at a small fraction of the risk.

**Four fully independent scenarios with no carry at all.** Cheapest, and it survives
every check. It lost because it throws away the one thing a multi-chapter arc uniquely
offers. The whole argument for chapters rather than four unrelated scenarios is that the
learner sees their own earlier decisions arrive later, which is the same mechanic as
`scheduleLater` operating on a longer horizon. Six flags buy that back for very little.

**One deeper scenario instead of three new ones.** Extend chapter 1 to 60 turns covering
the same concepts in one business. Attractive because it is one content artefact, one
starting state, one set of checks. It lost on plausibility: a mandazi stall does not
issue trade credit, appraise capex or export, and forcing those onto it would teach the
concepts in a setting where the learner can see they do not belong. It would also make
Q-004 much worse by producing a single unbreakable multi-hour run.

**Advanced concepts as new interface controls** — a working-capital slider, a financing
widget, an org chart builder. Attractive because each concept gets a purpose-built
surface. It lost against the owner's explicit instruction to keep the interaction
simpler, against the mobile-first constraint in `AGENTS.md` §3, and against the evidence
of session 006: every new control type is a new way for a control to be unable to reach
its own answer. Consequences in a ledger the learner already knows how to read are both
cheaper and truer to how the concept presents in a real business.

## Revisit if

- Playtesting shows learners routinely finish chapter 2 and do not start chapter 3 — the
  carry is then too weak to be motivating and full state carry-forward earns another look.
- Any chapter cannot be authored within its six carried flags without a seventh, twice.
  That is the signal that the closed set is the wrong abstraction rather than a tight one.
- A partner (Q-002) turns out to need a single aggregate progression signal across
  chapters. That conflicts with point 5 and with ADR-0004, and should be escalated rather
  than quietly accommodated.
