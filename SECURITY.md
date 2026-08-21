# Security and learner data

Two things here: how to report a vulnerability, and the rules governing learner data.
The second matters more for this project than the first.

---

## Reporting a vulnerability

Email **arnorohwedder@gmail.com**. Please do not open a public issue for a security
problem.

Include what you found, how to reproduce it, and what an attacker could do with it.
You will get an acknowledgement, and we will tell you what we intend to do about it.

There is no bounty programme. This is a small grant-funded project.

**Current status:** there is no application code and no deployed system yet, so there is
nothing running to attack. This policy exists ahead of that.

---

## Learner data — the part that matters

The simulator records what a learner does. Once that record informs a funding decision,
it stops being telemetry and becomes **consequential personal data about people in a
weak bargaining position** — applicants to programmes that control money they need.

Getting this wrong does not just leak data. It damages people who have limited recourse.

### Principles

**Local-first.** The behavioural record lives on the learner's device by default.
Nothing is transmitted merely because a connection became available.

**The learner holds their record.** They can see all of it, in full, in language they
can read. Nothing is stored about a person that they cannot read themselves.

**Sharing is opt-in, per recipient, revocable.** No blanket consent at signup. A learner
chooses to share a specific profile with a specific programme, and can withdraw it.

**Playing without sharing is fully supported.** Not a degraded mode — a learner may use
the entire tool and share nothing.

**Minimise.** Collect what the behavioural record needs and nothing else. No contact
harvesting, no device fingerprinting, no third-party analytics, no advertising
identifiers. If a field is not used by an indicator in
[`docs/assessment.md`](./docs/assessment.md), do not collect it.

**No third-party trackers.** Not analytics SDKs, not social widgets, not embedded fonts
that phone home. Beyond privacy, every one of them costs the learner data they paid for.

**Explain before collecting.** Before a learner starts, they are told plainly what is
recorded and what it can be used for — in their language, at the reading level of
[`docs/localization.md`](./docs/localization.md), not in a terms-of-service wall.

**Never overstate the benefit.** A learner must not be told that completing this
improves their funding chances. We do not know that
([Q-003](./memory/OPEN_QUESTIONS.md)). Implying it to obtain consent would make the
consent worthless.

### Special categories

Do not collect, and do not build features that would require: national ID numbers,
biometrics, precise location, contacts, health data, or financial account credentials.

Real business financial figures, if a learner ever enters them, are sensitive
commercial data. Treat them as the highest-sensitivity category in the system, keep them
local, and never include them in a shared profile without separate explicit consent.

### Deletion

A learner can delete their data, and deletion means deletion — including from any
programme the record was shared with, to the extent we control it. Where a programme has
already ingested a profile we cannot recall it; the learner must be told that clearly
*before* sharing, not after.

### Legal

[Q-008](./memory/OPEN_QUESTIONS.md) is open: Tanzania's Personal Data Protection Act and
equivalent legislation across the target countries impose requirements we have not yet
established, and cross-border hosting adds more.

**This must be resolved with qualified local advice before any real learner data is
collected.** The principles above are a design position, not a compliance assessment,
and should not be relied on as one.

### Hosting

No decision yet. Constraints when it is made: no single-vendor lock-in
([`AGENTS.md`](./AGENTS.md) §3), data residency requirements from Q-008, and the
project's need to remain portable across whatever funding supports it. Record it as an
ADR.

---

## For contributors

- Never commit credentials, API keys or tokens. Not even to a branch — assume anything
  pushed is public.
- Never commit real learner data, including in tests, fixtures or screenshots. Synthetic
  data only.
- If you find learner data anywhere it should not be, report it as a security issue
  rather than fixing it quietly — we need to know it happened.
- Adding a dependency that transmits data anywhere requires an ADR.
