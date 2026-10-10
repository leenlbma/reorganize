'use strict';

const $ = (selector, root = document) => root.querySelector(selector);
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const number = id => String(id).padStart(2, '0');
const parts = ['重新解释团队', '重建协作机制', '人的参与和成长', '重写管理与公司'];
const paths = {
  mechanisms: {title:'协作机制', ids:[4,5,6,7,10], description:'规则、事实、权力、责任与管理'},
  growth: {title:'人的成长', ids:[3,8,9], description:'能力杠杆、参与意愿与判断经验'},
  pilot: {title:'从实践开始', ids:[12,5,6,7,10], description:'选一条真实工作链路，开始改进'}
};
const storage = {
  get(key, fallback){try{return JSON.parse(localStorage.getItem(key)) ?? fallback;}catch{return fallback;}},
  set(key, value){try{localStorage.setItem(key,JSON.stringify(value));}catch{/* Reading remains available without browser storage. */}}
};
let chapters = [], current = null, filter = 'all', query = '', pathName = null;
let reading = storage.get('reorganize-reading-v1', {lastId:null,pages:{}});
if (!reading || typeof reading !== 'object' || !reading.pages || typeof reading.pages !== 'object') reading = {lastId:null,pages:{}};
let theme = storage.get('reorganize-theme', 'light');
let fontSize = storage.get('reorganize-font-size', 19);
if (![17,19,21,23].includes(fontSize)) fontSize = 19;
let ticking = false, lastSaved = 0, rendering = false, savedToast;
let lastRoute = null;
const main = $('#main');
// Static article pages (read/NN/) live below the site root; they carry data-root and data-article.
const root = document.body.dataset.root || '';
const staticArticle = Number(document.body.dataset.article) || null;
const siteURL = new URL(root || './', location.href).href.replace(/#.*$/, '');
const articleURL = id => new URL(`read/${number(id)}/`, siteURL).href;
$('.skip-link').addEventListener('click',event=>{event.preventDefault();main.focus();main.scrollIntoView({behavior:'instant'});});
// Save before navigation: native fragment scrolling can otherwise reset the old page first.
document.addEventListener('click',event=>{
  const link=event.target.closest('a[href]');
  if(!link||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
  const raw=link.getAttribute('href'), match=raw.match(/^(?:\.\.\/\.\.\/|\.\/)?(#\/.*)$/);
  const staticRead=raw.match(/^\.\.\/\.\.\/read\/(\d+)\/$/);
  if(!match&&!staticRead)return;
  event.preventDefault();
  if(current){updateProgress();storage.set('reorganize-reading-v1',reading);}
  const href=match?match[1]:`#/read/${Number(staticRead[1])}`;
  // From a static page the reading app keeps running at the site root, so old #/ links and progress keep working.
  if(staticArticle||location.hash!==href)history.pushState(null,'',(staticArticle?siteURL:'')+href);
  route(true);
});

function setTheme(value){
  theme = value === 'dark' ? 'dark' : 'light';
  document.documentElement.dataset.theme = theme;
  $('#theme-button').setAttribute('aria-label', theme === 'light' ? '切换为深色模式' : '切换为浅色模式');
  $('#theme-button').title = theme === 'light' ? '深色阅读' : '浅色阅读';
  storage.set('reorganize-theme', theme);
}
setTheme(theme);
document.documentElement.style.setProperty('--article-size', fontSize+'px');
$('#theme-button').addEventListener('click',()=>setTheme(theme === 'light' ? 'dark' : 'light'));
$('#about-button').addEventListener('click',()=>$('#about-dialog').showModal());

$('#mobile-menu-button').addEventListener('click',()=>{
  $('#mobile-navigation').innerHTML = `<div class="menu-links"><a href="#/catalog">全部文章</a><a href="#/maps">五张地图</a><button type="button" id="menu-about">关于</button><a href="${root}ai.html">AI 入口</a></div>` + (current ? `<div class="eyebrow">本篇目录 · ${number(current.id)}</div><div class="mobile-toc">${tocLinks(current)}</div><hr><div class="eyebrow">全部文章</div>${chapterLinks(current.id)}` : `<div class="eyebrow">全部文章 · 12 篇</div>${chapterLinks()}`);
  $('#menu-about').addEventListener('click',()=>{$('#navigation-dialog').close();$('#about-dialog').showModal();});
  $('#navigation-dialog').showModal();
});
$('#navigation-dialog').addEventListener('click', event=>{if(event.target.closest('a'))$('#navigation-dialog').close();});
document.querySelectorAll('dialog').forEach(dialog=>dialog.addEventListener('click',event=>{
  if(event.target !== dialog)return;
  const r=dialog.getBoundingClientRect();
  if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();
}));

function toast(message){
  $('#toast').textContent=message;$('#toast').classList.add('show');
  clearTimeout(savedToast);savedToast=setTimeout(()=>$('#toast').classList.remove('show'),2200);
}

function heroDiagram(){
  const nodes=[{x:180,y:15,en:'工作',cn:'任务如何完成',section:2},{x:350,y:123,en:'状态',cn:'依据是否可信',section:3},{x:284,y:320,en:'决定权',cn:'谁决定与复核',section:4},{x:50,y:320,en:'价值',cn:'结果与收益分配',section:5},{x:0,y:123,en:'学习',cn:'方法与人的成长',section:6}];
  return `<svg viewBox="-10 -15 535 455" role="img" aria-labelledby="hero-graph-title hero-graph-description"><title id="hero-graph-title">重新组织的五张地图</title><desc id="hero-graph-description">工作、状态、决策、价值、学习是观察同一条业务链路的五个视角，点击任一节点阅读相应章节。</desc><circle class="orbit" cx="252" cy="216" r="185" stroke-dasharray="3 8"/><circle class="orbit" cx="252" cy="216" r="122"/><path class="solid-line" d="M252 216V76M252 216L422 155M252 216L355 352M252 216L121 352M252 216L72 155" stroke-width="1"/><path class="orbit" d="M252 76L422 155L355 352L121 352L72 155Z" stroke-dasharray="4 6"/><circle class="center" cx="252" cy="216" r="62"/><text x="252" y="211" text-anchor="middle" font-size="21" letter-spacing="2">人 × AI</text><text x="252" y="237" text-anchor="middle" font-size="11" letter-spacing="2">共同完成一件事</text>${nodes.map(n=>`<a class="map-link" href="#/read/12/section-${n.section}" aria-label="${n.en} ${n.cn}"><rect class="map-box" x="${n.x}" y="${n.y}" width="144" height="69" rx="2"/><text class="diagram-en" x="${n.x+72}" y="${n.y+28}" text-anchor="middle" font-size="21">${n.en}</text><text x="${n.x+72}" y="${n.y+51}" text-anchor="middle" font-size="12">${n.cn}</text></a>`).join('')}<text x="252" y="427" text-anchor="middle" font-size="11" letter-spacing="2" style="fill:var(--muted)">五种视角，观察同一件工作</text></svg>`;
}

function renderHome(target){
  current=null;$('#reading-progress').style.width='0';
  document.title='重新组织 · AI 时代的分工、权力与人的价值';
  const last=chapters.find(c=>c.id===reading.lastId);
  const resume=last && reading.pages[last.id] && reading.pages[last.id].ratio>0.02;
  main.innerHTML=`<div class="home"><section class="hero" aria-labelledby="home-title"><div class="hero-copy"><div class="eyebrow season-line">ESSAYS ON AI & ORGANIZATION · 第一季</div><h1 id="home-title">重新<br>组织<em>。</em></h1><p class="subtitle">AI 时代的分工、权力与人的价值</p><p class="intro">当 AI 不只执行工作，也开始组织工作，<br>我们为什么一起工作，又该如何一起工作？</p><div class="hero-actions"><a class="primary-button" href="#/read/${resume?last.id+'/resume':'1'}">${resume?'继续阅读 · '+number(last.id):'从第一篇开始'} <span aria-hidden="true">↗</span></a><a class="text-link" href="#/catalog">浏览全部 12 篇 ↓</a></div><div class="author-line"><span>LeenMa</span><i></i><span>12 篇文章 · 一次关于组织的重新思考</span></div></div><div class="hero-art">${heroDiagram()}<div class="figure-foot"><span>图 01 / 观察组织的五个视角</span><span>点击地图，进入对应章节 ↗</span></div></div></section><nav class="reading-paths" aria-label="推荐阅读路径">${Object.entries(paths).map(([key,p],i)=>`<a href="#/path/${key}" class="path-card"><span class="path-index">0${i+1}</span><div><strong>${p.title}</strong><small>${p.ids.map(number).join(' → ')}</small></div><span class="arrow" aria-hidden="true">↗</span></a>`).join('')}</nav><section id="catalog" aria-labelledby="catalog-title"><div class="section-title"><div><span class="eyebrow">THE COLLECTION · 01—12</span><h2 id="catalog-title">从一件工作，到一个组织。</h2></div><p>四个部分，沿着问题向前走。</p></div><div class="catalog-tools"><div class="filter-list" aria-label="按部分筛选"><button class="filter-button" data-filter="all" aria-pressed="${filter==='all'}">全部 12 篇</button>${parts.map((p,i)=>`<button class="filter-button" data-filter="${i}" aria-pressed="${filter===String(i)}">${p}</button>`).join('')}</div><label class="search-wrap"><span aria-hidden="true">⌕</span><input type="search" id="article-search" placeholder="搜索标题、概念或正文" aria-label="搜索文章全文" value="${esc(query)}"></label></div><div id="search-result" class="search-result" aria-live="polite"></div><div id="catalog-grid" class="catalog-grid"></div></section><section class="maps-section" id="maps" aria-labelledby="maps-title"><div class="section-title"><div><span class="eyebrow">A WAY TO BEGIN</span><h2 id="maps-title">五张地图，一件真实的工作。</h2></div><a class="text-link" href="#/read/12">阅读终篇 ↗</a></div><div class="maps-grid">${[
    ['Work','工作','看清任务、执行者与真实依赖。'],['State','状态','区分已确认、推断与未知。'],['Decision','决定权','明确授权、暂停与异议复核。'],['Value','价值','看结果，也看收益与代价的分配。'],['Learning','学习','让一次经验进入下一次工作。']
  ].map(([en,cn,desc],i)=>`<a class="map-item" href="#/read/12/section-${i+2}"><span class="map-en">${en}</span><h3>${cn}地图 ↗</h3><p>${desc}</p></a>`).join('')}</div><p class="maps-note">五张地图是同一条工作链路的不同视角，互相联系与反馈，并非固定执行步骤。</p></section><footer class="site-footer"><span class="footer-brand">重新组织。</span><span>LeenMa</span><a href="CONTENT-LICENSE.txt" target="_blank">内容许可 CC BY 4.0 ↗</a></footer></div>`;
  $('#article-search').addEventListener('input',e=>{query=e.target.value;renderCards();});
  document.querySelectorAll('[data-filter]').forEach(button=>button.addEventListener('click',()=>{
    filter=button.dataset.filter;pathName=null;
    document.querySelectorAll('[data-filter]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.filter===filter)));
    renderCards();
  }));
  renderCards();
  if(target)$('#'+target)?.scrollIntoView({behavior:'instant'});else window.scrollTo({top:0,behavior:'instant'});
}

function renderCards(){
  let selected=pathName?paths[pathName].ids.map(id=>chapters.find(c=>c.id===id)):chapters;
  const normalized=query.trim().toLocaleLowerCase();
  selected=selected.filter(c=>(filter==='all'||c.part===Number(filter))&&(!normalized||`${c.title} ${c.tag} ${c.searchText}`.toLocaleLowerCase().includes(normalized)));
  $('#search-result').textContent=pathName?`${paths[pathName].title} · ${paths[pathName].description} · ${selected.length} 篇（按推荐顺序）`:normalized?`“${query.trim()}” · 找到 ${selected.length} 篇文章`:'';
  $('#catalog-grid').innerHTML=selected.length?selected.map(c=>{
    const state=reading.pages[c.id];
    let description=c.takeaway;
    if(normalized){const index=c.searchText.toLocaleLowerCase().indexOf(normalized);if(index>=0)description='…'+c.searchText.slice(Math.max(0,index-24),index+70).replace(/[#*\n]/g,'')+'…';}
    return `<a href="#/read/${c.id}" class="chapter-card" aria-label="阅读第 ${c.id} 篇：${esc(c.title)}"><div class="card-top"><span class="card-number">${number(c.id)}</span><span>PART 0${c.part+1} / ${parts[c.part]}</span></div><h3>${esc(c.title)}</h3><p>${esc(description)}</p><div class="card-foot"><span class="tag">${esc(c.tag)}</span><span>约 ${c.readingMinutes} 分钟</span>${state?.completed?'<span class="read-mark">已读 ✓</span>':''}<span class="card-arrow" aria-hidden="true">↗</span></div></a>`;
  }).join(''):'<p class="no-results">没有找到相关文章。试试“判断”“责任”或“团队”。</p>';
}

function chapterLinks(active){
  return parts.map((p,i)=>`<h3 class="sidebar-group">0${i+1} / ${p}</h3>${chapters.filter(c=>c.part===i).map(c=>`<a class="sidebar-link${active===c.id?' active':''}" href="#/read/${c.id}" ${active===c.id?'aria-current="page"':''}><span class="number">${number(c.id)}</span><span>${esc(c.title)}</span></a>`).join('')}`).join('');
}

function tocLinks(chapter){
  return `<a href="#/read/${chapter.id}/concept" data-toc="concept">图解</a>${chapter.headings.filter(h=>h.level===2).map(h=>`<a href="#/read/${chapter.id}/${h.id}" data-toc="${h.id}">${esc(h.title.replace(/^[一二三四五六七八九十]+、/,''))}</a>`).join('')}`;
}

function concept(chapter){
  const img=chapter.images[0];
  if(!img)return '';
  return `<figure class="reading-figure" id="concept"><span id="gallery" class="section-anchor" aria-hidden="true"></span><button data-image="0" aria-label="放大图解：${esc(img.alt)}"><img src="${root}${esc(img.src)}" alt="${esc(img.alt)}" width="${img.width}" height="${img.height}"><span class="zoom-hint" aria-hidden="true">⤢ 点击放大 · 双指缩放</span></button><figcaption>${esc(img.alt)}</figcaption><p class="sr-only">${esc(img.description)}</p></figure>`;
}

function renderReader(chapter, anchor){
  current=chapter;
  document.title=`${number(chapter.id)} · ${chapter.title} — 重新组织`;
  const previous=chapters[chapter.id-2], next=chapters[chapter.id];
  main.innerHTML=`<div class="reader-layout"><aside class="chapter-sidebar" aria-label="系列文章"><a href="#/catalog" class="sidebar-home">← 返回系列总览</a><div class="eyebrow">第一季 · 12 篇</div>${chapterLinks(chapter.id)}</aside><article class="article-center"><div class="article-inner"><header><div class="article-kicker"><span><span class="kicker-number">${number(chapter.id)}</span> / 12</span><span>PART 0${chapter.part+1} · ${parts[chapter.part]}</span></div><h1 class="article-title">${esc(chapter.title)}</h1><div class="article-meta"><span>LeenMa</span><span>约 ${chapter.readingMinutes} 分钟</span></div></header><nav class="reading-toolbar" aria-label="阅读设置"><span class="tool-label">${esc(chapter.tag)}</span><button id="open-toc">本篇目录 ↓</button><a href="#/read/${chapter.id}/concept">图解 ↓</a><button id="font-smaller" class="font-button" aria-label="A− 缩小正文字号" ${fontSize<=17?'disabled':''}>A−</button><button id="font-larger" class="font-button" aria-label="A＋ 放大正文字号" ${fontSize>=23?'disabled':''}>A＋</button><button id="copy-link">复制链接</button></nav>${concept(chapter)}<div class="prose" id="article-body">${chapter.html}</div><div class="end-marker" id="article-end">第 ${number(chapter.id)} 篇 · 正文完</div><div class="article-download" id="sources"><a href="${root}articles/${chapter.file}" download>下载 Markdown ↓</a></div><nav class="next-reading" aria-label="前后篇文章">${previous?`<a href="#/read/${previous.id}"><span>← 上一篇 · ${number(previous.id)}</span>${esc(previous.title)}</a>`:'<a href="#/catalog"><span>← 返回</span>系列总览</a>'}${next?`<a href="#/read/${next.id}"><span>下一篇 · ${number(next.id)} →</span>${esc(next.title)}</a>`:'<a href="#/catalog"><span>第一季 · 完 →</span>回到十二个问题</a>'}</nav></div></article><aside class="toc-sidebar" aria-label="本篇章节"><div class="toc-title">ON THIS PAGE / 本篇目录</div>${tocLinks(chapter)}<div class="toc-progress"><span>正文阅读进度</span><span id="percent">0%</span></div></aside></div>`;
  $('#open-toc').addEventListener('click',()=>{
    $('#mobile-navigation').innerHTML=`<div class="eyebrow">第 ${number(chapter.id)} 篇 · 本篇目录</div><div class="mobile-toc">${tocLinks(chapter)}</div>`;
    $('#navigation-dialog').showModal();
  });
  $('#font-smaller').addEventListener('click',()=>changeFont(-2));
  $('#font-larger').addEventListener('click',()=>changeFont(2));
  $('#copy-link').addEventListener('click',async()=>{
    try{await navigator.clipboard.writeText(articleURL(chapter.id)+(location.hash.split('/')[3]?'#'+location.hash.split('/')[3]:''));toast('阅读链接已复制');}
    catch{toast('暂时无法复制，请从浏览器地址栏复制链接');}
  });
  document.querySelectorAll('[data-image]').forEach(button=>button.addEventListener('click',()=>{
    const img=chapter.images[Number(button.dataset.image)];
    $('#image-full').src=root+img.src;$('#image-full').alt=img.alt;
    $('#image-caption').textContent=img.alt;$('#image-original').href=root+img.src;
    $('#image-dialog').showModal();openImage();
  }));
  $('.sidebar-link.active')?.scrollIntoView({block:'nearest',behavior:'instant'});
  jumpTo(anchor);rendering=false;updateProgress(false);
}

const zoom={value:1,min:1,max:5};
function openImage(){
  const viewport=$('.image-viewport'), image=$('#image-full');
  // Phones open at about 2.4x so the diagram text is readable; pan by dragging.
  zoom.value=innerWidth<760?2.4:1;
  image.style.width=zoom.value*100+'%';viewport.scrollTop=0;viewport.scrollLeft=0;
  if(zoom.value>1)viewport.scrollLeft=(viewport.scrollWidth-viewport.clientWidth)/2;
}
function setZoom(value,cx,cy){
  const viewport=$('.image-viewport'), image=$('#image-full');
  const next=Math.min(zoom.max,Math.max(zoom.min,value)), old=zoom.value;
  const px=(viewport.scrollLeft+cx)/old, py=(viewport.scrollTop+cy)/old;
  zoom.value=next;image.style.width=next*100+'%';
  viewport.scrollLeft=px*next-cx;viewport.scrollTop=py*next-cy;
}
$('#image-close').addEventListener('click',()=>$('#image-dialog').close());
for(const [id,factor] of [['zoom-in',1.4],['zoom-out',1/1.4]])$('#'+id).addEventListener('click',()=>{const v=$('.image-viewport');setZoom(zoom.value*factor,v.clientWidth/2,v.clientHeight/2);});
$('#zoom-reset').addEventListener('click',()=>{const v=$('.image-viewport');setZoom(1,v.clientWidth/2,v.clientHeight/2);});
(()=>{
  const viewport=$('.image-viewport');let start=null;
  const distance=t=>Math.hypot(t[0].clientX-t[1].clientX,t[0].clientY-t[1].clientY);
  viewport.addEventListener('touchstart',e=>{if(e.touches.length===2)start={d:distance(e.touches),z:zoom.value};},{passive:true});
  viewport.addEventListener('touchmove',e=>{
    if(e.touches.length!==2||!start)return;
    e.preventDefault();
    const r=viewport.getBoundingClientRect();
    setZoom(start.z*distance(e.touches)/start.d,(e.touches[0].clientX+e.touches[1].clientX)/2-r.left,(e.touches[0].clientY+e.touches[1].clientY)/2-r.top);
  },{passive:false});
  viewport.addEventListener('touchend',e=>{if(e.touches.length<2)start=null;});
  viewport.addEventListener('wheel',e=>{if(!e.ctrlKey)return;e.preventDefault();const r=viewport.getBoundingClientRect();setZoom(zoom.value*Math.exp(-e.deltaY/200),e.clientX-r.left,e.clientY-r.top);},{passive:false});
})();

function changeFont(delta){
  fontSize=Math.min(23,Math.max(17,fontSize+delta));
  document.documentElement.style.setProperty('--article-size',fontSize+'px');
  storage.set('reorganize-font-size',fontSize);
  $('#font-smaller').disabled=fontSize<=17;$('#font-larger').disabled=fontSize>=23;
  toast(`正文字号 ${fontSize}`);updateProgress(false);
}

function jumpTo(anchor){
  if(anchor==='resume'){
    const state=reading.pages[current.id];
    const end=$('#article-end');
    const max=Math.max(1,end.getBoundingClientRect().bottom+scrollY-innerHeight+60);
    window.scrollTo({top:Math.max(0,Math.min(1,state?.ratio||0))*max,behavior:'instant'});
  }else if(anchor){
    document.getElementById(anchor)?.scrollIntoView({behavior:'instant'});
  }else window.scrollTo({top:0,behavior:'instant'});
}

function updateProgress(persist=true){
  if(!current||rendering)return;
  const end=$('#article-end'),body=$('#article-body');if(!end||!body)return;
  const max=Math.max(1,end.getBoundingClientRect().bottom+scrollY-innerHeight+60);
  const bodyTop=body.getBoundingClientRect().top+scrollY;
  const percent=Math.max(0,Math.min(100,(scrollY+innerHeight-bodyTop-100)/(max+innerHeight-bodyTop-100)*100));
  $('#reading-progress').style.width=percent+'%';
  if($('#percent'))$('#percent').textContent=Math.round(percent)+'%';
  let selected='concept';
  for(const node of document.querySelectorAll('#concept,.prose h2')){if(node.getBoundingClientRect().top<160)selected=node.id;}
  document.querySelectorAll('.toc-sidebar [data-toc]').forEach(a=>{
    const active=a.dataset.toc===selected;a.classList.toggle('active',active);
    if(active)a.setAttribute('aria-current','location');else a.removeAttribute('aria-current');
  });
  if(persist){
    const old=reading.pages[current.id]||{};
    reading.pages[current.id]={ratio:Math.max(0,Math.min(1,scrollY/max)),percent:Math.round(percent),completed:old.completed||percent>=99};
    reading.lastId=current.id;
    if(Date.now()-lastSaved>800){storage.set('reorganize-reading-v1',reading);lastSaved=Date.now();}
  }
}

function route(force=false){
  if(!force&&lastRoute===location.hash)return;
  lastRoute=location.hash;
  let segments=location.hash.slice(1).split('/').filter(Boolean);
  if(staticArticle&&!segments.length)segments=['read',String(staticArticle)];
  const id=Number(segments[1]);
  if(segments[0]==='read'&&current?.id===id){jumpTo(segments[2]);updateProgress();return;}
  rendering=true;
  document.querySelectorAll('dialog[open]').forEach(d=>d.close());
  if(segments[0]==='read'){
    const chapter=chapters.find(c=>c.id===id);
    if(chapter){renderReader(chapter,segments[2]);return;}
    toast('没有找到这篇文章，已回到系列总览');
  }
  pathName=segments[0]==='path'&&paths[segments[1]]?segments[1]:null;
  filter='all';query='';
  renderHome(pathName||segments[0]==='catalog'?'catalog':segments[0]==='maps'?'maps':null);
  rendering=false;
}

window.addEventListener('scroll',()=>{
  if(!ticking){requestAnimationFrame(()=>{updateProgress();ticking=false;});ticking=true;}
},{passive:true});
window.addEventListener('resize',()=>updateProgress(false));
window.addEventListener('pagehide',()=>{updateProgress();storage.set('reorganize-reading-v1',reading);});
window.addEventListener('hashchange',()=>route());
window.addEventListener('popstate',()=>route());
if('scrollRestoration' in history)history.scrollRestoration='manual';
fetch(root+'content.json').then(response=>{if(!response.ok)throw new Error('content unavailable');return response.json();}).then(articles=>{
  chapters=articles;
  const staticHash=location.hash.startsWith('#/');
  if(staticArticle&&!staticHash){
    // Take over the server-rendered article in place; the URL stays the shareable article address.
    const chapter=chapters.find(c=>c.id===staticArticle);
    lastRoute=location.hash;rendering=true;
    const anchor=decodeURIComponent(location.hash.slice(1));
    renderReader(chapter,anchor&&document.getElementById(anchor)?anchor:undefined);
  }else{
    if(staticArticle)history.replaceState(null,'',siteURL+location.hash);
    route();
  }
}).catch(()=>{
  main.innerHTML='<div class="loading"><h1>文章暂时未能加载</h1><p>请刷新页面重试。</p><button class="primary-button" id="reload">重新加载 ↻</button></div>';
  $('#reload').addEventListener('click',()=>location.reload());
});
