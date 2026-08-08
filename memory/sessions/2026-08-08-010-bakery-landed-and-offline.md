# Session 010 — the bakery lands, a chapter becomes finishable, and the app goes offline

**Date:** 2026-08-08
**Worked by:** Claude (Opus 5)
**Branch:** `chapters-3-4-and-balance`
**Duration / scope:** Large. Chapter 2 committed, two engine-adjacent decisions taken, a
service worker written.

> **This entry was written retrospectively in session 011, from commits `073b34f` and
> `f20f9d2` and from `DECISIONS.md`.** Session 010 recorded its decisions but never wrote
> its session file, so the reasoning below is reconstructed from what it left behind and
> is thinner than a contemporaneous entry would be. Where it says why something was done,
> that came from the commit messages and D-018 to D-020, not from memory of the session.

---

## Goal

Land the work session 009 had left uncommitted, and answer the question session 009 could
not: is a chapter something a learner can actually finish?

## What happened

**The file finally had one owner.** Session 009 ended with five agents running in this
repository and one of them editing `scenario-bakery.json` live, so nothing was committed.
Session 010 worked on a branch with a single owner and landed the lot:

- the bakery, chapter 2, twenty turns in both languages
- CI running the five application checks — the workflow had claimed since session 003
  that there was no application code
- `validate-scenario.mjs` walking the manifest instead of only ever seeing chapter 1
- resuming after a recovery turn no longer skipping an authored turn
- the insolvency capacity floor applying to chapters with a product mix
- turn 6 of the bakery as a decision rather than a scripted bankruptcy
- per-chapter prediction band edges in the engine

**Then three things that were new.** The bakery adopted its own band edges, chosen from
its own option deltas ([D-018](../DECISIONS.md)). Only one pair worked — `same: 2000`,
`lot: 21200` — because an edge has to land in a gap between clusters of outcomes, and the
bakery's cluster tightly. Chapter 1 could not be fixed the same way, which is now
[Q-021](../OPEN_QUESTIONS.md).

`simulate-runs.mjs` gained a fifth simulated player, `attentive`, and a chapter it cannot
finish solvent is a **FAIL** rather than a warning ([D-019](../DECISIONS.md)). This is the
direct answer to session 009's "everything ends badly": the four existing strategies were
too crude to distinguish a balance problem from a strategy that was barely engaging. A
profit maximiser was tried first and rejected — it ran chapter 1 to 1.4m by turn 16 and
then collapsed with reputation at zero, which is the lesson rather than a failure, and
requiring myopic greed to succeed would forbid the project from teaching what it exists to
teach. Chapter 1 and the bakery both failed the new probe and both now pass.

The end of a chapter now recaps every concept it taught, with the learner's decision
against each and **no marks** ([D-020](../DECISIONS.md)). The `conceptLabel` on every turn
already existed and was shown for about a minute and then never again.

**Offline, at last.** `f20f9d2` added `app/sw.js`. The manifest had been there since
session 008 and the caching had not, so "offline-capable PWA" ([ADR-0002](../../docs/adr/0002-mobile-first-offline-pwa.md),
required since session 002) was a claim rather than a behaviour. Two rules, chosen for a
metered connection: the shell is cache-first, because it changes only on deploy; content
JSON is network-first with a cache fallback, because scenario files get corrected and a
learner holding a stale chapter is worse than one waiting a moment. Scenario files are not
pre-cached — fetching all four up front spends a learner's data on three they may never
open. `build-info.json` is exempt, because a cached copy would report a deploy that had not
happened, which is the exact failure it was added to catch.

## Decisions made

- **[D-018](../DECISIONS.md)** — prediction band edges are per chapter, and each chapter
  must choose its own.
- **[D-019](../DECISIONS.md)** — a chapter must be finishable by a learner who reads the
  warnings; `attentive` failing is a FAIL.
- **[D-020](../DECISIONS.md)** — the end of a chapter recaps the concepts, not the
  performance.

## Questions raised or resolved

- **Raised: [Q-021](../OPEN_QUESTIONS.md)** — "up a lot" is unreachable in chapter 1, and
  only content can fix it. Left alone: chapter 1 is content the owner has played and
  accepted, so rebalancing it is their call.

## State at end of session

Chapters 1 and 2 playable, committed, and passing all six checks. Chapters 3 and 4 listed
in the manifest with no files — a supported state, which the app reports as "not ready
yet". The app works offline.

## Next steps

1. Author chapters 3 and 4.
2. The owner plays chapter 1 again, in both languages.
3. Nobody has still looked at any of it on a phone.

## Notes for the next contributor

- The bakery's band edges were not a free choice. Only one pair in the space worked, and
  the reasoning is in D-018 — do not "tidy" them to rounder numbers without re-running
  `validate-scenario.mjs` and reading the whole table.
- `attentive` is a floor, not a target. If tuning its constants becomes the routine way to
  make a chapter pass, the probe is being fitted to the content — D-019 says so.
