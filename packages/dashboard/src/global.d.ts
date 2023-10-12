import type { Tooltip } from 'bootstrap'
import 'vite/client'

declare global {
  interface Window {
    bootstrap: { Tooltip: Tooltip }
  }
}
