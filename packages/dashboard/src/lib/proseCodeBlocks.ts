import type { Action } from 'svelte/action'

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text)
    return
  } catch {
    const textarea = document.createElement('textarea')
    textarea.value = text
    textarea.style.position = 'fixed'
    textarea.style.opacity = '0'
    document.body.appendChild(textarea)
    textarea.select()
    document.execCommand('copy')
    document.body.removeChild(textarea)
  }
}

function shouldEnhance(pre: HTMLPreElement) {
  return !pre.closest('.prose-code-block') && !pre.closest('.copy-field')
}

function enhancePre(pre: HTMLPreElement) {
  const text = (pre.querySelector('code')?.textContent ?? pre.textContent ?? '').replace(/\n$/, '')

  const wrapper = document.createElement('div')
  wrapper.className = 'prose-code-block'
  pre.parentNode?.insertBefore(wrapper, pre)
  wrapper.appendChild(pre)

  const button = document.createElement('button')
  button.type = 'button'
  button.className = 'prose-code-block-copy'
  button.setAttribute('aria-label', 'Copy to clipboard')
  button.innerHTML = '<wa-icon name="copy" aria-hidden="true"></wa-icon>'

  let resetTimer: ReturnType<typeof setTimeout> | undefined

  const onClick = async (event: Event) => {
    event.preventDefault()
    await copyText(text)
    button.innerHTML = '<wa-icon name="check" aria-hidden="true"></wa-icon>'
    button.setAttribute('aria-label', 'Copied')
    button.classList.add('prose-code-block-copy--copied')
    clearTimeout(resetTimer)
    resetTimer = setTimeout(() => {
      button.innerHTML = '<wa-icon name="copy" aria-hidden="true"></wa-icon>'
      button.setAttribute('aria-label', 'Copy to clipboard')
      button.classList.remove('prose-code-block-copy--copied')
    }, 2000)
  }

  button.addEventListener('click', onClick)
  wrapper.appendChild(button)

  return () => {
    button.removeEventListener('click', onClick)
    clearTimeout(resetTimer)
  }
}

function scanPres(root: HTMLElement) {
  const disposers: Array<() => void> = []

  for (const pre of root.querySelectorAll('pre')) {
    if (!shouldEnhance(pre)) continue
    disposers.push(enhancePre(pre))
  }

  return disposers
}

export const proseCodeBlocks: Action<HTMLElement> = (node) => {
  const disposers = scanPres(node)

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const added of mutation.addedNodes) {
        if (!(added instanceof HTMLElement)) continue

        if (added.matches('pre') && shouldEnhance(added)) {
          disposers.push(enhancePre(added))
        }

        disposers.push(...scanPres(added))
      }
    }
  })

  observer.observe(node, { childList: true, subtree: true })

  return {
    destroy() {
      observer.disconnect()
      for (const dispose of disposers) dispose()
    },
  }
}
