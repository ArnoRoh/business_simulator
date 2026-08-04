# Session 005 — Depth, clearer numbers, and Kiswahili

**Date:** 2026-08-04
**Worked by:** Project owner (Arno Rohwedder) + Claude (claude-opus-5, Claude Code)
**Branch:** `claude/simulator-v2-depth-and-swahili`
**Duration / scope:** Large. Second major build; first version with two languages.

---

## Goal

The owner played the session 003 proof of concept and gave four pieces of feedback:

> "I played through it, and I think there needs to be clearer numbers showing up. Please
> rework, also a bit more on the animations and buttons, clearer that the time etc.
> impacts things long term. The run through is very quick as well, ideally it teaches
> things more […] should also have a toggle for kiswahili, please do the translations"

So: legibility of the numbers, interaction polish, long-term consequence, depth, and
Kiswahili.

## Discussion

Three scope questions were put to the owner before building, because each changed the work
materially.

**Length.** Offered ~30 turns in chapters, ~20 turns with much more depth each, or a
multi-session 45+ turn engagement. The owner chose **~20 turns, deeper each**. That is a
choice for teaching per decision over breadth of content, and it is the cheaper of the
serious options to translate.

**The gate.** Since the results screen was being rebuilt anyway, [Q-012](../OPEN_QUESTIONS.md)
was put directly, with the fairness cost stated next to the option. The owner chose the
**completion gate** — reversing what they had described in session 003, where they spoke of
passing on people who "get all of the questions right". This closes Q-012 and the remainder
of Q-009, and moves [ADR-0005](../../docs/adr/0005-simulator-as-stage-zero-gate.md) to
`Accepted`. Recorded as [D-008](../DECISIONS.md).

**Kiswahili honesty.** `docs/localization.md` says register needs "a native speaker with
business exposure — not a translator working from a word list, and definitely not machine
translation". Neither of us is that speaker. Offered: ship labelled as a draft, ship
unlabelled pending the owner's own review, or translate the interface chrome only. The
owner chose **ship as a labelled draft**. A banner now appears in Kiswahili mode saying so,
working the same way as the existing placeholder-figures banner.

## What happened

### Numbers

The weekly P&L was a collapsible list of rows. It is now an always-open ledger grouped into
*money coming in* / *money going out* / what is left, with a proportional bar per line so
magnitude is visible and not merely readable — `docs/localization.md` asks for exactly that
and the old panel did not do it. The per-unit economics line used to appear only for the
first four turns; it is the most reusable idea in the scenario and now stays on screen.

**The reveal is the biggest change.** It used to show a single profit delta, which tells a
learner they were wrong without telling them *where*. It now shows the full ledger before
and after, side by side, with the changed rows highlighted and the profit row counting up to
its new value. After a wrong prediction a short "look again" note names the line that moved
and by how much.

Stat tiles carry the currency now — a bare `150k` next to a unit count was ambiguous.

### Long-term consequence

This was the deepest change and it is mostly engine work.

- **A pending-consequence queue.** An option can author
  `later: [{ inWeeks, effects, cause }]`. When it fires, a card names the decision that
  caused it: *"Week 16: the customers who need a receipt you cannot give."* Attribution is
  the entire teaching value — an effect the learner cannot trace back to a choice reads as
  bad luck, and bad luck teaches nothing. Six existing options and two new ones now schedule
  one.
- **Owner time now bites.** `ownerLoad()` was computed and only ever drew a warning tile.
  Running past your hours now degrades hygiene and reputation, which reaches demand on the
  existing lag. Hours scale with output and fall with staff, so growing without delegating
  walks you into an overload you cannot work your way out of — which is the founder-cannot-
  build-beyond-themselves failure `AGENTS.md` §2 names.
- **Turns can span several weeks** (`advanceWeeks`), used where the narrative already said
  time passed — registration, the setback, finding a second buyer. A caption says how many
  weeks went by, so drift does not look like it happened for no reason.
- **A trajectory panel** projects twelve weeks ahead. Honest — it runs the same drift the
  engine already applies — and it makes slow decline legible before it is terminal.

### Depth

A **work-it-out** step now sits between choosing and predicting: the arithmetic of the
learner's current position, revealed a line at a time. `docs/localization.md` requires that
we never make the learner do mental arithmetic to see a consequence, and asking them to
predict a change to a number they were never shown was doing precisely that.

**Prediction bands now show the money they mean** — "Up a little — TZS 1,500 to TZS 12,000
more". `BAND_SAME` and `BAND_LOT` previously existed only inside `validate-scenario.mjs`,
so the learner was graded against a boundary that lived in the test tooling and could not be
displayed even in principle. `bandFor()` moved into the engine and both the app and the
validator now import it. This is the cheap half of [Q-014](../OPEN_QUESTIONS.md); whether
the bands are *intuitive* is still untested.

Content went 16 → 20 turns. The four new ones are the concepts the thesis leans on hardest
and the original set underweighted: **what you buy** (a cheap input that fails three weeks
later), **your own hours** (working *on* rather than *in* the business), **staying official**
(compliance is a running cost, not a one-off), and **holding your price** (a discount traded
for something is negotiating; a discount given for nothing is a price cut).

### Kiswahili

New `app/js/i18n.js` with `t()`, `tCount()` on `Intl.PluralRules`, and whole-sentence
templates. 105 interface strings moved out of `ui.js`, `main.js` and `index.html` into
`app/content/ui.json`; ~4,000 words of scenario content localised in place. Both files are
key-major — English and Kiswahili adjacent per string — so a reviewer reads them side by
side ([D-009](../DECISIONS.md)).

