# Plan: Dramatic redesign — finding export-manufacturing diamonds through a teaching funnel

## Goal

Find "diamonds in the rough" who can build export manufacturing firms, and teach basic business ideas through a game, with the same instrument. Cheap enough to screen thousands, honest enough to select no-one on an unvalidated score.

The other agent (bf3fb5af) built a cleaner version of the same 80-decision teaching game. Its own last assessment is correct: it preserved four chapters × 20 decisions, simulated choices, lessons about business, a portal after all chapters, and a generic path. That does not satisfy [AGENTS.md §2]( /srv/repos/business_simulator/AGENTS.md:48) — livelihood vs transformational, observed execution over plan scores — or [docs/context/transformational-entrepreneurship.md §11]( /srv/repos/business_simulator/docs/context/transformational-entrepreneurship.md:360).

## Success Criteria

1. **Entry is 10–15 minutes.** A first-time learner on a low-end Android finishes the entry episode without facilitator help and can state one changed intention for their own firm (not "found it useful"). Measured by [MV-BS-TEST-001]( /srv/repos/business_simulator/docs/MV-BS-TEST-001-learner-acceptance.md).
2. **Teaching is by doing, not by picking answers.** At least one practical task uses the learner's real business (cash record, paid trial, delegation check) before any grant gate.
3. **Selection is on demonstrated execution, not in-game performance.** No composite score, rank or percentile ever decides access to money ([ADR-0004]( /srv/repos/business_simulator/docs/adr/0004-simulator-as-selection-instrument.md), [ADR-0008 §8]( /srv/repos/business_simulator/docs/adr/0008-learner-record-portal-and-judge.md:164), [D-008]( /srv/repos/business_simulator/memory/DECISIONS.md:142)). Completion is the gate; evidence after it is what progresses.
4. **Two legitimate trajectories exist.** Livelihood consolidation and transformational growth are a choice the learner makes (Track 0 in [curriculum.md]( /srv/repos/business_simulator/docs/curriculum.md:102)), not a ladder everyone climbs ([arc.md §1]( /srv/repos/business_simulator/docs/arc.md:39)).
5. **Funnel is measurable.** Drop-off, channel bias (`?src=`), and stage-0 → stage-1 → six-month join are observable without inventing data. Enables [Q-003]( /srv/repos/business_simulator/memory/OPEN_QUESTIONS.md) validation later.

## Context And Current Facts

**Inspected:** `memory/PROJECT_STATE.md` (production 110ffb2, four chapters × 20 turns in episodes of 5, interactionVersion 2, no forecast in normal play), `memory/DECISIONS.md` D-001..D-024, `docs/arc.md`, `docs/game-design.md` (current: choice runs period immediately, numeric presets, cash-book practice), `docs/curriculum.md` (80 turns counted: 2.2 paid trial is "thin", 4.4 specialist + 4.5 removable are absent, Track 0 not built), `docs/assessment.md` (no score, no prediction), `docs/grants.md` + `docs/theory-of-change.md` (links [B] is weakest, Q-003 low confidence), `AGENTS.md` thesis and constraints (offline PWA, TZS, no invented regulation), personas Grace/Joseph/Amina/Peter, open questions Q-030/Q-033/Q-037/Q-039, ADRs 0004/0005/0007/0008/0009/0012, engine `app/js/engine.js`, and agent bf3fb5af timeline (final self-critique table exactly matches gap list).

**What already works:** vanilla ES modules, no-build, bilingual inline (`validate-i18n.mjs`), offline IndexedDB attempts, small payload (27,922 compressed), chapter snapshots + six flags, working-capital/debt/FX engine, programme portal locally under ADR-0011, Q-030 implementation update (immutable attempts, drafts, reports at 2/4/6).

