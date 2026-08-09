# Session 013 — A carry rule that paid the learner interest, and three docs that had gone stale

**Date:** 2026-08-09
**Worked by:** Claude (Opus 5), unattended
**Branch:** `chapters-3-4-and-balance`
**Duration / scope:** one session. Two content fixes, two new checks, three documents
reconciled against the code.

---

## Goal

The request was "please continue from the handoff". `memory/HANDOFF.md` (written at the
end of session 012, now deleted as it asked to be) said the four-chapter arc was
content-complete, seven checks were green, and the bottleneck was **contact with real
people** — an owner playing it, a phone, a Kiswahili reader, Tanzanian figures somebody
can vouch for. None of that can be produced from inside the repository.

So this session took the two things on `PROJECT_STATE.md`'s list that *were* an agent's
to do: fix bakery t16 ([Q-024](../OPEN_QUESTIONS.md)), and reconcile `docs/` with the
code, which had been item 7 on the next-steps list for two sessions.

Fixing t16 is what found the real defect.

## What happened

**1. Bakery t16 — a prediction with only one answer (Q-024).**

All three options declared `same`, so the turn could not discriminate and
`validate-scenario.mjs` had been printing `weak t16` on every run. The question proposed
a delayed consequence as the honest fix; that does not work, because the prediction asks
about *this week's* profit and a consequence three weeks out leaves all three options
declaring `same`.

What does work is charging money instead of only time. "Rebuild six months from memory
and the receipt pile" became "Pay someone weekly to keep the book and rebuild the old
months": a 20,000-a-week fee, so the option declares `down` on all three paths and holds
across the 400-path sweep. The reconstruction lesson moved inside the new option's
outcome — the receipts become a rough story with gaps, because a sale nobody wrote down
cannot be recovered — and the turn now teaches that a record costs you time or it costs
you money, and neither raises this week's profit.

The fee lands on the `licenceFees` line, which was labelled "Licence fees". Chapter 1
already books a bookkeeper there, so the label was already not true of it; it is now
"Licences and fees" / "Leseni na ada". The turn carries `unverified: true`, because
20,000 a week for a part-time bookkeeper in Dar es Salaam is invented.

**2. Then the new check found something.**

`PROJECT_STATE.md` says to add an assertion to `playthrough.mjs` for anything a learner
looks at. The obvious one: [D-023](../DECISIONS.md) requires the work-it-out card's
column to add up, and the money panel — the screen the learner is actually told to read,
on screen every turn — had no such check at all. So `auditLedger` now checks that the
panel's rows sum to the profit printed under them and that the profit is the one the
engine computed.

It failed four times on the first run, all at the same point, and all of them were the
check's fault: a new session is not written to storage until the learner acts, so on the
first screen of a chapter the save still describes the *previous* chapter, and the
ledger is on screen from that first render. It was comparing a bakery's panel with a
stall's state. Guarded, and the guard is written up in [D-027](../DECISIONS.md) because
any future check pairing a screen with `liveState()` needs it.

But one of the debug dumps taken while chasing that showed the factory's ledger printing
**"Interest on the loan" as money coming in** — +11,538 a week, on a 30,000,000 term
loan.

**3. The carry rules were authored as deltas, and they are not deltas.**

A chapter's `carryIn` block declares opening overrides per carried flag.
`applyCarryIn()` merges them over the authored `startState`, so a number there is
**absolute**. Three of the eight rules were written in the *effects* habit, where a
signed value subtracts ([D-022](../DECISIONS.md)):

| Rule | Authored | The chapter opened on | Meant |
|---|---|---|---|
| factory / `tookCredit` | `interestRate: -0.02` | −2%, so the loan paid the learner | 0.20 |
| factory / `builtTeam` | `ownerHoursFixed: -3` | −3 fixed owner hours | 27 |
| factory / `keepsRecords` | `cash: 800000` | 800,000 | 15,800,000 |
| bakery / `keepsRecords` | `ownerHoursFixed: -2` | −2 fixed owner hours | 18 |

The cash one is the worst, and it is not a sign error: a learner who kept proper books
through the bakery started the factory with **5% of the cash** the opening note told
them their books had earned them. The one behaviour the whole project is built to reward
was silently punished, and the screen said the opposite.

Nothing could see any of it. Every automated check opens a chapter from an **empty
carry** — `validate-scenario.mjs` walks three paths from the authored `startState`,
`simulate-runs.mjs` runs each chapter standalone. The only check that plays four
chapters in sequence with the flags accumulating is `playthrough.mjs`, and it read what
the panel said without ever asking which direction it said it in.

Fixed in content, and both doors closed: `validate-scenario.mjs` fails a carry override
that is negative or signed, and `playthrough.mjs` fails any money-going-out row that is
money coming in. Both were verified by putting the defect back and watching each fail.
[D-026](../DECISIONS.md), [D-027](../DECISIONS.md).

**4. `docs/game-design.md`, `docs/curriculum.md`, `docs/assessment.md`.**

All three were written before there was any code, and four chapters were then authored
against them. They described a different product in places. Rather than delete the
unbuilt parts, each doc now separates what the application does from what was designed
and not built, and says which is which. [D-028](../DECISIONS.md).

