/**
 * 十一的Claude成长节点记录 v3.5
 * 方舟风格 · 游戏化 · 筛选/搜索 · 高密度卡片
 */
(async function(){
  const resp = await fetch('data/entries.json');
  if(!resp.ok){console.error('Failed to load entries.json');return}
  const entries = await resp.json();
  entries.sort((a,b)=>b.date.localeCompare(a.date));

  const state = { filterTag:null, filterSkill:null, searchQuery:'' };
  window.__logState = state;

  renderStats(entries);
  renderLevel(entries);
  renderNodes(entries);
  renderConstellation(entries);
  renderBadges(entries);
  renderArchives(entries);
  initSearch(entries);
  initDashClicks();
  initFilterClear();
  if(document.querySelector('.entry-wrapper')) renderEntryNav(entries);

  // ═══ Stats as rings ═══
  function renderStats(e){
    const skills=e.reduce((s,x)=>s+(x.skills_added||[]).length+(x.skills_removed||[]).length,0);
    const repos=e.filter(x=>x.repo).length;
    const anchors=e.reduce((s,x)=>s+(x.behavior_changes||[]).length,0);
    ['stat-sessions','stat-skills','stat-repos','stat-anchors'].forEach(id=>document.getElementById(id)&&(document.getElementById(id).textContent='0'));
    animateRing('stat-sessions',e.length,Math.max(e.length*2,10));
    animateRing('stat-skills',skills,Math.max(skills*2,10));
    animateRing('stat-repos',repos,Math.max(repos*2,10));
    animateRing('stat-anchors',anchors,Math.max(anchors*2,10));
  }
  function animateRing(id,target,max){
    const el=document.getElementById(id);if(!el)return;
    const ring=el.closest('.dash-card')?.querySelector('.dash-ring-bg');
    const pct=(target/max)*100;
    let c=0;const step=Math.max(1,Math.floor(target/25));
    const t=setInterval(()=>{c=Math.min(c+step,target);el.textContent=c;if(ring)ring.style.setProperty('--pct',((c/max)*100)+'%');if(c>=target)clearInterval(t)},35);
  }

  // ═══ Level ═══
  function renderLevel(e){
    const total=e.length,level=Math.floor((total-1)/5)+1,cin=total-(level-1)*5,pct=(cin/5)*100;
    document.getElementById('levelBadge').textContent='Lv.'+level;
    document.getElementById('xpBar').style.width=pct+'%';
    document.getElementById('xpText').textContent=cin+'/5';
  }

  // ═══ Rarity ═══
  function calcRarity(e){const s=(e.tags||[]).length+(e.repo?2:0)+(e.behavior_changes||[]).length;if(s>=10)return'legendary';if(s>=7)return'epic';if(s>=4)return'rare';return'common'}
  const R={legendary:'传说',epic:'史诗',rare:'稀有',common:'普通'};

  // ═══ Filter ═══
  function matchesFilter(e){
    if(state.filterTag&&!(e.tags||[]).includes(state.filterTag))return false;
    if(state.filterSkill){const all=[...(e.skills_added||[]),...(e.skills_removed||[])];if(!all.includes(state.filterSkill))return false}
    if(state.searchQuery){const q=state.searchQuery.toLowerCase();const hay=[e.title,e.summary,...(e.tags||[]),...(e.skills_added||[]),...(e.skills_removed||[])].join(' ').toLowerCase();if(!hay.includes(q))return false}
    return true;
  }
  function applyFilter(tag){state.filterTag=tag;state.filterSkill=null;refresh()}
  function applySkillFilter(skill){state.filterSkill=skill;state.filterTag=null;refresh()}
  function clearFilter(){state.filterTag=null;state.filterSkill=null;state.searchQuery='';document.getElementById('searchInput').value='';refresh()}
  function refresh(){const filtered=entries.filter(matchesFilter);renderNodes(filtered);updateFilterBar();renderConstellation(entries)}
  function updateFilterBar(){const bar=document.getElementById('filterBar'),tag=document.getElementById('filterTag');if(state.filterTag||state.filterSkill||state.searchQuery){bar.style.display='flex';tag.textContent=state.filterTag||state.filterSkill||'"'+state.searchQuery+'"'}else bar.style.display='none'}

  // ═══ Nodes (rich cards) ═══
  function renderNodes(list){
    const container=document.getElementById('nodeTimeline');
    const data=state.filterTag||state.filterSkill||state.searchQuery?list.filter(matchesFilter):list;
    const html=data.map((e,i)=>{
      const r=calcRarity(e),tags=(e.tags||[]).length,sk=(e.skills_added||[]).length+(e.skills_removed||[]).length;
      const bh=(e.behavior_changes||[]).length,hasRepo=e.repo?1:0,idx=entries.indexOf(e)+1;
      return `<div class="node-item" style="animation-delay:${i*0.08}s">
        <div class="node-hex"></div>
        <div class="node-card rarity-${r}">
          <span class="node-file-no">FILE-NO.${String(idx).padStart(3,'0')}</span>
          <span class="node-rarity-badge rarity-${r}">${R[r]}</span>
          <div class="node-status rarity-${r}"></div>
          <div class="node-date">${e.date}</div>
          <div class="node-title"><a href="${e.url}">${e.title}</a></div>
          <div class="node-summary">${e.summary}</div>
          <div class="node-mini-stats">
            <div class="node-mini-stat"><div class="ms-val">${tags}</div><div class="ms-lbl">标签</div></div>
            <div class="node-mini-stat"><div class="ms-val">${sk}</div><div class="ms-lbl">技能</div></div>
            <div class="node-mini-stat"><div class="ms-val">${hasRepo}</div><div class="ms-lbl">仓库</div></div>
            <div class="node-mini-stat"><div class="ms-val">${bh}</div><div class="ms-lbl">锚点</div></div>
          </div>
          <div class="node-tags">
            ${(e.skills_added||[]).map(s=>`<span class="node-skill add${state.filterSkill===s?' active':''}" data-skill="${s}">+${s}</span>`).join('')}
            ${(e.skills_removed||[]).map(s=>`<span class="node-skill del${state.filterSkill===s?' active':''}" data-skill="${s}">−${s}</span>`).join('')}
            ${(e.tags||[]).map(t=>`<span class="node-tag${state.filterTag===t?' active':''}" data-tag="${t}">${t}</span>`).join('')}
          </div>
          ${e.repo?`<div class="node-repo"><a href="${e.repo}">◫ ${e.repo.split('/').pop()}</a></div>`:''}
        </div>
      </div>`;
    }).join('');
    container.innerHTML=data.length?html:'<div style="text-align:center;color:var(--text-muted);padding:3rem;font-family:var(--font-mono)">◆ 没有匹配的节点</div>';
    container.querySelectorAll('.node-tag').forEach(el=>el.addEventListener('click',e=>{e.preventDefault();applyFilter(el.dataset.tag)}));
    container.querySelectorAll('.node-skill').forEach(el=>el.addEventListener('click',e=>{e.preventDefault();applySkillFilter(el.dataset.skill)}));
  }

  // ═══ Constellation ═══
  function renderConstellation(all){
    const freq={};all.forEach(e=>(e.tags||[]).forEach(t=>{freq[t]=(freq[t]||0)+1}));
    const max=Math.max(...Object.values(freq),1);
    const tags=Object.entries(freq).sort((a,b)=>b[1]-a[1]);
    const html=tags.map(([t,f])=>{const sz=Math.ceil((f/max)*5),act=state.filterTag===t?' active':'';return`<span class="constellation-node size-${sz}${act}" data-tag="${t}" title="点击筛选: ${t}">${t} ×${f}</span>`}).join('');
    document.getElementById('tagConstellation').innerHTML=html;
    document.querySelectorAll('.constellation-node').forEach(el=>el.addEventListener('click',()=>applyFilter(el.dataset.tag)));
  }

  // ═══ Badges ═══
  function renderBadges(e){
    const total=e.length;
    const badges=[{name:'初心者',icon:'🏅',cond:total>=1,desc:'记录第一个节点'},{name:'探索者',icon:'🎖️',cond:total>=5,desc:'累计5个节点'},{name:'开拓者',icon:'🏆',cond:total>=10,desc:'累计10个节点'},{name:'先驱者',icon:'👑',cond:total>=20,desc:'累计20个节点'},{name:'传奇',icon:'⭐',cond:total>=50,desc:'累计50个节点'},{name:'工具链大师',icon:'🔧',cond:e.filter(x=>(x.skills_added||[]).length+(x.skills_removed||[]).length>0).length>=3,desc:'3次以上技能变迁'},{name:'收藏家',icon:'📦',cond:e.filter(x=>x.repo).length>=3,desc:'关联3个以上仓库'},{name:'锚点守护者',icon:'⚓',cond:e.reduce((s,x)=>s+(x.behavior_changes||[]).length,0)>=5,desc:'5个以上行为锚点'}];
    document.getElementById('badgeWall').innerHTML=badges.map(b=>{const u=b.cond;return`<div class="badge-item ${u?'unlocked':'locked'}" title="${u?'已解锁: '+b.desc:'未解锁: '+b.desc}"><div class="badge-icon">${u?b.icon:'⬜'}</div><div class="badge-name">${b.name}</div></div>`}).join('');
  }

  // ═══ Archives ═══
  function renderArchives(e){
    const months={};e.forEach(x=>{const m=x.date.substring(0,7);if(!months[m])months[m]=[];months[m].push(x)});
    document.getElementById('archiveGrid').innerHTML=Object.entries(months).sort((a,b)=>b[0].localeCompare(a[0])).map(([m,items])=>`<div class="archive-month-card"><div class="archive-month-label">◫ ${m}</div>${items.map(x=>`<div class="archive-entry"><a href="${x.url}">${x.title}</a><span class="archive-entry-day">${x.date.substring(8)}</span></div>`).join('')}</div>`).join('');
  }

  // ═══ Search ═══
  function initSearch(e){const inp=document.getElementById('searchInput');if(!inp)return;inp.addEventListener('input',()=>{state.searchQuery=inp.value.trim();state.filterTag=null;state.filterSkill=null;refresh()})}

  // ═══ Dash clicks ═══
  function initDashClicks(){document.querySelectorAll('.dash-card').forEach(c=>c.addEventListener('click',()=>{const t=document.getElementById(c.dataset.target);if(t)t.scrollIntoView({behavior:'smooth',block:'start'})}))}

  // ═══ Filter clear ═══
  function initFilterClear(){const b=document.getElementById('filterClear');if(b)b.addEventListener('click',()=>clearFilter())}

  // ═══ Entry nav ═══
  function renderEntryNav(all){const path=window.location.pathname,idx=all.findIndex(e=>path.endsWith(e.url));if(idx===-1)return;const nav=document.querySelector('.entry-nav');if(!nav)return;const prev=idx<all.length-1?all[idx+1]:null,next=idx>0?all[idx-1]:null;nav.innerHTML=`${prev?`<a href="../${prev.url}">← ${prev.date}</a>`:'<span></span>'}${next?`<a href="../${next.url}">${next.date} →</a>`:'<span></span>'}`}
})();
