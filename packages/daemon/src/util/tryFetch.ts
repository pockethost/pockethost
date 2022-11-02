import fetch from 'node-fetch'

export const tryFetch = (url: string) =>
  new Promise<void>((resolve, reject) => {
    const tryFetch = () => {
      console.log(`Trying to connect to instance ${url} `)
      fetch(url)
        .then(() => {
          console.log(`Connection to ${url} successful`)
          resolve()
        })
        .catch((e) => {
          console.error(`Could not connect to ${url}`)
          setTimeout(tryFetch, 1000)
        })
    }
    tryFetch()
  })
