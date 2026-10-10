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
const index = fs.readFileSync(path.join(output, 'index.html'), 'utf8');
for (const [, url] of index.matchAll(/(?:src|href)="([^"]+)"/g)) {
  assert.ok(!url.startsWith('/'), `Root-relative asset: ${url}`);
  if (!/^(?:#|https?:|mailto:)/.test(url)) assert.ok(fs.existsSync(path.join(output, url)), `Missing entry asset: ${url}`);
}
const allowedOutput = new Set(['.nojekyll', 'articles', 'images', 'content.json', 'index.html', 'app.js', 'styles.css', 'favicon.svg', 'CONTENT-LICENSE.txt', 'LICENSE', 'LICENSE-CODE']);
for (const item of fs.readdirSync(output)) assert.ok(allowedOutput.has(item), `Unexpected output: ${item}`);
assert.ok(fs.existsSync(path.join(output, '.nojekyll')));
assert.equal(fs.readFileSync(path.join(output, 'LICENSE'), 'utf8'), fs.readFileSync(path.join(repo, 'LICENSE'), 'utf8'));
assert.ok(fs.readFileSync(path.join(repo, 'LICENSE-CODE'), 'utf8').startsWith('MIT License'));
console.log(`PASS: 12 complete articles, ${data.reduce((n, a) => n + a.headings.length, 0)} headings, 12 diagrams, downloads, licenses and ${links} Markdown links.`);
