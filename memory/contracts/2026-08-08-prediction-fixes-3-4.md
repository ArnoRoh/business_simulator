# Contract — fixing the prediction bands in chapters 3 and 4

**Date:** 2026-08-08 (session 011) · **Owner of this contract:** the integrating agent
**Why a contract exists:** two agents are editing content at the same time, and
`AGENTS.md` §6 requires the slices and the seam to be written down before that happens.
The last time content was edited by more than one agent without one, two of them
converged on different fixes for the same defect in the same file
([session 009](../sessions/2026-08-08-009-audit-fixes-and-a-file-with-two-owners.md)).

## The problem being fixed

`node scripts/validate-scenario.mjs` exits 1. Chapters 1 and 2 are clean; chapters 3 and
4 are not:

| Chapter | File | Option predictions verified | Problems |
|---|---|---|---|
| factory | `app/content/scenario-factory.json` | 41/45 | 4 |
| export | `app/content/scenario-export.json` | 30/45 | 15 |

A problem is either `!!` — the declared `predictAnswer` is not what the engine computes,
so the learner is marked wrong for being right — or `~`, the option lands in different
bands depending on which path the learner took to reach the turn, which is the same
unfairness with a longer fuse.

## The slices

| Agent | Owns, exclusively | Must not touch |
|---|---|---|
| A | `app/content/scenario-factory.json` | anything else |
| B | `app/content/scenario-export.json` | anything else |
| Integrator | everything else, including all of `memory/`, and the commit | the two files above |

Both chapters keep their own band edges (`bands` in the scenario file), so **the two
slices share no state at all**: `setBands` is called per chapter by the validator and by
the app. That is what makes this split safe, and it is the only reason it was made.

## Rules both agents work under

1. **Do not touch** `app/js/`, `scripts/`, `app/content/ui.json`,
   `app/content/chapters.json`, the other chapter's scenario file, or `memory/`.
2. **Do not weaken a check.** Loosening `validate-scenario.mjs` to make a chapter pass is
   the one outcome worse than the chapter failing.
3. **Every string carries both languages.** `en` and `sw`, always
   ([D-009](../DECISIONS.md)).
4. Prefer fixing the declaration where the engine is stable and the author simply
   declared the wrong band. Prefer changing effects where the option straddles an edge.
   Move the chapter's `bands` edges only into a **gap** between clusters of outcomes
   ([D-018](../DECISIONS.md)).
5. The option's text must stay true of what it now does. A fix that makes the outcome
   text a lie has moved the defect rather than repaired it.
6. Do not commit. Do not write to `memory/`. Report back instead.

## Verification, in this order

```bash
node scripts/validate-scenario.mjs app/content/scenario-<chapter>.json   # must exit 0
node scripts/test-engine.mjs
node scripts/validate-i18n.mjs
node scripts/simulate-runs.mjs        # must exit 0; the `attentive` player must still finish
node scripts/smoke-app.mjs
```

`simulate-runs.mjs` prints numbers a person is meant to read. Read them
([D-019](../DECISIONS.md)): the bar a chapter must clear is that a learner who heeds the
warnings on screen can finish it well, not that the script exited 0.
