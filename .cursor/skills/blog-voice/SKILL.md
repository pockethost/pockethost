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

## Author and date

Author metadata lives in `packages/dashboard/src/lib/blog/authors.ts` (name, handle, email for Gravatar, optional link). Each `toc.ts` entry sets `author` (id, default `capn`) and `date` (`Mon D, YYYY`).

Posts no longer open with an inline signature line. The blog layout renders the author row with Gravatar automatically.

To add a new author:

```ts
// packages/dashboard/src/lib/blog/authors.ts
contributor: {
  id: 'contributor',
  name: 'Jane Doe',
  handle: '@jane',
  email: 'jane@example.com',
  url: 'https://example.com',
},
```

Then set `author: 'contributor'` on the post's `toc.ts` entry.

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
| Short announcement (3–6 paragraphs) | Hook → what changed → user impact → optional CTA |
| Longer technical post | Add `###` sections. Rhetorical questions OK ("But what about…?") |

Avoid changelog-style bullet dumps. One feature per post. See `feature-blog` skill. Legacy version roundups (`pockethost-2-3-0-release`) are not the current pattern.

## PocketHost vocabulary

Use consistently:

- **PocketHost**. The platform
- **PocketBase**. The backend framework
- **Mothership**. Control-plane PocketBase instance
- **Edge**. Instance spawner / regional node
- **Instance**. A user's hosted PocketBase

**Billing language:** Hard paywall. **Pay Per PocketBase** — **$9/mo**, **$59/yr**, or **$149 lifetime** per slot (250 MB DB + 10 GB files + one powered-on each). Unlimited instance records; powered-on capped by paid slots. Checkout still shows legacy prices until Jul 1 rollout. See [.cursor/rules/billing-paywall.mdc](../../rules/billing-paywall.mdc).

Link internal posts with `/blog/{slug}` paths.

## Technical posts

When describing engineering work:

1. State the old pain or limitation in one sentence.
2. Explain the new approach in plain terms (not a file tree).
3. Tie back to user-visible behavior (dashboard, version picker, `serve`, etc.).
4. Optional: one concrete detail (API used, command to run). Not a code dump.

Skip implementation minutiae agents already know (factory patterns, import paths) unless the post is a deep dive.

## File checklist

New post (one folder per slug — see `.cursor/rules/blog-articles.mdc`):

1. `packages/dashboard/src/routes/(static)/blog/{slug}/+page.md`
2. Co-located images in the same `{slug}/` folder; reference with relative paths (`![alt](hero.png)`)
3. Add entry at **top** of `packages/dashboard/src/routes/(static)/blog/toc.ts` with `description`, `date`, and `author`

Slug: lowercase kebab-case, descriptive (`webhooks-launch`, not `post-12`).

When the user adds images before or after the draft, scan the slug folder and weave them into the article with sensible alt text and placement.

## Examples

See [examples.md](examples.md) for representative excerpts from published posts.
