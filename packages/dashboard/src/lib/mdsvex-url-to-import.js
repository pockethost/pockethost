import('svelte/compiler')
import camelCase from 'just-camel-case'
import { visit } from 'unist-util-visit'

// forgive me
const RE_SCRIPT_START =
  /<script(?:\s+?[a-zA-z]+(=(?:["']){0,1}[a-zA-Z0-9]+(?:["']){0,1}){0,1})*\s*?>/i

export default function fancyImages() {
  return function transformer(tree, vFile) {
    const images = new Map()
    const image_count = new Map()

    visit(tree, 'image', (node, index, parent) => {
      let camel = `i${camelCase(node.url)}`
      const count = image_count.get(camel)
      const dupe = images.get(node.url)

      if (count && !dupe) {
        image_count.set(camel, count + 1)
        camel = `${camel}_${count}`
      } else if (!dupe) {
        image_count.set(camel, 1)
      }

      images.set(node.url, {
        path: node.url.startsWith('.') ? node.url : `./${node.url}`,
        id: camel,
      })

      parent.children[index] = {
        type: 'html',
        value: `<enhanced:img src={${camel}} alt="image"/>`,
      }
    })

    let scripts = ''
    images.forEach(
      (x) => (scripts += `import ${x.id} from "${x.path}?enhanced";\n`),
    )

    let is_script = false

    visit(tree, 'html', (node) => {
      if (RE_SCRIPT_START.test(node.value)) {
        is_script = true
        node.value = node.value.replace(
          RE_SCRIPT_START,
          (script) => `${script}\n${scripts}`,
        )
      }
    })

    if (!is_script) {
      tree.children.push({
        type: 'html',
        value: `<script>\n${scripts}</script>`,
      })
    }
  }
}
