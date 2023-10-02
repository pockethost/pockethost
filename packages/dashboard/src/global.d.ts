import type { Tooltip } from 'bootstrap'

declare global {
  interface Window {
    bootstrap: { Tooltip: Tooltip }
  }
}
