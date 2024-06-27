type JobQueue = {
  [key: string]: Promise<any> | undefined
}

const jobQueue: JobQueue = {}

export function enqueueJob(
  key: string,
  promiseFn: () => Promise<any>,
): Promise<any> {
  const currentJob = jobQueue[key]

  const chainedPromise = currentJob ? currentJob.then(promiseFn) : promiseFn()

  jobQueue[key] = chainedPromise.finally(() => {
    if (jobQueue[key] === chainedPromise) {
      delete jobQueue[key]
    }
  })

  return chainedPromise
}
