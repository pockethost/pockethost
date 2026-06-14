PocketHost already runs on Node 24. The next step was to stop carrying polyfills Node ships for free.

Over the last week we trimmed the hosting stack in two passes. First we dropped packages that nothing imported anymore. Then we replaced the rest with Node 24 built-ins and web standards. The lockfile is over 100 packages lighter. That means fewer things to audit, faster installs, and less surface area when we experiment with new runtimes.

### What we swapped out

The CLI and edge services no longer depend on:

- **`node-fetch`** → global `fetch`
- **`eventsource`** → Node's `EventSource` (`NODE_OPTIONS=--experimental-eventsource` on CLI scripts)
- **`memorystream`** → `PassThrough` from `node:stream` (Docker log pipes)
- **`glob`** → `globSync` from `node:fs`
- **`dotenv`** → `process.loadEnvFile` in settings bootstrap

We also removed dead weight that had lingered for years: unused dashboard packages, the old Changesets release tooling, dev-only cert helpers, and a few orphaned type packages.

None of this changes how you use PocketHost. Instances still spawn the same way. The dashboard still talks to Mothership the same way. If you self-host with `pnpm dev:cli serve`, you get the same commands with a leaner install.

### Why bother

Every dependency is a contract. Someone has to keep it compatible with Node, with Docker, with our forked packages, and eventually with whatever runtime comes next.

Standards-based APIs (`fetch`, `EventSource`, Node core modules) are the boring choice. Boring is good when you run thousands of PocketBase instances on shared edge nodes.

### The road to Bun

We are **not** switching production to [Bun](https://bun.sh) today. Bun stays on the icebox until we rebalance the experimental branch and soak-test the hard parts: `dockerode`, our patched log tailer, and process supervision on Linux.

That said, this cleanup is deliberate prep. Bun already excels at `fetch` and TypeScript-native tooling. The fewer Node-only polyfills we carry, the less we have to re-validate when we try Bun for real on edge daemons.

When Bun lands, it will be because the container lifecycle and logging story are proven, not because we skipped the easy wins on Node first.

### What's next

More dependency diet work is queued: inlining small Express middleware helpers and tightening the dashboard frontend bundle.

The big platform thread is unchanged: edge-owned runtime status, then Mothership PocketBase v0.39. Leaner deps do not block that work. They just make every step after it cheaper.

If you run PocketHost yourself, pull latest and `pnpm install`. You should feel the difference in install time long before you notice anything in runtime behavior.