`format.js` now formats against the active language, and `proportion()` builds "3 of 20"
from a template instead of concatenating, which `docs/localization.md` rule 2 forbids and
which it had been quietly doing.

Money stays as the ISO code `TZS` in both languages. `TSh` and the local `1,500/=` are both
plausible and neither was invented — logged as [Q-016](../OPEN_QUESTIONS.md).

## The bug worth remembering

**Demand ran away to zero and the business could never come back.**

`advanceWeek` added `(reputation − 50) × 0.6` to demand every week. That compounds: a
middling reputation subtracts customers indefinitely. At 16 turns with less drift it was
survivable and nobody looked. At 20 turns, with the new overload penalty and the new delayed
consequences, the neglectful path had demand at **zero by turn 10** — and every remaining
turn then played out in a dead business, where all three options produce a nil result and
the learner is choosing between identical outcomes.

Two things about how it was found. It was **not** found by the validator, which passed
throughout: `validate-scenario.mjs` checks that a declared prediction band is stable across
paths, not that the business is still alive. It was found by printing the state at four
checkpoints along each robot path — which is worth doing after any change to the drift
rules, and is now the reason to keep doing it.

Fixed properly rather than by tuning content: demand moves a fraction of the way towards a
level implied by reputation, so it has a floor and a ceiling and keeps the lag that makes
the mechanic teach. Authored demand changes move that baseline, floored at 25% of opening
demand — a stall by a bus stand always has some passing trade. Hygiene got the same
treatment: it slips only to 40, and going below takes active neglect. ([D-010](../DECISIONS.md).)

A related one, caught while adding the overload penalty: `ownerHoursUsed` accumulated for
the whole playthrough and was never reset. Once overload had a cost, checking your facts —
the behaviour `informationSeeking()` exists to *reward* — would have slowly destroyed the
learner. Hours are now a weekly load, recomputed each week.

## Decisions made

- **[D-008](../DECISIONS.md)** — Completion, not performance, is the gate. ADR-0005 `Accepted`.
- **[D-009](../DECISIONS.md)** — Bilingual content inline and key-major, parity enforced by a check.
- **[D-010](../DECISIONS.md)** — Mean-reverting demand; hygiene floor.

## Questions raised or resolved

**Resolved — [Q-012](../OPEN_QUESTIONS.md)** (completion gate) and the remainder of
**[Q-009](../OPEN_QUESTIONS.md)** (stage-zero placement accepted in full).

**Partly answered — [Q-013](../OPEN_QUESTIONS.md).** 16 turns was too short; that is settled
by the owner having played it. Whether 20 deeper turns is right is untested.

**Raised — [Q-015](../OPEN_QUESTIONS.md)** (is the Kiswahili register right — the important
one, with the specific word choices that need checking listed) and
**[Q-016](../OPEN_QUESTIONS.md)** (how money should be written in Kiswahili).

## State at end of session

Playable in English and Kiswahili, 20 turns, all four checks green:

- `test-engine.mjs` — **74 assertions** (was 47), covering bands, the consequence queue,
  owner-time load, and that projecting a trajectory does not drain the real pending queue.
- `validate-scenario.mjs` — **60/60** option predictions stable across all paths.
- `validate-i18n.mjs` — **new.** 105 keys × 2 languages, 455 localised content strings,
  placeholder parity, and every key the code asks for. `t()` returns the key itself when a
  string is missing, so a gap ships as a literal `pnl.sales` on screen and nothing throws —
  invisible in a language you do not read.
- `check-links.sh` — 191 links.

**Verified by driving the real `standalone.html` headlessly in jsdom** — full playthrough in
both languages, plus a run that deliberately takes every neglectful option to confirm the
delayed-consequence cards and the weeks-passed captions render with the right attribution.
No console errors.

**~62KB gzipped, up from ~33KB.** Roughly half of that is carrying two languages; the rest
is 25% more content and the new interface. Still far inside the budget in
`docs/localization.md`.

## Notes for the next contributor

- **The environment no longer has a browser.** Session 003's Chromium at
  `/opt/pw-browsers/` is gone. `jsdom` (installed to `/tmp`, not committed) drives
  `standalone.html` and works well precisely because the single-file build has no ES
  modules. That verifies behaviour and text, **not** layout — nobody has looked at this
  version on a real screen, and session 003's solid-black-scene bug is the standing reminder
  of what that misses.
- **Run all four checks after any content edit**, and `validate-i18n.mjs` after touching any
  string. Adding a UI string means adding it to `app/content/ui.json` in both languages.
- **The `effects` footgun still stands.** A plain number *sets* `price`, `unitCost`, `staff`,
  `formality`; use `"+n"` / `"-n"` strings to force additive. Now also: author
  `ownerHoursFixed` for a permanent change to weekly load — `ownerHoursUsed` is recomputed
  every week and an authored change to it only lasts the current turn.
- **Band stability is easy to break.** Three of the four new turns failed
  `validate-scenario.mjs` on first run, straddling a band boundary depending on earlier
  choices. Effects that bite on price or unit cost scale with volume and so vary a lot
  between paths; a fixed cost is stable. `/tmp/tune.mjs` (not committed) sweeps candidate
  values across all three paths and is a fast way to settle this.
- **`docs/` is now further behind the code**, not closer. `game-design.md`,
  `assessment.md` and `curriculum.md` still describe the session-001 design. Q-012 is
  settled now, which was the stated precondition for reconciling them — that is the obvious
  next docs task.
