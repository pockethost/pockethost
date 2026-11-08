import {
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'fs'
import { tmpdir } from 'os'
import { dirname, join } from 'path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { DEFAULT_EXCLUDES, DEFAULT_INCLUDES } from './deployIncludes'
import { deployToDir } from './deployLocal'
import { collectNodeModules, hasRuntimeDependencies } from './nodeModules'

let root: string

const write = (rel: string, content: string) => {
  const abs = join(root, rel)
  mkdirSync(dirname(abs), { recursive: true })
  writeFileSync(abs, content)
}
const pkg = (
  dir: string,
  json: Record<string, unknown>,
  files: Record<string, string> = { 'index.js': '' }
) => {
  write(`${dir}/package.json`, JSON.stringify(json))
  for (const [f, c] of Object.entries(files)) write(`${dir}/${f}`, c)
}
const link = (target: string, rel: string) => {
  const abs = join(root, rel)
  mkdirSync(dirname(abs), { recursive: true })
  symlinkSync(target, abs)
}
const paths = (r: ReturnType<typeof collectNodeModules>) =>
  r.files.map((f) => f.path)

/** Every entry under `dir`, with whether it's a symlink. */
const listTree = (
  dir: string,
  rel = ''
): { path: string; symlink: boolean }[] =>
  readdirSync(join(dir, rel)).flatMap((name) => {
    const childRel = rel ? `${rel}/${name}` : name
    const st = lstatSync(join(dir, childRel))
    if (st.isSymbolicLink()) return [{ path: childRel, symlink: true }]
    if (st.isDirectory()) return listTree(dir, childRel)
    return [{ path: childRel, symlink: false }]
  })

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'ph-nm-'))
})
afterEach(() => {
  rmSync(root, { recursive: true, force: true })
})

describe('collectNodeModules', () => {
  it('ships dependencies and their dependencies, never devDependencies', () => {
    pkg('.', { dependencies: { a: '1' }, devDependencies: { dev: '1' } }, {})
    pkg('node_modules/a', {
      name: 'a',
      version: '1.0.0',
      dependencies: { b: '1' },
    })
    pkg('node_modules/b', { name: 'b', version: '1.0.0' }, { 'lib/b.js': 'b' })
    pkg('node_modules/dev', { name: 'dev', version: '1.0.0' })
    pkg('node_modules/unrelated', { name: 'unrelated', version: '1.0.0' })

    const r = collectNodeModules(root)
    expect(paths(r)).toEqual([
      'node_modules/a/index.js',
      'node_modules/a/package.json',
      'node_modules/b/lib/b.js',
      'node_modules/b/package.json',
    ])
    expect(r.missing).toEqual([])
  })

  it('nests a second version under the package that needs it', () => {
    pkg('.', { dependencies: { a: '1', b: '1' } }, {})
    pkg('node_modules/b', { name: 'b', version: '1.0.0' }, { 'v.js': '1' })
    pkg('node_modules/a', {
      name: 'a',
      version: '1.0.0',
      dependencies: { b: '2' },
    })
    pkg(
      'node_modules/a/node_modules/b',
      { name: 'b', version: '2.0.0' },
      { 'v.js': '2' }
    )

    const r = collectNodeModules(root)
    expect(r.packages.map((p) => `${p.path}@${p.version}`)).toEqual([
      'node_modules/a@1.0.0',
      'node_modules/a/node_modules/b@2.0.0',
      'node_modules/b@1.0.0',
    ])
  })

  it('reuses a hoisted copy instead of duplicating it', () => {
    pkg('.', { dependencies: { a: '1', c: '1' } }, {})
    pkg('node_modules/a', {
      name: 'a',
      version: '1.0.0',
      dependencies: { shared: '1' },
    })
    pkg('node_modules/c', {
      name: 'c',
      version: '1.0.0',
      dependencies: { shared: '1' },
    })
    pkg('node_modules/shared', { name: 'shared', version: '1.0.0' })

    const r = collectNodeModules(root)
    expect(r.packages.map((p) => p.path)).toEqual([
      'node_modules/a',
      'node_modules/c',
      'node_modules/shared',
    ])
  })

  it('follows pnpm-style symlinks and flattens them into a plain tree', () => {
    pkg('.', { dependencies: { a: '1' } }, {})
    pkg('node_modules/.pnpm/a@1.0.0/node_modules/a', {
      name: 'a',
      version: '1.0.0',
      dependencies: { b: '1' },
    })
    pkg('node_modules/.pnpm/b@1.0.0/node_modules/b', {
      name: 'b',
      version: '1.0.0',
    })
    link(
      '../../b@1.0.0/node_modules/b',
      'node_modules/.pnpm/a@1.0.0/node_modules/b'
    )
    link('.pnpm/a@1.0.0/node_modules/a', 'node_modules/a')

    const r = collectNodeModules(root)
    expect(paths(r)).toEqual([
      'node_modules/a/index.js',
      'node_modules/a/package.json',
      'node_modules/b/index.js',
      'node_modules/b/package.json',
    ])
    expect(
      r.files.every((f) => f.source.includes('/node_modules/.pnpm/'))
    ).toBe(true)
    expect(
      r.files.find((f) => f.path === 'node_modules/b/index.js')!.source
    ).toContain('.pnpm/b@1.0.0')
  })

  it('handles scoped packages', () => {
    pkg('.', { dependencies: { '@s/a': '1' } }, {})
    pkg('node_modules/@s/a', {
      name: '@s/a',
      version: '1.0.0',
      dependencies: { '@s/b': '1' },
    })
    pkg('node_modules/@s/b', { name: '@s/b', version: '1.0.0' })

    expect(collectNodeModules(root).packages.map((p) => p.path)).toEqual([
      'node_modules/@s/a',
      'node_modules/@s/b',
    ])
  })

  it('ships only the published files of a linked workspace package', () => {
    pkg('.', { dependencies: { w: 'workspace:*' } }, {})
    pkg(
      'packages/w',
      { name: 'w', version: '0.1.0', files: ['dist'] },
      {
        'dist/index.js': 'built',
        'src/index.ts': 'source',
        'tsconfig.json': '{}',
        'README.md': 'readme',
      }
    )
    link('../packages/w', 'node_modules/w')

    expect(paths(collectNodeModules(root))).toEqual([
      'node_modules/w/README.md',
      'node_modules/w/dist/index.js',
      'node_modules/w/package.json',
    ])
  })

  it('reports missing required packages and ignores missing optional ones', () => {
    pkg(
      '.',
      { dependencies: { gone: '1' }, optionalDependencies: { maybe: '1' } },
      {}
    )

    const r = collectNodeModules(root)
    expect(r.missing).toEqual([{ name: 'gone', requiredBy: 'package.json' }])
    expect(r.files).toEqual([])
  })

  it('includes resolvable peer dependencies of packages', () => {
    pkg('.', { dependencies: { plugin: '1', host: '1' } }, {})
    pkg('node_modules/plugin', {
      name: 'plugin',
      version: '1.0.0',
      peerDependencies: { host: '1', absent: '1' },
    })
    pkg('node_modules/host', { name: 'host', version: '1.0.0' })

    const r = collectNodeModules(root)
    expect(r.packages.map((p) => p.name)).toEqual(['host', 'plugin'])
    expect(r.missing).toEqual([])
  })

  it('survives a symlink loop inside a package', () => {
    pkg('.', { dependencies: { a: '1' } }, {})
    pkg('node_modules/a', { name: 'a', version: '1.0.0' })
    link('..', 'node_modules/a/lib/loop')

    expect(paths(collectNodeModules(root))).toEqual([
      'node_modules/a/index.js',
      'node_modules/a/package.json',
    ])
  })

  it('detects whether package.json has runtime dependencies', () => {
    pkg('.', { devDependencies: { x: '1' } }, {})
    expect(hasRuntimeDependencies(root)).toBe(false)
    pkg('.', { dependencies: { x: '1' } }, {})
    expect(hasRuntimeDependencies(root)).toBe(true)
  })
})

