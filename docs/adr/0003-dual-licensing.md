# ADR-0003 — MIT for code, CC BY-SA 4.0 for content

**Status:** Accepted
**Date:** 2026-08-02
**Deciders:** Project owner
**Related:** [D-003](../../memory/DECISIONS.md)

## Context

This project produces two different kinds of thing, with different reuse economics.

**Software** — the simulation engine, the PWA, tooling. Its value grows with adoption.
Other people building on it costs us nothing and helps the goal.

**Learning content** — curriculum, scenarios, the operating-context data that makes
scenarios true. This is the expensive part. Establishing real formalisation costs, real
value-chain economics and real lead times requires local knowledge that is slow to
gather and easy to get wrong. It is also the part most likely to be developed with grant
funding, which carries an expectation that the results stay public.

The project also expects to work with institutional funders and government training
programmes, both of which have licence requirements and both of which are slow to
approve anything unusual.

## Decision

Dual licence by artefact type:

- **Source code** under the **MIT License** (`LICENSE`).
- **Curriculum, scenarios, documentation and other learning content** under **Creative
  Commons Attribution-ShareAlike 4.0 International** (`LICENSE-CONTENT`).

Both files sit at the repository root, and `README.md` states which applies to what.

## Consequences

**What this gets us.** Maximum reuse of the software, including commercially — someone
building a different tool on the engine is a good outcome. Meanwhile the content, which
is where the public investment concentrates, cannot be enclosed: a derived curriculum
stays open under the same terms. Both licences are standard and widely recognised, which
matters for institutional approval — neither will require a legal review that stalls a
partnership.

**What this costs us.** Two licences means an ongoing boundary question: which applies to
a given file? Scenario data is content, the engine is code, but a scenario schema
definition or a piece of tooling that embeds content is arguable. We will have to make
calls and record them.

Share-alike also excludes some adopters. An organisation that wants to fold the
curriculum into proprietary training material cannot, and may walk away rather than
open their own.

**What it forecloses.** Relicensing either half later becomes hard once outside
contributions arrive, since it requires their agreement. This is effectively a one-way
door.

## Alternatives considered

**MIT for everything.** Simplest, one licence, no boundary question, and maximally
attractive to adopters. Rejected because it allows publicly-funded curriculum to be
enclosed in a closed commercial product with nothing flowing back. The content is the
part worth protecting, and protecting it is cheap here.

**Apache-2.0 for code, CC BY 4.0 for content.** Apache's explicit patent grant is
preferred by some institutional funders and provides more defensive cover. Rejected
because there is no meaningful patent exposure in this project — it is a teaching
simulation, not a novel technical method — and Apache's extra obligations buy nothing we
need. CC BY without share-alike was rejected for the same reason as MIT-for-everything.

**Copyleft on the code as well (GPL/AGPL).** Would guarantee that improvements to the
engine return to the commons. Rejected because it materially narrows who can adopt the
software, and adoption of the engine is not the thing we are trying to protect. AGPL in
particular would deter exactly the institutional and government adopters this project
wants.

**Deciding later.** Rejected because early contributions accumulate under whatever terms
are in place, and retrofitting a licence across contributors is painful. Choosing now,
while the contributor set is one person, is by far the cheapest moment.

## Revisit if

- A significant funder or partner requires different terms as a condition of support.
- Share-alike proves to be a real obstacle to adoption by government or institutional
  training programmes — evidenced by a specific partnership that failed on it, not by
  speculation.
- The code/content boundary turns out to be genuinely unworkable in practice.
