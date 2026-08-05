// mirror all sitemap urls into ./pages/<slug>.html
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'

const urls = readFileSync('urls.txt', 'utf8').trim().split('\n').filter(Boolean)
mkdirSync('pages', { recursive: true })

const slug = (u) => {
  const p = new URL(u).pathname
  return (p === '/' ? 'index' : p.replace(/^\/|\/$/g, '').replace(/\//g, '__')) + '.html'
}

let done = 0, failed = []
const CONC = 6
const queue = [...urls]

async function worker() {
  while (queue.length) {
    const u = queue.shift()
    try {
      const r = await fetch(u, { headers: { 'user-agent': 'Mozilla/5.0 (Macintosh) KLM-archive/1.0' } })
      if (!r.ok) throw new Error('HTTP ' + r.status)
      writeFileSync('pages/' + slug(u), await r.text())
    } catch (e) {
      failed.push([u, String(e)])
    }
    done++
    if (done % 50 === 0) console.log(done + '/' + urls.length)
  }
}

await Promise.all(Array.from({ length: CONC }, worker))
console.log('done', done, 'failed', failed.length)
writeFileSync('failed.json', JSON.stringify(failed, null, 2))
