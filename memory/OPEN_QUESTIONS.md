# Open questions

Things that are unresolved, blocked, or need a human with local or institutional
knowledge. Add freely. Resolve by moving the entry to **Resolved** with the answer and
a date — do not delete, the reasoning is worth keeping.

Mark blocking questions clearly. A question that stops downstream work is worth
chasing; one that does not can wait.

**Format**

```
### Q-NNN — Short title  [BLOCKING | open | needs local review]
**Raised:** YYYY-MM-DD · **Owner:** who should answer
**Question:** what we need to know.
**Why it matters:** what is blocked or at risk.
**Current assumption:** what we are proceeding on, if anything.
```

---

## Blocking

### Q-001 — Which learner segment is primary?  [BLOCKING]
**Raised:** 2026-08-02 · **Owner:** Project owner
**Question:** Is the primary user (a) an existing small firm with revenue and some
traction, (b) a pre-revenue founder with an idea, or (c) an experienced operator who
could run a larger firm but has not yet? The background note argues selection should
favour experienced operators and existing firms with verifiable bottlenecks — but an
on-ramp tool implies reaching people earlier.
**Why it matters:** Determines the curriculum, the simulation's starting state, the
length of a playthrough, and what the assessment can legitimately measure. Almost
every other design decision sits downstream of it.
**Current assumption:** None. Proceeding with a capability map broad enough to serve
(a) and (c), which is not a sustainable position for long.

### Q-002 — What programme does this actually feed into?  [BLOCKING]
**Raised:** 2026-08-02 · **Owner:** Project owner
**Question:** Is there a named grant programme, training provider or funder this is an
on-ramp for? What does their selection process consume today, and what could it
realistically ingest from us? **Added 2026-08-02 (session 002):** does any available
partner run a *staged* portfolio, or are they all single-shot grant competitions?
**Why it matters:** The evidence trail is the point of the tool. Designing it without
knowing the consumer risks producing a record nobody can use. Also determines whether
we need export formats, an API, or just a printable summary.
**Escalated by session 002.** Under the proposed stage-zero design
([ADR-0005](../docs/adr/0005-simulator-as-stage-zero-gate.md)) this moves onto the
critical path: a stage-zero gate only exists if there is a stage 1 to gate into. A
partner running a single-shot competition cannot host that design at all.
**Current assumption:** Designing the behavioural record to be self-contained and
human-readable, so it degrades gracefully if no integration exists.

