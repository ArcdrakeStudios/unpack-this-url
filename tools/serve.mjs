import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
const root = resolve('dist'); const port = Number(process.env.PORT ?? 43218)
const files = new Map([['/', ['index.html', 'text/html']], ['/index.html', ['index.html', 'text/html']], ['/style.css', ['style.css', 'text/css']], ['/app.js', ['app.js', 'text/javascript']], ['/anatomy.js', ['anatomy.js', 'text/javascript']], ['/language.js', ['language.js', 'text/javascript']]])
for (const name of ['feedback.js', 'feedback-config.js', 'measurement-feedback-client.mjs', 'measurement-contract.mjs']) files.set('/' + name, [name, 'text/javascript'])
const server = createServer(async (request, response) => {
  if (['/api/events', '/api/feedback'].includes(request.url)) {
    const isPost = request.method === 'POST'
    response.writeHead(isPost ? 503 : 405, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...(!isPost ? { Allow: 'POST' } : {}) })
    response.end(JSON.stringify({ ok: false, error: isPost ? 'unavailable' : 'method' })); return
  }
  const match = files.get((request.url ?? '').split('?')[0])
  if (!match || request.method !== 'GET') { response.writeHead(404); response.end(); return }
  try { response.writeHead(200, { 'Content-Type': `${match[1]}; charset=utf-8`, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer' }); response.end(await readFile(resolve(root, match[0]))) }
  catch { response.writeHead(500); response.end('Local static asset unavailable') }
})
server.listen(port, '127.0.0.1', () => console.log(`Local: http://127.0.0.1:${port}`))
for (const event of ['SIGINT', 'SIGTERM']) process.on(event, () => server.close())
