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

### Q-018 — Are the chapter 2–4 opening states realistic for Tanzania?  [BLOCKING for chapters 2–4 · needs local review]
**Raised:** 2026-08-08 (session 008) · **Owner:** Project owner / someone running a real
bakery or food processor in Tanzania
**Question:** Chapters 2, 3 and 4 open on authored balance sheets — rent, wages, oven
cost, loan size, interest rate, margins, staff numbers, weekly volumes. Every one of
those figures was chosen to make the simulation work, not because anyone knows what a
bakery in Dar es Salaam actually pays. Specifically: is TZS 180,000 a week plausible rent
for a small bakery premises; is 90,000 a week a plausible wage; is a second-hand oven
TZS 3,000,000; is 22% a plausible commercial term-loan rate; are the wholesale bread
margins near 30%; is a 9-person factory paying 180,000 a week each?
**Why it matters:** This is a bigger exposure than chapter 1's, because there are three
times as many numbers and they are less common knowledge — most people can sanity-check
the price of a mandazi and very few can sanity-check a term-loan rate. `AGENTS.md` §6 is
explicit that wrong specifics discredit the whole tool with the people it is meant to
serve. Chapter 1's placeholders are already unverified (Q-015 and the in-app banner);
this triples the surface.
**Current assumption:** All three chapters ship with `unverified: true`, so the existing
in-app banner appears. That is honest, not sufficient. The owner runs Upendo Honey /
Third Man Ltd and Tanganyika Blue and is the nearest available ground truth for the
factory and export chapters in particular.

## Open

### Q-025 — Is chapter 4's opening ledger too much to meet at once?  [open]
**Raised:** 2026-08-08 (session 012) · **Owner:** Project owner / playtesting
**Question:** [D-025](./DECISIONS.md) makes each ledger line beyond the basic five introduce
itself once, in a sentence. That gives 1 line in chapter 1, 3 in chapter 2, 3 in chapter 3
and **5 in chapter 4** — spoilage, freight, duty, depreciation and interest, all on the first
turn, because chapter 4 opens with all of them already running. Five short paragraphs above
the first decision, on a small screen.
**Why it matters:** the alternative that was there before was silence, and silence is worse —
but the point of the panel is that it can be read, and five explanations is close to the
point where a learner scrolls past all of them.
**What would answer it:** somebody playing chapter 4 on a phone. Not another opinion here.
**Current assumption:** left at five. If it needs cutting, cut words rather than
explanations: a learner who meets `duty` with no idea what it is has been handed a ledger
they cannot read, which is the failure this fixes.

### Q-026 — Mechanical depth peaks in chapter 2, not chapter 4. Is that the shape you want?  [open]
**Raised:** 2026-08-08 (session 012) · **Owner:** Project owner
**Question:** Counting the distinct engine fields each chapter's content actually moves:

| Chapter | Engine fields touched | Delayed consequences | Diagnose steps |
|---|---|---|---|
| 1 — stall | 14 | 8 of 42 options | 1 |
| 2 — bakery | **26** | 11 of 45 | 1 |
| 3 — factory | 21 | 14 of 45 | 2 |
| 4 — export | 18 | 13 of 45 | 1 |

Chapter 2 introduces product mix, depreciation, debt, interest, repayment, working capital
and spoilage — **twelve new fields at once**, immediately after a chapter with none of them.
Chapters 3 and 4 are then mechanically *lighter* than chapter 2 while being conceptually
harder (bottlenecks, standard costing, Incoterms, letters of credit, preferential access).
The shape of the arc is a cliff and then a plateau, not a ramp.
**The case that this is correct:** [`arc.md`](../docs/arc.md) §1 says the chapters progress by
*what kind of thing you are running*, not by mechanic count, and the profit-versus-cash
cluster genuinely all belongs in chapter 2 — that is what the bakery is for. On that reading
the numbers above are the design working.
**The case that it is not:** every structural measure is flat. All four chapters are 20 turns,
15 choices, 4 numeric inputs, 1 allocation, information on every turn. A learner who finishes
chapter 2 meets nothing structurally new again, and the hardest single step in the whole arc
is the one from chapter 1 to chapter 2, where the most learners will be.
**What was done about it in session 012:** nothing to the content, which is the owner's call.
[D-025](./DECISIONS.md) softens the cliff at the point it is actually felt — the ledger — by
having each new line explain itself. Whether the arc needs restructuring beyond that is this
question.

