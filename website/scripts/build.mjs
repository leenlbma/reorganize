import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { marked } from './vendor/marked.mjs';
import { buildAI } from './build-ai.mjs';
import { buildPages } from './build-pages.mjs';

const site = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repo = path.dirname(site);
const output = path.join(site, 'dist');
const chapters = JSON.parse(fs.readFileSync(path.join(site, 'content/chapters.json'), 'utf8'));
const anchors = JSON.parse(fs.readFileSync(path.join(site, 'content/heading-anchors.json'), 'utf8'));
const files = fs.readdirSync(path.join(repo, 'articles')).filter(f => f.endsWith('.md')).sort();
if (files.length !== 12 || chapters.length !== 12 || chapters.some(c => !files.includes(c.file))) {
  throw new Error('Expected exactly 12 articles.');
}

// dist is generated output. Keep source edits in articles/, images/ and website/src/.
fs.rmSync(output, {recursive: true, force: true});
fs.mkdirSync(path.join(output, 'articles'), {recursive: true});
fs.cpSync(path.join(site, 'src'), output, {recursive: true});
fs.cpSync(path.join(repo, 'images'), path.join(output, 'images'), {recursive: true});
fs.copyFileSync(path.join(repo, 'LICENSE'), path.join(output, 'CONTENT-LICENSE.txt'));
fs.copyFileSync(path.join(repo, 'LICENSE'), path.join(output, 'LICENSE'));
fs.copyFileSync(path.join(repo, 'LICENSE-CODE'), path.join(output, 'LICENSE-CODE'));
fs.writeFileSync(path.join(output, '.nojekyll'), '');

