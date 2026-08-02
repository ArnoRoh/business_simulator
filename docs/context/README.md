# Context

Regional and evidence grounding for the simulation.

## Contents

| Document | Status |
|---|---|
| [`transformational-entrepreneurship.md`](./transformational-entrepreneurship.md) | **Authoritative.** The project owner's background note. |
| [`east-africa-operating-context.md`](./east-africa-operating-context.md) | **Stub.** Names the gaps; does not fill them. |

## Why the operating-context file is empty

The simulation makes specific claims about what it costs and how long it takes to
register a business, obtain a licence, get certified, or comply with tax obligations in
particular countries. Those numbers determine whether a scenario feels true or fake to
the person playing it.

**Wrong specifics are worse than absent ones.** A learner in Arusha who reads a
registration cost they know to be wrong stops trusting everything else in the tool, and
does not come back. That damage is not recoverable by fixing the number later.

So this directory names what needs to be established and leaves it to someone with
ground truth, rather than producing a plausible-looking table that would be quietly
wrong. See `AGENTS.md` §6, "Regional accuracy over plausibility."

## Rules for anyone filling this in

1. **Cite the source and date it.** Fees change. An uncited figure is unusable because
   nobody can check or refresh it.
2. **Mark anything unverified** with `<!-- UNVERIFIED -->` and log it in
   [`../../memory/OPEN_QUESTIONS.md`](../../memory/OPEN_QUESTIONS.md).
3. **Prefer lived operating experience over published guidance.** The official process
   and the actual process differ, often substantially, and the actual one is what a
   learner will recognise. Where they differ, record both — the gap is itself worth
   teaching.
4. **Record time as well as money.** Lead times are frequently the binding constraint,
   and are almost always understated in official sources.
5. **Do not extrapolate between countries.** Tanzanian detail does not transfer to
   Kenya. Each country is separate work.
