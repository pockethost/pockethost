---
name: dashboard-browser-qa
description: >-
  QA the PocketHost dashboard in the Cursor IDE browser (cursor-ide-browser MCP).
  Use when verifying UI changes, testing login flows, checking styling, or when the
  user asks to open or test the dashboard in the browser.
---

# Dashboard browser QA

The **Cursor IDE browser works** for PocketHost dashboard QA. Use the `cursor-ide-browser` MCP tools. Do not skip browser verification because you assume automation is unavailable.

## Prerequisites

| Requirement | Notes |
|-------------|-------|
| `pnpm dev:dashboard` | Vite on `:5174` (usually already running) |
| `pnpm dev:cli serve` | Mothership + firewall on 80/443. Required for login and app routes |
| HTTPS base URL | `https://pockethost.lvh.me` — **not** `http://localhost:5174` (insecure context, wrong routing) |

## Credentials

Read `.secret/pockethost-io-login` at repo root:

- Line 1: email
- Line 2: password

Do not paste credentials into chat, commits, or rules. Reference the file path only.

## Login flow

1. `browser_navigate` → `https://pockethost.lvh.me/login`
2. `browser_lock` before interactions (after navigate, or lock first if a tab already exists)
3. Fill `#email` and `#password`. Svelte `bind:value` needs CDP `Runtime.evaluate` that sets `.value` and dispatches `input` on each field
4. Click submit, then `browser_snapshot` to confirm redirect (e.g. `/instances`)
5. `browser_unlock` when done

## Verification workflow

1. `browser_snapshot` for structure and refs before clicking
2. `browser_take_screenshot` after meaningful UI changes
3. Navigate the **task flow** the user cares about (not just the edited component in isolation)
4. Check mobile-ish width if layout is responsive

Lock order: navigate → lock → interact → unlock.

## When to use

- After dashboard UI/UX changes
- When the user reports "hard to use" or confusing flows
- Before shipping customer-visible `(app)/` route changes
- Pair with [.cursor/rules/dashboard-ux.mdc](../../rules/dashboard-ux.mdc) for styling expectations
