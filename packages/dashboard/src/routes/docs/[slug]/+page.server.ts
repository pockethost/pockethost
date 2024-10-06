import { error } from '@sveltejs/kit'
import fs from 'fs'
import { compile } from 'mdsvex' // Import the mdsvex compiler
import path from 'path'

export async function load({ params }) {
  const { slug } = params
  const filePath = path.resolve('src/routes/docs/[slug]', `${slug}.md`)

  if (fs.existsSync(filePath)) {
    const html = await compile(fs.readFileSync(filePath, 'utf-8'))

    return {
      content: `<div class="prose">${html?.code}</div>`,
    }
  }

  throw error(404, 'File not found')
}

export async function entries() {
  // Get all markdown files in the docs directory
  const files = fs
    .readdirSync('src/routes/docs/[slug]')
    .filter((file) => file.endsWith('.md'))

  // Return an array of route entries (without the .md extension)
  return files.map((file) => ({
    slug: file.replace('.md', ''),
  }))
}
