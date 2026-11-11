// Runs the published CLI's deploy, files and logs code (packages/cli in the pockethost repo) against the Go deploy API.
// Driven by TestCLICompat; CLI_DIR, INST_DIR and the POCKETHOST_* variables come from the test.
import { existsSync, mkdirSync, readFileSync, readlinkSync, symlinkSync, unlinkSync, writeFileSync, mkdtempSync } from 'fs'
import { tmpdir } from 'os'
import { dirname, join } from 'path'

const cli = process.env.CLI_DIR!
const inst = process.env.INST_DIR!
const { deployViaApi, createDeployClient } = await import(join(cli, 'src/lib/deployApi.ts'))
const { DEFAULT_EXCLUDES, DEFAULT_INCLUDES } = await import(join(cli, 'src/lib/deployIncludes.ts'))
const { createFilesClient } = await import(join(cli, 'src/lib/filesApi.ts'))
const { resolveDeployCredential } = await import(join(cli, 'src/lib/token.ts'))
const { isCodePath } = await import(join(cli, 'src/lib/codeSet.ts'))

const project = mkdtempSync(join(tmpdir(), 'ph-cli-project-'))
const projectFile = (rel: string, content: string) => {
  const p = join(project, rel)
  mkdirSync(dirname(p), { recursive: true })
  writeFileSync(p, content)
}
const instFile = (rel: string) => join(inst, rel)
const read = (p: string) => readFileSync(p, 'utf8')
let failures = 0
const expect = (name: string, ok: boolean, detail: unknown = '') => {
  if (!ok) {
    failures++
    console.log(`FAIL ${name} ${typeof detail === 'string' ? detail : JSON.stringify(detail)}`)
  } else console.log(`ok   ${name}`)
}
const rejects = async (name: string, p: Promise<unknown>, re: RegExp) => {
  try {
    await p
    expect(name, false, 'did not throw')
  } catch (e) {
    expect(name, re.test(`${(e as Error).message}`), (e as Error).message)
  }
}
const deploy = (extra: Record<string, unknown> = {}) =>
  deployViaApi({ instanceName: 'myapp', include: DEFAULT_INCLUDES, exclude: DEFAULT_EXCLUDES, cwd: project, commit: 'deadbeef', log: () => {}, ...extra })

projectFile('pb_hooks/main.pb.js', 'routerAdd()')
projectFile('pb_migrations/1_init.js', 'migrate()')
projectFile('pb_public/index.html', '<h1>v1</h1>')
projectFile('package.json', '{"name":"x"}')
projectFile('pb_data/data.db', 'LOCAL DB MUST NOT SHIP')
projectFile('node_modules/dep/index.js', 'no')
projectFile('README.md', 'not deployed')
projectFile('pb_public/.well-known/security.txt', 'contact')
projectFile('pb_public/.gitignore', 'ignored')
mkdirSync(dirname(instFile('pb_data/data.db')), { recursive: true })
writeFileSync(instFile('pb_data/data.db'), 'REMOTE DB')

const first = await deploy()
expect('first deploy', first.writtenCount === 5 && first.deletedCount === 0 && first.restarted === true, first)
expect('dotfile shipped', read(instFile('pb_public/.well-known/security.txt')) === 'contact')
expect('.gitignore not shipped', !existsSync(instFile('pb_public/.gitignore')))
expect('hook', read(instFile('pb_hooks/main.pb.js')) === 'routerAdd()')
expect('remote db kept', read(instFile('pb_data/data.db')) === 'REMOTE DB')
expect('no node_modules', !existsSync(instFile('node_modules')))
expect('no README', !existsSync(instFile('README.md')))

projectFile('pb_public/index.html', '<h1>v2</h1>')
unlinkSync(join(project, 'pb_migrations/1_init.js'))
const logs: string[] = []
const second = await deploy({ log: (m: string) => logs.push(m) })
expect('second deploy', second.writtenCount === 1 && second.deletedCount === 1 && second.unchanged === 3, second)
expect('v2', read(instFile('pb_public/index.html')) === '<h1>v2</h1>')
expect('migration deleted', !existsSync(instFile('pb_migrations/1_init.js')))
expect('uploaded one', logs.some((l) => l.includes('Uploading 1 file')), logs)
expect('third: nothing changed', (await deploy()).nothingChanged === true)

