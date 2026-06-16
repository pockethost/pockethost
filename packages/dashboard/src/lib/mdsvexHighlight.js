import hljs from 'highlight.js'
import { escapeSvelte } from 'mdsvex'

/**
 * @param {string} code
 * @param {string | undefined} lang
 * @param {unknown} _meta
 * @param {string | undefined} _filename
 * @param {boolean} [optimise]
 */
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
