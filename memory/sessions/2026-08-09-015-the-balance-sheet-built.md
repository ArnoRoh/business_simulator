# Session 015 — The balance sheet, built

**Date:** 2026-08-09
**Worked by:** Claude (Opus 5), with the project owner
**Branch:** `chapters-3-4-and-balance`
**Duration / scope:** one long session. An engine addition, a panel, a content sweep
across all four chapters, and every chapter's capital split moved off its last turn.

---

## Goal

Session 014 put [Q-028](../OPEN_QUESTIONS.md) to the owner with three costed options —
a net-worth line, gearing on top of it, and moving the split off turn 20. The answer was
**"Do them all."**

## What happened

**1. What the business is worth ([D-030](../DECISIONS.md)).**

`netWorth(state)` = cash + equipment at written-down value + working capital held − debt.
It sits under the weekly ledger in its own block with the amount it moved by since last
week, because the level tells a learner nothing and the movement tells them everything.
Once a chapter has debt it is joined by one sentence — "for every 100 of this that is
yours, the lender is owed 62" — and a warning when more is owed than held. Both introduce
themselves once, through the same mechanism a new ledger line uses (D-025).

Said as a comparison rather than a ratio, per `docs/localization.md`. A stake of zero or
less returns no ratio at all rather than infinity, and the panel says the business owes
more than it owns.

**2. Which immediately forced a content sweep ([D-031](../DECISIONS.md)).**

`netWorth` counts what content recorded, and content had not been recording. Chapter 1's
fryer (120,000), its generator (180,000) and its entire reinvestment bucket were cash
that left with nothing arriving, so the new panel would have shown every capability
investment as destruction of worth — the exact opposite of what the owner asked for.
Chapter 2 was worse: `borrow-oven` raised debt by 1,200,000 and recorded no oven.

All of them now record `assetValue`. The bakery's oven consequently depreciates, which is
what that chapter's own depreciation turn says should happen. Chapters 3 and 4 were
already doing this where they meant to.

The rule this establishes cannot be fully checked by a script: whether a spend *should*
have recorded an asset is a judgement about what the money bought. A check for "spends
cash and adds capacity" fires on chapter 1's "go and find a second buyer", which is a
trip and not an asset — and one false positive is how a warning becomes noise. It is an
authoring rule in `game-design.md` instead.

**3. The split moved off the last turn ([D-032](../DECISIONS.md)).**

It is now turn 17 in chapter 1 and turns 14, 13 and 15 in the others, so six, six, seven
and five weeks of trading follow it. Chapters 3 and 4 gained a "take some home" bucket
they never had — the two chapters about building an organisation offered no way to take
money out of it.

What that produces, measured on a middle-option path:

| Chapter | All to home, at the end | All to reserve | All reinvested |
|---|---|---|---|
| Bakery | 2,005,097 | 2,805,097 | 2,646,843 (stock) · 2,820,190 (repay) |
| Factory | 77,985,449 | 81,985,449 | 83,612,419 (second line) |
| Export | 142,539,854 | 145,139,854 | 143,849,994 (export line) |

The gap between taking it home and holding it is the whole amount, and it is still there
at the end of the chapter. That is the owner's point, on screen, as a number.

**Two dead ends worth recording.** First: I swapped the split with a mid-chapter turn
rather than rotating. That moved three capacity-scaled options to week 20, where the
business is several times larger and their effects straddle a band edge — the validator
failed on all three. A rotation moves every turn by one position instead and broke
exactly one option, fixed by putting the factory's split one turn later. Second: an
ongoing weekly `drawings` field, so that a withdrawal became a standing commitment. It
teaches the compounding better and it is a bigger change than the question needed, and a
one-off "take some home" that quietly becomes a permanent obligation is not what the
words on the button say.

**What it cost chapter 1.** Its split sits at turn 17, not 14. The greedy `attentive` run
was already one nudge from loss-making before this session — it ended at +9,590 with
reputation 3 — and moving the split to 14 tipped it to −14,190, which D-019 makes a FAIL.
Rebalancing chapter 1 is [Q-021](../OPEN_QUESTIONS.md) and the owner's call, so the split
went where the chapter still passes. Turn 14 is the better position and is available the
moment chapter 1 has any headroom.

**4. A pre-existing hole, now visible.** `validate-scenario.mjs` reports allocation turns
that have nothing to allocate: `empty t17: nothing to split on 4 of 6 paths`, and the
same for the factory. It fails only if the split is empty on *every* path. This is not
caused by the move — at turn 20, chapter 1 had nothing to split on two of three paths and
10,000 on the third — but the situation text above it says "for the first time you have
real money left over", which is false for that learner. Raised as
[Q-029](../OPEN_QUESTIONS.md).

## Discussion

The owner's instruction was two words. The three options had been costed in Q-028 the
session before, including that option 3 re-authors content in all four chapters and
touches chapter 1, which they have played and accepted; "do them all" was given with that
in front of them.

## Decisions made

- **[D-030](../DECISIONS.md)** — the money panel carries what the business is worth and
  the lender's claim on it.
- **[D-031](../DECISIONS.md)** — an option that spends cash on something the business
  keeps records it, and stock is never recorded twice.
- **[D-032](../DECISIONS.md)** — the split that decides what leaves the business is not
  the last turn.

## Questions raised or resolved

- **Resolved: [Q-028](../OPEN_QUESTIONS.md)** — "do them all", and all three are built.
- **Raised: [Q-029](../OPEN_QUESTIONS.md)** — what the split should do when there is
  nothing to split.

## State at end of session

Eight checks green.

```
test-engine        241 passed   (15 new, on worth and gearing)
validate-scenario  177/177 predictions, 75/75 numeric paths, 0 problems
validate-i18n      1,789 content strings × 2 languages
simulate-runs      no whole-business failures; attentive finishes all four
smoke-app          29 passed
playthrough        5,920 passed (3,646 before)
check-links        all resolve
```

`standalone.html` rebuilt. The four chapters' turn ids were renumbered by the rotation, so
`docs/curriculum.md`'s coverage table was recounted against the new positions.

## Next steps

Unchanged, and still not an agent's: **play it** — and this is the first session in a
while where the thing to look at is not a defect but a design. The worth block adds a
figure to a panel that was already the longest thing on the screen ([Q-025](../OPEN_QUESTIONS.md)),
and nobody has seen it on a phone.

Then [Q-029](../OPEN_QUESTIONS.md), [Q-021](../OPEN_QUESTIONS.md) (which would let chapter
1's split move to turn 14), and the Kiswahili and Tanzanian figures.

## Notes for the next contributor

- **`netWorth` counts what content recorded.** If a new option spends cash on equipment
  and does not author `assetValue`, the panel will show that investment as destruction of
  worth, and no check will tell you. D-031 is the rule; there is no script for it.
- **Turn ids are positional labels**, and the rotation renumbered them. Anything that
  quoted a turn id — the curriculum coverage table did — is stale after a turn moves.
  `/tmp` scripts are gone; the rotation was `move(path, from, to)` over the raw text with
  brace matching, so the formatting survived.
- **A rotation is much safer than a swap.** Moving one turn six positions changes the
  state its options see enough to break declared bands; moving every turn by one usually
  does not.
- **Chapter 1's greedy path has almost no headroom.** It ends around break-even with
  reputation near zero, overloaded and over-capacity. Anything that shifts its back half
  can tip `simulate-runs` into a FAIL, and that is a real signal about the chapter rather
  than about the change.
