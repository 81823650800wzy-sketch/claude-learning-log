/**
 * 十一的Claude成长节点记录 v3
 * 方舟风格 · 浅色系 · 筛选/搜索/游戏化渲染引擎
 */
(async function(){
  const resp = await fetch('data/entries.json');
  if(!resp.ok) return;
  const entries = await resp.json();
  entries.sort((a,b) => b.date.localeCompare(a.date));

  // ═══ State ═══
  const state = { filterTag: null, filterSkill: null, searchQuery: '' };
  window.__logState = state;

  // ═══ Render All ═══
  renderStats(entries);
  renderLevel(entries);
  renderNodes(entries);
  renderConstellation(entries);
  renderBadges(entries);
  renderArchives(entries);
  initSearch(entries);
  initDashClicks();
  initFilterClear();

  // On entry page: render prev/next nav
  if(document.querySelector('.entry-wrapper')){
    renderEntryNav(entries);
  }

  // ═══ Stats ═══
  function renderStats(e){
    const skills = e.reduce((s,x)=>s+(x.skills_added||[]).length+(x.skills_removed||[]).length,0);
    const repos = e.filter(x=>x.repo).length;
    const anchors = e.reduce((s,x)=>s+(x.behavior_changes||[]).length,0);
    animateNum('stat-sessions', e.length);
    animateNum('stat-skills', skills);
    animateNum('stat-repos', repos);
    animateNum('stat-anchors', anchors);
  }
  function animateNum(id,target){
    const el=document.getElementById(id);if(!el)return;
    let c=0;const s=Math.max(1,Math.floor(target/25));
    const t=setInterval(()=>{c=Math.min(c+s,target);el.textContent=c;if(c>=target)clearInterval(t)},35);
  }

  // ═══ Level ═══
  function renderLevel(e){
    const total=e.length;
    const level=Math.floor((total-1)/5)+1;
    const currentInLevel=total-(level-1)*5;
    const pct=(currentInLevel/5)*100;
    document.getElementById('levelBadge').textContent='Lv.'+level;
    document.getElementById('xpBar').style.width=pct+'%';
    document.getElementById('xpText').textContent=currentInLevel+'/5';
  }

  // ═══ Rarity ═══
  function calcRarity(entry){
    const score = (entry.tags||[]).length + (entry.repo?2:0) + (entry.behavior_changes||[]).length;
    if(score>=10) return 'legendary';
    if(score>=7) return 'epic';
    if(score>=4) return 'rare';
    return 'common';
  }
  const RARITY_LABEL = {legendary:'传说',epic:'史诗',rare:'稀有',common:'普通'};

  // ═══ Filter logic ═══
  function matchesFilter(entry){
    if(state.filterTag && !(entry.tags||[]).includes(state.filterTag)) return false;
    if(state.filterSkill){
      const allSkills = [...(entry.skills_added||[]),...(entry.skills_removed||[])];
      if(!allSkills.includes(state.filterSkill)) return false;
    }
    if(state.searchQuery){
      const q=state.searchQuery.toLowerCase();
      const haystack=[entry.title,entry.summary,...(entry.tags||[]),...(entry.skills_added||[]),...(entry.skills_removed||[])].join(' ').toLowerCase();
      if(!haystack.includes(q)) return false;
    }
    return true;
  }
  function applyFilter(tag){state.filterTag=tag;state.filterSkill=null;refresh(entries)}
  function applySkillFilter(skill){state.filterSkill=skill;state.filterTag=null;refresh(entries)}
  function clearFilter(){state.filterTag=null;state.filterSkill=null;state.searchQuery='';document.getElementById('searchInput').value='';refresh(entries)}
  function refresh(entries){
    const filtered=entries.filter(matchesFilter);
    renderNodes(filtered);
    updateFilterBar();
    // re-render constellation with filter highlight
    renderConstellation(entries);
  }
  function updateFilterBar(){
    const bar=document.getElementById('filterBar');
    const tag=document.getElementById('filterTag');
    if(state.filterTag||state.filterSkill||state.searchQuery){
      bar.style.display='flex';
      tag.textContent = state.filterTag || state.filterSkill || '"'+state.searchQuery+'"';
    }else{bar.style.display='none'}
  }

  // ═══ Nodes ═══
  function renderNodes(entries){
    const container=document.getElementById('nodeTimeline');
    const list=state.filterTag||state.filterSkill||state.searchQuery ? entries.filter(matchesFilter) : entries;
    const html=list.map((e,i)=>{
      const r=calcRarity(e);
      return `<div class="node-item" style="animation-delay:${i*0.08}s">
        <div class="node-dot"></div>
        <div class="node-card rarity-${r}">
          <span class="node-rarity-badge rarity-${r}">${RARITY_LABEL[r]}</span>
          <div class="node-date">${e.date}</div>
          <div class="node-title"><a href="${e.url}">${e.title}</a></div>
          <div class="node-summary">${e.summary}</div>
          <div class="node-tags">
            ${(e.skills_added||[]).map(s=>`<span class="node-skill add${state.filterSkill===s?' active':''}" data-skill="${s}">+${s}</span>`).join('')}
            ${(e.skills_removed||[]).map(s=>`<span class="node-skill del${state.filterSkill===s?' active':''}" data-skill="${s}">−${s}</span>`).join('')}
            ${(e.tags||[]).map(t=>`<span class="node-tag${state.filterTag===t?' active':''}" data-tag="${t}">${t}</span>`).join('')}
          </div>
          ${e.repo?`<div class="node-repo"><a href="${e.repo}">◫ ${e.repo.split('/').pop()}</a></div>`:''}
        </div>
      </div>`;
    }).join('');
    container.innerHTML=list||'<div style="text-align:center;color:var(--text-muted);padding:3rem">◆ 没有匹配的节点</div>';
    // Wire tag/skill clicks
    container.querySelectorAll('.node-tag').forEach(el=>el.addEventListener('click',e=>{e.preventDefault();applyFilter(el.dataset.tag)}));
    container.querySelectorAll('.node-skill').forEach(el=>el.addEventListener('click',e=>{e.preventDefault();applySkillFilter(el.dataset.skill)}));
  }

  // ═══ Constellation ═══
  function renderConstellation(entries){
    const freq={};
    entries.forEach(e=>(e.tags||[]).forEach(t=>{freq[t]=(freq[t]||0)+1}));
    const max=Math.max(...Object.values(freq),1);
    const tags=Object.entries(freq).sort((a,b)=>b[1]-a[1]);
    const html=tags.map(([t,f])=>{
      const size=Math.ceil((f/max)*5);
      const active=state.filterTag===t?' active':'';
      return `<span class="constellation-node size-${size}${active}" data-tag="${t}">${t} ×${f}</span>`;
    }).join('');
    document.getElementById('tagConstellation').innerHTML=html;
    document.querySelectorAll('.constellation-node').forEach(el=>el.addEventListener('click',()=>applyFilter(el.dataset.tag)));
  }

  // ═══ Badges ═══
  function renderBadges(entries){
    const total=entries.length;
    const badges=[
      {name:'初心者',icon:'🏅',cond:total>=1,desc:'记录第一个成长节点'},
      {name:'探索者',icon:'🎖️',cond:total>=5,desc:'累计5个节点'},
      {name:'开拓者',icon:'🏆',cond:total>=10,desc:'累计10个节点'},
      {name:'先驱者',icon:'👑',cond:total>=20,desc:'累计20个节点'},
      {name:'传奇',icon:'⭐',cond:total>=50,desc:'累计50个节点'},
      {name:'工具链大师',icon:'🔧',cond:entries.filter(e=>(e.skills_added||[]).length+(e.skills_removed||[]).length>0).length>=3,desc:'3次以上技能变迁'},
      {name:'收藏家',icon:'📦',cond:entries.filter(e=>e.repo).length>=3,desc:'关联3个以上仓库'},
      {name:'锚点守护者',icon:'⚓',cond:entries.reduce((s,e)=>s+(e.behavior_changes||[]).length,0)>=5,desc:'5个以上行为锚点'},
    ];
    const html=badges.map(b=>{
      const unlocked=b.cond;
      return `<div class="badge-item ${unlocked?'unlocked':'locked'}" title="${unlocked?b.desc:'未解锁: '+b.desc}">
        <div class="badge-icon">${unlocked?b.icon:'⬜'}</div>
        <div class="badge-name">${b.name}</div>
      </div>`;
    }).join('');
    document.getElementById('badgeWall').innerHTML=html;
  }

  // ═══ Archives ═══
  function renderArchives(entries){
    const months={};
    entries.forEach(e=>{const m=e.date.substring(0,7);if(!months[m])months[m]=[];months[m].push(e)});
    const html=Object.entries(months).sort((a,b)=>b[0].localeCompare(a[0])).map(([m,items])=>`
      <div class="archive-month-card">
        <div class="archive-month-label">◫ ${m}</div>
        ${items.map(e=>`<div class="archive-entry"><a href="${e.url}">${e.title}</a><span class="archive-entry-day">${e.date.substring(8)}</span></div>`).join('')}
      </div>
    `).join('');
    document.getElementById('archiveGrid').innerHTML=html;
  }

  // ═══ Search ═══
  function initSearch(entries){
    const input=document.getElementById('searchInput');
    if(!input) return;
    input.addEventListener('input',()=>{
      state.searchQuery=input.value.trim();
      state.filterTag=null;state.filterSkill=null;
      refresh(entries);
    });
  }

  // ═══ Dash clicks ═══
  function initDashClicks(){
    document.querySelectorAll('.dash-card').forEach(card=>{
      card.addEventListener('click',()=>{
        const target=card.dataset.target;
        const el=document.getElementById(target);
        if(el) el.scrollIntoView({behavior:'smooth',block:'start'});
      });
    });
  }

  // ═══ Filter Clear ═══
  function initFilterClear(){
    const btn=document.getElementById('filterClear');
    if(btn) btn.addEventListener('click',()=>clearFilter(entries));
  }

  // ═══ Entry Page Nav ═══
  function renderEntryNav(allEntries){
    const path=window.location.pathname;
    const idx=allEntries.findIndex(e=>path.endsWith(e.url));
    if(idx===-1) return;
    const nav=document.querySelector('.entry-nav');
    if(!nav) return;
    const prev=idx<allEntries.length-1?allEntries[idx+1]:null;
    const next=idx>0?allEntries[idx-1]:null;
    nav.innerHTML = `
      ${prev?`<a href="../${prev.url}">← ${prev.date} ${prev.title}</a>`:'<span></span>'}
      ${next?`<a href="../${next.url}">${next.date} ${next.title} →</a>`:'<span></span>'}
    `;
  }
})();
