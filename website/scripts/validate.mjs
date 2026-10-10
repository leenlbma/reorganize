import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {marked} from './vendor/marked.mjs';

const site = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repo = path.dirname(site);
const output = path.join(site, 'dist');
const data = JSON.parse(fs.readFileSync(path.join(output, 'content.json'), 'utf8'));
const anchors = JSON.parse(fs.readFileSync(path.join(site, 'content/heading-anchors.json'), 'utf8'));
const legacy = JSON.parse(fs.readFileSync(path.join(site, 'content/legacy-anchors.json'), 'utf8'));
const text = html => html.replace(/<span class="sr-only">[\s\S]*?<\/span>/g, '').replace(/<[^>]+>/g, '')
  .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\s+/g, '');
const hash = s => createHash('sha256').update(s).digest('hex');
assert.equal(data.length, 12);
assert.equal(fs.readdirSync(path.join(repo, 'articles')).length, 12);
assert.equal(fs.readdirSync(path.join(repo, 'images')).length, 12);
for (const article of data) {
  const source = fs.readFileSync(path.join(repo, 'articles', article.file), 'utf8');
  assert.equal(hash(source), article.sourceHash);
  const body = source.replace(/^---\n[\s\S]*?\n---\n/, '').split('\n---\n\n## 图解')[0]
    .trim().replace(/^# .+\n+/, '').replace(/^\*\*《重新组织》[^\n]+\n+/, '');
  assert.equal(text(article.html), text(marked.parse(body)), `Incomplete article: ${article.file}`);
  assert.ok(text(article.html).length > 1500, `Truncated article: ${article.file}`);
  assert.ok(source.includes('author: "LeenMa"'));
  assert.equal(article.title, source.match(/^title: "(.+)"$/m)?.[1]);
  const ids = [...article.html.matchAll(/id="([^"]+)"/g)].map(m => m[1]);
  assert.equal(new Set(ids).size, ids.length, `Duplicate anchors: ${article.file}`);
  assert.deepEqual(article.headings.filter(h => h.level === 2).map(h => h.id), anchors[article.file].map(h => h.id));
  for (const id of legacy[article.file]) assert.ok(ids.includes(id), `Broken heading: ${article.file}/${id}`);
  assert.equal(article.images.length, 1);
  for (const image of article.images) {
    assert.ok(image.description.length > 30);
    for (const key of ['src', 'thumb']) assert.ok(fs.existsSync(path.join(output, image[key])));
    const svg = fs.readFileSync(path.join(output, image.src), 'utf8');
    assert.ok(!/<script|<image|<foreignObject|https?:\/\/(?!www.w3.org)/i.test(svg), `Unexpected active SVG content: ${image.src}`);
  }
  for (const [, href] of article.html.matchAll(/href="([^"]+)"/g)) {
    if (/^https?:\/\//.test(href)) continue;
    const match = href.match(/^#\/read\/(\d+)$/);
    assert.ok(match && data.some(a => a.id === Number(match[1])), `Broken reading link: ${href}`);
  }
  assert.equal(fs.readFileSync(path.join(output, 'articles', article.file), 'utf8'), source);
}

let links = 0;
const markdown = ['README.md', 'NOTICE.md', ...data.map(a => `articles/${a.file}`)];
for (const file of markdown) {
  for (const [, href] of fs.readFileSync(path.join(repo, file), 'utf8').matchAll(/!?\[[^\]\n]*\]\(([^)\n]+)\)/g)) {
    if (/^[a-z][a-z\d+.-]*:/i.test(href) || href.startsWith('#')) continue;
    const target = path.resolve(repo, path.dirname(file), decodeURIComponent(href.split('#')[0]));
    assert.ok(target.startsWith(repo + path.sep) && fs.existsSync(target), `Missing Markdown target: ${file} -> ${href}`);
    links++;
  }
}
for (const file of ['index.html', 'ai.html']) {
  const html = fs.readFileSync(path.join(output, file), 'utf8');
  for (const [, url] of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
    assert.ok(!url.startsWith('/'), `Root-relative asset: ${file} -> ${url}`);
    if (!/^(?:#|https?:|mailto:)/.test(url)) assert.ok(fs.existsSync(path.join(output, url.split('?')[0])), `Missing entry asset: ${file} -> ${url}`);
  }
}
const ai = JSON.parse(fs.readFileSync(path.join(output, 'ai-index.json'), 'utf8'));
const directory = fs.readFileSync(path.join(output, 'llms.txt'), 'utf8');
const fulltext = fs.readFileSync(path.join(output, 'llms-full.txt'), 'utf8');
assert.equal(directory, fs.readFileSync(path.join(repo, 'llms.txt'), 'utf8'), 'Repository and website AI directories differ');
const fullChapters = fulltext.split(/(?=^## \d{2} · )/m).slice(1);
assert.equal(ai.author, 'LeenMa');
assert.equal(ai.license.id, 'CC-BY-4.0');
assert.equal(ai.article_count, 12);
assert.equal(ai.articles.length, 12);
assert.equal(fullChapters.length, 12);
assert.equal(new Set(ai.articles.map(a => a.id)).size, 12);
assert.ok(fs.readFileSync(path.join(output, 'index.html'), 'utf8').includes('href="ai.html"'));
function checkAIURL(href) {
  const target = new URL(href);
  assert.ok(['http:', 'https:'].includes(target.protocol), `Non-web AI link: ${href}`);
  if (href.startsWith(ai.website_url)) {
    const relative = target.pathname.slice(new URL(ai.website_url).pathname.length);
    assert.ok(fs.existsSync(path.join(output, relative || 'index.html')), `Missing AI link: ${href}`);
  }
}
for (const [i, article] of ai.articles.entries()) {
  const original = data[i];
  assert.equal(article.order, original.id);
  assert.equal(article.title, original.title);
  assert.equal(article.sha256, original.sourceHash);
  assert.equal(article.markdown_url, new URL(`articles/${original.file}`, ai.website_url).href);
  assert.ok(directory.includes(`](${article.markdown_url})`), `Article missing from AI directory: ${original.file}`);
  const source = fs.readFileSync(path.join(repo, 'articles', original.file), 'utf8')
    .replace(/^---\n[\s\S]*?\n---\n/, '').trim().replace(/^# .+\n+/, '');
  assert.ok(text(marked.parse(fullChapters[i])).endsWith(text(marked.parse(source))), `Incomplete AI fulltext: ${original.file}`);
  assert.equal(article.diagram.description, original.images[0].description);
  for (const href of [article.markdown_url, article.reading_url, article.diagram.url]) checkAIURL(href);
}
for (const document of [directory, fulltext]) {
  for (const [, href] of document.matchAll(/!?\[[^\]\n]*\]\(([^)\n]+)\)/g)) checkAIURL(href);
}
const allowedOutput = new Set(['read', 'sitemap.xml', 'robots.txt', 'feed.xml', '.nojekyll', 'articles', 'images', 'content.json', 'index.html', 'app.js', 'styles.css', 'favicon.svg', 'og-cover.png', 'CONTENT-LICENSE.txt', 'LICENSE', 'LICENSE-CODE', 'ai.html', 'ai.css', 'ai.js', 'llms.txt', 'llms-full.txt', 'ai-index.json']);
for (const item of fs.readdirSync(output)) assert.ok(allowedOutput.has(item), `Unexpected output: ${item}`);
assert.ok(fs.existsSync(path.join(output, '.nojekyll')));
assert.equal(fs.readFileSync(path.join(output, 'LICENSE'), 'utf8'), fs.readFileSync(path.join(repo, 'LICENSE'), 'utf8'));
assert.ok(fs.readFileSync(path.join(repo, 'LICENSE-CODE'), 'utf8').startsWith('MIT License'));
const index = fs.readFileSync(path.join(output, 'index.html'), 'utf8');
const site_url = 'https://leenlbma.github.io/reorganize/';
const metaTag = (attr, key) => index.match(new RegExp(`<meta ${attr}="${key}" content="([^"]+)"`))?.[1];
for (const key of ['og:title', 'og:description', 'og:type', 'og:url', 'og:image']) assert.ok(metaTag('property', key), `Missing ${key}`);
assert.equal(metaTag('name', 'twitter:card'), 'summary_large_image');
assert.equal(metaTag('property', 'og:url'), site_url);
assert.equal(metaTag('property', 'og:image'), site_url + 'og-cover.png');
assert.ok(index.includes(`<link rel="canonical" href="${site_url}">`), 'Missing canonical');
const cover = fs.readFileSync(path.join(output, 'og-cover.png'));
assert.equal(cover.readUInt32BE(16), 1200); assert.equal(cover.readUInt32BE(20), 630);
assert.ok(fs.readFileSync(path.join(repo, 'LICENSE'), 'utf8').startsWith('Attribution 4.0 International'), 'LICENSE must be CC BY 4.0');
for (const file of ['README.md', 'NOTICE.md', 'llms.txt', 'website/src/app.js', 'website/src/ai.html', 'website/scripts/build-ai.mjs', ...data.map(a => `articles/${a.file}`)]) {
  assert.ok(!/BY-SA|ShareAlike|相同方式/i.test(fs.readFileSync(path.join(repo, file), 'utf8')), `Stale license text: ${file}`);
}

// Standalone article pages, sitemap, robots and feed.
const pageIndex = fs.readFileSync(path.join(output, 'index.html'), 'utf8');
assert.ok(pageIndex.includes('<link rel="alternate" type="application/atom+xml" href="feed.xml"'), 'Home page must advertise the Atom feed');
assert.equal(fs.readdirSync(path.join(output, 'read')).length, 12);
const decode = s => s.replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
for (const article of data) {
  const id = String(article.id).padStart(2, '0');
  const pageURL = `${site_url}read/${id}/`;
  const html = fs.readFileSync(path.join(output, 'read', id, 'index.html'), 'utf8');
  const meta = (attr, key) => decode(html.match(new RegExp(`<meta ${attr}="${key}" content="([^"]*)"`))?.[1] || '');
  assert.ok(html.includes(`<link rel="canonical" href="${pageURL}">`), `Wrong canonical: ${id}`);
  assert.equal((html.match(/<link rel="canonical"/g) || []).length, 1, `Duplicate canonical: ${id}`);
  assert.equal(meta('property', 'og:url'), pageURL);
  assert.equal(meta('property', 'og:type'), 'article');
  assert.ok(meta('property', 'og:title').includes(article.title), `og:title missing title: ${id}`);
  assert.equal(meta('property', 'og:image'), site_url + 'og-cover.png');
  assert.equal(meta('name', 'twitter:card'), 'summary_large_image');
  assert.equal(meta('name', 'twitter:title'), meta('property', 'og:title'));
  assert.ok(meta('name', 'description').length > 20 && meta('name', 'description') === meta('property', 'og:description'), `Bad description: ${id}`);
  assert.equal((html.match(/<title>/g) || []).length, 1);
  assert.ok(text(html.match(/<div class="prose"[\s\S]*?<div class="end-marker"/)[0]).includes(text(article.html).slice(0, 400)), `Static body missing: ${id}`);
  assert.ok(html.includes('data-article="' + article.id + '"') && html.includes('data-root="../../"'));
  assert.ok(html.includes('href="../../#/catalog"'), `Missing catalog link: ${id}`);
  if (article.id > 1) assert.ok(html.includes(`href="../../read/${String(article.id - 1).padStart(2, '0')}/" rel="prev"`), `Missing previous: ${id}`);
  if (article.id < 12) assert.ok(html.includes(`href="../../read/${String(article.id + 1).padStart(2, '0')}/" rel="next"`), `Missing next: ${id}`);
  assert.ok(!/href="#\/read/.test(html), `Legacy hash link left in static page: ${id}`);
  for (const [, url] of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
    assert.ok(!url.startsWith('/'), `Root-relative asset: ${id} -> ${url}`);
    if (!/^(?:#|https?:|mailto:)/.test(url)) assert.ok(fs.existsSync(path.join(output, 'read', id, url.split('#')[0].split('?')[0])), `Missing asset on static page ${id}: ${url}`);
  }
}
const sitemap = fs.readFileSync(path.join(output, 'sitemap.xml'), 'utf8');
const locs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);
assert.equal(locs.length, 13, 'sitemap must list home and 12 articles');
assert.equal(new Set(locs).size, 13);
assert.deepEqual(locs, [site_url, ...data.map(a => `${site_url}read/${String(a.id).padStart(2, '0')}/`)]);
const robots = fs.readFileSync(path.join(output, 'robots.txt'), 'utf8');
assert.ok(/User-agent: \*\nAllow: \//.test(robots) && !/Disallow: \//.test(robots) && robots.includes(`Sitemap: ${site_url}sitemap.xml`));
const feed = fs.readFileSync(path.join(output, 'feed.xml'), 'utf8');
assert.ok(feed.includes('xmlns="http://www.w3.org/2005/Atom"'));
const entries = feed.split('<entry>').slice(1);
assert.equal(entries.length, 12);
for (const [i, entry] of entries.entries()) {
  const link = `${site_url}read/${String(data[i].id).padStart(2, '0')}/`;
  assert.ok(entry.includes(`<id>${link}</id>`) && entry.includes(`href="${link}"`), `Feed link: ${i + 1}`);
  assert.ok(entry.includes(data[i].title.replace(/&/g, '&amp;')), `Feed title: ${i + 1}`);
  assert.ok(/<summary>[^<]{20,}<\/summary>/.test(entry), `Feed summary: ${i + 1}`);
  assert.ok(!entry.includes('<published>') || /<published>\d{4}-\d\d-\d\dT[^<]+<\/published>/.test(entry));
}
const umamiTag = '<script defer src="https://cloud.umami.is/script.js" data-website-id="8ba58f50-24d2-4d61-a09c-1aa3558a4ade"></script>';
for (const rel of ['index.html', 'ai.html', ...data.map(a => `read/${String(a.id).padStart(2, '0')}/index.html`)]) {
  const html = fs.readFileSync(path.join(output, rel), 'utf8');
  assert.ok(html.includes(umamiTag), `Missing Umami script: ${rel}`);
  assert.equal([...html.matchAll(/data-website-id="([^"]+)"/g)].map(m => m[1]).join(), '8ba58f50-24d2-4d61-a09c-1aa3558a4ade', `Umami website id mismatch: ${rel}`);
}
console.log(`PASS: 12 complete articles, ${data.reduce((n, a) => n + a.headings.length, 0)} headings, 12 diagrams, downloads, licenses, ${links} Markdown links complete AI reading exports, 12 standalone article pages, sitemap, robots and Atom feed.`);
