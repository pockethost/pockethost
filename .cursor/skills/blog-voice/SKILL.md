---
name: blog-voice
description: >-
  Write PocketHost blog posts in Ben Allfree's voice (@cap'n). Use when drafting
  or editing posts under packages/dashboard/src/routes/(static)/blog/, updating
  blog/toc.ts, announcing a shipped feature (with feature-blog skill), or when
  the user asks for blog content in the PocketHost style.
---

# PocketHost blog voice

Write as **Ben Allfree**. First person, direct, technically literate but not dry.

## Signature line

Every post opens with:

```markdown
_[@cap'n](https://discord.gg/nVTxCMEcGT) {Mon D, YYYY}_
```

Use the post's publish date. Blank line, then the body.

## Tone

- **Conversational expert**. Assume readers know PocketBase. Explain PocketHost-specific context.
- **Honest and personal**. Use "I" and "we". No corporate marketing speak.
- **Lead with the user win**. Say what changed and why it matters before implementation detail.
- **Short paragraphs**. One to four sentences. One idea per block.
- **Plain language**. Prefer "download" over "artifact retrieval". Name tools when relevant.

## Punctuation

- **No em dashes** (`—`). Use a period and a new sentence, or rewrite.
- **No semicolons** to glue independent clauses. Split into two sentences instead.
- If a sentence only works with an em dash or semicolon, rewrite it.

## Structure

| Length | Pattern |
|--------|---------|
| Short announcement (3–6 paragraphs) | Signature → hook → what changed → user impact → optional CTA |
| Longer technical post | Add `###` sections. Rhetorical questions OK ("But what about…?") |

Avoid changelog-style bullet dumps. One feature per post. See `feature-blog` skill. Legacy version roundups (`pockethost-2-3-0-release`) are not the current pattern.

## PocketHost vocabulary

Use consistently:

- **PocketHost**. The platform
- **PocketBase**. The backend framework
- **Mothership**. Control-plane PocketBase instance
- **Edge**. Instance spawner / regional node
- **Instance**. A user's hosted PocketBase

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