**What blocks the goal today:** funnel entry is ~80 decisions; teaching is simulated-choice + one-line takeaway; no real-world task before portal; portal after four chapters contradicts "coarse filter cheapest" ([D-034]( /srv/repos/business_simulator/memory/DECISIONS.md), Q-031); generic path for Peter and Grace; record is in-game performance, not cash record / customer test / paid trial / delivery ([transformational-entrepreneurship §11]( /srv/repos/business_simulator/docs/context/transformational-entrepreneurship.md:392)); recruitment channel unmeasured per [Q-039]( /srv/repos/business_simulator/memory/OPEN_QUESTIONS.md:364).

## Constraints And Non-goals

**Constraints (AGENTS.md §3, ADR-0002, ADR-0006):** mobile-first 2GB Android, offline after first load, small data, localisable day one, varied literacy/numeracy, no vendor lock-in, learner data minimised consent-based, no hard-coded currency, never invent Tanzanian fees/rates/names — mark UNVERIFIED.

**Non-goals for this redesign:** business-plan generator (explicitly forbidden by [ADR-0004]( /srv/repos/business_simulator/docs/adr/0004-simulator-as-selection-instrument.md)), pitch trainer, personality/grit score, ranking learners, predicting real success, native app, continuous sync/accounts.

## Key Decisions

| # | Decision | Recommendation | Rejected alternative & why |
|---|---|---|---|
| 1 | **Gate position** | Gate after **Entry Episode** (12 decisions, mandazi stall only). Chapters 2–4 become optional advanced training, not prerequisites for portal. | Gate after four chapters — keeps cost high, filters on stamina not relevant for export discovery; contradicts D-033/D-034 coarse-filter intent. |
| 2 | **What teaches** | **Consequence + one real task.** Keep `situation → action → animated result → takeaway` (ADR-0012) but end Entry with one verifiable task outside simulation: either (a) photo of one-week cash record, or (b) paid trial offer/customer commitment note. | 80 text lessons + takeaways — teaches vocabulary, not bottleneck behaviour; strongest signal in evidence base is paid trial ([curriculum 2.2 thin]( /srv/repos/business_simulator/docs/curriculum.md:49)). |
| 3 | **Trajectory** | **Track 0 choice at 5 minutes:** learner chooses livelihood consolidation or transformational/export growth in their own words. Content branches lightly (bakery/factory/export vs stall deep-dive). System never assigns ([curriculum Track 0]( /srv/repos/business_simulator/docs/curriculum.md:103) + [Q-006]( /srv/repos/business_simulator/memory/OPEN_QUESTIONS.md)). | Single ladder where stall→bakery→factory→export is progression — misreads Peter persona and makes every livelihood learner a "dropout". |
| 4 | **Selection signal** | **Observations + evidence, no score.** Entry record = what they did (choices, info bought, help opened). Progress beyond entry requires evidence artefacts (cash photo, trial receipt, delegation log) + reflection on forecast vs actual ([D-036]( /srv/repos/business_simulator/memory/DECISIONS.md), [D-037]( /srv/repos/business_simulator/memory/DECISIONS.md)). Judge scores blind to stage-0 ([ADR-0008 §5]( /srv/repos/business_simulator/docs/adr/0008-learner-record-portal-and-judge.md:127)). | Composite entrepreneur score or prediction accuracy gate — D-008 rejects performance gate; validity unproven (Q-003); would filter Joseph on game fluency ([personas.md: Joseph]( /srv/repos/business_simulator/docs/personas.md:44)). |
| 5 | **Export-manufacturing discovery** | Export is not simulated for everyone; it is the **aspiration + bottleneck** for the transformational branch. Discovery via: (a) who chooses transformational path, (b) who names a constraint in export-relevant terms (standards, working capital for long cycle, buyer), (c) who completes longer-cycle task. Chapters 3–4 become filtered training for that self-selected slice. | Force every learner through export chapter — teaches context most never need; dilutes signal; UNVERIFIED regulatory detail risk ([Q-018]( /srv/repos/business_simulator/memory/OPEN_QUESTIONS.md:164)). |
| 6 | **Funnel stages** | 0: Entry game (free). 0b: One real task. 1: Portal forecast of own firm (dated numeric) + probes against stage-0 ([ADR-0008 §6]( /srv/repos/business_simulator/docs/adr/0008-learner-record-portal-and-judge.md:140)). 2: Six-month review with photo corroboration. Grants at USD 1k (50, per [D-035]( /srv/repos/business_simulator/memory/DECISIONS.md)) then fixed ladder (open [Q-041]( /srv/repos/business_simulator/memory/OPEN_QUESTIONS.md:218)). | Single grant decision off game + plan — no execution observation; fails theory-of-change link [B] and does not distinguish livelihood vs transformational. |
| 7 | **Recruitment** | Implement `?src=` capture on first load and carry to portal (one field, per [ADR-0008 §4]( /srv/repos/business_simulator/docs/adr/0008-learner-record-portal-and-judge.md:118)). Deliberately run 2–3 channels in parallel (e.g., edtech freebie vs word-of-mouth vs fellowship) to measure bias ([Q-039]( /srv/repos/business_simulator/memory/OPEN_QUESTIONS.md:376)). | Single unspecified channel — becomes invisible filter above simulator that negates finding Joseph. |
| 8 | **Game controls** | Keep 4 controls only (choice, number with presets, allocate, diagnose). No new widget. Depth via engine lines already present; add at most one **evidence capture** control (photo/note) which is not a scored decision ([D-017]( /srv/repos/business_simulator/memory/DECISIONS.md:307)). | Points, leaderboard, timer — violates assessment honesty and amplifies gaming by Amina persona. |

