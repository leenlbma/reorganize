import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { marked } from './vendor/marked.mjs';
import { buildAI } from './build-ai.mjs';

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
for (const chapter of chapters) {
  const source = fs.readFileSync(path.join(repo, 'articles', chapter.file), 'utf8');
  const body = source.replace(/^---\n[\s\S]*?\n---\n/, '').split('\n---\n\n## 图解')[0]
    .trim().replace(/^# .+\n+/, '').replace(/^\*\*《重新组织》[^\n]+\n+/, '');
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
fs.writeFileSync(path.join(output, 'content.json'), JSON.stringify(chapters));
buildAI({repo, output, chapters});
console.log(`Built ${chapters.length} articles, ${chapters.length} diagrams and AI reading files.`);
