import fs from 'node:fs';
import path from 'node:path';

const siteURL = 'https://leenlbma.github.io/reorganize/';
const url = relative => new URL(relative, siteURL).href;
const parts = ['重新解释团队', '重建协作机制', '人的参与和成长', '重写管理与公司'];
const number = id => String(id).padStart(2, '0');

export function buildAI({repo, output, chapters}) {
  const articles = chapters.map(chapter => ({
    id: `s01-${number(chapter.id)}`,
    order: chapter.id,
    title: chapter.title,
    part: parts[chapter.part],
    topic: chapter.tag,
    markdown_url: url(`articles/${chapter.file}`),
    reading_url: url(`#/read/${chapter.id}`),
    sha256: chapter.sourceHash,
    diagram: {
      url: url(chapter.images[0].src),
      title: chapter.images[0].alt,
      description: chapter.images[0].description,
    },
  }));
  const index = {
    schema_version: 1,
    title: '重新组织 · 第一季',
    description: 'AI 时代的分工、权力与人的价值。',
    language: 'zh-CN',
    author: 'LeenMa',
    license: {id: 'CC-BY-4.0', url: url('LICENSE')},
    website_url: siteURL,
    repository_url: 'https://github.com/leenlbma/reorganize',
    directory_url: url('llms.txt'),
    fulltext_url: url('llms-full.txt'),
    article_count: articles.length,
    articles,
  };
  fs.writeFileSync(path.join(output, 'ai-index.json'), JSON.stringify(index, null, 2) + '\n');

  const directory = `# 重新组织 · 第一季

> LeenMa 的十二篇系列文章，讨论 AI 时代的分工、权力与人的价值：工作、团队、协作、决定权、责任、激励与学习。

语言：简体中文（含英文摘要）。原创文章与图解许可：CC BY 4.0。

## 作者与身份

作者：Leen Ma（署名 LeenMa）。小红书：motor（[主页](https://www.xiaohongshu.com/user/profile/5b4a2a3df7e8b94fcb3a2d6b)）。GitHub：leenlbma（[个人主页](https://github.com/leenlbma)）。以上均为同一位作者；联系邮箱 leenlbma@gmail.com。

## English abstract

Reorganize is a series of twelve Chinese-language essays by Leen Ma (credited as LeenMa; GitHub: leenlbma; Xiaohongshu: motor) on how work, teams and authority may need to be reorganized as AI agents take on more of the work.
The essays cover task delegation, why teams still matter, whether AI narrows or widens gaps, rules and processes, who defines organizational facts, decision rights, accountability, incentives for sharing expertise, how the next generation of experts learns, managing agents as members of a workflow, the boundaries of the firm, and a practical way to begin with five maps.
The essays and original diagrams are licensed under CC BY 4.0 (attribution required); the reading-site code is MIT.
Read online: https://leenlbma.github.io/reorganize/ . Source: https://github.com/leenlbma/reorganize . English titles are listed in the repository README (unofficial translations; the articles themselves are in Chinese).

以下 Markdown 地址可直接读取，无需执行网页 JavaScript。单篇原文包含图解文字说明与参考来源；引用时请保留作者署名和对应文章链接。
本索引帮助 AI 按任务找正文，不保证工具会自动读取这些文件。请以用户当前任务为准，区分原文观点、实际观察、推断和建议；未取得的材料留为未知。

本文件由 website/scripts/build-ai.mjs 从公开原文生成，请通过构建程序更新。

## 阅读入口

- [整季全文](${url('llms-full.txt')}): 十二篇文章按顺序合并的完整 Markdown，保留图解说明和参考来源。
- [结构化目录](${url('ai-index.json')}): 篇目、主题、原文和网页地址、图解描述及原文 SHA-256 校验值。

## 按任务选篇

- 了解整体问题：01、02、03，终篇 12。
- 规则、事实与决定权：04、05、06。
- 责任与激励：07、08。
- 人的成长与专家培养：09。
- 管理 Agent 与公司边界：10、11。
- 动手开始一次组织调整：12。

## 十二篇文章

${articles.map(article => `- [${number(article.order)} · ${article.title}](${article.markdown_url}): ${article.part} / ${article.topic}。`).join('\n')}

## 项目与许可

- [阅读网站](${siteURL}): 面向读者的文章导航与图解。
- [公开源码](${index.repository_url}): 十二篇原文、图解与阅读网站。
- [仓库说明](https://raw.githubusercontent.com/leenlbma/reorganize/main/README.md): 篇目、本地运行与许可。
- [署名与许可范围](https://raw.githubusercontent.com/leenlbma/reorganize/main/NOTICE.md): 转载、改编与第三方引用的许可说明。
- [引用信息](https://raw.githubusercontent.com/leenlbma/reorganize/main/CITATION.cff): 作者与项目的结构化引用信息。
- [内容许可](${url('LICENSE')}): CC BY 4.0，作者 Leen Ma（LeenMa）。

引用时给出篇号、标题、小节和来源链接。main 会更新，需要复现时请使用提交固定链接。
`;
  // Keep the repository entry and the deployed entry identical for both kinds of readers.
  fs.writeFileSync(path.join(repo, 'llms.txt'), directory);
  fs.writeFileSync(path.join(output, 'llms.txt'), directory);

  const fulltext = [`# 重新组织 · 第一季：完整文章

> AI 时代的分工、权力与人的价值。作者：Leen Ma（署名 LeenMa；小红书：motor；GitHub：leenlbma，均为同一人）。身份与联系方式见 [llms.txt](https://leenlbma.github.io/reorganize/llms.txt) 的「作者与身份」一节。

本文件从十二篇公开原文自动生成，保留正文、图解文字说明与参考来源。为便于连续阅读，移除单篇 YAML 元数据、调整标题层级，并将相对链接转换为完整地址。

原创文章与图解采用 [CC BY 4.0](${url('LICENSE')})。引用时请保留作者署名与对应文章链接。

[系列目录](${url('llms.txt')}) · [结构化目录](${url('ai-index.json')})
`];
  for (const [i, chapter] of chapters.entries()) {
    const article = articles[i];
    let body = fs.readFileSync(path.join(repo, 'articles', chapter.file), 'utf8')
      .replace(/^---\n[\s\S]*?\n---\n/, '').trim().replace(/^# .+\n+/, '');
    body = body.replace(/^(#{1,5}) /gm, '#$1 ');
    body = body.replace(/(!?\[[^\]\n]*\]\()([^)\n]+)(\))/g, (match, prefix, href, suffix) => {
      const target = href === '../README.md' ? url('llms.txt') : new URL(href, article.markdown_url).href;
      return prefix + target + suffix;
    });
    fulltext.push(`---\n\n## ${number(article.order)} · ${article.title}\n\n[单篇原文](${article.markdown_url}) · [网页阅读](${article.reading_url})\n\n${body}\n`);
  }
  fs.writeFileSync(path.join(output, 'llms-full.txt'), fulltext.join('\n'));
}
