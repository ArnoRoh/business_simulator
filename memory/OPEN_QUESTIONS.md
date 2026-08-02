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
realistically ingest from us?
**Why it matters:** The evidence trail is the point of the tool. Designing it without
knowing the consumer risks producing a record nobody can use. Also determines whether
we need export formats, an API, or just a printable summary.
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
**Current assumption:** None.

## Open

### Q-003 — Can simulated behaviour predict real firm outcomes at all?  [open]
**Raised:** 2026-08-02 · **Owner:** Project owner / research partner
**Question:** Is there evidence that decision behaviour in a business simulation
correlates with real entrepreneurial performance? The project's own thesis is sceptical
of weakly-validated selection signals — we should not exempt ourselves.
**Why it matters:** If simulated behaviour is no better than a pitch score, the
selection purpose collapses and this is a teaching tool only. That is still valuable,
but it is a different product with different claims.
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

*(none yet — move entries here with the answer and the date it was settled)*
