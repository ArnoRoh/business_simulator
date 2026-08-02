# Persistent project memory

This directory is how the project remembers itself across sessions, contributors and
AI agents that do not share context.

Full protocol: [`AGENTS.md` §5](../AGENTS.md#5-the-memory-protocol). This file is the
short version.

## The four files

| File | Nature | When to touch it |
|---|---|---|
| [`PROJECT_STATE.md`](./PROJECT_STATE.md) | **Snapshot.** Overwritten. | End of every session. Must always describe *now*. |
| [`DECISIONS.md`](./DECISIONS.md) | **Log.** Append-only. | The moment a decision is made. |
| [`OPEN_QUESTIONS.md`](./OPEN_QUESTIONS.md) | **Live list.** Add and resolve. | Whenever something is unresolved or gets resolved. |
| [`GLOSSARY.md`](./GLOSSARY.md) | **Reference.** Grows. | When a term needs pinning down. |

Plus [`sessions/`](./sessions/) — one append-only entry per working session, never
edited after the fact.

## Why this exists

Sessions here are short and far apart. Someone — often an AI agent with no prior
context — picks the project up cold, weeks later. Without memory they will re-litigate
settled questions, contradict earlier decisions, and lose the reasoning behind choices
that looked arbitrary but were not.

The rejected options matter as much as the chosen ones. If a session record says only
"chose X", the next contributor will propose Y, and nobody will remember that Y was
considered and dropped for a good reason.

## Rules

1. **Record decisions when they happen.** Rationale reconstructed at the end of a
   session is rationalisation, not reasoning.
2. **`PROJECT_STATE.md` is a snapshot, not a diary.** Overwrite it. History lives in
   `sessions/` and `DECISIONS.md`.
3. **Session entries are immutable.** Wrong about something? Say so in the *next*
   entry. Do not rewrite the record.
4. **Memory commits with its work.** Same commit or same PR — never a separate
   trailing "update memory" change.
5. **Write for a stranger.** No unexplained shorthand, no "as discussed", no
   references to context that exists only in someone's head.

## Naming

Session entries: `sessions/YYYY-MM-DD-NNN-short-slug.md`

`NNN` is a zero-padded counter within that date, starting at `001`. Example:
`sessions/2026-08-02-001-repo-bootstrap.md`.