What was wrong, specifically:

- **`game-design.md`** had a four-step loop with no prediction in it, which is the spine
  of the actual game. It called a chapter "a phase ending at a threshold" — ADR-0007
  made a chapter a whole business. Its "systems modelled" section was a wish-list
  written before the engine existed. The bottleneck mechanic it describes as *the
  signature mechanic* — the learner naming the binding constraint in their own words —
  **does not exist**; `record.observeConstraint()` sits in `record.js` called by
  nothing. Neither does the trajectory choice, and neither do random shocks.
- **`curriculum.md`** said "which capabilities the first release covers are unassigned".
  They are now countable, so they were counted: eighty turns mapped onto the capability
  map. Tracks 1 and 3 are well covered. Four capabilities are not covered at all, and
  one of them is **2.2, getting a paid trial** — the capability the background note
  treats as the strongest execution signal there is. Raised as
  [Q-027](../OPEN_QUESTIONS.md).
- **`assessment.md`** listed eight candidate indicators. The application computes five,
  and exactly one of them (recovery) is on that list. A document that overstates what is
  measured is the precise failure this project criticises other programmes for. Each of
  the seven uncomputed indicators now says which observation it would need. Two of its
  other rules were quietly false: "do not publish the indicator logic" does not survive
  an MIT-licensed public repository, and "detect and flag replay" is not built.

## Discussion

None. The session ran unattended from the handoff.

## Decisions made

- **[D-026](../DECISIONS.md)** — a carry override replaces the opening figure; it never
  subtracts from it. Enforced by a check.
- **[D-027](../DECISIONS.md)** — the money panel is checked like the work-it-out card:
  rows sum to the printed profit, the printed profit is the engine's, and no cost row is
  money coming in.
- **[D-028](../DECISIONS.md)** — `docs/` says which parts describe built behaviour and
  which are intent, and keeps the unbuilt parts labelled rather than deleting them.

## Questions raised or resolved

- **Resolved: [Q-024](../OPEN_QUESTIONS.md)** — bakery t16 discriminates; the middle
  option costs money rather than only time.
- **Raised: [Q-027](../OPEN_QUESTIONS.md)** — nothing in eighty turns is about getting a
  paid trial, which is both the biggest curriculum gap and the reason the customer-
  validation indicator cannot be computed. Same hole, two symptoms.

## State at end of session

All eight checks green — seven as before plus the ledger audit inside
`playthrough.mjs`, which went from 1,372 assertions to 3,646.

```
test-engine        226 passed
validate-scenario  177/177 predictions, 75/75 numeric paths, 0 problems, 4 chapters
validate-i18n      1,789 content strings × 2 languages
simulate-runs      no whole-business failures; attentive finishes all four
smoke-app          29 passed
playthrough        3,646 passed
check-links        358 links resolve
```

`standalone.html` rebuilt. `memory/HANDOFF.md` deleted, as it asked to be. Nothing is
half-finished.

The four `drift` lines in the stability sweep are unchanged and still deliberately not
failing ([Q-022](../OPEN_QUESTIONS.md)). Chapters 2, 3 and 4 still carry `unverified`
figures ([Q-018](../OPEN_QUESTIONS.md)) — and t16 added one more.

## Next steps

Unchanged from the handoff, and none of them is an agent's:

1. **The owner plays chapter 1, both languages.** Four of thirteen sessions found
   defects only because somebody played it, and this session is a fifth by proxy.
2. **A phone**, with the connection off at some point.
3. **Rule on [Q-022](../OPEN_QUESTIONS.md), [Q-023](../OPEN_QUESTIONS.md),
   [Q-026](../OPEN_QUESTIONS.md)** — all three need the owner, not more engineering.
4. **A Kiswahili reader**, and **Tanzanian figures somebody can vouch for**.

If a session must be spent on content, [Q-027](../OPEN_QUESTIONS.md) — the paid trial —
is the gap that sits closest to the thesis.

## Notes for the next contributor

- **A carry override is absolute. An effect is signed.** Two conventions, two files,
  and the habit of the second was what broke the first. The validator catches the sign
  error now; it cannot catch `cash: 800000` where 15,800,000 was meant, so **read a
  carry rule's note against its number**.
- **Checks that open a chapter from an empty carry cannot see a carry defect**, and all
  but one of ours do exactly that. `playthrough.mjs` is the only check that plays the
  chapters in sequence with the flags accumulating, which is why it is the only one that
  could have found this.
- **A screen can be internally consistent and still lying.** The factory's panel summed
  its negative interest row into the profit perfectly correctly for two sessions. What
  gave it away was direction, not arithmetic. When you add a check that a column adds
  up, ask separately whether each row points the way it should.
- **Pairing a screen with `liveState()` needs the chapter guard** in
  `playthrough.mjs` (`liveStateOf`). The save lags a chapter behind on the first render.
- `docs/game-design.md` now has a **"Designed and not built"** section. Read it before
  building something it describes — the free-text bottleneck question and the trajectory
  choice both look like small additions and are neither small nor uncontested.
