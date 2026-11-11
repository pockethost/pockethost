/**
 * Port of PocketBase CE ext/bulkmail/template.go. Keep the two in step: campaigns written for the legacy mothership
 * must render the same way once the CE plugin takes over.
 *
 * {{path}} placeholders and {{if path}}…{{else}}…{{end}} blocks (with {{if !path}}), nothing else.
 */

type Node =
  | { kind: 'text'; text: string }
  | { kind: 'var'; path: string }
  | { kind: 'if'; path: string; negate: boolean; then: Node[]; els: Node[] }

const pathRe = /^[A-Za-z_]\w*(\.[A-Za-z_]\w*)*$/

export const parseTemplate = (src: string): Node[] => {
  const root: Node[] = []
  const stack: { node: Extract<Node, { kind: 'if' }>; inElse: boolean }[] = []
  const push = (n: Node) => {
    const f = stack[stack.length - 1]
    if (!f) root.push(n)
    else if (f.inElse) f.node.els.push(n)
    else f.node.then.push(n)
  }

  const tagRe = /\{\{\s*(.*?)\s*\}\}/g
  let pos = 0
  let m: RegExpExecArray | null
  while ((m = tagRe.exec(src))) {
    if (m.index > pos) push({ kind: 'text', text: src.slice(pos, m.index) })
    pos = m.index + m[0].length
    const tag = m[1]!
    if (tag.startsWith('if ')) {
      let cond = tag.slice(3).trim()
      let negate = false
      if (cond.startsWith('!')) {
        negate = true
        cond = cond.slice(1).trim()
      }
      if (!pathRe.test(cond)) throw new Error(`invalid condition "${tag}"`)
      stack.push({ node: { kind: 'if', path: cond, negate, then: [], els: [] }, inElse: false })
    } else if (tag === 'else') {
      const f = stack[stack.length - 1]
      if (!f || f.inElse) throw new Error('unexpected {{else}}')
      f.inElse = true
    } else if (tag === 'end') {
      const f = stack.pop()
      if (!f) throw new Error('unexpected {{end}}')
      push(f.node)
    } else {
      if (!pathRe.test(tag)) throw new Error(`invalid placeholder {{${tag}}}`)
      push({ kind: 'var', path: tag })
    }
  }
  if (stack.length) throw new Error(`missing {{end}} for {{if ${stack[stack.length - 1]!.node.path}}}`)
  if (pos < src.length) push({ kind: 'text', text: src.slice(pos) })
  return root
}

export const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&#34;').replace(/'/g, '&#39;')

const lookup = (data: any, path: string): any => {
  let cur = data
  for (const part of path.split('.')) {
    if (cur === null || typeof cur !== 'object') return undefined
    cur = cur[part]
  }
  return cur
}

const toStr = (v: any): string => {
  if (v === undefined || v === null) return ''
  if (Array.isArray(v)) return v.join(', ')
  return String(v)
}

const truthy = (v: any): boolean => {
  if (v === undefined || v === null) return false
  if (typeof v === 'boolean') return v
  if (typeof v === 'number') return v !== 0
  if (typeof v === 'string') {
    const s = v.trim().toLowerCase()
    return s !== '' && s !== '0' && s !== 'false'
  }
  if (Array.isArray(v)) return v.length > 0
  if (typeof v === 'object') return Object.keys(v).length > 0
  return toStr(v) !== ''
}

const renderNodes = (nodes: Node[], data: any, escape: boolean): string =>
  nodes
    .map((n) => {
      if (n.kind === 'text') return n.text
      if (n.kind === 'var') {
        const v = toStr(lookup(data, n.path))
        return escape ? escapeHtml(v) : v
      }
      return truthy(lookup(data, n.path)) !== n.negate
        ? renderNodes(n.then, data, escape)
        : renderNodes(n.els, data, escape)
    })
    .join('')

export const renderTemplate = (src: string, data: any, escape: boolean) => renderNodes(parseTemplate(src), data, escape)

/** Legacy mailer placeholders: {$Var} (keys were matched lowercased) → {{var}}. */
export const convertLegacyTemplate = (src: string) =>
  src.replace(/\{\$(\w+)\}/g, (_m, key: string) => `{{${key.toLowerCase()}}}`)

export const footerHtml = (unsubscribeUrl: string, postal: string) => {
  let s =
    `<hr style="border:0;border-top:1px solid #ddd;margin:24px 0 12px"><p style="font-size:12px;color:#777">` +
    `Don't want these emails? <a href="${escapeHtml(unsubscribeUrl)}">Unsubscribe</a>.`
  postal = postal.trim()
  if (postal) s += '<br>' + escapeHtml(postal).replace(/\n/g, '<br>')
  return s + '</p>'
}

export const footerText = (unsubscribeUrl: string, postal: string) => {
  let s = '\n\n--\nUnsubscribe: ' + unsubscribeUrl
  postal = postal.trim()
  if (postal) s += '\n' + postal
  return s
}

const entities: Record<string, string> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#34;': '"',
  '&#39;': "'",
  '&nbsp;': ' ',
}

export const htmlToText = (s: string) => {
  s = s.replace(/<br\s*\/?>|<\/p>|<\/div>|<\/h[1-6]>|<\/li>/gi, '\n')
  s = s.replace(/<[^>]*>/g, '')
  s = s.replace(/&[#\w]+;/g, (e) => entities[e] ?? e)
  return s
    .split('\n')
    .map((l) => l.trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

export const normalizeEmail = (s: string) => {
  const e = `${s ?? ''}`.trim().toLowerCase()
  return /^[^\s@<>(),;:"]+@[^\s@<>(),;:"]+\.[^\s@<>(),;:"]+$/.test(e) ? e : ''
}
