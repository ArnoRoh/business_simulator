# AGENTS.md

Canonical operating guide for AI agents (and humans) working in this repository.
`CLAUDE.md` points here. If any other file disagrees with this one, this one wins —
except `memory/DECISIONS.md`, which is the authority on *what was decided and when*.

---

## 1. What this project is

**Business Simulator** is a browser-based simulation game and guided tutorial that
teaches practical business skills to entrepreneurs in the Global South, with an
initial focus on East Africa (Tanzania first, then Kenya, Uganda, Rwanda, Ethiopia).

It has two connected purposes:

1. **Learning.** A learner runs a simulated enterprise, makes decisions under
   realistic constraints, and sees consequences play out over simulated time.
2. **Selection and on-ramp.** Play generates an evidence trail of *observed
   behaviour* that feeds grant applications and selection into training programmes.

**Purpose 2 is the harder and more valuable one.** Read §2 before designing anything.

## 2. The thesis this project is built on

This is not a generic "teach microentrepreneurs the basics" tool. It rests on a
specific argument set out in `docs/context/transformational-entrepreneurship.md`
(background written by the project owner). Internalise it — it constrains design
decisions throughout.

**The argument, compressed:**

- Development programmes routinely treat every microenterprise as an underfunded
  future medium-sized firm. Most are not. The **livelihood vs. transformational**
  distinction (Schoar) matters: a livelihood firm gives the owner a job; a
  transformational firm builds an organisation larger than the founder.
- Programmes report "businesses trained" and "jobs created," usually from
  **self-reported survey data**, without verifying formality, hours, wages,
  durability, or displacement. Those numbers support a much narrower claim than the
  one they are used to make.
- **Business-plan quality and pitch scores predict future performance poorly.** Even
  in well-run competitions, judges select badly. Founder charisma, hardship
  narratives, business degrees and "grit" questionnaires are weak indicators.
- What predicts better is **observed execution**: securing a paid trial, delivering a
  sample, establishing credible unit economics, recruiting a capable collaborator,
  keeping proper records, and updating sensibly when assumptions break.
- The better funding model is a **portfolio of many cheap experiments**, staged,
  selecting on demonstrated execution, then **removing one specific verified
  bottleneck** in firms that have shown traction — rather than funding generic
  "business growth."

**What this means for us — the design rules that follow:**

| Rule | Consequence |
|---|---|
| The simulator is a **low-cost first-stage execution test**, not a pitch trainer | Score what the learner *did* across many decisions, never how well they described a plan |
| Never build a "generate your business plan" feature as the headline output | It optimises exactly the signal the evidence says is weak |
| Distinguish livelihood from transformational trajectories explicitly | Both are legitimate; the tool must not pretend every learner is scaling, nor cap those who could |
| Teach bottleneck thinking | Scenarios should force "what one constraint, if removed, changes my trajectory?" |
| Model the real cost of formality | Registration, certification, standards, tax and compliance are expensive and often decisive — do not hand-wave them |
| Model delegation and organisation-building | The common failure is a founder who cannot build beyond themselves |
| Be honest about our own evidence | Anything the simulator claims to measure must be defensible; see §6 |

**Not the point of this tool:** making people better at applying for grants. The point
is producing a signal that is *worth selecting on*, and teaching the capabilities that
signal reflects. If those two goals conflict in a design decision, say so explicitly
and escalate — do not quietly optimise for application polish.

## 3. Non-negotiable constraints

These come from the operating context, not from taste. Do not relax them without an
ADR.

| Constraint | Why |
|---|---|
| Mobile-first, low-end Android (2GB RAM, small screens) | The dominant device class among target learners |
| Works offline after first load | Connectivity is intermittent and data is expensive |
| Small data footprint; budget every asset | Learners pay per megabyte |
| Localisable from day one — no hardcoded UI strings | Swahili is first-class, not an afterthought |
| Tolerant of varied literacy and numeracy | Iconography, audio and worked examples over dense text |
| No single-vendor cloud lock-in | Grant-funded work must stay portable and auditable |
| Learner data minimised and consent-based | Participants are often vulnerable; see `SECURITY.md` |

Delivery target is a **mobile-first, offline-capable PWA** (ADR-0002).

## 4. Repository map

```
AGENTS.md              You are here. Operating guide.
CLAUDE.md              Pointer to this file.
README.md              Human-facing project introduction.
CONTRIBUTING.md        How to propose changes.
CODE_OF_CONDUCT.md     Community expectations.
SECURITY.md            Vulnerability reporting + learner-data rules.
LICENSE                MIT — source code.
LICENSE-CONTENT        CC BY-SA 4.0 — curriculum and learning content.

docs/                  Durable design and domain documentation.
  vision.md            Why this exists, who it serves, what success looks like.
  theory-of-change.md  The causal chain from play to firm outcomes, with assumptions.
  personas.md          Learner and facilitator archetypes.
  curriculum.md        Capability map and module outline.
  game-design.md       Simulation loop, mechanics, progression.
  assessment.md        What we observe, what we infer, what we refuse to claim.
  grants.md            How simulator output feeds funding and training pipelines.
  localization.md      Language, literacy, numeracy and accessibility rules.
  context/             Regional and evidence grounding. Start here for domain reading.
  adr/                 Architecture Decision Records. Numbered, immutable once merged.

memory/                Persistent project memory. READ THIS FIRST. See §5.
  PROJECT_STATE.md     Current snapshot: where we are right now.
  DECISIONS.md         Chronological decision log with rationale.
  OPEN_QUESTIONS.md    Known unknowns, blocked items, things needing a human.
  GLOSSARY.md          Shared vocabulary — domain, regional and project terms.
  sessions/            One append-only entry per working session.
```