### Q-022 — Should band stability be checked on more than three paths, and fail?  [open]
**Raised:** 2026-08-08 (session 011) · **Owner:** Project owner, for the chapter 1 part
**Question:** `validate-scenario.mjs` walks three fixed paths — always the first option,
always the middle, always the last. Nobody plays that way, and an option's band depends on
the state earlier decisions left behind. Session 011 added a 400-path random sweep with a
fixed seed. It **reports** and does not fail. Should it fail?
**What it found immediately**, in content the three-path check had just passed clean:

| Chapter | Holds its band across 400 paths | Drifting options |
|---|---|---|
| mama-asha | 41/42 | `t09/ask-later` |
| bakery | 38/45 | `t08`, `t09`, `t12`, `t14`, `t15`, `t18` ×2 |
| factory | 41/45 | `t12`, `t14`, `t19` ×2 |
| export | 45/45 | — |

> The factory row read `45/45` when this question was first written, in the same pass that
> fixed its four declared-band failures. It does not: the check prints `41/45`, standalone
> and in a full run. Corrected at the end of session 011 from what the check actually says.
> Only chapter 4 clears the sweep.

**Why it matters:** an option that changes band between paths grades identical reasoning
differently depending on decisions made ten turns earlier. That is the same unfairness
[D-015](./DECISIONS.md) and the three-path check exist to prevent — the check was simply
not looking hard enough. Prediction accuracy is the signal the assessment rests on.
**Why it does not fail today:** turning it into a FAIL turns three of the four chapters
red, and chapter 1 is content the owner has played and accepted — see
[Q-021](#q-021--up-a-lot-is-unreachable-in-chapter-1-and-only-content-can-fix-it). An
integrator should not force a rebalance of the owner's accepted content by way of a check.
**Current assumption:** reports every run, next to the numbers a person already reads.
Make it a FAIL once the owner has ruled on chapters 1 and 2.

### Q-023 — Is the export chapter now too easy, and is its narrowed freight range right?  [open]
**Raised:** 2026-08-08 (session 011) · **Owner:** Project owner / playtesting
**Question:** Two things about chapter 4 that a human should look at:
1. An `attentive` player now finishes at ~137m cash, ~5.7m a week and reputation 77. Before
   session 011 it finished at ~97m with reputation 33 — the difference is almost entirely
   one engine defect ([D-021](./DECISIONS.md)) that was charging 34–50 reputation for
   naming any export price at all. There is no earlier honest calibration to compare
   against, because every previous run was measuring a broken control.
2. Turn 2's freight range was narrowed from 100–320 to 120–240 per unit, to stop a single
   number chosen at turn 2 swinging turn 3's Incoterms comparison by more than the whole
   band was wide. The top of the range now describes 240, not 320.
**Why it matters:** [D-019](./DECISIONS.md) sets the floor — a chapter must be finishable
by someone who heeds the warnings — and says nothing about a ceiling. A last chapter that
is the *easiest* to finish well would be the arc arriving backwards.
**Current assumption:** left as it is. It is no longer measuring a broken control as the
learner's judgement, which was the thing that had to be true; whether it now has enough
teeth is a playtesting question, not one more round of tuning by the author.

### Q-024 — Bakery turn 16 is a prediction with only one answer  [open]
**Raised:** 2026-08-08 (session 011) · **Owner:** whoever next edits chapter 2's content
**Question:** All three options on the bakery's turn 16 (keeping books) declare `same`, so
`validate-scenario.mjs` prints `weak t16`. The learner predicts, and every choice is the
same prediction.
**Why it matters:** small, and worth fixing when the file is next open. A turn that cannot
discriminate teaches nothing at the moment of engagement, and it quietly dilutes the
prediction signal. It is also a nag on every validation run, which is how real warnings
come to be ignored.
**Current assumption:** left alone. The turn's *content* is sound — record-keeping does not
move this week's profit, which is exactly its lesson — so the honest fix is probably a
delayed consequence rather than a same-week effect, and that is a content decision.

### Q-021 — "Up a lot" is unreachable in chapter 1, and only content can fix it  [open]
**Raised:** 2026-08-08 (session 010) · **Owner:** Project owner
**Question:** Of chapter 1's forty-two option predictions, exactly **one** lands in "up a
lot". Should chapter 1's content change so the fourth band means something?
**Why it matters:** A four-way prediction that behaves as a three-way one narrows the
signal prediction accuracy is supposed to carry ([Q-014](#q-014--do-the-prediction-bands-match-how-learners-think--open)),
and it is quietly unfair — a learner who reasons their way to "a lot" is almost always
marked wrong because the content never produces a lot.
**Why it is not just a band setting.** This was tried. Chapter 1's positive deltas run
358 … 10,845 and then jump straight to 38,600. Every edge in that gap gives the same
result, and the only lower edge that would promote more options (8,000) makes `t08` land
in two different bands depending on the path taken to reach it — which the validator
rejects, correctly. The bakery was fixed this way and chapter 1 cannot be
([D-018](./DECISIONS.md)).
**Why it was not fixed anyway:** the remedy is to author an outcome in the 12,000–38,000
range, and chapter 1 is content the owner has **played and accepted**. Rebalancing it is
their call, not an integrator's.
**Current assumption:** Left as it is. Chapter 1 keeps the engine's default edges, and
chapters 2 onward author their own.

### Q-019 — Does anyone play past chapter 1?  [open]
**Raised:** 2026-08-08 (session 008) · **Owner:** Project owner / field testing
**Question:** [ADR-0007](../docs/adr/0007-four-chapter-arc.md) assumes a learner who
finishes the stall will want the bakery. Nothing supports that. The chapters are
deliberately unlocked and unranked, so there is no extrinsic pull at all — only whether
the next business is interesting enough on its own.
**Why it matters:** If nobody progresses, the arc is three chapters of unread content and
the answer was one deeper scenario after all. It also decides whether the six carried
flags earn their complexity: continuity nobody experiences is not continuity.
**Related:** This is [Q-011](#q-011--does-compelling-rather-than-fun-actually-retain-learners--open)
at chapter scale, and it inherits Q-011's problem — it is an argument, not evidence.
ADR-0007's "revisit if" names this specifically as the trigger for reconsidering full
state carry-forward.
**Current assumption:** Untested. Needs someone who is not the author playing two
chapters in a row.

### Q-020 — Do the carried flags feel like anything?  [open]
**Raised:** 2026-08-08 (session 008) · **Owner:** Project owner / playtesting
**Question:** Six flags travel between chapters and tint the opening plus at most two
turns. Is that enough for a learner to notice that their earlier decisions followed them,
or does it read as nothing at all?
**Why it matters:** The hybrid design (D-016) exists precisely to buy felt continuity
cheaply. If it buys none, the honest options are to drop it — four independent scenarios,
which is simpler and survives every check — or to accept the testability cost of real
state carry-forward. Keeping a mechanism that does nothing is the one outcome with no
argument for it.
**Current assumption:** Untested, and deliberately small. The cap is in ADR-0007 rather
than in taste, so raising it is a decision with a record, not a drift.

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
**PARTLY ANSWERED 2026-08-05 (session 006).** The six free-input turns no longer use bands
at all — the learner names an actual profit figure, graded close / near / off
([D-012](./DECISIONS.md)), which removes the boundary problem entirely for those turns. The
fourteen categorical turns still use bands, so the question stands for them.
**Current assumption:** Bands are stable across playthrough paths (verified, 42/42) and are
now labelled on screen with the money they cover, but whether they are *intuitive* is still
untested.

### Q-017 — Can a learner estimate a weekly profit figure at all?  [open]
**Raised:** 2026-08-06 (session 007) · **Owner:** Project owner / playtesting
**Question:** The owner played the v3 build and said "the pricing and estimating earnings
are hard". Part of that was a defect — the prediction stepper could not reach the true
answer on three of the six numeric turns, so the complaint was correct and unfixable by
effort ([D-015](./DECISIONS.md)). Session 007 made every answer reachable, showed the
price decision's arithmetic through to the weekly gross, and kept margin and fixed costs
on screen during the estimate. What is not known is whether estimating a figure is now
*comfortable* or merely *possible*.
**Why it matters:** [D-012](./DECISIONS.md) already says to anchor the stepper harder
rather than return to bands if learners cannot estimate at all. Deciding that needs
someone who is not the author trying it.
**Current assumption:** The scaffolding is now enough. Untested by anyone.

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