const token = process.env.POCKETHOST_TOKEN
process.env.POCKETHOST_TOKEN = `ph_pat_abcdefghij12345_${'C'.repeat(43)}`
await rejects('rejected token', deploy(), /Authentication failed \(POCKETHOST_TOKEN\)/)
process.env.POCKETHOST_TOKEN = token
await rejects('unknown instance', deploy({ instanceName: 'nope' }), /Instance 'nope' not found/)

mkdirSync(dirname(instFile('node_modules/old/index.js')), { recursive: true })
writeFileSync(instFile('node_modules/old/index.js'), 'server-installed')
mkdirSync(instFile('node_modules/.bin'), { recursive: true })
symlinkSync('../old/index.js', instFile('node_modules/.bin/old'))
projectFile('pb_hooks/main.pb.js', 'routerAdd(2)')
const nm = await deploy({ nodeModules: false })
expect('--no-node-modules', nm.writtenCount === 1 && nm.deletedCount === 0, nm)
expect('old package kept', read(instFile('node_modules/old/index.js')) === 'server-installed')
expect('old link kept', readlinkSync(instFile('node_modules/.bin/old')) === '../old/index.js')

const logs2: string[] = []
const empty = await deploy({ log: (m: string) => logs2.push(m) })
expect('empties node_modules', empty.nothingChanged === false && empty.replacedNodeModules === true && empty.restarted === true, empty)
expect('old gone', !existsSync(instFile('node_modules/old')) && !existsSync(instFile('node_modules/.bin')))
expect('warned', logs2.some((l) => l.includes('any on the server will be removed')), logs2)

// files
const files = await createFilesClient('myapp')
const listing = await files.list('', true)
const paths = (listing.entries ?? listing).map((e: { path: string }) => e.path)
expect('list', paths.includes('pb_hooks/main.pb.js') && paths.includes('pb_data'), paths)
const dl = join(project, 'dl/main.pb.js')
await files.download('pb_hooks/main.pb.js', dl)
expect('download', read(dl) === 'routerAdd(2)')
projectFile('up/big.bin', 'x'.repeat(1000))
await files.upload(join(project, 'up/big.bin'), 'pb_public/big.bin')
expect('upload', read(instFile('pb_public/big.bin')) === 'x'.repeat(1000))
await files.remove('pb_public/big.bin')
expect('remove', !existsSync(instFile('pb_public/big.bin')))
await rejects('pb_data while powered on', files.download('pb_data/data.db', join(project, 'dl/db')), /Power off/)

// logs
mkdirSync(instFile('logs'), { recursive: true })
writeFileSync(instFile('logs/exec.log'), '{"message":"hello from pocker","stream":"stdout","time":"2026-11-10T00:00:00Z"}\n')
const api = createDeployClient('myapp', await resolveDeployCredential())
// Read through Node, the CLI's runtime (bin is #!/usr/bin/env node): bun's fetch sometimes drops the first chunk of
// a streamed response. The wire format (event: log / data: {...}) is standard SSE.
const sse = `
const ctrl = new AbortController(); setTimeout(() => ctrl.abort(), 5000)
const res = await fetch(process.argv[1], { headers: JSON.parse(process.argv[2]), signal: ctrl.signal })
console.log('CT ' + res.headers.get('content-type'))
const r = res.body.getReader(); let buf = ''
for (;;) {
  const { value, done } = await r.read(); if (done) break
  buf += new TextDecoder().decode(value)
  const block = buf.split('\\n\\n').find((b) => b.split('\\n').includes('event: log'))
  if (block) { console.log('MSG ' + JSON.parse(block.split('\\n').find((l) => l.startsWith('data: ')).slice(6)).message); process.exit(0) }
}`
const node = Bun.spawnSync(['node', '--input-type=module', '-e', sse, `${api.base}/logs?n=10`, JSON.stringify(api.headers)])
const out = node.stdout.toString()
expect('logs content type', /^CT text\/event-stream/m.test(out), out + node.stderr.toString())
const got = [...out.matchAll(/^MSG (.*)$/gm)].map((m) => m[1])
expect('logs', got[0] === 'hello from pocker', got)

// code-set parity: print the CLI's verdicts for the Go side to compare
const parity = JSON.parse(process.env.PARITY_PATHS!) as string[]
console.log('PARITY ' + JSON.stringify(parity.map((p) => isCodePath(p))))

if (failures) {
  console.log(`${failures} failure(s)`)
  process.exit(1)
}