const escape = s => s.replaceAll('&', '&amp;').replaceAll('"', '&quot;');
const plain = s => s.replace(/<[^>]+>/g, '').replace(/\*\*/g, '');
const bodies = [];
for (const chapter of chapters) {
  const source = fs.readFileSync(path.join(repo, 'articles', chapter.file), 'utf8');
  const body = source.replace(/^---\n[\s\S]*?\n---\n/, '').split('\n---\n\n## 图解')[0]
    .trim().replace(/^# .+\n+/, '').replace(/^\*\*《重新组织》[^\n]+\n+/, '');
  bodies.push(body);
  const headings = [], sections = anchors[chapter.file], subheadingCounts = [];
  for (const token of marked.lexer(body)) {
    if (token.type !== 'heading') continue;
    if (token.depth === 2) subheadingCounts.push(0);
    else if (token.depth === 3) subheadingCounts[subheadingCounts.length - 1]++;
  }
  if (sections.length !== subheadingCounts.length) throw new Error(`Update anchors for ${chapter.file}`);
  let sectionIndex = -1, subheadingIndex = 0;
  const renderer = new marked.Renderer();
  renderer.heading = function({tokens, depth}) {
    const label = this.parser.parseInline(tokens);
    let id, aliases = '';
    if (depth === 2) {
      sectionIndex++; subheadingIndex = 0; id = sections[sectionIndex].id;
      const retired = [...(sections[sectionIndex].aliases || []), ...sections[sectionIndex].subheadings.slice(subheadingCounts[sectionIndex])];
      aliases = retired.map(a => `<span id="${a}" class="section-anchor" aria-hidden="true"></span>`).join('');
    } else {
      id = sections[sectionIndex]?.subheadings[subheadingIndex++];
      if (!id) throw new Error(`Update subheading anchors for ${chapter.file}`);
    }
    headings.push({id, title: plain(label), level: depth});
    return `${aliases}<h${depth} id="${id}">${label}</h${depth}>\n`;
  };
  renderer.link = function({href, tokens}) {
    const label = this.parser.parseInline(tokens);
    const article = chapters.find(a => href?.split('#')[0] === a.file);
    if (article) return `<a href="#/read/${article.id}">${label}</a>`;
    if (/^https?:\/\//i.test(href)) return `<a href="${escape(href)}" target="_blank" rel="noopener noreferrer">${label}<span class="sr-only">（在新标签页打开）</span></a>`;
    throw new Error(`Unmapped article link: ${href}`);
  };
  const figures = [...source.matchAll(/!\[([^\]]*)\]\(\.\.\/images\/(s01-\d{2}\.svg)\)/g)];
  if (figures.length !== 1) throw new Error(`Expected one figure in ${chapter.file}`);
  const [, alt, name] = figures[0];
  const svg = fs.readFileSync(path.join(repo, 'images', name), 'utf8');
  const description = svg.match(/<desc[^>]*>([\s\S]*?)<\/desc>/)?.[1].replaceAll('&amp;', '&');
  if (!description) throw new Error(`Missing image description: ${name}`);
  chapter.html = marked.parse(body, {renderer});
  chapter.searchText = body;
  chapter.headings = headings;
  const chars = (body.match(/[\u4e00-\u9fff]/g) || []).length + (body.match(/[A-Za-z]+/g) || []).length;
  chapter.readingMinutes = Math.max(1, Math.ceil(chars / 400));
  chapter.characterCount = chars;
  chapter.images = [{src: `images/${name}`, thumb: `images/${name}`, alt, width: 1000, height: 700, description}];
  chapter.sourceHash = createHash('sha256').update(source).digest('hex');
  fs.copyFileSync(path.join(repo, 'articles', chapter.file), path.join(output, 'articles', chapter.file));
}
buildPages({repo, output, chapters, bodies});
fs.writeFileSync(path.join(output, 'content.json'), JSON.stringify(chapters));
buildAI({repo, output, chapters});

// Static home content for crawlers and no-JS readers; the reading app replaces it on load.
const partNames = ['重新解释团队', '重建协作机制', '重新分配价值', '重新开始'];
const homeHtml = fs.readFileSync(path.join(output, 'index.html'), 'utf8');
const esc = t => t.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
const staticHome = `<main id="main" tabindex="-1"><div class="static-home"><h1>重新组织</h1><p class="static-subtitle">AI 时代的分工、权力与人的价值</p><p>Leen Ma（署名 LeenMa）的十二篇系列文章，讨论 AI 如何改变工作、团队、协作、决定权、责任、激励和学习。文章与图解采用 CC BY 4.0。</p><p><a href="read/01/">从第一篇开始阅读</a> · <a href="llms.txt">AI 阅读目录</a> · <a href="feed.xml">Atom 订阅</a> · <a href="https://github.com/leenlbma/reorganize">GitHub 仓库</a></p><h2>十二篇文章</h2><ol class="static-list">${chapters.map(c => `<li><a href="read/${String(c.id).padStart(2, '0')}/">${esc(c.title)}</a> <small>${esc(c.tag)}</small></li>`).join('')}</ol></div></main>`;
if (!homeHtml.includes('<main id="main" tabindex="-1"><div class="loading">正在打开《重新组织》…</div></main>')) throw new Error('Home placeholder not found');
fs.writeFileSync(path.join(output, 'index.html'), homeHtml.replace('<main id="main" tabindex="-1"><div class="loading">正在打开《重新组织》…</div></main>', staticHome));

// Cache-bust scripts and styles so readers always get the current build.
const assetHash = name => createHash('sha256').update(fs.readFileSync(path.join(output, name))).digest('hex').slice(0, 10);
const versions = Object.fromEntries(['app.js', 'ai.js', 'styles.css', 'ai.css'].map(n => [n, assetHash(n)]));
const stampHtml = dir => {
  for (const entry of fs.readdirSync(dir, {withFileTypes: true})) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) stampHtml(full);
    else if (entry.name.endsWith('.html')) {
      const html = fs.readFileSync(full, 'utf8').replace(/((?:href|src)="[^"?]*?\b(app\.js|ai\.js|styles\.css|ai\.css))"/g, (m, a, n) => `${a}?v=${versions[n]}"`);
      fs.writeFileSync(full, html);
    }
  }
};
stampHtml(output);
console.log(`Built ${chapters.length} articles, ${chapters.length} diagrams, ${chapters.length} static article pages, sitemap, robots, feed and AI reading files.`);