## Recommended Approach

**Shortest path that proves the thesis without rebuilding everything:**

Keep the PWA, engine, bilingual pipeline, and portal host. Replace the **entry** while leaving chapters 2–4 intact but demoted to optional. Ship a 12-turn Entry Episode that ends with a real task and a stage-0 submit, plus the Track 0 branch. Everything else is behind that gate.

**Narrative:** Asha's mandazi stall remains the universal entry. At turn 5, after cash-vs-profit and unit-economics, ask Track 0 in plain language: "Which help do you want — make this stall steady, or build a business that can sell to other businesses and abroad?" Peter's path deepens stall mastery; Grace/Joseph's path points toward bakery→factory→export content. Both are complete outcomes.

**Entry Episode (12 turns, ~12 min):**
1. Unit economics (keep today's price vs raise — existing t01, now 3 presets)
2. Pricing vs cheaper competitor (t02)
3. Cash vs profit — stock on floor (t03)
4. Records that support decisions — one cash-book practice (existing)
5. **Track 0 choice** — trajectory + binding constraint in learner's own words (free text or voice note, stored verbatim)
6. Paid trial — shops want 30 days (ch2 t06 moved forward) as *choice + follow-up task*
7. Bottleneck diagnose — profit up bank down (diagnose workingCapitalChange)
8. Delegation — who keeps quality when Asha not there
9. Shock — big shop hasn't paid in nine weeks (setback, no forecast)
10. Financing an asset — save/borrow/lease (ch2 t09)
11. Pricing with cost-plus check (landed-cost intuition, without export jargon)
12. Allocation — what stays in vs leaves business (cap discipline, [curriculum 1.8]( /srv/repos/business_simulator/docs/curriculum.md:182))

Turns 1–4 and 6–12 run as ADR-0012 interaction (no mandatory forecast). Prediction is not asked; the takeaway is one sentence. Help (word/arithmetic) is free and assistance-flagged. End screen offers **one practical task** (choose one): photograph your last week's cash record, or write a paid-trial offer you will send tomorrow. Submitting the episode record (IndexedDB → opt-in POST with claim code per [ADR-0008 §2]( /srv/repos/business_simulator/docs/adr/0008-learner-record-portal-and-judge.md:63)) unlocks portal access. Full chapter completion no longer required.

**Why this is dramatic yet minimal:** it reuses 70% of existing authored content and all engine code, but changes the *job* of the game from "teach 80 concepts" to "filter cheaply, teach one constraint, collect one real artefact." That is the portfolio-of-experiments model in [transformational-entrepreneurship §9]( /srv/repos/business_simulator/docs/context/transformational-entrepreneurship.md:299).

## Work Plan

Ordered phases; each is shippable and testable. No new build step, no new runtime dependency (ADR-0006).

**Phase 0 — Groundwork (1–2 days, no user-visible change)**
- Add `?src=` capture to install id and record (extends `app/js/storage.js` / `record.js`). Carry to portal submission.
- Add mid-episode record view + submit affordance (ADR-0008 §3 fix: reachable at any turn, not only chapter end). IndexedDB migration keeps legacy attempts.
- Define `entry-episode.json` schema delta: `trajectory` field, `constraintText`, `evidenceTaskId`.
- Reuse existing validators: `validate-i18n.mjs`, `validate-scenario.mjs`, `check-generated.py`.

**Phase 1 — Entry Episode ship (1 week)**
- Author `app/content/entry.json` by extracting/polishing 12 turns from mama-asha + bakery (no new economics). Add Track 0 turn (choice + free text/voice). Mark Kiswahili as draft banner until [Q-015]( /srv/repos/business_simulator/memory/OPEN_QUESTIONS.md:146) review.
- Update `app/content/chapters.json` and `app/js/main.js`: entry is default landing; chapters 2–4 marked "Advanced — optional".
- Update `app/js/ui.js`: trajectory-aware chapter bridge text; no score, no lock.
- Keep 80-turn content unchanged on disk; behind optional route.
- Tests: 24,200 seeded outcomes still pass for entry; browser checks bilingual at 320px/200%.

**Phase 2 — Real task + evidence trail (1 week)**
- Add evidence capture: photo/note upload queued offline (compress to ~200KB, no geotag, no faces per ADR-0008 §9). Stored locally, submitted with record only on explicit opt-in.
- Extend `assessment.md` derived indicators: `constraintStated`, `evidenceSubmitted` (photo vs note), `trajectoryChosen` — all observations, not scores.
- Portal: extend submission schema to store entry record + evidence + constraint text + `?src=`. Raw submissions retained for re-scoring ([ADR-0008 §5]( /srv/repos/business_simulator/docs/adr/0008-learner-record-portal-and-judge.md:130)).

**Phase 3 — Portal forecast + blind judge probes (1–2 weeks)**
- Implement portal forecast fields per [D-036]( /srv/repos/business_simulator/memory/DECISIONS.md): dated numeric predictions about own firm (not narrative plan). Add deterministic checks.
- AI judge: blind scoring pass + second combined pass; probes generated from learner's own entry decisions (e.g., "you chose cheap flour and predicted rise — your forecast assumes stable input price, which is it?") per [ADR-0008 §6]( /srv/repos/business_simulator/docs/adr/0008-learner-record-portal-and-judge.md:140). No typing/paste heuristics.
- Add oral/worked-example route for low-literacy applicants.

**Phase 4 — Channel experiment + six-month loop (operational, not code-heavy)**
- Launch 2–3 recruitment channels tagged by `?src=`; volume target low thousands per [D-035]( /srv/repos/business_simulator/memory/DECISIONS.md) and [Q-039]( /srv/repos/business_simulator/memory/OPEN_QUESTIONS.md:379).
- Schedule progress reports at months 2/4/6 and six-month reflection (D-051). Define success measure before cohort: bankability (lender credit extended) + survival, not self-reported jobs, per [Q-037]( /srv/repos/business_simulator/memory/OPEN_QUESTIONS.md:309) and [AGENTS.md §2]( /srv/repos/business_simulator/docs/context/transformational-entrepreneurship.md:40).

**PR slice if published:** Phase 0 → Phase 1 → Phase 2 → Phase 3 → Phase 4, in order. Each merges to main separately; no collapsing (per plan skill commitment).

## Validation Plan

| Work unit | Check | Command / method | Expected evidence |
|---|---|---|---|
| Phase 0 storage | No regression | `node scripts/test-engine.mjs && node scripts/validate-scenario.mjs` | 270 engine checks pass, entry valid |
| Phase 0 i18n | No drift | `node scripts/validate-i18n.mjs` | Parity en+sw |
| Phase 1 entry playable | Browser E2E | `PLAYWRIGHT_BROWSERS_PATH=/tmp/bs-browsers LD_LIBRARY_PATH=/tmp/bs-browser-libs/root/usr/lib/x86_64-linux-gnu node scripts/browser-checks.mjs` | Bilingual guided steps, 320px @200%, offline resume, no dead control |
| Phase 1 cache | Update safety | `node scripts/playthrough.mjs` (both langs, entry + optional chapters) | Downloaded scenarios survive shell update |
| Phase 2 evidence | Offline queue | Manual: airplane mode, photo 200KB, resume | Artefact appears in record, not blocking play |
| Phase 3 portal | Deterministic + blind | `node scripts/test-corrections.mjs` + synthetic API 59 requests | Finish vs evidence separation, re-runnable judge |
| All phases | Evasion | Manual with personas | Joseph (assisted mode) completes entry; Amina cannot game score because none exists |
| Learner acceptance | Field | Protocol [MV-BS-TEST-001]( /srv/repos/business_simulator/docs/MV-BS-TEST-001-learner-acceptance.md) — 2 rounds × 6 learners on real devices | Completion + intention change; no device/test inferred from software checks |

**Highest-risk validation:** real-device learner testing with Joseph-like users (low app fluency, no business plan). Software checks cannot establish ease of play ([ADR-0012]( /srv/repos/business_simulator/docs/adr/0012-play-first-business-journey.md:62)).

## Risks / Rollback

- **We overclaim again.** Mitigation: keep assessment language exactly as [assessment.md]( /srv/repos/business_simulator/docs/assessment.md:44) — observations only, no trait inference, limitations inside document.
- **Digital-fluency bias.** Mitigation: no timer, help is free, oral route, facilitator-assisted mode; measure correlation of completion with device/age vs business variables ([theory-of-change falsifier]( /srv/repos/business_simulator/docs/theory-of-change.md:166)).
- **Claim codes lost.** ADR-0008 already flags; fallback is phone at application, not at play.
- **Kiswahili & cost realism still UNVERIFIED.** Keep banner; do not ship Tanzanian fees/rates as verified ([Q-015]( /srv/repos/business_simulator/memory/OPEN_QUESTIONS.md:146), [Q-018]( /srv/repos/business_simulator/memory/OPEN_QUESTIONS.md:178)).
- **Rollback:** entry is additive file `entry.json`; chapters 2–4 remain on disk. Feature-flag entry as default; revert is one commit changing `chapters.json` landing pointer. No data migration to undo.

## Open Questions

Carried forward because repo cannot answer them locally — need owner decision:

- **Q-033:** grant funder/date for cohort 1 (USD 50k grants fixed, running costs not) — blocks urgency.
- **Q-041:** tranche ladder beyond 1k (1k→10k vs partner's 2k→10–20k→50–100k) — determines output language about "enough".
- **Q-037:** outcome measure is named but not fixed — recommend bankability + survival as primary, jobs only if defined to [AGENTS.md §2]( /srv/repos/business_simulator/docs/context/transformational-entrepreneurship.md:40) standard.
- **Q-039:** which channels actually run, and who operates non-LinkedIn reach to find Joseph at scale.
- **Q-035:** AI judge calibration + decision authority for penalties/appeals — requires field review before money moves.
- **Geography:** Tanzania-first content vs stated flexibility to "anywhere" — cheapest to branch now via entry copy, expensive to retrofit regulatory detail later.

No file was created beyond this durable plan at `.agents/plans/2026-09-20-diamonds-export-funnel.md` (path above).
