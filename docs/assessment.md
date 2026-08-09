# Assessment and the behavioural record

> **Status:** the rules below are policy and they are unreviewed — this is still the
> document most likely to have misread the owner's intent, and the one to review first.
>
> **What is built is now marked.** Reconciled against `app/js/record.js` on 2026-08-09
> (session 013). Where the design asks for something the application does not record or
> compute, it says so in place rather than leaving the reader to assume. That
> distinction matters more here than anywhere else in `docs/`: this file is the one that
> says what we may claim, and claiming an indicator we do not compute would be the exact
> failure the project exists to criticise.

This project criticises programmes that overclaim from weak measurement. That criticism
binds us. This document defines what we observe, what we may infer, and what we refuse
to say.

---

## The one rule

> **Report what was observed. Never report a prediction.**

We have no evidence that in-simulation behaviour predicts real firm performance
([Q-003](../memory/OPEN_QUESTIONS.md)). Until an external study establishes otherwise,
every output says what a learner *did in the simulation* — never what they *would do*,
are *likely to*, or are *suited for*.

This is not caution for its own sake. A tool that quietly acquires predictive authority
it has not earned would allocate real money on a signal nobody validated. That is the
failure the project exists to address.

---

## Three layers

### Layer 1 — Observations (recorded, factual)

Raw decision data. Not interpretation. Observations are the durable artefact: they
survive every change to how we interpret them, which is why scoring is never baked into
storage.

**Recorded today**, each entry timestamped and appended in order:

| Kind | What it holds |
|---|---|
| `decision` | The turn, its concept, the option chosen and its label, how many information items were bought first, and the weekly profit before and after |
| `prediction` | What was predicted, what happened, whether it was right — and for a numeric estimate, the error and its grade |
| `info-sought` | Which information item was bought, on which turn |
| `diagnosis` | Which ledger line the learner named as the source of a loss, and the answer |
| `input` | A number the learner supplied — a price, a wage, a split — as the value itself |

**Designed and not recorded:**

- **Time taken and revisions.** Each observation carries the wall-clock time it was
  written, so elapsed time between decisions is recoverable, but nothing records
  hesitation, a changed answer, or a stepper moved and moved back.
- **Free-text reasoning.** Nothing in the application asks the learner to explain a
  decision in their own words. `observeConstraint()` exists in `record.js` for exactly
  this and is called by nothing — see [`game-design.md`](./game-design.md), "Designed
  and not built". Every observation above is therefore a *choice among authored
  options*, which bounds what the record can ever show.

### Layer 2 — Behavioural indicators (derived, labelled as derived)

Patterns computed from observations. Each one names its evidence. An indicator that
cannot point at its evidence is an opinion and does not ship — and every one below
carries its evidence list in the artefact.

**Computed today**, in `record.js`:

| Indicator | What it counts | Evidence it cites |
|---|---|---|
| **Calibration** — anticipating consequences | Correct predictions out of total, split early vs. late so improvement is visible | Every prediction, with what was predicted and what happened |
| **Information-seeking** — checking before deciding | Decisions where something was bought first, out of total | Every decision, its concept, its choice, and how much was bought |
| **Recovery** — after a setback | Decisions that reduced weekly profit, and what was chosen next | Each setback turn, the drop, and the following choice |
| **Concept coverage** | Distinct concepts a decision was made about | Each concept and how many times |
| **Diagnosis** — identifying the source of a loss | Correct diagnoses out of total | Each diagnose step, what was picked, what the answer was |

Calibration is the strongest of these and the reason predict-then-reveal is the spine of
the loop: becoming well calibrated about a system requires understanding it, and it is
hard to fake by performing for an assessor.

**Candidate indicators from the background note that are NOT computed.** Each needs an
observation the application does not currently make; none should be reported as if it
were available.

| Indicator | Why it is not computed |
|---|---|
| **Constraint identification** | Needs the free-text bottleneck question, and the comparison of what was *said* to be binding with what was *funded*. Neither exists. Chapter 3's bottleneck turn and the diagnose steps are recognition among authored options, which is a weaker thing. |
| **Assumption updating** | Needs a per-turn notion of what the learner believed before the assumption broke. The prediction record is the nearest thing, and turning it into this indicator has not been designed. |
| **Unit-economics realism** | The numeric decisions record the figure supplied, so the raw material exists. Nothing computes whether those figures survived contact with costs. |
| **Record keeping** | Partly covered by information-seeking; the `keepsRecords` carried flag is a fact about the run, not an indicator. |
| **Delegation** | The hiring and delegation turns are observed as decisions like any other. Nothing derives a pattern across them. |
| **Capital discipline** | The observation now exists — the split is recorded as `input` entries, it happens with most of the chapter still to run, and what the business is worth is computable at any turn (D-030, D-032). Nobody has written the derivation. This is the closest of the seven to being real. |
| **Customer validation** | Needs the paid-trial content that [`curriculum.md`](./curriculum.md) records as a gap (2.2). |

**Explicitly excluded** — the weak predictors named in the background note. Do not build
proxies for them: youth, charisma, presentation quality, expressed passion, hardship
narrative, formal credentials, promised job numbers, or generic personality and grit
constructs. If an indicator would correlate mainly with one of these, it is a bug.

### Layer 3 — The readiness profile (human-facing, hedged)

