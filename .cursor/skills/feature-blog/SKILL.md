---
name: feature-blog
description: >-
  Ship user-facing PocketHost features with a blog post instead of semver
  release notes. Use when landing feat/enh work, finishing a customer-visible
  change, or when the user asks to announce a feature. Pair with blog-voice for
  writing style.
---

# Feature + blog post

PocketHost **does not** maintain product version announcements (no `PocketHost 2.x` roundup posts, no CHANGELOG-as-comms, no `pnpm version` as a release trigger). **User-facing work ships with its own blog post.**

## When to write a post

| Ship with post | Skip the post |
|----------------|---------------|
| New dashboard capability, CLI behavior customers run, billing/access change | Internal refactors, deps bumps, CI, typing |
| Platform infra with a user-visible win (faster PB versions, custom domains) | Routine PocketBase patch syncs (unless noteworthy) |
| Policy or pricing change users should know about | Small bug fixes unless security or widely reported |

**One feature → one post.** If a PR bundles unrelated user wins, split posts or pick the headline feature and mention the rest in one sentence.

## Workflow

1. **Land the feature** — code, docs, MEMORY/backlog updates as usual.
2. **Draft the post** — follow [blog-voice](../blog-voice/SKILL.md). Lead with the user win, not the semver.
3. **Wire the blog** (new post — one folder per slug; see `.cursor/rules/blog-articles.mdc`):
   - `packages/dashboard/src/routes/(static)/blog/{slug}/+page.md`
   - Images co-located in `blog/{slug}/` when available
   - Entry at **top** of `packages/dashboard/src/routes/(static)/blog/toc.ts` (`description`, `date`, `author`)
4. **Commit** — separate commits are fine:
   - `feat(…): …` or `enh(…): …` for the feature
   - `docs(dashboard): blog post for …` for the announcement

Ask the user before committing unless they already asked to commit.

## Title and slug

- **Title**: plain benefit (`Direct PocketBase Version Sync`, not `PocketHost 3.1.0`)
- **Slug**: kebab-case, topic-based (`pocketbase-version-sync`, not `release-3-1-0`)

## What we stopped doing

- Batch release blog posts listing everything in a semver (`pockethost-2-3-0-release` style) — historical only; don't add new ones
- Updating `packages/pockethost/CHANGELOG.md` or `docs/production.md` gitbook releases as the primary announcement path
- Treating `pnpm version --patch` as a comms milestone

`CHANGELOG.md` may still exist for package history; **the blog is the customer-facing changelog.**

## Examples

Good pattern: [pocketbase-version-sync](../../../packages/dashboard/src/routes/(static)/blog/pocketbase-version-sync/+page.md) — one engineering change, one narrative, ships beside the feature.

Legacy pattern to avoid: [pockethost-2-3-0-release](../../../packages/dashboard/src/routes/(static)/blog/pockethost-2-3-0-release/+page.md) — version roundup; don't replicate.

## Agent checklist

When finishing user-facing work in this session:

- [ ] Does this change matter to hosted users or self-hosters? If no → skip post.
- [ ] If yes → offer to draft the post (or write it if the user asked to ship the full feature).
- [ ] Post uses blog-voice signature and file checklist.
- [ ] No new semver release-post unless the user explicitly requests one.
