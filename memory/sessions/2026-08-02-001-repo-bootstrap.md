# Session 001 — Repository bootstrap

**Date:** 2026-08-02
**Worked by:** Project owner (Arno Rohwedder) + Claude (claude-opus-5, Claude Code)
**Branch:** `claude/business-simulator-repo-setup-lpe4ir`
**Duration / scope:** Single session. Full initial scaffold from an effectively empty
repository.

---

## Goal

From the owner's request:

> "I'm looking to build a business simulator game/tutorial so people can learn business
> skills. The idea is for this to be used as an on ramp for grant applications and
> training for participants. This is building on development work in the global south,
> with an initial focus on east africa. Can you please set up this repo initially with
> the standard things for this type of project. agents.md, claude.md that points there,
> persistent memory to understand how progression has occurred and our discussions,
> etc."

Set up the repository with an operating guide, a memory system, governance files and
first-draft design documentation.

## What happened

The repository contained only a stub `README.md` on `main`. Three scoping questions
were put to the owner before writing anything; answers were: **docs and memory scaffold
only** (no app code yet), **MIT for code plus CC BY-SA 4.0 for content**, and
**mobile-first offline-capable PWA** as the delivery target.

Work began on that basis. Partway through, the owner added background material to
`main` — `transformational_entrepreneurship_summary.md`, a substantial note on the
World Bank MbeleNaBiz competition and the design of programmes that produce genuinely
transformational firms.

**This reframed the project, and the first draft of `AGENTS.md` was discarded and
rewritten.** The initial draft treated the project as a business-literacy tool for
micro and small enterprises — competent, but generic, and it would have led directly to
building the exact features the owner's note argues against.

The working branch was rebased onto `origin/main` so the owner's uploads were preserved
rather than orphaned, and the background note was moved to
`docs/context/transformational-entrepreneurship.md` (via `git mv`, history intact).

Everything written after that point is grounded in the note's argument. See §2 of
`AGENTS.md`, which now carries the thesis explicitly so that future contributors and
agents cannot miss it.

## Discussion

The background note is the substance of the discussion this session. Its argument, and
what was taken from it:

**On measurement.** The owner's scepticism about MbeleNaBiz is methodological: reported
employment gains come from entrepreneur surveys, not verified payroll or
social-security records, and the materials do not establish whether owners were counted,
whether unpaid family labour was included, whether casual work was equated with
permanent staff, or what the wages and hours were. The defensible claim is "recipients
reported employing more people," not "durable formal jobs were created."

*Taken as:* the project must not overclaim from its own measurements either. This became
an explicit working agreement (`AGENTS.md` §6, "Evidential honesty") and drives
`docs/assessment.md`, which distinguishes what is observed from what is inferred and
states plainly what we refuse to claim. Q-003 records that we have no evidence
simulated behaviour predicts real performance, and holds us to saying so.

**On selection.** Business-plan scores and pitch quality predict poorly, even in
well-run competitions; observed execution predicts better. Weak indicators include
youth, charisma, hardship narratives, business degrees and grit questionnaires.

*Taken as:* the decisive product decision (D-004 / ADR-0004). The simulator is a
first-stage execution test producing a behavioural record. **A business-plan generator
was explicitly rejected** — it is the obvious product shape and the one most grant
programmes would ask for, but it optimises the signal the evidence says does not work.
Flagged prominently in `AGENTS.md` §2 because it will otherwise be re-proposed.

**On the livelihood/transformational distinction.** Central analytically, but it carries
an obvious risk of condescension toward learners. Raised as Q-006 rather than resolved;
the working position is to present these as different trajectories with different
requirements, learner-chosen, never as a ranking.

**On what good programme design looks like.** Bottleneck removal over generic growth
funding; capability-jump investment over payroll and inventory subsidy; staged portfolio
funding over trying to pick winners from applications; customer creation and real
purchase orders over pitches. These shaped `docs/curriculum.md` (organised around
capabilities, with bottleneck thinking as a first-class skill) and `docs/game-design.md`
(the core loop forces identification of a binding constraint).

**On ground truth.** The owner runs Upendo Honey / Third Man Ltd (~130 employees,
thousands of beekeeper suppliers, export, certified), Tanganyika Blue (aquaculture) and
Dark Earth Carbon (industrial carbon removal), with operating experience in Tanzania.

*Taken as:* Tanzania leads the geographic sequence (D-005) rather than Kenya, despite
Kenya having the larger published evidence base — access to real operational detail
matters more than proximity to the literature. Honey is the leading candidate for the
first scenario (Q-005): the owner can verify it, and the chain from beekeeper through
aggregation, processing and certification to export exercises exactly the capabilities
the project cares about.

**Not discussed, and therefore open:** the target learner segment, whether a specific
partner programme exists, and how long a playthrough runs. These are Q-001, Q-002 and
Q-004, all marked blocking.

## Decisions made

- **D-001** — Bootstrap at documentation stage, no application code yet
- **D-002** — Mobile-first offline-capable PWA (ADR-0002)
- **D-003** — MIT for code, CC BY-SA 4.0 for content (ADR-0003)
- **D-004** — Simulator as selection instrument, not business-plan trainer (ADR-0004)
- **D-005** — Tanzania first, then wider East Africa

## Questions raised or resolved

Raised: **Q-001** (primary learner segment, blocking), **Q-002** (which programme this
feeds, blocking), **Q-003** (can simulated behaviour predict anything), **Q-004**
(playthrough length, blocking), **Q-005** (first value chain), **Q-006** (handling the
livelihood/transformational distinction with learners), **Q-007** (language plan),
**Q-008** (learner data, consent, hosting).

Resolved: none.

## State at end of session

The repository has a complete documentation and memory scaffold. Governance files,
licences, issue and PR templates, ADR framework with four records, and eight design
documents.

**All design documentation is first draft and unreviewed.** `docs/vision.md`,
`docs/theory-of-change.md` and `docs/assessment.md` carry the strongest interpretive
claims — they are an AI's reading of the owner's note, and are the most likely to have
got something subtly wrong.

`docs/context/` beyond the owner's own note is a **stub**. Country-level operating
detail — registration steps, real costs, tax thresholds, licensing — has deliberately
not been invented. Writing plausible-but-wrong regulatory specifics would discredit the
tool with exactly the people it is for, so the file names the gaps instead of filling
them.

Nothing is half-finished in a broken state.

## Next steps

1. Owner reviews `docs/vision.md`, `docs/theory-of-change.md`, `docs/assessment.md` —
   correct any misreading of the thesis before it propagates further.
2. Resolve **Q-001** and **Q-004**. Nearly all downstream design waits on these.
3. Fill `docs/context/` with verified Tanzania operating detail from ground truth.
4. Once Q-001 and Q-005 are settled, specify one scenario end to end — probably honey —
   before any code is written.

## Notes for the next contributor

- Read `AGENTS.md` §2 before proposing features. A business-plan builder, pitch
  scoring, or personality assessment are all ruled out by the project's thesis. They
  will look like obvious wins. They are not.
- The owner's note in `docs/context/` is the authority on intent. Where these
  first-draft docs and that note disagree, the note is right and the docs need fixing.
- Do not invent regulatory or cost detail for East African countries. Mark it
  `<!-- UNVERIFIED -->` and log it in `OPEN_QUESTIONS.md`.
- The branch was rebased onto `origin/main` mid-session to pick up the owner's uploads.
  If work seems to be missing early history, that is why.
