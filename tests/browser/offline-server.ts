import { readdir, readFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import { extname } from 'node:path'

// A server per offline test lets us disconnect the actual origin, including in
// Some browser versions reject setOffline for service-worker-generated navigations.
export async function offlineServer() {
  const types: Record<string, string> = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.png': 'image/png',
    '.svg': 'image/svg+xml',
    '.webmanifest': 'application/manifest+json',
  }
  const files = new Map<string, Buffer>()
  for (const name of await readdir('./dist'))
    files.set(`/${name}`, await readFile(`./dist/${name}`))
  let updated = false
  const server = createServer((request, response) => {
    const url = new URL(request.url ?? '/', 'http://localhost')
    const path = url.pathname === '/' ? '/index.html' : url.pathname
    let body = files.get(path)
    if (body && path === '/service-worker.js' && updated)
      body = Buffer.from(
        body
          .toString()
          .replace(/tribe-app-[a-f0-9]{20}/g, 'tribe-app-browser-update'),
      )
    response.writeHead(body ? 200 : 404, {
      'Content-Type': types[extname(path)] ?? 'application/octet-stream',
      'Cache-Control': 'no-store',
    })
    response.end(body)
  })
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  const address = server.address()
  if (!address || typeof address === 'string')
    throw new Error('Test server has no TCP address')
  return {
    url: `http://127.0.0.1:${address.port}`,
    update() {
      updated = true
    },
    async close() {
      server.closeAllConnections()
      if (server.listening)
        await new Promise<void>((resolve) => server.close(() => resolve()))
    },
  }
}
