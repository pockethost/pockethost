---
name: commit
description: >-
  Create git commits scoped to the current conversation only (e.g. /commit).
  Never stages unrelated WIP or cross-chat dependencies; halts if a dependent
  change from another conversation is required. Use when the user says /commit
  or asks to commit session work.
disable-model-invocation: true
---

# Commit

Parse `/commit` or a plain **commit** request the same way.

## Scope

Commits are scoped to **this conversation only**. The commit command applies to the work discussed here, not to other open chats or unrelated WIP in the working tree.

- Use **this conversation's context** to decide what belongs in each commit.
- **Only commit changes from this conversation.** Leave everything else unstaged, even if it is modified on disk.
- Stage paths explicitly (`git add <path>…`). Never `git add .` or `git add -A` unless the user asks to commit everything.
- Make **as many logical commits as reasonable** (separate by type, scope, or unrelated work).
- Never commit generated or local-only artifacts unless explicitly part of this conversation: `.env`, `.pockethost`, `dist`, `.svelte-kit`, `pb_data`, `live-data`, `node_modules`.
- If a changed file is ambiguous (possible work from another session), **do not stage it**. Leave it unstaged unless the user clarifies it belongs here.

### Dependency halt

Before staging, check whether the conversation's changes **depend on** other uncommitted changes that were **not** part of this conversation (e.g. a type or helper added in another chat that this diff imports or requires).

If a clean commit of this conversation's work is **not possible** without also committing that external dependency:

1. **Stop.** Do not commit.
2. Tell the user what blocks the commit: which files or hunks are required dependents, and which conversation or task they likely came from.
3. Offer options: commit the dependency in its own session first, narrow this commit to a subset that stands alone, or explicitly expand scope if they want both in one commit.

Do not silently bundle unrelated or cross-conversation changes to "make it work."

## Git safety

- NEVER update git config
- NEVER run destructive/irreversible git commands unless the user explicitly requests them
- NEVER skip hooks unless the user explicitly requests it
- NEVER force-push to main/master
- Avoid `git commit --amend` unless all amend rules in user instructions are met
- NEVER commit unless the user asked (this skill satisfies that)

## Procedure

1. In parallel, run:
   - `git status`
   - `git diff` (staged and unstaged)
   - `git log --oneline -8`
2. Map each changed file to **this conversation**. Leave everything else unstaged.
3. Check **dependency halt** (imports, types, or build coupling to unstaged changes from outside this conversation). Stop before staging if blocked.
4. Draft one or more commit messages (subject **under 50 characters**).
5. Stage only the scoped files (or hunks), then commit each logical group sequentially.
6. Run `git status` after the last commit to verify success.

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

If halted on a dependency, report the blocker and do not summarize commits.

Otherwise summarize commits created (hash + subject) and list anything left unstaged, with a short reason.