### Q-004 — How long is a full playthrough?  [BLOCKING]
**Raised:** 2026-08-02 · **Owner:** Project owner
**Question:** Is this a 30-minute tutorial, a several-hour course, or a multi-week
engagement running alongside real business activity? The background note's execution
test runs six to twelve weeks in reality.
**Why it matters:** A short session cannot generate a meaningful behavioural signal; a
multi-week engagement is a completely different product with retention, notification
and facilitation requirements. Drives the offline and data-sync design directly.
**Partly answered by session 002, not closed.** The proposed assessment design —
pre/post on a novel scenario plus a delayed retest at ~4 weeks — implies a multi-session
engagement rather than a single tutorial. That follows only if
[Q-009](#q-009--confirm-or-reject-the-stage-zero-placement--blocking) is answered
affirmatively, so this stays open.
**Current assumption:** Multi-session, pending Q-009.

### Q-009 — Confirm or reject the stage-zero placement  [BLOCKING]
**Raised:** 2026-08-02 (session 002) · **Owner:** Project owner
**Question:** Does the owner accept the proposal in
[ADR-0005](../docs/adr/0005-simulator-as-stage-zero-gate.md) — that the simulator gates
entry to a ~$500 discovery experiment, that **completion** rather than performance is
the gate, and that the behavioural record informs the *next* stage transition rather
than the current one?
**Why it matters:** Everything from session 002 sits downstream. If accepted, ADR-0005
moves to `Accepted` and `docs/game-design.md`, `docs/assessment.md` and
`docs/curriculum.md` all need revision to match. If rejected, the during-programme-only
alternative is most likely correct, and the project scopes down to a teaching tool.
**PARTLY ANSWERED 2026-08-02 (session 003).** The owner described the funnel
unprompted: the simulator sits before a business-plan competition, its job is "getting
lots and lots of people into the funnel", and prizes sit at the end. **Placement is
confirmed.** What remains open is the *gate type* — see Q-012, where the owner's
description and ADR-0005 diverge.
**Current assumption:** Stage-zero placement accepted. Gate type unresolved.

### Q-012 — Performance gate or completion gate?  [BLOCKING]
**Raised:** 2026-08-02 (session 003) · **Owner:** Project owner
**Question:** The owner described passing people on when they "get all of the questions
right". [ADR-0005](../docs/adr/0005-simulator-as-stage-zero-gate.md) proposed the
opposite — that **completion** is the gate and performance only informs the *next* stage.
Which is it?
**Why it matters:** This is not a detail. A performance gate places real consequence on
an instrument with no validated signal ([Q-003](#q-003--can-simulated-behaviour-predict-real-firm-outcomes-at-all--open)),
and risks selecting for digital fluency rather than business capability — which would
filter out the Joseph persona, the experienced operator the project's own thesis says is
most undervalued. `docs/assessment.md` currently forbids automatic cut-offs outright, so
a performance gate would require that document to change deliberately rather than by
drift.
**Current assumption:** None. Flagged rather than resolved because it is the owner's
call and the trade-off should be made with the fairness cost visible.

## Open

### Q-013 — Is 16 turns the right length?  [open]
**Raised:** 2026-08-02 (session 003) · **Owner:** Project owner / playtesting
**Question:** The proof of concept runs 16 turns across 12 concepts, roughly 20–30
minutes. Too long to hold attention, too short to generate signal, or about right?
**Why it matters:** Feeds [Q-004](#q-004--how-long-is-a-full-playthrough--blocking) and
determines how much curriculum can exist per scenario.
**Current assumption:** A guess. Only playtesting answers it.

### Q-014 — Do the prediction bands match how learners think?  [open]
**Raised:** 2026-08-02 (session 003) · **Owner:** Project owner / playtesting
**Question:** Predictions are graded into four bands — up a lot, up a little, about the
same, goes down — with thresholds fixed in the validator. Does "up a little" mean the
same thing to a learner as it does to the model?
**Why it matters:** If a learner reasons correctly and lands in the neighbouring band,
they are marked wrong, and prediction accuracy is the signal the whole assessment rests
on. Under a performance gate (Q-012) this would directly affect who progresses.
**Current assumption:** Bands are stable across playthrough paths (verified, 48/48), but
whether they are *intuitive* is untested.

### Q-010 — How do we handle assessment/selection interference?  [open]
**Raised:** 2026-08-02 (session 002) · **Owner:** Project owner
**Question:** Measuring learning and generating a selection signal interfere. Told they
are being assessed, learners perform — which corrupts the learning measurement. Not told,
and selection use becomes a consent violation that `SECURITY.md` already forbids. How is
this resolved in practice?
**Why it matters:** Affects both the validity of any learning claim and the honesty of
the consent flow. Gets worse the higher the stakes attached to the record.
**Current assumption:** Full transparency about what is recorded, accept the resulting
performance effect, and rely on instruments robust to it — transfer tests and prediction
calibration are much harder to fake than knowledge tests, since performing convincingly
still requires understanding the system.

### Q-011 — Does "compelling rather than fun" actually retain learners?  [open]
**Raised:** 2026-08-02 (session 002) · **Owner:** Project owner / field testing
**Question:** Session 002 argued against game-style fun on the grounds that tight
feedback loops and a legible optimisable system teach a false model of business, and
proposed recognition, consequence, character and prediction instead. Does that actually
hold people through a multi-session engagement?
**Why it matters:** If not, completion rates collapse — and under ADR-0005 completion is
the gate, so a retention failure is also a selection failure.
**Current assumption:** Untested, and it is an argument rather than evidence. Needs field
testing, not more reasoning.

### Q-003 — Can simulated behaviour predict real firm outcomes at all?  [open]
**Raised:** 2026-08-02 · **Owner:** Project owner / research partner
**Question:** Is there evidence that decision behaviour in a business simulation
correlates with real entrepreneurial performance? The project's own thesis is sceptical
of weakly-validated selection signals — we should not exempt ourselves.
**Why it matters:** If simulated behaviour is no better than a pitch score, the
selection purpose collapses and this is a teaching tool only. That is still valuable,
but it is a different product with different claims.
**Session 002 note:** the stage-zero design would generate the data to answer this as a
by-product — simulator behaviour → who received a discovery experiment → who succeeded at
a paid trial. That is an argument in favour of ADR-0005, and it does not make the
question any less open in the meantime.
**Current assumption:** We claim only "observed in-simulation behaviour", never
"predicted real-world performance", until validated. Encoded in `docs/assessment.md`.

### Q-005 — Which value chain anchors the first scenario?  [open]
**Raised:** 2026-08-02 · **Owner:** Project owner
**Question:** Honey (owner has deep ground truth via Upendo Honey), aquaculture
(Tanganyika Blue), or a more common retail/service context that more learners will
recognise?
**Why it matters:** Determines the depth and credibility of the first content, and
whether learners see themselves in it.
**Current assumption:** Honey is the leading candidate — best available ground truth,
and a genuine value chain with supplier development, certification and export stages
that exercise the transformational capabilities we want to teach.

### Q-006 — How do we handle the livelihood/transformational distinction with learners?  [open]
**Raised:** 2026-08-02 · **Owner:** Project owner
**Question:** The distinction is analytically central but potentially demeaning if
surfaced bluntly — nobody wants to be told their business is "merely a livelihood."
How is this represented in the product?
**Why it matters:** Gets the tone of the whole product right or wrong. A tool that
implicitly ranks users' ambitions will not be trusted.
**Current assumption:** Represent it as *different trajectories with different
requirements*, never as a ranking, and let learners choose which they are pursuing.

### Q-007 — What is the language plan?  [needs local review]
**Raised:** 2026-08-02 · **Owner:** Project owner
**Question:** Launch in English and Swahili simultaneously, or English first? Which
Swahili register — Tanzanian standard, and how is business vocabulary handled where
learners typically use English loanwords?
**Why it matters:** Retrofitting localisation is expensive; getting the register wrong
makes the tool feel foreign to the people it is for.
**Current assumption:** Build localisation-ready from the first line of code
(`AGENTS.md` §3), decide launch languages later.

### Q-008 — Data, consent and hosting for learner records  [needs local review]
**Raised:** 2026-08-02 · **Owner:** Project owner
**Question:** If the behavioural record feeds funding decisions it becomes
consequential personal data. Where is it stored, who controls it, what does the learner
consent to, and what does Tanzania's Personal Data Protection Act require of us?
**Why it matters:** Legal exposure, and a trust question for participants. Also
determines the sync architecture.
**Current assumption:** Local-first storage, learner holds their own record, explicit
opt-in before anything is shared with a programme. See `SECURITY.md`.

## Resolved

*(none yet — move entries here with the answer and the date it was settled)*
