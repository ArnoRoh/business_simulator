# Assessment and the behavioural record

> **Status:** first draft, unreviewed. This is the document most likely to have
> misread the owner's intent — it encodes the strongest interpretive claims in the
> project. Review it first.

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

Raw decision data. Not interpretation.

- What was chosen, from which options, at what simulated time
- What information the learner had when choosing
- Time taken, revisions, whether they sought more information first
- What happened as a result
- What they did next, particularly after an adverse outcome
- Free-text responses where the learner explains their reasoning

Observations are the durable artefact. They survive every change to how we score, which
is why scoring must never be baked into storage.

### Layer 2 — Behavioural indicators (derived, labelled as derived)

Patterns computed from observations. Each one names its evidence.

Candidate indicators, drawn from the execution-test traits in the background note:

| Indicator | Observable behaviour |
|---|---|
| **Constraint identification** | Does the learner locate the binding constraint, or spread resources across everything? |
| **Assumption updating** | When an assumption breaks, do they change course or persist? How fast? |
| **Unit-economics realism** | Do their prices and volumes survive contact with actual costs? Do they check before committing? |
| **Record keeping** | Do they use available information, or decide blind when data was there? |
| **Delegation** | Do they build capacity beyond themselves when the firm outgrows one person? |
| **Capital discipline** | Capability-jump investment vs. working capital consumed on payroll, rent and stock |
| **Customer validation** | Do they seek a real commitment before scaling, or scale on assumption? |
| **Recovery** | What do they do after a serious setback? |

Every indicator must be traceable to specific observations. An indicator that cannot
point at its evidence is an opinion and does not ship.

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
  weights.
- **No single optimal line.** Scenarios vary and involve genuine trade-offs, so
  memorising one path does not pay.
- **Score process, not outcome.** A well-reasoned decision that fails to bad luck
  should read better than a lucky guess.
- **Detect and flag replay.** Repeated attempts are recorded. Improvement across
  attempts is itself interesting — it may be the most honest learning signal we have —
  but it is not the same as first-attempt behaviour and must not be silently merged.

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

Until this work is done, the tool is for learning, and any selection use is explicitly
experimental.

---

## Data and consent

The behavioural record is consequential personal data once it touches funding. See
[`../SECURITY.md`](../SECURITY.md) and [Q-008](../memory/OPEN_QUESTIONS.md).

Working position: local-first storage, the learner holds their own record, explicit
opt-in before anything is shared with any programme, and a learner may play without
sharing anything at all.
