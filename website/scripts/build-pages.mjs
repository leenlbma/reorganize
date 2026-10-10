import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';

const siteURL = 'https://leenlbma.github.io/reorganize/';
const parts = ['重新解释团队', '重建协作机制', '人的参与和成长', '重写管理与公司'];
const number = id => String(id).padStart(2, '0');
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
export const articlePath = id => `read/${number(id)}/`;

function gitDates(repo, file) {
  try {
    const out = execFileSync('git', ['log', '--follow', '--format=%aI', '--', `articles/${file}`], {cwd: repo, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore']})
      .trim().split('\n').filter(Boolean);
    if (out.length) return {published: out[out.length - 1], updated: out[0]};
  } catch { /* Not a git checkout. */ }
  return null;
}

// Opening prose paragraphs, flattened and trimmed to a search-snippet length.
function describe(body) {
  const flat = body.split(/\n{2,}/).map(p => p.trim()).filter(p => p && !/^(#|>|[-*]|\d+\.|\||!|---)/.test(p))
    .map(p => p.replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1').replace(/[*_`]/g, '').replace(/\s+/g, ' ').trim())
    .reduce((text, p) => text.length >= 70 ? text : (text ? text + ' ' : '') + p, '');
  const chars = [...flat];
  return chars.length > 120 ? chars.slice(0, 118).join('') + '…' : flat;
}

export function buildPages({repo, output, chapters, bodies}) {
  const template = fs.readFileSync(path.join(output, 'index.html'), 'utf8');
  const root = '../../';
  const dated = chapters.map(c => ({c, dates: gitDates(repo, c.file)}));
  const withDates = dated.every(d => d.dates);

  for (const [i, chapter] of chapters.entries()) {
    const url = siteURL + articlePath(chapter.id);
    const title = `${number(chapter.id)} · ${chapter.title} — 重新组织`;
    const description = describe(bodies[i]);
    chapter.description = description;
    const image = siteURL + 'og-cover.png';
    const {dates} = dated[i];
    const previous = chapters[i - 1], next = chapters[i + 1];
    const ld = {'@context': 'https://schema.org', '@type': 'Article', headline: chapter.title, description, inLanguage: 'zh-CN',
      author: {'@type': 'Person', name: 'LeenMa'}, image, mainEntityOfPage: url, license: 'https://creativecommons.org/licenses/by/4.0/',
      isPartOf: {'@type': 'CreativeWorkSeries', name: '重新组织', url: siteURL}, ...(dates ? {datePublished: dates.published, dateModified: dates.updated} : {})};
    const headMeta = `<title>${esc(title)}</title>
  <meta name="description" content="${esc(description)}">
  <link rel="canonical" href="${url}">
  <meta property="og:type" content="article">
  <meta property="og:site_name" content="重新组织 · Reorganize">
  <meta property="og:locale" content="zh_CN">
  <meta property="og:title" content="${esc(title)}">
  <meta property="og:description" content="${esc(description)}">
  <meta property="og:url" content="${url}">
  <meta property="og:image" content="${image}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="《重新组织》：AI 时代的分工、权力与人的价值，LeenMa">
  <meta property="article:author" content="LeenMa">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${esc(title)}">
  <meta name="twitter:description" content="${esc(description)}">
  <meta name="twitter:image" content="${image}">
  <script type="application/ld+json">${JSON.stringify(ld).replace(/</g, '\\u003c')}</script>`;

    const prose = chapter.html.replace(/href="#\/read\/(\d+)"/g, (_, id) => `href="${root}${articlePath(id)}"`);
    const img = chapter.images[0];
    const main = `<main id="main" tabindex="-1"><div class="reader-layout static-reader"><article class="article-center"><div class="article-inner"><header><div class="article-kicker"><span><span class="kicker-number">${number(chapter.id)}</span> / 12</span><span>PART 0${chapter.part + 1} · ${parts[chapter.part]}</span></div><h1 class="article-title">${esc(chapter.title)}</h1><div class="article-meta"><span>LeenMa</span><span>约 ${chapter.readingMinutes} 分钟</span></div></header><figure class="reading-figure" id="concept"><img src="${root}${esc(img.src)}" alt="${esc(img.alt)}" width="${img.width}" height="${img.height}"><figcaption>${esc(img.alt)}</figcaption><p class="sr-only">${esc(img.description)}</p></figure><div class="prose" id="article-body">${prose}</div><div class="end-marker" id="article-end">第 ${number(chapter.id)} 篇 · 正文完</div><div class="article-download" id="sources"><a href="${root}articles/${chapter.file}" download>下载 Markdown ↓</a></div><nav class="next-reading" aria-label="前后篇文章">${previous ? `<a href="${root}${articlePath(previous.id)}" rel="prev"><span>← 上一篇 · ${number(previous.id)}</span>${esc(previous.title)}</a>` : `<a href="${root}#/catalog"><span>← 返回</span>系列总览</a>`}${next ? `<a href="${root}${articlePath(next.id)}" rel="next"><span>下一篇 · ${number(next.id)} →</span>${esc(next.title)}</a>` : `<a href="${root}#/catalog"><span>第一季 · 完 →</span>回到十二个问题</a>`}</nav><p class="static-back"><a href="${root}#/catalog">← 返回全部文章</a></p></div></article></div></main>`;

    let html = template
      .replace(/^\s*<title>[\s\S]*?<\/title>\n/m, '')
      .replace(/^\s*<meta (?:name="description"|property="og:[^"]+"|name="twitter:[^"]+")[^>]*>\n/gm, '')
      .replace(/^\s*<link rel="canonical"[^>]*>\n/m, '')
      .replace('<meta name="theme-color" content="#f7f5ef">', `<meta name="theme-color" content="#f7f5ef">\n  ${headMeta}`)
      .replace(/<main id="main"[\s\S]*?<\/main>/, main)
      .replace(/<noscript>[\s\S]*?<\/noscript>/, '')
      .replace('<body>', `<body data-root="${root}" data-article="${chapter.id}">`);
    // Page lives two levels below the site root: point entry assets and hash routes back at it.
    html = html.replace(/\b(src|href)="(?!https?:|mailto:|#$|data:)([^"]+)"/g, (m, attr, value) => {
      if (value.startsWith(root) || value.startsWith('#') && !value.startsWith('#/') ) return m;
      return `${attr}="${root}${value}"`;
    });
    fs.mkdirSync(path.join(output, 'read', number(chapter.id)), {recursive: true});
    fs.writeFileSync(path.join(output, 'read', number(chapter.id), 'index.html'), html);
  }

  const urls = [siteURL, ...chapters.map(c => siteURL + articlePath(c.id))];
  const lastmod = (d) => d ? `<lastmod>${d.slice(0, 10)}</lastmod>` : '';
  fs.writeFileSync(path.join(output, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u, i) => `  <url><loc>${u}</loc>${i ? lastmod(dated[i - 1].dates?.updated) : lastmod(withDates ? dated.map(d => d.dates.updated).sort().pop() : null)}</url>`).join('\n')}
</urlset>
`);
  fs.writeFileSync(path.join(output, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${siteURL}sitemap.xml\n`);

  const feedUpdated = withDates ? dated.map(d => d.dates.updated).sort().pop() : null;
  fs.writeFileSync(path.join(output, 'feed.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom" xml:lang="zh-CN">
  <title>重新组织 · AI 时代的分工、权力与人的价值</title>
  <subtitle>LeenMa 的十二篇系列文章</subtitle>
  <id>${siteURL}</id>
  <link rel="alternate" type="text/html" href="${siteURL}"/>
  <link rel="self" type="application/atom+xml" href="${siteURL}feed.xml"/>
  <rights>CC BY 4.0 · LeenMa</rights>
  <author><name>LeenMa</name></author>
${feedUpdated ? `  <updated>${feedUpdated}</updated>\n` : ''}${chapters.map((c, i) => {
    const d = dated[i].dates;
    return `  <entry>
    <title>${esc(`${number(c.id)} · ${c.title}`)}</title>
    <id>${siteURL + articlePath(c.id)}</id>
    <link rel="alternate" type="text/html" href="${siteURL + articlePath(c.id)}"/>
${d ? `    <published>${d.published}</published>\n    <updated>${d.updated}</updated>\n` : ''}    <summary>${esc(c.description)}</summary>
  </entry>`;
  }).join('\n')}
</feed>
`);
  return {withDates};
}
