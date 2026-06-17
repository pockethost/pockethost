# Admin Plugin — Server Registration

## JSVM (pb_hooks)

Use `$app.onServe().bindFunc`. There is **no** top-level `onServe()` helper in v0.39 typings (unlike `onBootstrap`).

```js
// pb_hooks/admin_plugins.pb.js
$app.onServe().bindFunc((e) => {
  e.uiExtensions.push({
    name: 'operator-stats',
    fs: $os.dirFS(`${__hooks}/../pb_admin_ext/operator-stats`),
  })

  // Multiple extensions:
  e.uiExtensions.push({
    name: 'tools',
    fs: $os.dirFS(`${__hooks}/../pb_admin_ext/tools`),
  })

  e.next() // required
})
```

### FS requirements

- `fs` must be an `fs.FS` — use `$os.dirFS(absoluteOrRelativePath)`.
- `${__hooks}` is the absolute `pb_hooks` directory (works in JSVM).
- Directory must contain optional `main.js` at the **root** of the FS (not nested).
- Other static files (css, svg, images) are served under `/_/extensions/{name}/{path}`.

### Generated routes

PocketBase registers these automatically when UI is bundled (not `no_ui` builds):

| Route | Purpose |
|-------|---------|
| `GET /_/extensions/{name}/{path...}` | Static files from extension FS |
| `GET /_/extensions.js` | Concatenated `main.js` from all extensions (IIFE-wrapped, supports top-level await) |

`/_/extensions.js` is **not cached in memory** so hook FS changes can be previewed without restart (still restart for `uiExtensions` registration changes).

### Multiple extensions

Each push to `e.uiExtensions` adds one extension. All `main.js` files are concatenated into one `/_/extensions.js` load.

## Go (framework mode)

```go
app.OnServe().BindFunc(func(e *core.ServeEvent) error {
    e.UIExtensions = append(e.UIExtensions, core.UIExtension{
        Name: "example",
        FS:   os.DirFS("./pb_admin_ext/example"),
        // or embed.FS for single-binary deploy
    })
    return e.Next()
})
```

Future Stage 2 may add helpers like `uiAdd(name, fs)` ([#7612](https://github.com/pocketbase/pocketbase/discussions/7612)).

## Directory conventions

PocketBase does not mandate a folder name. Common layouts:

```
# A — sibling to pb_hooks (recommended for PocketHost)
pb_hooks/admin_plugins.pb.js
pb_admin_ext/{pluginName}/main.js

# B — under pb_hooks (works with phio/FTP)
pb_hooks/extensions.pb.js
pb_hooks/_ext/{pluginName}/main.js
```

Pick one layout per app and reference it consistently in `$os.dirFS(...)`.

## Mothership (PocketHost)

- Hook registration code can live in `mothership-app/src/lib/handlers/…/hooks.ts` (bundled by tsdown into `pb_hooks/mothership.pb.js`).
- **Static extension assets are not bundled by tsdown.** Ship `pb_admin_ext/` as real files beside `pb_hooks/` in the mothership app directory on the host.
- Use `$os.dirFS(\`${__hooks}/../pb_admin_ext/…\`)` so paths resolve whether hooks run from `pb_hooks/mothership.pb.js` or the bundle.
- Stop mothership before swapping hook bundles (see `.cursor/rules/mothership-hooks.mdc`).

## Customer instances (PocketHost)

- Deploy via phio/FTP: upload `pb_hooks/*.pb.js` + `pb_admin_ext/**` together.
- Instance container restart reloads hooks from a consistent tree.
- Instance must run PocketBase **≥0.37**.

## Debugging

1. `curl -I https://your-pb/_/` — admin UI must be present (`no_ui` builds skip extensions).
2. `curl https://your-pb/_/extensions.js` — should return JS (possibly empty if no `main.js` files).
3. `curl https://your-pb/_/extensions/{name}/main.js` — verify static mount.
4. Browser Network tab — confirm `/_/extensions.js` loads after admin auth.
