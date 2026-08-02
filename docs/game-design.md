# Game design

> **Status:** first draft, unreviewed. Blocked in places on
> [Q-001](../memory/OPEN_QUESTIONS.md) (learner segment) and
> [Q-004](../memory/OPEN_QUESTIONS.md) (session length).

How the simulation works. What it teaches is [`curriculum.md`](./curriculum.md); what it
records is [`assessment.md`](./assessment.md).

---

## The core loop

```
   ┌─────────────────────────────────────────────┐
   │                                             │
   ▼                                             │
 SITUATION ──► INFORMATION ──► DECISION ──► CONSEQUENCE
   │              │              │              │
   │              │              │              └─ arrives with a realistic lag
   │              │              └─ committed, with limited resources
   │              └─ costs time or money to obtain; never complete
   └─ a concrete problem, not a lesson
```

**Situation.** A specific problem in a specific business. "A buyer in Dar wants 500kg a
month, on 60-day terms" — not "learn about payment terms."

**Information.** Never complete and never free. Checking a competitor's price, testing a
sample, or asking a customer costs time, money, or a turn. **Whether the learner seeks
information before deciding is itself one of the strongest signals** — so it must be a
real choice with a real cost.

**Decision.** Committed under constraint. Resources are finite; choosing one thing
forecloses another. No undo — that is where the signal lives.

**Consequence.** Arrives on a realistic lag. Certification takes months. A hire takes
weeks to become productive. Reputation compounds slowly. Immediate feedback would teach
the wrong model of how business works.

Then the situation moves on, carrying the consequences forward.

---

## Structure of time

**Turn** — one decision cycle, a simulated week or month depending on scenario.

**Chapter** — a coherent phase, ending at a threshold: first paid customer, formalising,
first non-family hire, first capability jump. Chapters are natural save and stop points
— essential on a phone with intermittent connectivity.

**Playthrough** — one full run of a scenario. Length is [Q-004](../memory/OPEN_QUESTIONS.md)
and genuinely undecided. The design must degrade gracefully: playable in short sittings,
resumable after weeks away, meaningful even if abandoned partway.

---

## Systems modelled

Only what teaches something. Every system earns its place or is cut — complexity is
paid for in load time, data, and cognitive burden on a small screen.

**Cash.** Balance, timing, receivables and payables. Runs out. Non-negotiable — this is
the spine.

**Demand.** Segments with different willingness to pay, volume and reliability. Responds
to price, quality and relationship, with lag.

**Operations.** Capacity, input costs, spoilage and waste, quality variation. Capacity
is stepped, not smooth — you buy a machine, not a fraction of one. That is what makes a
capability jump feel like a jump.

**People.** Headcount, cost, capability, the productivity dip after hiring, and what the
founder's time is consumed by. The founder's attention is a modelled scarce resource —
that is how delegation becomes visible rather than abstract.

**Formality.** Registration, licences, certification: each with a real cost and a real
lead time, gating access to particular customers and markets. Sourced from
[`context/`](./context/), currently a stub.

**Reputation and relationships.** Slow to build, fast to lose, gates access to buyers
and supplier credit.

**Shocks.** Scheduled and random. See Track 6 in the curriculum.

**Deliberately not modelled:** detailed accounting entries, HR administration, tax
computation to the shilling, market share dynamics. They add burden without teaching a
decision.

---

## The bottleneck mechanic

The signature mechanic, carrying Track 5.

At intervals the learner is asked, in their own words: **what is the one thing holding
this business back?**

Then they act on it — or do not. The simulation shows what actually happens.

Three outcomes worth designing for:

1. **Correct constraint, removed** — trajectory changes visibly.
2. **Wrong constraint, removed** — money spent, little changes. The most instructive
   outcome, and it must not feel like punishment.
3. **Effort spread across everything** — nothing moves much. The default behaviour, and
   the one the mechanic exists to make visible.

The learner's free-text answer is recorded. Comparing what they *said* was binding with
what they *funded* is a strong observation.

---

## Trajectories

At Track 0 the learner chooses: consolidate a livelihood business, or build a
transformational one.

The choice changes the scenario's goals, available options and what "going well" looks
like. It is **not a difficulty setting and not a ranking** — see
[Q-006](../memory/OPEN_QUESTIONS.md). A learner can change trajectory mid-play; that
decision is itself recorded and is interesting.

---

## Failure

Firms fail. The simulation must let them, or nothing is at stake and no signal is
generated.

But failure is a chapter boundary, not a game over. The learner sees what happened,
why, and what the leading indicators were. Then they continue — restructured, restarted,
or into the next chapter.

**What they do after failing is one of the most valuable observations in the record**
(`assessment.md`, "Recovery"). A design that prevents failure destroys that.

---

## Interface constraints

From `AGENTS.md` §3, restated as design rules:

- **One decision per screen.** Small screens, second-language readers, interruption.
- **Numbers shown as consequences, not tables.** "You will be short 400,000 next month"
  beats a cash-flow grid.
- **Icons and layout carry meaning**, not text alone. Varied literacy is the design
  centre.
- **Every state is resumable.** Assume the app is closed mid-decision.
- **Assets budgeted in kilobytes.** Learners pay for data.
- **No timers, no real-time pressure.** Play happens in interrupted fragments.

---

## Content model

Scenarios are **data, not code** — authored as structured content so that people with
domain knowledge and no programming skill can write and review them. This is what makes
local ground truth reachable, and it is a hard requirement, not a nice-to-have.

A scenario declares: setting and value chain, starting state, the situations and their
branches, cost and timing tables, shocks, and which capabilities it exercises.

Format is unspecified pending implementation. Localisation-ready from the start
(`AGENTS.md` §3) — no strings in code, amounts locale-neutral, formatted at render time.

---

## Open

- **[Q-001]** Segment — determines starting state and scenario scope.
- **[Q-004]** Length — determines chapter count and whether multi-week play is a design
  requirement.
- **[Q-005]** First value chain — honey leading.
- Unresolved: how much simulation state a learner can inspect; whether facilitator-led
  group play is a v1 mode; how much randomness before consequences feel arbitrary
  rather than instructive.
