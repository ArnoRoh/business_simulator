# Running several agents on this repository at once

> **Status:** written 2026-08-05, from two attempts with opposite outcomes. Update it after
> the next one. `AGENTS.md` §6 still governs — this is how to apply it when work is split.

Parallel agents have been tried twice here. The first attempt produced a total failure that
looked like a crash; the second produced most of a working feature. The difference was not
the models. It was how much interface design happened *before* anyone started writing.

---

## 1. When this is worth doing

Splitting work costs a contract, an integration pass, and a real chance of a seam nobody
owns. It pays only when **all** of these hold:

- The work divides into slices that touch **disjoint files**. Not "different features" —
  different files. Two agents in one file is the failure mode, not a risk to manage.
- Each slice is **large enough** to be worth a cold start. An agent re-derives context you
  already have; a twenty-minute slice is cheaper done inline.
- The interfaces between slices can be **written down before work starts**. If you cannot
  specify them, you do not understand the change well enough to split it — do the design
  first, then decide.

Do not split for speed alone. The honest benefit in session 006 was not wall-clock: it was
that writing the contract forced the interfaces to be designed properly before any code
existed. That would have been worth doing even single-handed.

**Do not split at all** when the change is mostly one file, when the design is still moving,
or when the slices need to see each other's work to know if they are right.

## 2. The two attempts

**Session 003 — failed.** Two agents against "a written interface contract" that named
responsibilities but not signatures. `scene.js` assigned CSS classes; the stylesheet agent
never landed the rules for them. Every scene rendered as a **solid black rectangle**. Found
by driving the app and looking at a screenshot, not by reading code. The contract had said
who does what, and nothing about what passes between them.

**Session 006 — mostly worked.** Three agents, disjoint file ownership, exact signatures,
integrator-owned seams. No file collisions despite three agents writing to one working tree.
Each agent reported its unfinished edges accurately and none worked around its boundary.
Every integration failure was one I had failed to specify, not one an agent invented.

The pattern is clear enough to state plainly: **agents honour boundaries you write down and
silently violate ones you assume.**

## 3. Rules that worked — keep these

**Write the contract first, with signatures.** Not "agent 2 builds the controls" but the
exact exported function, its arguments, and the shape of every object crossing a boundary.
Session 006's contract specified `resolveNumberInput(state, input, value) -> effects` and
the full JSON shape of a decision. Nobody had to guess, and nobody did.

**Assign files, not features.** A table of who owns which path, and an explicit "never
touch" list. Features overlap; files do not.

**One integrator.** They own the wiring file (`app/js/main.js` here), every seam, and the
commit. Agents are told: do not run `git commit`, `git push` or `git checkout`. This avoids
index contention and keeps history coherent.

**Tell agents to verify by running, not reading**, and name the commands. All three ran
their checks. Two reported real failures in files they had been told not to touch, and
correctly declined to fix them.

**Ask explicitly for what was not finished.** The prompt line "do not claim success for
anything you did not run" produced accurate reports rather than optimistic ones. This is the
cheapest quality control available.

**Give them the project's rules, not just the task.** Each prompt pointed at `AGENTS.md` §2
and §6 and named the specific constraints that would otherwise be violated — content is
data not code, no composite score in the record, no typing on a low-end phone. Agents
followed all of them. They cannot infer a thesis from a codebase.

## 4. What session 006 still got wrong

Each of these cost real time and has a concrete fix.

### 4.1 Seams were missing from the contract

Two interfaces were discovered *after* launch and sent as mid-flight addenda:

- `renderReveal` had to serve three decision types and two prediction kinds. Its signature
  changed and the contract had not said so.
- The headless harness needed stable `data-*` hooks to drive the new controls. Nothing
  specified them, so there would have been nothing reliable to test against.

Both landed in time by luck — the agent had not yet finished those parts.

**Fix.** Before launching, list two things explicitly:
1. Every function whose **signature changes**. This is the highest-risk category by far,
   because existing callers compile fine and break at runtime.
2. Everything the **verifier** needs. Test hooks are an interface. If the only way to check
   the work is a harness, the harness's requirements belong in the contract.

### 4.2 Nobody could build against real code

Agents 2 and 3 both depended on agent 1's engine, which did not exist when they started.
They built blind against the contract. It worked, but agent 2 could not fully verify its
own slice, and said so.

**Fix — the integrator writes the stubs.** Land the exported signatures as throwing stubs
*before* launching anyone. The contract becomes executable: every agent imports real
functions from minute zero, type-level mistakes surface immediately, and the harness runs.
This is the single biggest improvement available and it costs about ten minutes.

### 4.3 Nobody checked that ownership was respected

