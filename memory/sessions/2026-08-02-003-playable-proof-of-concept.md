# Session 003 — Playable proof of concept

**Date:** 2026-08-02
**Worked by:** Project owner (Arno Rohwedder) + Claude (claude-opus-5, Claude Code),
with two Sonnet subagents
**Branch:** `claude/business-simulator-repo-setup-lpe4ir` → merged to `main`
**Duration / scope:** Large. First application code in the project.

---

## Goal

The owner endorsed the session 002 ideation ("I think these are good ideas") and asked
for a playable proof of concept: pedagogically real, teaching accounting, operations,
customer relations, market sizing, logistics, food safety and quality control, managing
employees and government requirements; engaging rather than dry; able to test whether
learning happened; browser-based and phone-first; graphical rather than text-only.

Explicitly framed as a proof of concept to be played and given feedback on, with depth
left open.

## What happened

Built `app/` — a working simulator, 16 turns, playable end to end.

**Architecture:** vanilla ES modules, no build step, no dependencies
([ADR-0006](../../docs/adr/0006-no-build-vanilla-js.md)). Whole app is ~33KB gzipped
including content. The weekly profit and loss is **computed by the engine**, never
authored in content — so an author cannot hand-write an outcome, and the numbers stay
internally consistent no matter what path a learner takes.

**Subagents:** two Sonnet agents ran in parallel against a written interface contract —
one on scenario content, one on the visual layer. The owner interrupted the turn partway
through, which cancelled both. `scene.js` (SVG scenes that reflect game state) had
already landed complete and was good. The stylesheet had only its design-token block, and
no scenario content existed. Both were finished by Claude directly rather than
relaunching, which was faster than another round trip.

**The integration bug worth remembering:** `scene.js` assigns CSS classes to SVG elements
and expects fills from the stylesheet. Because the stylesheet was cut off before its
component layer, every scene rendered as a **solid black rectangle**. Found by driving
the real app in Chromium and looking at a screenshot — not by reading code. Several
scene classes were set via ternary expressions (`class: night ? 'a' : 'b'`), which a
naive grep for `class: '...'` misses, so the first fix was incomplete and the sky and
ground stayed black through a second round.

## Discussion

**The owner described the funnel in their own words**, and it matters that this is
recorded accurately:

> "if someone gets all of the the questions right in terms of, like, what do you think
> would happen when I do x to your profit or whatever, then they would potentially, like,
> get pass on to, like, the business plan competition to use those skills in the funnel.
> So it's it's all about getting lots and lots of people into the funnel, and then
> there's being prizes at the end."

This **confirms the stage-zero placement** proposed in
[ADR-0005](../../docs/adr/0005-simulator-as-stage-zero-gate.md): the simulator sits
before a competition, its job is to get large numbers of people into a funnel, and prizes
sit at the end. Q-009 is answered on placement.

**But it diverges from ADR-0005 on the gate itself, and the divergence is not cosmetic.**
ADR-0005 argued for *completion* as the gate, with performance informing only the next
stage. The owner describes *getting the questions right* as what passes someone through —
a performance gate.

That is the exact thing `docs/assessment.md` warns about: a performance gate puts
consequence on an instrument with no validated signal, and risks selecting for digital
fluency over business capability — which would filter out the Joseph persona, the
experienced operator the whole thesis says is most undervalued. Raised as
[Q-012](../OPEN_QUESTIONS.md) rather than resolved in either direction, because it is the
owner's call and it should be made deliberately.

**On "fun".** The owner asked for animations and engagement "as much of that as possible
whilst at the same time not taking away from the learning" — which is precisely the
tension session 002 named. The build resolves it by making the graphics *informational*:
scenes reflect actual game state (more customers when demand is high, staff figures when
staff are hired, a dimmer scene when reputation drops), so the animation carries meaning
rather than decorating around it.

**On depth.** The owner was explicitly unsure how deep to go and expects to playtest.
Sixteen turns covering twelve concepts was chosen as enough to feel like a business and
short enough to finish in one sitting — roughly 20 to 30 minutes. That is a guess and
should be treated as one.

## Decisions made

- **D-006** — Vanilla ES modules, no build step, no dependencies
  ([ADR-0006](../../docs/adr/0006-no-build-vanilla-js.md))
- **D-007** — Proof-of-concept scope: one scenario, English only, no service worker

## Questions raised or resolved

**Partly resolved — Q-009.** Placement confirmed by the owner: prerequisite, feeding a
funnel into a competition. The *gate type* is now the open part, tracked as Q-012.

**Raised — Q-012** (performance gate vs completion gate — the divergence above),
**Q-013** (is 16 turns the right length), **Q-014** (do the prediction bands match how
learners actually think about profit changes).

## State at end of session

`app/` is playable. Verified by driving it in Chromium at 360×740: all 16 turns,
prediction and reveal on every turn, results profile, light and dark themes, no console
errors, no horizontal overflow, progress surviving a page reload via `localStorage`.

**Three checks now guard the things most easily broken:**

- `scripts/test-engine.mjs` — 47 assertions on the economics, and on the profile
  containing no score, rank or percentile field, with its statements staying
  observational. Those guardrails come from `docs/assessment.md` and are easy to erode
  by accident.
- `scripts/validate-scenario.mjs` — **48/48 option predictions verified**. This one
  earned its keep immediately: see below.
- `scripts/check-links.sh` — 178 internal links.

**The validator caught 17 real problems on first run, including a genuine engine-content
bug.** `unitCost` is an *absolute* field in `applyEffects`, so authoring `"unitCost": -30`
to mean "thirty cheaper" actually **set unit cost to minus thirty**, producing enormous
fake profits. Four options were affected. String-prefixed values (`"-30"`) force additive
behaviour and were the fix.

It also caught a subtler and more important class of problem: many declared answers were
**unstable across playthrough paths**. Demand-only effects do nothing when capacity is
the binding constraint, and capacity-only effects do nothing when demand binds — so the
same option could be genuinely "up a little" or genuinely "no change" depending on
earlier choices. **A learner would have been marked wrong for being right.** Fixed by
making effects bite on both sides, or by moving them to price and cost, which always
bite.

## Next steps

1. **Owner plays it.** That is the point of this build. Q-011 (does this hold anyone's
   attention) cannot be answered by argument.
2. **Answer Q-012** — performance or completion gate. It determines what the app does at
   the end of a run, and it has fairness consequences.
3. Verified Tanzanian figures to replace the placeholders. The in-app banner says they
   are made up; that banner should eventually come down.
4. A second scenario in a different business, which is what makes far-transfer testing
   possible — currently impossible with one scenario.
5. Service worker, so it is genuinely installable and offline (ADR-0002 is not yet
   satisfied).

## Notes for the next contributor

- **Run `node scripts/validate-scenario.mjs` after any content edit.** Prediction
  fairness is the foundation of the assessment model, and it is silently easy to break.
- In `effects`, a plain number **sets** `price`, `unitCost`, `staff` and `formality`, and
  **adds** to `cash`, `demand`, `capacity`, `reputation` and `hygiene`. Use `"+n"` or
  `"-n"` as a string to force additive on an absolute field. This has already caused one
  bug.
- When adding a scene to `scene.js`, add its CSS classes to `styles.css` — SVG elements
  with no fill rule render **black**, which looks like a crash rather than a styling gap.
- Testing in a real browser found things reading the code did not. Playwright with the
  pre-installed Chromium at `/opt/pw-browsers/chromium-1194/` works; the driver script is
  not committed, since it is scratch tooling.
