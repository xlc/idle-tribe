import { createHash } from 'node:crypto'
import { cp, rm } from 'node:fs/promises'
import { relative, resolve } from 'node:path'

await rm('./dist', { recursive: true, force: true })
const app = await Bun.build({
  entrypoints: ['./index.html'],
  outdir: './dist',
  minify: true,
  define: { 'process.env.NODE_ENV': '"production"' },
})
if (!app.success) throw new AggregateError(app.logs, 'App build failed')
await cp('./public', './dist', { recursive: true })

const assets = new Set([
  '/',
  ...app.outputs.map(
    (output) => `/${relative(resolve('./dist'), output.path)}`,
  ),
])
for await (const file of new Bun.Glob('*').scan('./public'))
  assets.add(`/${file}`)
const hash = createHash('sha256')
for (const asset of [...assets].sort()) {
  hash.update(asset)
  hash.update(
    await Bun.file(`./dist${asset === '/' ? '/index.html' : asset}`).bytes(),
  )
}
hash.update(await Bun.file('./src/service-worker.ts').bytes())
const worker = await Bun.build({
  entrypoints: ['./src/service-worker.ts'],
  outdir: './dist',
  naming: 'service-worker.js',
  minify: true,
  define: {
    PRECACHE_ASSETS: JSON.stringify([...assets]),
    CACHE_NAME: JSON.stringify(`tribe-app-${hash.digest('hex').slice(0, 20)}`),
  },
})
if (!worker.success)
  throw new AggregateError(worker.logs, 'Offline worker build failed')
