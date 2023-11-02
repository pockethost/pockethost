interface Require {
  (id: string): any
}
declare var require: Require

/** [MDN Reference](https://developer.mozilla.org/docs/Web/API/console) */
interface Console {
  /** [MDN Reference](https://developer.mozilla.org/docs/Web/API/console/assert) */
  assert(condition?: boolean, ...data: any[]): void
  /** [MDN Reference](https://developer.mozilla.org/docs/Web/API/console/clear) */
  clear(): void
  /** [MDN Reference](https://developer.mozilla.org/docs/Web/API/console/count) */
  count(label?: string): void
  /** [MDN Reference](https://developer.mozilla.org/docs/Web/API/console/countReset) */
  countReset(label?: string): void
  /** [MDN Reference](https://developer.mozilla.org/docs/Web/API/console/debug) */
  debug(...data: any[]): void
  /** [MDN Reference](https://developer.mozilla.org/docs/Web/API/console/dir) */
  dir(item?: any, options?: any): void
  /** [MDN Reference](https://developer.mozilla.org/docs/Web/API/console/dirxml) */
  dirxml(...data: any[]): void
  /** [MDN Reference](https://developer.mozilla.org/docs/Web/API/console/error) */
  error(...data: any[]): void
  /** [MDN Reference](https://developer.mozilla.org/docs/Web/API/console/group) */
  group(...data: any[]): void
  /** [MDN Reference](https://developer.mozilla.org/docs/Web/API/console/groupCollapsed) */
  groupCollapsed(...data: any[]): void
  /** [MDN Reference](https://developer.mozilla.org/docs/Web/API/console/groupEnd) */
  groupEnd(): void
  /** [MDN Reference](https://developer.mozilla.org/docs/Web/API/console/info) */
  info(...data: any[]): void
  /** [MDN Reference](https://developer.mozilla.org/docs/Web/API/console/log) */
  log(...data: any[]): void
  /** [MDN Reference](https://developer.mozilla.org/docs/Web/API/console/table) */
  table(tabularData?: any, properties?: string[]): void
  /** [MDN Reference](https://developer.mozilla.org/docs/Web/API/console/time) */
  time(label?: string): void
  /** [MDN Reference](https://developer.mozilla.org/docs/Web/API/console/timeEnd) */
  timeEnd(label?: string): void
  /** [MDN Reference](https://developer.mozilla.org/docs/Web/API/console/timeLog) */
  timeLog(label?: string, ...data: any[]): void
  timeStamp(label?: string): void
  /** [MDN Reference](https://developer.mozilla.org/docs/Web/API/console/trace) */
  trace(...data: any[]): void
  /** [MDN Reference](https://developer.mozilla.org/docs/Web/API/console/warn) */
  warn(...data: any[]): void
}

declare var console: Console
