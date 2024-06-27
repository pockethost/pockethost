import hljs from 'highlight.js'

const highlight = (code, lang) => {
  lang = lang && hljs.getLanguage(lang) ? lang : 'plaintext'
  return hljs.highlight(code, { language: lang }).value
}

export default { highlight }
