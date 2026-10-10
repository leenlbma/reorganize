# Reorganize · 重新组织

**AI 时代的分工、权力与人的价值。**

LeenMa 的十二篇系列文章，讨论 AI 如何改变工作、团队、协作、决定权、责任、激励和学习。本仓库包含文章、对应图解和阅读网站的完整源码。

[在线阅读](https://leenlbma.github.io/reorganize/)

## English summary

**Reorganize** is a series of twelve Chinese-language essays by LeenMa on how work, teams and authority may need to be reorganized as AI agents take on more of the work. The essays cover task delegation, why teams still matter, whether AI narrows or widens gaps, rules and processes, who defines organizational facts, decision rights, accountability, incentives for sharing expertise, how the next generation of experts learns, managing agents as members of a workflow, the boundaries of the firm, and a practical way to begin using five maps. This repository contains the essays, one diagram per essay, and the source of the reading site. The essays and original diagrams are licensed under [CC BY 4.0](LICENSE); the site code is MIT. Read online: <https://leenlbma.github.io/reorganize/>

English titles of the twelve essays (unofficial translations; the articles are in Chinese):

1. When "organizing work" can itself be done by AI
2. After the one-person company, why do we still need teams?
3. Will AI close the gap, or amplify the strong?
4. In the age of AI, do we still need "processes"?
5. Who gets to define an organization's facts?
6. Organizations get flatter, but power may become more concentrated
7. When AI takes on the work, who takes responsibility?
8. Why would employees teach their experience to AI?
9. If AI takes over junior work, where do the next experts come from?
10. When agents become members of the organization, what do managers manage?
11. When every capability can be called on demand, why do we still need companies?
12. Don't start by changing the org chart: how to begin "reorganizing"

## 阅读文章

1. [当“组织工作”本身也能被 AI 执行](articles/01-work.md)
2. [超级个体之后，为什么还需要团队？](articles/02-teams.md)
3. [AI 会拉平差距，还是放大强者？](articles/03-judgment-leverage.md)
4. [AI 时代，我们还需要“流程”吗？](articles/04-policy.md)
5. [谁有权定义组织的事实？](articles/05-live-state.md)
6. [组织变扁了，权力却可能更集中](articles/06-decision-rights.md)
7. [当 AI 开始承担工作，谁来承担责任？](articles/07-accountability.md)
8. [把经验教给 AI，员工为什么愿意？](articles/08-incentives.md)
9. [AI 接走了初级工作，下一代专家从哪里来？](articles/09-learning.md)
10. [当 Agent 成为组织成员，管理者到底在管理什么？](articles/10-agent-management.md)
11. [当能力都可以调用，我们为什么还需要公司？](articles/11-firm-boundaries.md)
12. [不要先改组织架构：如何真正开始「重新组织」](articles/12-five-maps.md)

## 本地运行

需要 Node.js 22 或以上，不需要安装前端依赖。Marked 随源码提供并保留其原许可。

```sh
node website/scripts/build.mjs
node website/scripts/validate.mjs
```

使用任意静态服务器提供 `website/dist/`。例如已安装 Python 3 时：

```sh
python3 -m http.server 4173 --bind 127.0.0.1 --directory website/dist
```

打开 `http://127.0.0.1:4173/`。网站提供全文搜索、文章与章节导航、图解放大、字号和主题设置、Markdown 下载。阅读进度与偏好只保存在读者的浏览器中。

## 修改与部署

- `articles/`：十二篇 Markdown 原文，是正文的唯一编辑来源。
- `images/`：每篇对应的 SVG 图解，保留可编辑文本。
- `website/src/`：网站页面、样式和交互。
- `website/content/`：篇目导航与稳定的章节链接配置。
- `website/scripts/`：构建、校验和图解生成程序；`vendor/` 为第三方解析器。

修改正文后重新构建，网页与 Markdown 下载会一起更新。修改标题层级时，同时核对章节链接。图解可使用 `python3 website/scripts/generate-diagrams.py` 重新生成；修改图解时同步修改生成程序。

GitHub Pages 的发布源选择 **GitHub Actions**。推送到 `main` 后，工作流先构建并检查，再部署 `website/dist/`；PR 只检查。项目子路径与章节刷新使用同一套相对资源地址，不需要后端或路径重写。

这些文章也发布在我的小红书：[LeenMa 的小红书主页](https://www.xiaohongshu.com/user/profile/5b4a2a3df7e8b94fcb3a2d6b)。欢迎在那里阅读、交流。

也可以写邮件联系我：[leenlbma@gmail.com](mailto:leenlbma@gmail.com)。

欢迎通过 Issue 提出文章纠错、不同观点或网站问题，提供具体篇章、表述和依据即可。修改可提交 PR，保留作者署名和已有引用。

## 许可

原创文章与图解采用 [CC BY 4.0](LICENSE)，原创网站与工具代码采用 [MIT](LICENSE-CODE)。第三方材料保留原权利，范围见 [NOTICE](NOTICE.md)。

AI 读者可从 [llms.txt](llms.txt) 按任务找到各篇原文。引用请参考 [CITATION.cff](CITATION.cff)。

作者：**LeenMa**。
