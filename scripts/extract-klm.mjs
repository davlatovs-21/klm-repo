// pages/*.html -> site.json (all pages) + catalog.json (products only)
import { readFileSync, writeFileSync, readdirSync } from 'node:fs'

const files = readdirSync('pages').filter((f) => f.endsWith('.html'))
const unslug = (f) => '/' + f.replace(/\.html$/, '').replace(/__/g, '/').replace(/^index$/, '')

const dec = (s) =>
  s
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&laquo;/g, '«')
    .replace(/&raquo;/g, '»')
    .replace(/&mdash;/g, '—')
    .replace(/&ndash;/g, '–')
    .replace(/&nbsp/g, ' ')

const strip = (h) =>
  dec(h.replace(/<[^>]+>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim()

const meta = (h, name) => {
  const m =
    h.match(new RegExp(`<meta[^>]+(?:name|property)="${name}"[^>]+content="([^"]*)"`, 'i')) ||
    h.match(new RegExp(`<meta[^>]+content="([^"]*)"[^>]+(?:name|property)="${name}"`, 'i'))
  return m ? dec(m[1]) : null
}

const pages = []

for (const f of files) {
  const raw = readFileSync('pages/' + f, 'utf8')
  const path = unslug(f) || '/'

  const ld = []
  for (const m of raw.matchAll(/<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/g)) {
    try {
      ld.push(JSON.parse(m[1]))
    } catch {
      /* skip malformed */
    }
  }

  const body = raw.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<style[\s\S]*?<\/style>/g, '')

  // spec cards: <div class="...text-muted-foreground">LABEL</div><div class="mt-3 font-display...">VALUE</div>
  const specs = {}
  for (const m of body.matchAll(
    /text-muted-foreground[^>]*>([^<]{2,60})<\/div><div class="mt-3 font-display[^>]*>([\s\S]{1,200}?)<\/div>/g,
  )) {
    const k = dec(m[1]).trim()
    const v = strip(m[2])
    if (k && v) specs[k] = v
  }

  const heads = { h1: [], h2: [], h3: [] }
  for (const t of ['h1', 'h2', 'h3'])
    for (const m of body.matchAll(new RegExp(`<${t}[^>]*>([\\s\\S]*?)</${t}>`, 'g'))) {
      const s = strip(m[1])
      if (s) heads[t].push(s)
    }

  const bodyOnly = (body.match(/<body[\s\S]*<\/body>/) || [body])[0]
  const text = dec(bodyOnly.replace(/<[^>]+>/g, '\n'))
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean)
    .join('\n')

  pages.push({
    path,
    title: (raw.match(/<title[^>]*>([\s\S]*?)<\/title>/) || [, ''])[1].trim(),
    description: meta(raw, 'description'),
    canonical: (raw.match(/<link[^>]+rel="canonical"[^>]+href="([^"]*)"/) || [, null])[1],
    ogImage: meta(raw, 'og:image'),
    h1: heads.h1[0] || null,
    headings: heads,
    specs,
    jsonld: ld,
    text,
  })
}

pages.sort((a, b) => a.path.localeCompare(b.path))
writeFileSync('site.json', JSON.stringify(pages, null, 1))

// ---- catalog: pages under /catalog with a Product JSON-LD ----
const flat = (x) => (Array.isArray(x) ? x : [x]).flatMap((v) => (v && v['@graph'] ? v['@graph'] : [v]))
const products = []
for (const p of pages) {
  const prod = p.jsonld.flatMap(flat).find((x) => x && x['@type'] === 'Product')
  if (!prod) continue
  const crumbs = p.jsonld
    .flatMap(flat)
    .filter((x) => x && x['@type'] === 'BreadcrumbList')
    .map((b) => b.itemListElement.map((i) => i.name))
    .sort((a, b) => b.length - a.length)[0]
  const faq = p.jsonld
    .flatMap(flat)
    .filter((x) => x && x['@type'] === 'FAQPage')
    .flatMap((x) => x.mainEntity)
    .map((q) => ({ q: q.name, a: q.acceptedAnswer?.text }))
  products.push({
    path: p.path,
    sku: prod.sku || null,
    name: prod.name,
    category: prod.category || null,
    section: p.path.split('/')[2] || null,
    description: prod.description || p.description,
    specs: p.specs,
    breadcrumbs: crumbs || null,
    faq,
  })
}
writeFileSync('catalog.json', JSON.stringify(products, null, 1))

// ---- categories from CollectionPage ItemList ----
const cats = []
for (const p of pages) {
  if (p.path !== '/catalog') continue
  for (const x of p.jsonld.flatMap(flat)) {
    if (x?.mainEntity?.['@type'] === 'ItemList')
      for (const i of x.mainEntity.itemListElement)
        cats.push({ position: i.position, name: i.name, path: new URL(i.url).pathname })
  }
}
writeFileSync('categories.json', JSON.stringify(cats, null, 1))

console.log('pages', pages.length, 'products', products.length, 'categories', cats.length)
console.log('spec keys:', [...new Set(products.flatMap((p) => Object.keys(p.specs)))].join(' | '))
