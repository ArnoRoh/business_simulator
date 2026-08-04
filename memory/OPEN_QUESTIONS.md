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

### Q-015 — Is the Kiswahili register right?  [needs local review]
**Raised:** 2026-08-04 (session 005) · **Owner:** Project owner / a first-language speaker
with business exposure
**Question:** The app now ships a complete Kiswahili translation — ~4,000 words of scenario
content plus 105 interface strings — drafted by Claude. `docs/localization.md` says
plainly that register "is a judgement call for a native speaker with business exposure —
not a translator working from a word list, and definitely not machine translation." This is
closer to the last of those than the first.
**Why it matters:** Correctness is not the risk; naturalness is. Target learners mix English
loanwords into business talk, and fully-translated vocabulary can read as stilted or
foreign, while over-borrowing excludes people. A tool that sounds wrong to the people it is
for loses their trust immediately and does not get it back.
**Specific calls that need checking:** "Kiigizo cha Biashara" for the app name; "faida" /
"mtaji" / "gharama" used untranslated as-is; "kodi ya pango" for rent, to avoid "kodi"
being read as tax; whether "sambusa", "gesti" and "bodaboda" are the forms the audience
actually uses.
**Current assumption:** Shipped as a **visibly labelled draft** — a banner appears in
Kiswahili mode saying it has not yet been checked by a first-language speaker. That is the
honest position under `AGENTS.md` §6, not a substitute for the review.

### Q-016 — How should money be written in Kiswahili?  [needs local review]
**Raised:** 2026-08-04 (session 005) · **Owner:** Project owner
**Question:** Amounts currently render as `TZS 1,500` in both languages. Tanzanian usage
also includes `TSh 1,500` and the very common `1,500/=`. Which does the target learner read
most easily, and does it differ between the two languages?
**Why it matters:** Small, but money notation is exactly the kind of detail that signals
whether a tool was made locally or elsewhere — and `AGENTS.md` §6 forbids inventing this
sort of specific rather than asking.
**Current assumption:** The ISO code `TZS` in both languages, because it is unambiguous and
not invented. `app/js/format.js` has a single place to change it.

## Open

### Q-013 — Is 20 turns the right length?  [open]
**Raised:** 2026-08-02 (session 003) · **Owner:** Project owner / playtesting
**Question:** The proof of concept ran 16 turns in roughly 20–30 minutes and the owner
found it too quick to teach much. Session 005 took it to 20 turns and, more importantly,
made each turn longer — a work-it-out step before predicting, a fuller reveal, an
explanation after a wrong prediction. Is *that* the right length?
**Why it matters:** Feeds [Q-004](#q-004--how-long-is-a-full-playthrough--blocking) and
determines how much curriculum can exist per scenario.
**PARTLY ANSWERED 2026-08-04 (session 005).** 16 turns was too short — that much is
settled, from the owner playing it. The owner chose depth-per-turn over more turns. Whether
the result is now right, or has overshot, is untested.
**Current assumption:** ~30–40 minutes. Still a guess; only playtesting answers it.

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

### Q-009 — Confirm or reject the stage-zero placement  [RESOLVED 2026-08-04]
**Raised:** 2026-08-02 (session 002) · **Answered by:** Project owner
**Question was:** Does the owner accept [ADR-0005](../docs/adr/0005-simulator-as-stage-zero-gate.md) —
that the simulator gates entry to a ~$500 discovery experiment, that **completion** rather
than performance is the gate, and that the record informs the *next* stage transition?
**Answer: accepted in full.** Placement was confirmed in session 003, when the owner
described the funnel unprompted — the simulator sits before a business-plan competition,
its job is "getting lots and lots of people into the funnel", prizes at the end. The gate
type was the part left open, and it was settled in session 005; see Q-012 below. ADR-0005
is now `Accepted`.
**Still downstream:** `docs/game-design.md`, `docs/assessment.md` and `docs/curriculum.md`
were written before this and have not been revised to match.

### Q-012 — Performance gate or completion gate?  [RESOLVED 2026-08-04]
**Raised:** 2026-08-02 (session 003) · **Answered by:** Project owner
**Question was:** The owner described passing people on when they "get all of the questions
right"; ADR-0005 proposed that completion is the gate and performance only informs the next
stage. Which is it?
**Answer: the completion gate.** Asked directly in session 005, with the fairness cost
stated alongside the option — that a performance gate places real consequence on an
instrument with no validated signal ([Q-003](#q-003--can-simulated-behaviour-predict-real-firm-outcomes-at-all--open))
and would most likely filter on digital fluency rather than business capability, excluding
the Joseph persona the thesis says is most undervalued — the owner chose completion.
**Consequences:** `docs/assessment.md` keeps its prohibition on automatic cut-offs, and no
longer needs a deliberate change. The end-of-run screen states plainly that finishing is
what carries the learner forward, and no threshold is applied to prediction accuracy. The
tally is still shown and still travels with the record, because it informs the next stage.
Recorded as [D-008](./DECISIONS.md).
