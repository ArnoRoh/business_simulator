# Localisation, literacy and accessibility

> **Status:** first draft. The language plan is [Q-007](../memory/OPEN_QUESTIONS.md) and
> needs review by someone who speaks the target languages as a first language.

These are engineering requirements, not a late accessibility pass. Retrofitting any of
them is expensive; several are impossible to retrofit at all.

---

## Language

**Rules, from day one:**

1. **No user-facing string in code.** Every string lives in a translation resource with
   a stable key. No exceptions, including error messages, placeholder text and debug
   copy that "won't be seen."
2. **No string concatenation to build sentences.** Word order differs between languages.
   Use whole-sentence templates with named placeholders.
3. **Amounts and dates are locale-neutral in content**, formatted at render time. Never
   author a currency symbol into content — see `AGENTS.md` §6.
4. **Plurals through a plural-rules mechanism**, never `if (n === 1)`.
5. **Layout survives text expansion.** Swahili runs longer than English. Nothing may
   depend on a string's length.

**Languages:** English and Swahili are the initial pair, sequencing per
[Q-007](../memory/OPEN_QUESTIONS.md). Later candidates follow the geographic sequence:
Amharic, Kinyarwanda, Luganda, French, Somali.

**Register matters as much as translation.** Target learners frequently use English
loanwords for business terms while thinking in Swahili. Fully-translated business
vocabulary can read as stilted or foreign, while over-borrowing excludes people. This is
a judgement call for a native speaker with business exposure — not a translator working
from a word list, and definitely not machine translation.

**Right-to-left** is not needed for the initial languages. Do not architect against it,
but do not build for it speculatively either.

---

## Literacy and numeracy

Target learners range from limited formal literacy to postgraduate. The design centre is
someone who reads slowly in their second language.

**Text:**

- Short sentences. One idea each.
- Common words. Define any term on first use.
- Target roughly a lower-secondary reading level in the source language before
  translation. Translating dense English produces dense Swahili.
- Nothing important conveyed by text alone.

**Numbers:**

- Show magnitude visually as well as numerically — a bar the learner can see shrinking
  communicates a cash problem faster than a figure.
- Prefer concrete comparison to abstraction: "enough for two months of wages", not "a
  runway of 0.17 years".
- Percentages are less reliably understood than proportions. "Three out of every ten
  customers" over "30% of customers."
- Never require mental arithmetic to understand a consequence. If the learner must
  compute to see what happened, show the computation.

**Audio** is the main affordance for limited literacy. Recorded voice for key content,
in-language, with a real speaker rather than synthesis where budget allows. Weighed
against the data budget — see below. Audio is optional and downloadable per chapter,
never bundled into first load.

---

## Devices, data and connectivity

**Device target:** Android, 2GB RAM, ~5-inch screen, several years old, possibly shared.

**Budgets** (targets to hold ourselves to, to be confirmed once implementation starts):

| | Target |
|---|---|
| First load | as small as achievable; every kilobyte justified |
| Return visit | near zero — served from cache |
| Per chapter of new content | small, explicitly downloaded, size shown before download |
| Audio | separate, opt-in, per chapter |

**Rules:**

- Nothing loads that is not needed for the screen in front of the learner.
- No web fonts. System fonts only.
- Images earn their place individually; prefer SVG and generated graphics.
- **The learner is told what a download will cost them in data, before it happens.**
  They are paying.

**Connectivity:** offline after first load, non-negotiable
([ADR-0002](./adr/0002-mobile-first-offline-pwa.md)). Sync when a connection appears,
never blocking. Every state resumable — assume the app is killed mid-decision, because
it will be.

**Power:** sessions get interrupted by dead batteries and outages. Save continuously;
never rely on an explicit save action.

---

## Accessibility

Beyond the constraints above:

- Adequate contrast; do not assume a good screen in good light. Much play happens
  outdoors or in poor lighting.
- Touch targets sized for imprecise input on a cracked screen.
- Never colour alone to convey state.
- Text scaling respected without breaking layout.
- Screen-reader labels on interactive elements. Low usage in this context, but cheap to
  do and impossible to retrofit cleanly.
- **No time pressure anywhere.** Timers punish slower readers and interrupted lives.

---

## Cultural and contextual fit

- **Names, places, businesses and amounts must be locally real.** A scenario about a
  "small business owner named John selling widgets" signals that this was written
  somewhere else, for someone else.
- **Prices and costs must be plausible to a local reader.** A wrong figure destroys
  credibility instantly and permanently — this is why `docs/context/` names its gaps
  rather than filling them with invention.
- **Mobile money is the default payment rail**, with its fees and float. Cash-flow
  modelling that assumes bank transfers will feel foreign.
- **Avoid development-sector register.** Learners have seen "empowerment" language
  before and it signals a donor project rather than a serious tool.
- Gender, age and family assumptions in scenarios need local review. Household labour
  obligations and access to capital are not evenly distributed, and pretending otherwise
  makes the simulation less true.

---

## Testing requirements

Before any claim that this works:

- Test on an actual low-end device on an actual metered connection. Not a throttled
  desktop browser.
- Test with users at the low end of the literacy and digital-fluency range —
  particularly the Joseph persona. If the tool only works for Amina, it has failed at
  its purpose (`assessment.md`, "Fairness").
- Test in the target language with native speakers, checking register and not just
  correctness.
- Test interrupted: kill the app mid-decision, return three weeks later.