describe('deploy --out', () => {
  it('writes the code set plus node_modules as plain files with no symlinks', async () => {
    pkg('.', { dependencies: { a: '1' }, devDependencies: { dev: '1' } }, {})
    write('pb_hooks/main.pb.js', 'require("a")')
    write('pb_data/data.db', 'secret')
    write('README.md', 'not deployed')
    pkg(
      'node_modules/.pnpm/a@1.0.0/node_modules/a',
      { name: 'a', version: '1.0.0' },
      { 'index.js': 'A' }
    )
    link('.pnpm/a@1.0.0/node_modules/a', 'node_modules/a')
    pkg('node_modules/dev', { name: 'dev', version: '1.0.0' })
    const out = join(root, '..', `${root.split('/').pop()}-out`)

    try {
      await deployToDir(out, {
        include: DEFAULT_INCLUDES,
        exclude: DEFAULT_EXCLUDES,
        nodeModules: true,
        cwd: root,
        log: () => {},
      })
      const tree = listTree(out)
      expect(tree.filter((e) => e.symlink)).toEqual([])
      expect(tree.map((e) => e.path).sort()).toEqual([
        'node_modules/a/index.js',
        'node_modules/a/package.json',
        'package.json',
        'pb_hooks/main.pb.js',
      ])
      expect(readFileSync(join(out, 'node_modules/a/index.js'), 'utf8')).toBe(
        'A'
      )
    } finally {
      rmSync(out, { recursive: true, force: true })
    }
  })

  it('refuses a missing required package', async () => {
    pkg('.', { dependencies: { gone: '1' } }, {})
    await expect(
      deployToDir(join(root, 'out'), {
        include: DEFAULT_INCLUDES,
        exclude: DEFAULT_EXCLUDES,
        nodeModules: true,
        cwd: root,
        log: () => {},
      })
    ).rejects.toThrow(/missing/)
  })

  it('refuses a non-empty output folder', async () => {
    pkg('.', {}, {})
    write('out/keep.txt', 'x')
    await expect(
      deployToDir(join(root, 'out'), {
        include: DEFAULT_INCLUDES,
        exclude: DEFAULT_EXCLUDES,
        cwd: root,
        log: () => {},
      })
    ).rejects.toThrow(/must be empty/)
  })
})
