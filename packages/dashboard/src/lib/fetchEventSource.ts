export type EventSourceMessage = {
  data: string
  event?: string
  id?: string
  retry?: number
}

export type FetchEventSourceInit = RequestInit & {
  onopen?: (response: Response) => Promise<void>
  onmessage?: (ev: EventSourceMessage) => void
  onclose?: () => void
  onerror?: (err: unknown) => number | void | null | undefined
  fetch?: typeof fetch
  openWhenHidden?: boolean
}

type FetchEventSource = (input: RequestInfo | URL, init?: FetchEventSourceInit) => Promise<void>

const loadFetchEventSource = new Function("return import('@microsoft/fetch-event-source')") as () => Promise<{
  fetchEventSource: FetchEventSource
}>

let fetchEventSourceImpl: FetchEventSource | undefined

export const fetchEventSource: FetchEventSource = async (input, init) => {
  if (!fetchEventSourceImpl) {
    const mod = await loadFetchEventSource()
    fetchEventSourceImpl = mod.fetchEventSource
  }
  return fetchEventSourceImpl(input, init)
}
