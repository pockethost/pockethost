PocketHost has made new releases.

`@pockethost/plugin-maildev` has been released, which allows users to use a local `maildev` server to test emailing from instances.

All plugins now output their settings when PocketHost is run in debug mode.

Other supporting enhancements are listed below.

<!-- TOC depthfrom:1 depthto:1 orderedlist:false -->

- [pockethost@1.5.0](#pockethost150)
- [@pockethost/plugin-auto-admin@0.1.1](#pockethostplugin-auto-admin011)
- [@pockethost/plugin-cloudflare-request-logger@0.0.2](#pockethostplugin-cloudflare-request-logger002)
- [@pockethost/plugin-console-logger@0.2.1](#pockethostplugin-console-logger021)
- [@pockethost/plugin-launcher-spawn@0.3.0](#pockethostplugin-launcher-spawn030)
- [@pockethost/plugin-maildev@0.0.1](#pockethostplugin-maildev001)

<!-- /TOC -->

# pockethost@1.5.0

### Minor Changes

- 5e9ed51: Added `--extra-plugins` global switch to temporarily load extra plugins from CLI
- 2376b0d: Add InstanceConfig filter, fix instance logger namespace, add core instance app lib
- 737b4b8: logSettings now exported from core
- 114b1d2: Add namespace() export to core Logger service

### Patch Changes

- 211fba6: Plugin authoring docs update
- 675e634: Added docs and updated maildev with plugin hook guards
- 3daf7f5: Fix: [INFO] logging prefixes
- 139468f: Updated documentation
- 1e5321b: Fix: improve plugin loading order
- Updated dependencies [517f602]
  - @pockethost/plugin-launcher-spawn@0.3.0
  - @pockethost/plugin-console-logger@0.2.1
  - @pockethost/plugin-auto-admin@0.1.1

# @pockethost/plugin-auto-admin@0.1.1

### Patch Changes

- 517f602: Settings are now logged in DEBUG mode
- Updated dependencies [114b1d2]
  - pockethost@1.5.0

# @pockethost/plugin-cloudflare-request-logger@0.0.2

### Patch Changes

- 517f602: Settings are now logged in DEBUG mode
- Updated dependencies [114b1d2]
  - pockethost@1.5.0

# @pockethost/plugin-console-logger@0.2.1

### Patch Changes

- 517f602: Settings are now logged in DEBUG mode
- Updated dependencies [114b1d2]
  - pockethost@1.5.0

# @pockethost/plugin-launcher-spawn@0.3.0

### Minor Changes

- e4d35ae: Added support for configuring instance env and binds

### Patch Changes

- 40d8b8b: Enhancement: improve URL instructions
- b4b0cf9: Fix: now uses correct info() logging call
- 517f602: Settings are now logged in DEBUG mode
- Updated dependencies [114b1d2]
  - pockethost@1.5.0

# @pockethost/plugin-maildev@0.0.1

Initial release
