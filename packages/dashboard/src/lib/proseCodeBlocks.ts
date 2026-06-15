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

export const proseCodeBlocks: Action<HTMLElement> = (node) => {
  const disposers: Array<() => void> = []

  for (const pre of node.querySelectorAll('pre')) {
    if (pre.closest('.prose-code-block') || pre.closest('.copy-field')) continue

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

    disposers.push(() => {
      button.removeEventListener('click', onClick)
      clearTimeout(resetTimer)
    })
  }

  return {
    destroy() {
      for (const dispose of disposers) dispose()
    },
  }
}
