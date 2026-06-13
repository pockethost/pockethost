_[@cap'n](https://discord.gg/nVTxCMEcGT) Jun 12, 2026_

The PocketHost dashboard has been on DaisyUI and a handful of Svelte wrapper libraries for a while. It worked, but the stack was showing its age — inconsistent components, icon packages bolted on separately, and a docs layout that was getting harder to read on wide monitors.

We just finished migrating the whole dashboard to [Web Awesome](https://webawesome.com/) (free tier) and cleaned up a few related rough edges along the way.

### What changed

**UI components** — Buttons, cards, callouts, inputs, dropdowns, and the rest now use Web Awesome's `wa-*` web components instead of DaisyUI classes. Icons go through `<wa-icon>` with Font Awesome Free built in, so we dropped `svelte-fa` and the separate `@fortawesome/*` packages.

**Theme** — Dark mode is first-class again. Brand green stays at `#1eb854`. The old blurred background pattern is gone in favor of a solid `#111111` shell, which reads better and keeps focus on content.

**Readability** — Marketing pages, the app shell, docs, and blog posts now share sensible max-widths so lines do not stretch forever on ultrawide displays. Doc prose got proper dark-theme typography so screenshots and body copy are actually legible.

**Images** — We removed `@sveltejs/enhanced-img` and the mdsvex image plugins. Logos and feature art use plain Vite imports; doc and blog images stay co-located with their routes and sync into `static/generated/` at dev/build time. One source of truth, no duplicate PNGs checked into git.

### What this means for you

**Same PocketHost, cleaner UI.** Dashboard, instance settings, pricing, and docs should feel familiar — just more consistent. Fewer random hover states and mismatched form controls.

**Docs are easier to read.** If you noticed gray-on-black prose lately, that was a migration side effect. Fixed.

**Easier for us to maintain.** One component library, one icon system, fewer dependencies. Future dashboard work should ship faster.

### Under the hood (briefly)

The old stack: DaisyUI + Tailwind + svelte-fa + enhanced-img + a custom blur background component.

The new stack: Web Awesome (cherry-picked components in `src/lib/webawesome.ts`) + Tailwind for layout + a small sync script for route-colocated markdown images.

Roughly sixty Svelte files touched. No user-facing feature removals — this is infrastructure and polish.

If you spot something that looks off after the deploy, [drop a note in Discord](https://discord.gg/nVTxCMEcGT). Always happy to fix the last 5%.
