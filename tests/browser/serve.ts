import { Glob } from 'bun'

// Serve only generated assets, on loopback, for production browser checks.
const routes: Record<string, Response> = {}
for await (const file of new Glob('*').scan('./dist'))
  routes[`/${file}`] = new Response(Bun.file(`./dist/${file}`))
routes['/'] = new Response(Bun.file('./dist/index.html'))

Bun.serve({ hostname: '127.0.0.1', port: 3019, routes })
