---
name: commit
description: >-
  Create scoped git commits from the current conversation (e.g. /commit).
  Splits logical changes, never blind full-folder commits. Use when the user
  says /commit or asks to commit session work.
disable-model-invocation: true
---

# Commit

Parse `/commit` or a plain **commit** request the same way.

## Scope

- Use **conversation context** to decide what belongs in each commit.
- **Only commit changes from the current conversation** — leave unrelated WIP unstaged.
- Stage paths explicitly (`git add <path>…`); never `git add .` or `git add -A` unless the user asks to commit everything.
- Make **as many logical commits as reasonable** (separate by type, scope, or unrelated work).
- Never commit generated or local-only artifacts unless explicitly part of the task: `.env`, `.pockethost`, `dist`, `.svelte-kit`, `pb_data`, `live-data`, `node_modules`.
- If a changed file is ambiguous (possible work from another session), **ask** before staging.

## Git safety

- NEVER update git config
- NEVER run destructive/irreversible git commands unless the user explicitly requests them
- NEVER skip hooks unless the user explicitly requests it
- NEVER force-push to main/master
- Avoid `git commit --amend` unless all amend rules in user instructions are met
- NEVER commit unless the user asked (this skill satisfies that)

## Backlog cull

Before staging and committing, reconcile [backlog.md](backlog.md) against repo history. The backlog often drifts out of sync with what has actually shipped.

1. Read **Backlog** and **Icebox** for rows that look done, duplicated, or stale (e.g. `Done (branch)`, `Partially done`, old blockers).
2. Cross-check against history:
   - `git log --oneline -30` (from step 1; extend with `--grep` if needed)
   - `git log --grep='<keyword>' --oneline` for specific item titles when unclear
   - This session's diff and commits about to land
3. **Cull:**
   - Move finished items to **Done** with date + commit or PR link
   - Delete duplicate rows
   - Update stale Notes (branch-only "done" now on main, partial work completed, blockers cleared)
   - Drop superseded rows or move abandoned spikes to **Icebox** with a short note
4. Stage `backlog.md` with the related feature/fix commit when the cull is tied to that work. Otherwise use a standalone `chore: cull backlog` commit.

Spot-check obvious matches — do not block on a full audit. If nothing needs updating, skip.

## Procedure

1. In parallel, run:
   - `git status`
   - `git diff` (staged and unstaged)
   - `git log --oneline -30`
2. **Backlog cull** (see above).
3. Map each changed file to **this conversation**. Leave everything else unstaged.
4. Draft one or more commit messages (subject **under 50 characters**).
5. Stage only the scoped files (or hunks), then commit each logical group sequentially.
   - Pre-commit runs **lint-staged** (Prettier on staged `*.{ts,js,cjs,svelte,json}`). If formatting changes land, include them in the same commit (re-stage after the hook runs, or run `pnpm lint:fix` on touched paths before staging).
   - Do not use `--no-verify` unless the user explicitly asked to skip hooks.
6. Run `git status` after the last commit to verify success.
7. If the user will **push** or open a **PR** next, run `pnpm check:push` per [check-push/SKILL.md](../check-push/SKILL.md) and fix failures before suggesting `git push`.

## Message format

Match this repo's established prefixes:

```
<type>(<scope>): <description>
```

- **type** (required): `feat`, `enh`, `fix`, `docs`, `refactor`, `test`, `chore`, `build`, `ci`, `perf`
  - Prefer `enh` for incremental improvements (common in this repo); `feat` for new user-facing capability.
- **scope** (optional): `pockethost`, `mothership`, `firewall`, `edge`, `dashboard`, `docs`, `cli`
- **description**: imperative mood, lowercase, no trailing period

Examples:

```text
enh(firewall): weighted rate limits for file routes
fix(pockethost): reject empty IPs in rate limiter
feat(mothership): add instance notes field
docs(dashboard): update hibernation webhook note
refactor(cli): centralize rate limiter rules
chore: bump supported pocketbase to 0.38.*
```

Legacy bare prefixes (`pockethost: …`, `mothership: …`) appear in history — use scoped conventional form for new commits.

**Don't:** subject ≥ 50 characters; vague subjects (`update stuff`, `wip`); sentences or past tense (`Fixed the cache.`).

Before committing, count characters in the full subject. If over 50, shorten scope or description — don't drop the type prefix.

Pass messages via HEREDOC:

```bash
git commit -m "$(cat <<'EOF'
subject here

EOF
)"
```

## Report

Summarize commits created (hash + subject) and list anything left unstaged, with a short reason.

## User-facing features

If the session shipped customer-visible `feat` / `enh` work and no blog post exists yet, remind the user (or offer to draft one per `.cursor/skills/feature-blog/SKILL.md`). Do not block the commit on the post unless they asked for both in one go.
