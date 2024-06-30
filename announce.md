PocketHost has made new releases.

`@pockethost/plugin-local-auth` has been released, which allows local management of usernames and passwords.

<!-- @import "[TOC]" {cmd="toc" depthFrom=1 depthTo=1 orderedList=false} -->

<!-- code_chunk_output -->

- [pockethost@1.6.0](#pockethost160)
- [@pockethost/plugin-auto-admin@0.2.0](#pockethostplugin-auto-admin020)
- [@pockethost/plugin-cloudflare-request-logger@0.1.0](#pockethostplugin-cloudflare-request-logger010)
- [@pockethost/plugin-console-logger@0.3.0](#pockethostplugin-console-logger030)
- [@pockethost/plugin-ftp-server@0.1.0](#pockethostplugin-ftp-server010)
- [@pockethost/plugin-launcher-spawn@0.4.0](#pockethostplugin-launcher-spawn040)
- [@pockethost/plugin-local-auth@0.0.1](#pockethostplugin-local-auth001)
- [@pockethost/plugin-maildev@0.1.0](#pockethostplugin-maildev010)

<!-- /code_chunk_output -->

# pockethost@1.6.0

### Minor Changes

- 40bbb3c: Improve tryFetch by accepting node-fetch params
- 12f029a: Add changeset maker
- b7277cf: Add public instance URL calculators and refactor HTTP protocol detection
- 45a8f45: Add internal app (remote control) support
- 55b43a1: Remove unneeded params from GetOrProvisionInstanceUrl filter
- 5be2c9e: Initial commit
- a236f3e: Added several more filters
- 35edc77: Enhancement: actions execute sequentially
- 879845a: Enhancement: unsubscribe from filters
- c473ed9: Added support for priorities in actions
- 795fcd7: New action: KillInstance
- c32b845: Added support for Settings filter whereby all settings are collected and displayed in DEBUG() mode
- cce72b3: New action: AfterPluginsLoaded
- 82dde2d: Enhancement: filters now have extensible data types

### Patch Changes

- b55c585: Clean up dead code
- 0e4bf43: Updated commit parser deps
- f79b067: Added serve command details
- dd3ceaa: Added filter debugging
- 7931204: Fixed a bug where adding plugins was not saved correctly
- 6e14f57: Updated plugin authoring guide
- 7604930: Minor fix to GetOrProvisionInstanceUrl filter
- 52b70cb: Fixed bug where --extra-plugins was not defaulting to '' correctly
- Updated dependencies [c32b845]
  - @pockethost/plugin-launcher-spawn@1.0.0
  - @pockethost/plugin-auto-admin@1.0.0
  - @pockethost/plugin-console-logger@1.0.0

# @pockethost/plugin-auto-admin@0.2.0

### Minor Changes

- c32b845: Added support for Settings filter whereby all settings are collected and displayed in DEBUG() mode

### Patch Changes

- 5aa29c8: Docs update
- Updated dependencies [52b70cb]
  - pockethost@1.6.0

# @pockethost/plugin-cloudflare-request-logger@0.1.0

### Minor Changes

- c32b845: Added support for Settings filter whereby all settings are collected and displayed in DEBUG() mode

### Patch Changes

- Updated dependencies [52b70cb]
  - pockethost@1.6.0

# @pockethost/plugin-console-logger@0.3.0

### Minor Changes

- c32b845: Added support for Settings filter whereby all settings are collected and displayed in DEBUG() mode

### Patch Changes

- Updated dependencies [52b70cb]
  - pockethost@1.6.0

# @pockethost/plugin-ftp-server@0.1.0

### Minor Changes

- b43aeb1: Added support for built-in admin account, FTP server now uses hooks for user auth, and disallows db access when instance is running.
- c32b845: Added support for Settings filter whereby all settings are collected and displayed in DEBUG() mode

### Patch Changes

- Updated dependencies [52b70cb]
  - pockethost@1.6.0

# @pockethost/plugin-launcher-spawn@0.4.0

### Minor Changes

- b7277cf: Add public instance URL calculators and refactor HTTP protocol detection
- 478dfa6: Relocated instance database, added support for starting/stopping/listing instances via CLI, added remote internal API for starting/stopping/listing instances.
- c32b845: Added support for Settings filter whereby all settings are collected and displayed in DEBUG() mode

### Patch Changes

- Updated dependencies [52b70cb]
  - pockethost@1.6.0

# @pockethost/plugin-local-auth@0.0.1

Initial release

# @pockethost/plugin-maildev@0.1.0

### Minor Changes

- c32b845: Added support for Settings filter whereby all settings are collected and displayed in DEBUG() mode

### Patch Changes

- Updated dependencies [52b70cb]
  - pockethost@1.6.0
