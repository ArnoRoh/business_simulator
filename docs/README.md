# Documentation

Durable design and domain documentation. For *how we got here* — decisions, discussions,
open questions — see `../memory/`, which is **not published**: it records private
conversations and is kept on the working machine. Links into it from these documents
will not resolve on a public checkout.

## Read in this order

Start with the background note. Everything else is downstream of it.

| # | Document | What it covers |
|---|---|---|
| 1 | [`context/transformational-entrepreneurship.md`](./context/transformational-entrepreneurship.md) | **The project owner's background note.** The intellectual foundation. Where other docs disagree with it, the note is right. |
| 2 | [`vision.md`](./vision.md) | Why this exists, what it is and is not, what success looks like |
| 3 | [`theory-of-change.md`](./theory-of-change.md) | The causal chain from play to firm outcomes, with the weak links named |
| 4 | [`assessment.md`](./assessment.md) | What we observe, what we infer, what we refuse to claim |
| 5 | [`curriculum.md`](./curriculum.md) | Capability map — what a learner should be able to do |
| 6 | [`game-design.md`](./game-design.md) | Simulation loop, systems, mechanics |
| 7 | [`arc.md`](./arc.md) | The four-chapter arc: stall, bakery, factory, export, and what each one teaches |
| 8 | [`personas.md`](./personas.md) | Learner and programme-side archetypes |
| 9 | [`localization.md`](./localization.md) | Language, literacy, numeracy, device and data constraints |
| 10 | [`grants.md`](./grants.md) | How output reaches funding and training pipelines |
| — | [`one-pager.md`](./one-pager.md) | **The concept in one page**, for someone outside the project. Shareable version at `one-pager.html` — **generated**, see below |
| — | [`concept-note.html`](./concept-note.html) | The long version: the programme, the pilot and a GiveWell-shaped cost-effectiveness model. **Generated** |
| — | [`adr/`](./adr/) | Architecture Decision Records |
| — | [`context/`](./context/) | Regional and evidence grounding |

If you only read two: the background note, and [`assessment.md`](./assessment.md).
Between them they contain the whole argument.

## Status

**Everything except the owner's background note is first draft and unreviewed.** These
documents were written in the repository's first session from the note plus a short
scoping conversation. They represent a careful reading of the owner's intent, not the
owner's own words, and the interpretive documents — `vision.md`, `theory-of-change.md`,
`assessment.md` — are where a misreading would do the most damage.

`context/` beyond the background note is a **stub**. Country operating detail has been
deliberately left unwritten rather than invented.

Current state: [`../memory/PROJECT_STATE.md`](../memory/PROJECT_STATE.md).

## Generated files — never hand-edit

| Output | Built by | Source |
|---|---|---|
| `one-pager.html` | [`../scripts/build-one-pager.py`](../scripts/build-one-pager.py) | `one-pager.md`. The build fails if the note's figures disagree with the model |
| `concept-note.html` | [`../scripts/build-concept-note.py`](../scripts/build-concept-note.py) | [`../scripts/lib/cea_model.py`](../scripts/lib/cea_model.py) |
| `concept-note-model.xlsx`, `.csv` | [`../scripts/build-model-xlsx.py`](../scripts/build-model-xlsx.py) | the same model |

Both builders are stdlib-only Python and deterministic. There is no PDF step — this
environment has no renderer. `one-pager.html` carries a print stylesheet, so
**Print → Save as PDF** produces the sendable file.

## Conventions

- **Docs describe what is true about the design.** Reasoning, alternatives and history
  belong in `../memory/`. See [`AGENTS.md` §5](../AGENTS.md#5-the-memory-protocol).
- **Unverified factual claims are marked** `<!-- UNVERIFIED -->` and logged in
  [`../memory/OPEN_QUESTIONS.md`](../memory/OPEN_QUESTIONS.md). Regulatory detail, costs
  and prices are never invented.
- **Open questions are referenced inline** as `[Q-NNN]`, linking to the questions file,
  so a reader can see where a document rests on something undecided.
- Documents carry a status line when they are provisional.