A human-readable summary for programme staff, and for the learner themselves.

**Required properties:**

1. **Observation-anchored.** Every statement points to what happened. "Identified the
   cold-chain constraint in month 4 and redirected the equipment budget toward it" —
   not "shows strategic thinking."
2. **No single score.** No composite number, no rank, no percentile. A single score
   invites exactly the mechanical filtering that makes plan scores harmful, and hides
   which behaviours drove it.
3. **Limitations stated in the document itself.** The profile carries its own caveat —
   what it does not measure, and that it is not validated against real outcomes. Not a
   footnote; part of the artefact, because it will be read out of context.
4. **Learner-visible.** The learner sees their own profile in full. Nothing is recorded
   about someone that they cannot read.
5. **Trajectory-aware.** Judged against the path the learner chose (livelihood
   consolidation or transformational growth), not against a single ideal. See
   [Q-006](../memory/OPEN_QUESTIONS.md).

**Built:** properties 1–4. The profile is a list of statements, each naming its
indicator and each written so that deleting "in the simulation" would make it false; it
carries its four limitations inside the artefact rather than as a footnote; there is no
composite number anywhere, and tests assert there is none. The learner sees the whole
thing on the end-of-chapter screen and can download it. The statements are rendered in
the learner's language and the downloaded copy keeps the English, because the programme
reading it may not share the learner's language.

**Not built:** property 5. Nothing asks the learner which trajectory they are pursuing,
so nothing can judge against it — see [`game-design.md`](./game-design.md), "Designed
and not built". The profile is currently trajectory-blind, which is not the same as
neutral: it reports the same statements to a learner consolidating a livelihood business
as to one trying to build past themselves.

---

## Language rules

These apply to product copy, exports, documentation and anything shown to a funder.

| Never write | Write instead |
|---|---|
| "Ready for funding" | "Completed the growth-stage scenario; profile attached" |
| "High potential" / "low potential" | Describe the behaviour observed |
| "Score: 78/100" | Named indicators with their evidence |
| "Likely to succeed" | "In simulation, did X when Y" |
| "Entrepreneurial aptitude" | "Observed decision behaviour" |
| "Assessed", "evaluated", "graded" | "Observed", "recorded" |

If a sentence about a learner would still make sense with "in the simulation" deleted,
it is overclaiming.

---

## Gaming and adversarial use

Any consequential assessment gets gamed. Assume it.

- **Do not publish the indicator logic to learners.** Not secrecy about the *existence*
  of assessment — learners are told plainly what is recorded and why. Secrecy about the
  weights. **This one does not survive contact with the repository**: the code is public
  and MIT-licensed, `record.js` is readable by anyone, and there are no weights to hide
  because there is no composite score. The honest version of the rule is that we do not
  *advertise* the logic in the product, and we do not rely on its obscurity for
  anything.
- **No single optimal line.** Scenarios vary and involve genuine trade-offs, so
  memorising one path does not pay. Partly true today: the four chapters are fixed
  content, so a determined learner could memorise a chapter. Nothing randomises.
- **Score process, not outcome.** A well-reasoned decision that fails to bad luck should
  read better than a lucky guess. **Held by design rather than by mechanism** — no
  outcome is scored at all, and the record reports what was chosen and what followed.
- **Detect and flag replay.** Repeated attempts are recorded. Improvement across
  attempts is itself interesting — it may be the most honest learning signal we have —
  but it is not the same as first-attempt behaviour and must not be silently merged.
  **Not built.** Replaying a chapter clears the saved session and starts a new record;
  nothing counts attempts or marks a record as a second one. What persists between
  chapters is the six carried flags and which chapters were finished, and neither says
  how many times.

## Fairness

The most likely way this tool causes harm is by measuring digital fluency and calling it
business capability. That would disadvantage older, less screen-literate operators —
precisely the people the background note says are the *best* candidates.

Required before any use in a real selection decision:

- Test with low-digital-literacy users and compare against their known business track
  record.
- Check indicator distributions against age, gender, education and device class. A
  strong relationship to any of these is a red flag about the instrument, not a finding
  about the people.
- Offer a facilitator-assisted mode so device unfamiliarity is not scored as business
  behaviour.

**None of these three has been done.** Nobody outside this repository has played any
chapter, so there is no distribution to check and no low-digital-literacy user to
compare against; there is no facilitator-assisted mode. Until that work exists, the tool
is for learning, and any selection use is explicitly experimental. The profile says so
in its own limitations, and the end-of-chapter screen says finishing is what carries a
learner forward, never how many predictions they got right.

---

## Data and consent

The behavioural record is consequential personal data once it touches funding. See
[`../SECURITY.md`](../SECURITY.md) and [Q-008](../memory/OPEN_QUESTIONS.md).

Working position: local-first storage, the learner holds their own record, explicit
opt-in before anything is shared with any programme, and a learner may play without
sharing anything at all.

**Built:** everything is in `localStorage`, and the application never sends anything —
there is no code in it that writes to the network. The only fetches it makes are for its
own content files. The learner downloads their own record as a file, deliberately, from
a button on the end screen. What has not been built is the consent
flow itself, because there is nothing yet to consent *to*: no programme consumes the
record ([Q-002](../memory/OPEN_QUESTIONS.md)). The moment one does, this section stops
being a working position and needs an ADR.
