# Handoff

**Written:** 2026-08-08, end of session 012 · **Branch:** `chapters-3-4-and-balance`
(not pushed) · **HEAD:** `c393a1f`

This file is a one-time orientation for whoever picks this up next, human or agent. It is
not part of the regular memory protocol — do not maintain it going forward. Once you've
read it, work from `PROJECT_STATE.md` as normal and delete this file in your session's
commit.

---

## Read first, in order

1. `AGENTS.md` §2 (the thesis) and §5 (the memory protocol) — non-negotiable, everything
   else follows from it.
2. `memory/PROJECT_STATE.md` — the live snapshot. It is current as of this commit.
3. `memory/OPEN_QUESTIONS.md` — Q-022 through Q-026 are all live and all need the project
   owner, not an agent, to resolve.
4. `memory/sessions/2026-08-08-012-playing-it-and-what-that-found.md` — the most recent
   session, and the one this handoff summarises.

## Where things actually stand

**The four-chapter arc is content-complete and passes seven automated checks**, all green
as of `c393a1f`:

```bash
node scripts/test-engine.mjs        # 226 passed
node scripts/validate-scenario.mjs  # 177/177 predictions, 75/75 numeric paths, 0 problems
node scripts/validate-i18n.mjs      # 1,789 content strings × 2 languages
node scripts/simulate-runs.mjs      # no whole-business failures
node scripts/smoke-app.mjs          # 29 passed
node scripts/playthrough.mjs        # 1,372 passed — NEW this session, see below
bash  scripts/check-links.sh        # 321 links resolve
```

Run all seven after any change. Rebuild `standalone.html`
(`node scripts/build-single-file.mjs`) after any change under `app/` — it has gone stale
twice already with nothing noticing.

**Nobody outside this repository has played any of it.** That is the actual bottleneck now,
not content or code. See "What only a human can do" below.

## What the last two sessions did

**Session 011** wrote chapters 3 (factory) and 4 (export) — the content session 008 had
designed but left unauthored. Found and fixed a real engine bug along the way: a control
reading `state['lines.export.price']` silently got `undefined` → `0`, so a response curve
was measured from zero instead of from the actual price, costing a learner 34–50 reputation
for naming any export price at all. Fixed via `readField()` in `engine.js` (D-021).

**Session 012** was prompted by the owner: *"go through the game play and make judgement
calls... the last times I played through for v2 there were bugs straight away on the ui."*
Built `scripts/playthrough.mjs` — the first check in this project that actually reads a
screen and asks whether what it says is true, rather than testing the engine or the content
against each other. It found **six live UI defects on the first run**, all invisible to the
other six checks, all things a real player would hit immediately:

- language toggle crashed on the chapter select screen
- work-it-out cards in chapters 2–4 quoted chapter 1's default price/cost (500/300) instead
  of the real product-line figures — the arithmetic shown didn't multiply to the total shown
- the workout column omitted spoilage/freight/duty/FX while showing the true total, so it
  didn't add up in *any* chapter
- the diagnose control assumed every answer was a P&L row; three of five diagnose turns
  aren't, and mismatches rendered as raw keys with "TZS 0" next to them
- four profile strings were missing, so the end-of-chapter record showed literal
  `indicator.diagnosis` text
- leaving a chapter via "choose chapter" and tapping back in restarted it from turn 1,
  discarding progress silently

All six are fixed. Full detail and the reasoning behind each fix is in D-023, D-024, D-025
in `memory/DECISIONS.md`, and in the session file.

**One thing was deliberately not done**: the content was not rebalanced even though the
session surfaced a real asymmetry — chapter 2 touches 26 engine fields, chapters 3 and 4
touch 21 and 18, while chapter 1 touches 14 and every chapter is 20 turns / 15 choices / 4
numeric inputs / 1 allocation. The arc's mechanical depth spikes at chapter 2 and then
plateaus rather than ramping. That's written up as **Q-026** with the numbers, for the owner
to rule on — not acted on unilaterally, because it may be intentional (chapter 2 is where
the profit-vs-cash lesson lives, per `arc.md` §1).

## Open questions that need the project owner specifically

These cannot be resolved by more engineering — they need either a human playing the app, or
a business-domain judgment call:

- **Q-026** (new) — is the mechanical-depth cliff at chapter 2 intentional?
- **Q-025** (new) — chapter 4's opening now explains 5 new ledger lines at once (D-025).
  Too much on one screen on a real phone? Nobody has checked.
- **Q-023** — is chapter 4 now too easy, after the export-pricing bug (D-021) was fixed?
  There's no earlier honest baseline to compare against.
- **Q-022** — should the 400-path band-stability sweep in `validate-scenario.mjs` (which
  currently only *reports* drift) become a hard FAIL? It would turn chapters 1–3 red today.
- **Q-018** — chapters 3 and 4 ship `unverified: true` (visible banner) because their
  Tanzanian figures (wages, duty, freight, opening balance sheets) have no local
  ground-truth check.
- **Q-015** — Kiswahili register is unreviewed by a first-language speaker, across all four
  chapters now.

## What only a human can do next (in priority order)

1. **Play chapter 1, both languages.** Sessions 008/010/011/012 have all changed the turn
   loop; nobody has played it since. Historically (sessions 006, 007) this is what finds
   the defects automated checks structurally cannot — that pattern held again this session.
2. **Play it on an actual phone**, connection off at some point to check the service worker
   (`sw.js`) actually works offline. There is no browser in this working environment;
   nothing here has ever rendered on real glass.
3. **Rule on Q-026** (the depth-cliff question above) — it shapes whether any future session
   should be touching content balance or not.
4. **Get a Kiswahili speaker to review the translation.**
5. **Verify the Tanzania-specific figures** in chapters 3–4 so the `unverified` banner can
   come down.

## Things worth knowing before you touch code

- **The screens lie more often than the engine does.** Four of twelve sessions (006, 007,
  011, 012) found defects only by looking at what the interface actually renders. If you
  change anything a learner looks at, run `playthrough.mjs` and add an assertion to it —
  don't rely on the other six checks to catch UI regressions, they structurally can't.
- **`state.price` / `state.unitCost` are not real once a chapter uses `lines[]`.** They sit
  at engine defaults (500/300) forever in that case. Read `weeklyPnl(state).perLine` instead.
  This exact mistake has bitten twice now (D-021, D-023).
- **The stub DOM is shared** at `scripts/lib/stub-dom.mjs`, used by both `smoke-app.mjs` and
  `playthrough.mjs`. Extend it there, not in either harness.
- **The branch is not pushed to origin.** Confirm with the owner before pushing.
- Full detail on every decision referenced above (D-018 through D-025) is in
  `memory/DECISIONS.md` with the "why" and "considered and rejected" for each — read those
  before re-deciding something that already has a documented rationale.
