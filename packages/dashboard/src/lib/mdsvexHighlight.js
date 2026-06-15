import hljs from 'highlight.js'
import { escapeSvelte } from 'mdsvex'

/** @type {import('mdsvex').Highlighter} */
export async function mdsvexHighlight(code, lang, _meta, _filename, optimise = true) {
  const normalisedLang = lang?.toLowerCase() ?? ''
  const language = normalisedLang && hljs.getLanguage(normalisedLang) ? normalisedLang : undefined
  const raw = language ? hljs.highlight(code, { language }).value : hljs.highlightAuto(code).value
  const highlighted = escapeSvelte(raw)
  const langClass = normalisedLang ? `language-${normalisedLang}` : 'language-plaintext'

  if (optimise) {
    return `<pre class="hljs ${langClass}">{@html \`<code class="hljs ${langClass}">${highlighted}</code>\`}</pre>`
  }

  return `<pre class="hljs ${langClass}"><code class="hljs ${langClass}">${highlighted}</code></pre>`
}