Zero collisions happened, but only by inspection after the fact. There was no check.

**Fix.** After the agents finish, before integrating:

```bash
git status --porcelain | awk '{print $2}'   # every file touched
```

Assert each path maps to exactly one owner in the contract table. Cheap, immediate, and it
catches a violation before it is buried under integration edits.

### 4.4 No one owned the whole

Each agent's definition of done was "the checks I own pass". Correct for parallelism, and it
means the integrated result had no owner but me. The three engine bugs found afterwards —
costs compounding to −900,000, rent going negative, a prediction band straddling a boundary
— were found by simulating full runs after integration. No agent was asked to look, so none
did.

**Fix — add a fourth role: an adversary.** Once integration is green, launch one agent whose
only job is to break it, explicitly told that passing checks is not evidence of correctness.
Given this repository's record — `validate-scenario.mjs` has now missed two whole-business
failures — this is not optional hygiene, it is where the real defects live.

### 4.5 Slices differed wildly in how verifiable they were

Agent 1's slice was pure functions with tests: fully verifiable alone. Agent 2's needed
`main.js`. Agent 3's needed agent 1's validator. Only one agent could actually prove its
work.

**Fix.** Prefer splits where each slice can be verified in isolation, and treat
verifiability as a criterion when choosing the split — not an afterthought. Where a slice
cannot be self-verified, either the integrator owns it, or the integrator supplies the
harness up front. Pointing agent 2 at an existing harness to copy was the right instinct and
should be standard.

### 4.6 Uniform model and effort

All three ran on the same model at the same reasoning effort. The engine slice was the
hardest and the most correctness-critical; the content slice was the most voluminous but the
least subtle.

**Fix.** Match model and effort to the slice. Reserve the strongest for engine, schema and
anything the assessment model depends on. (Where the user names a model, that governs — this
is about the default.)

### 4.7 Polling versus inspecting

Paseo says not to poll agent status, which is right. But repo inspection is free and was
genuinely useful — `git status`, and grepping for the exports agent 1 was due to add, showed
progress without interrupting anything.

**Fix.** Watch the repository, not the agents. `grep -oP '^export function \K\w+'` against
the file an agent owns answers "has the interface landed yet" without a single status call.

## 5. The contract template

Keep it in the repo, not `/tmp`. Session 006's contract was written to `/tmp/v3-contract.md`
and is now gone — the session entry describes it but the artefact itself did not survive,
which is exactly what `AGENTS.md` §5 exists to prevent. Put it in `memory/contracts/`.

```markdown
# <change> — interface contract

## Why this change exists
<the problem, in the words of whoever raised it. Agents design better when they
know what they are fixing.>

## Rules that bite
<the two or three project constraints this change is most likely to violate,
named specifically, with the file or ADR that carries them.>

## Current state
<branch; the exact check commands and their current passing numbers, so an
agent can tell what it broke.>

## Interfaces
<every exported signature, every JSON shape crossing a boundary.
EXPLICITLY: every signature that CHANGES.
EXPLICITLY: the hooks the verifier needs.>

## File ownership
| Agent | Owns | Never touches |
<paths, not features. Name the integrator's files as owned by nobody else.>

## Verification
<the command each agent runs; which failures are expected before integration
and which are theirs.>

## Definition of done
Your slice is done when the checks you own pass and you have said plainly what
you did not finish. Do not report success for work you did not run. If you hit
something that contradicts this contract, stop and say so rather than working
around it.
```

## 6. Checklist

Before launching:

- [ ] Slices touch disjoint files, and the split was chosen for verifiability
- [ ] Contract written **in the repo**, with exact signatures
- [ ] Every **changed** signature listed explicitly
- [ ] Test hooks the verifier needs are specified
- [ ] Stubs landed so agents import real code from the start
- [ ] Each prompt names the project rules its slice could violate
- [ ] "Do not commit / push / checkout" stated
- [ ] "Do not claim success for anything you did not run" stated

After they finish:

- [ ] Every touched file maps to exactly one owner
- [ ] Integration checks green, not just per-slice checks
- [ ] An adversarial pass over the integrated result
- [ ] Anything an agent reported as unfinished is either done or written down

## 7. One last thing, which is not about agents

Session 006's worst self-inflicted error had nothing to do with orchestration. A deploy
silently published the previous build: `git checkout --orphan` failed on an existing branch,
stderr was suppressed with `2>/dev/null`, the commit landed on a detached HEAD, and
`git push origin gh-pages` pushed the stale branch and reported success. It was caught only
by fetching the live file back and counting what was in it.

**Never suppress stderr on a step whose failure you are not otherwise detecting, and verify
a deploy by reading back what is actually being served.**