## 5. The memory protocol

This repository is worked on in short, discontinuous sessions by people and agents who
do not share context. Memory is how continuity survives. **Treat it as part of the
deliverable, not as bookkeeping.**

### At the start of every session

Read, in order:

1. `memory/PROJECT_STATE.md` — where things stand
2. `memory/OPEN_QUESTIONS.md` — what is unresolved
3. The two or three most recent files in `memory/sessions/`
4. `memory/DECISIONS.md` — skim for anything touching today's task

Do not start substantive work before doing this. If the task touches an area with a
recorded decision, honour it or open an ADR to change it — never silently contradict
it.

### During the session

Append to `memory/DECISIONS.md` **at the moment a decision is made**, not at the end.
Decisions recorded retrospectively lose their rationale.

When you hit something you cannot resolve, add it to `memory/OPEN_QUESTIONS.md` with
enough context that a stranger could pick it up.

### At the end of every session

1. Write `memory/sessions/YYYY-MM-DD-NNN-short-slug.md` from
   `memory/sessions/TEMPLATE.md`. `NNN` is a zero-padded counter within that date.
2. Update `memory/PROJECT_STATE.md`. This file is **overwritten**, not appended — it
   is a snapshot, not a history.
3. Resolve or update anything in `OPEN_QUESTIONS.md` that moved.
4. Commit memory updates *with* the work they describe. Memory that lands separately
   drifts.

### Memory vs. docs

- **`docs/`** — what is true about the design. Stable. Rewritten when it changes.
- **`memory/`** — how we got here, what we tried, what we rejected and why, what is
  still open. Accretes. Rarely deleted.

Writing "we decided X because Y, having considered Z"? That is memory. Writing "the
system does X"? That is docs.

### Recording discussions

Conversations with the project owner and partners are first-class inputs. When a
discussion produces direction, capture it in the session entry under `## Discussion` —
**including what was rejected**. Knowing an idea was raised and set aside is often
more valuable than knowing what was chosen. The background note in
`docs/context/transformational-entrepreneurship.md` is the model for this.

## 6. Working agreements

**Scope.** Do what was asked. Do not widen a docs task into a rewrite, or narrow an
implementation task into a stub. If scope is genuinely ambiguous and the readings
diverge materially, ask.

**Evidential honesty.** This project criticises programmes that overclaim from weak
measurement. We are held to the same standard. Do not describe an inferred trait as a
measured one. Do not report a simulator score as a prediction of real-world firm
performance — no such validation exists yet. Where we assert, cite; where we assume,
label it. See `docs/assessment.md`.

**Regional accuracy over plausibility.** This project makes claims about how business
works in specific places. Do not invent regulatory detail, tax rates, fee schedules,
licence names or market prices. If uncertain, mark `<!-- UNVERIFIED -->` and log it in
`OPEN_QUESTIONS.md` for local review. Wrong specifics discredit the whole tool with the
people it is meant to serve.

**Write for a second-language reader.** Short sentences. Common words. Define terms on
first use. This applies to the product *and* to these docs.

**No stock development-sector language.** Avoid "empower", "unlock potential",
"transform lives". Say what the thing does. (Note that "transformational" is a
*technical* term here, per §2 — use it precisely or not at all.)

**Currency and numbers.** Never hardcode a currency. Content amounts are authored
locale-neutral and formatted at render time. Simulated economies use locally realistic
magnitudes — see `docs/context/`.

**Don't ship placeholder content as real.** Sample scenarios stay visibly labelled as
samples until reviewed by someone with local ground truth.

## 7. Decisions and ADRs

Anything expensive to reverse gets an ADR in `docs/adr/`:

- technology, platform and hosting choices
- data model and learner-record schema
- pedagogy, scoring or selection-signal changes
- licensing and distribution
- anything affecting what we claim the evidence trail means

Copy `docs/adr/template.md`, take the next number, open as `Proposed`. Merged ADRs are
immutable — supersede, never edit. Add a one-line pointer in `memory/DECISIONS.md`.
Smaller decisions go straight to `memory/DECISIONS.md` with no ADR.

## 8. Git conventions

- Branch from the default branch. Never commit directly to it.
- Commit messages: imperative mood, scoped prefix where useful —
  `docs: add Tanzania formalisation costs`, `memory: record session 004`.
- One logical change per commit. Memory updates ride with their work.
- Push with `git push -u origin <branch>`.
- Do not open a pull request unless asked.

## 9. Current stage

**Documentation and design.** There is no application code yet, deliberately: ADR-0002
fixes the delivery target, but the curriculum, simulation model and — critically — the
assessment model are specified before implementation begins.

`memory/PROJECT_STATE.md` holds the live picture; this section will go stale.
