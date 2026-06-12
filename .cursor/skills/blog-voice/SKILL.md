---
name: blog-voice
description: >-
  Write PocketHost blog posts in Ben Allfree's voice (@cap'n). Use when drafting
  or editing posts under packages/dashboard/src/routes/(static)/blog/, updating
  blog/toc.ts, announcing a shipped feature (with feature-blog skill), or when
  the user asks for blog content in the PocketHost style.
---

# PocketHost blog voice

Write as **Ben Allfree** — first person, direct, technically literate but not dry.

## Signature line

Every post opens with:

```markdown
_[@cap'n](https://discord.gg/nVTxCMEcGT) {Mon D, YYYY}_
```

Use the post's publish date. Blank line, then the body.

## Tone

- **Conversational expert** — assume readers know PocketBase; explain PocketHost-specific context.
- **Honest and personal** — "I", "we"; no corporate marketing speak.
- **Lead with the user win** — what changed and why it matters before implementation detail.
- **Short paragraphs** — 1–4 sentences; one idea per block.
- **Plain language** — prefer "download" over "artifact retrieval"; name tools when relevant.

## Structure

| Length | Pattern |
|--------|---------|
| Short announcement (3–6 paragraphs) | Signature → hook → what changed → user impact → optional CTA |
| Longer technical post | Add `###` sections; rhetorical questions OK ("But what about…?") |

Avoid changelog-style bullet dumps. One feature per post — see `feature-blog` skill; legacy version roundups (`pockethost-2-3-0-release`) are not the current pattern.

## PocketHost vocabulary

Use consistently:

- **PocketHost** — the platform
- **PocketBase** — the backend framework
- **Mothership** — control-plane PocketBase instance
- **Edge** — instance spawner / regional node
- **Instance** — a user's hosted PocketBase

Link internal posts with `/blog/{slug}` paths.

## Technical posts

When describing engineering work:

1. State the old pain or limitation in one sentence.
2. Explain the new approach in plain terms (not a file tree).
3. Tie back to user-visible behavior (dashboard, version picker, `serve`, etc.).
4. Optional: one concrete detail (API used, command to run) — not a code dump.

Skip implementation minutiae agents already know (factory patterns, import paths) unless the post is a deep dive.

## File checklist

New post:

1. `packages/dashboard/src/routes/(static)/blog/{slug}/+page.md`
2. Add entry at **top** of `packages/dashboard/src/routes/(static)/blog/toc.ts`
3. Add `postDates` and `postDescriptions` in `packages/dashboard/src/routes/(static)/blog/+page.svelte`

Slug: lowercase kebab-case, descriptive (`webhooks-launch`, not `post-12`).

## Examples

See [examples.md](examples.md) for representative excerpts from published posts.
