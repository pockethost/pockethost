# Extending the PocketHost CLI

```ts
import { Command } from 'commander'

// Create some operation that you want to run via CLI
const myCmd = async () => {
  console.log(`Do something`)
}

// Add the command. By convention, create a top-level
// command named after your plugin, then add sub-commands.
onCliCommandsFilter(async (commands) => {
  return [
    ...commands,
    new Command(`my-plugin`).description(`my-plugin commands`).addCommand(
      new Command(`serve`).description(`Run a task`).action(async (options) => {
        myCmd()
      }),
    ),
  ]
})

/**
 * The following two hooks make it possible to run one or more of your custom
 * commands when the standard `pockethost serve` is called
 */

// Register a unique slug (your plugin name)
onServeSlugsFilter(async (slugs) => {
  return [...slugs, 'my-plugin']
})

// When the Serve action fires, check to see if
// your command is one of the commands the user
// specified (true by default)
onServeAction(async ({ only }) => {
  if (!only.includes('my-plugin')) return
  myCmd()
})
```
