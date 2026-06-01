/**
 * 十一的Claude成长节点记录 v4
 * SVG价值折线图 · 事件委托 · class切换筛选 · 自动评分
 */
(async function(){
  const resp = await fetch('/data/entries.json');
  if(!resp.ok) return console.error('Failed to load entries.json');
  const entries = await resp.json();
  entries.sort((a,b)=>a.date.localeCompare(a.date));

  const R = {legendary:'传说',epic:'史诗',rare:'稀有',common:'普通'};
  const state = { filter:null, filterVal:null, searchQuery:'', selectedIdx:-1 };
  const CHART = { W:800, H:320, PAD:40, R:7, XSPACING:100 };

  // ─── Value calc ───
  function calcValue(e){return (e.tags||[]).length + ((e.skills_added||[]).length+(e.skills_removed||[]).length)*2 + (e.repo?3:0) + (e.behavior_changes||[]).length*2}
  function calcRarity(e){const s=(e.tags||[]).length+(e.repo?2:0)+(e.behavior_changes||[]).length;if(s>=10)return'legendary';if(s>=7)return'epic';if(s>=4)return'rare';return'common'}

  // ─── Filter ───
  function matches(e){
    if(state.filter==='skills' && (e.skills_added||[]).length+(e.skills_removed||[]).length===0) return false;
    if(state.filter==='repo' && !e.repo) return false;
    if(state.filter==='behaviors' && (e.behavior_changes||[]).length===0) return false;
    if(state.filterVal && !(e.tags||[]).includes(state.filterVal) && ![...(e.skills_added||[]),...(e.skills_removed||[])].includes(state.filterVal)) return false;
    if(state.searchQuery){const q=state.searchQuery.toLowerCase();if(![e.title,e.summary,...(e.tags||[]),...(e.skills_added||[]),...(e.skills_removed||[])].join(' ').toLowerCase().includes(q)) return false}
    return true;
  }
  function applyFilter(type,val){state.filter=type;state.filterVal=val||null;state.searchQuery='';document.getElementById('searchInput').value='';refresh()}
  function clearFilter(){state.filter=null;state.filterVal=null;state.searchQuery='';document.getElementById('searchInput').value='';document.querySelectorAll('.dash-card').forEach(c=>c.classList.remove('active'));refresh()}

  // ─── Refresh (class toggle, no innerHTML rebuild) ───
  function refresh(){
    updateFilterBar();
    updateChartFilter();
    document.getElementById('detailPanel').style.display='none';
    state.selectedIdx=-1;
  }
  function updateFilterBar(){
    const bar=document.getElementById('filterBar'),tag=document.getElementById('filterTag');
    if(state.filter||state.filterVal||state.searchQuery){bar.style.display='flex';const parts=[];if(state.filter==='skills')parts.push('技能变迁');else if(state.filter==='repo')parts.push('关联仓库');else if(state.filter==='behaviors')parts.push('行为锚点');if(state.filterVal)parts.push(state.filterVal);if(state.searchQuery)parts.push('"'+state.searchQuery+'"');tag.textContent=parts.join(' + ')}else{bar.style.display='none'}
  }
  function updateChartFilter(){
    const dots=document.querySelectorAll('.chart-dot');
    dots.forEach(d=>{const idx=parseInt(d.dataset.idx);d.classList.toggle('dimmed',!matches(entries[idx]))});
  }

  // ─── Render Chart (SVG, one-time build) ───
  function renderChart(){
    const svg=document.getElementById('valueChart');if(!svg) return;
    const values=entries.map(calcValue);
    const maxV=Math.max(...values,3);
    const totalW=Math.max(CHART.W, entries.length*CHART.XSPACING+CHART.PAD*2);
    const chartH=CHART.H-CHART.PAD*2;
    svg.setAttribute('viewBox',`0 0 ${totalW} ${CHART.H}`);
    svg.style.width=totalW+'px';svg.style.height=CHART.H+'px';
    let html='';

    // Grid & Y labels
    const ySteps=5;
    for(let i=0;i<=ySteps;i++){
      const y=CHART.PAD+(chartH/ySteps)*i;
      const v=Math.round(maxV-(maxV/ySteps)*i);
      html+=`<line x1="${CHART.PAD}" y1="${y}" x2="${totalW-CHART.PAD}" y2="${y}" class="chart-grid-line"/>`;
      html+=`<text x="${CHART.PAD-5}" y="${y+3}" text-anchor="end" class="chart-label">${v}</text>`;
    }

    // X labels
    entries.forEach((e,i)=>{
      const x=CHART.PAD+i*CHART.XSPACING;
      html+=`<text x="${x}" y="${CHART.H-5}" text-anchor="middle" class="chart-label">${e.date.substring(5)}</text>`;
    });

    // Line path
    if(entries.length>1){
      let path='';
      entries.forEach((e,i)=>{
        const x=CHART.PAD+i*CHART.XSPACING;
        const y=CHART.PAD+chartH-(values[i]/maxV)*chartH;
        path+=(i===0?'M':'L')+`${x} ${y}`;
      });
      html+=`<path d="${path}" class="chart-line"/>`;
    }

    // Dots
    entries.forEach((e,i)=>{
      const x=CHART.PAD+i*CHART.XSPACING;
      const y=CHART.PAD+chartH-(values[i]/maxV)*chartH;
      const r=calcRarity(e);
      const colors={legendary:'#b8860b',epic:'#7c3aed',rare:'#2563eb',common:'#9a9aab'};
      html+=`<circle cx="${x}" cy="${y}" r="${CHART.R}" class="chart-dot" data-idx="${i}" data-value="${values[i]}" fill="${colors[r]}" stroke="${colors[r]}" stroke-width="1.5" opacity=".85"/>`;
    });

    svg.innerHTML=html;

    // Event delegation on SVG
    svg.addEventListener('click',e=>{
      const dot=e.target.closest('.chart-dot');
      if(!dot) return;
      const idx=parseInt(dot.dataset.idx);
      state.selectedIdx=idx;
      showDetail(idx);
      document.querySelectorAll('.chart-dot').forEach(d=>d.classList.remove('selected'));
      dot.classList.add('selected');
    });
    svg.addEventListener('mouseover',e=>{
      const dot=e.target.closest('.chart-dot');
      if(!dot) return;
      const idx=parseInt(dot.dataset.idx);
      const tip=document.getElementById('chartTooltip')||(()=>{const t=document.createElement('div');t.id='chartTooltip';t.className='chart-tooltip';document.body.appendChild(t);return t})();
      tip.textContent=entries[idx].title+' · '+dot.dataset.value+'pt';
      tip.style.opacity='1';
    });
    svg.addEventListener('mousemove',e=>{
      const tip=document.getElementById('chartTooltip');
      if(tip&&tip.style.opacity==='1'){tip.style.left=(e.clientX+12)+'px';tip.style.top=(e.clientY-28)+'px'}
    });
    svg.addEventListener('mouseout',()=>{const tip=document.getElementById('chartTooltip');if(tip)tip.style.opacity='0'});
  }

  // ─── Detail panel ───
  function showDetail(idx){
    const e=entries[idx];if(!e) return;
    const r=calcRarity(e);
    const panel=document.getElementById('detailPanel');
    const inner=document.getElementById('detailInner');
    inner.innerHTML=`
      <div class="detail-date">${e.date} · FILE-NO.${String(idx+1).padStart(3,'0')} · ${R[r]}</div>
      <div class="detail-title">${e.title}</div>
      <div class="detail-value">◆ 价值评分: ${calcValue(e)}pt</div>
      <div class="detail-summary">${e.summary}</div>
      <div class="detail-meta">
        ${(e.skills_added||[]).map(s=>`<span class="node-skill add" data-skill="${s}">+${s}</span>`).join('')}
        ${(e.skills_removed||[]).map(s=>`<span class="node-skill del" data-skill="${s}">−${s}</span>`).join('')}
        ${(e.tags||[]).map(t=>`<span class="node-tag" data-tag="${t}">${t}</span>`).join('')}
      </div>
      ${e.repo?`<div class="detail-repo"><a href="${e.repo}" target="_blank">◫ ${e.repo.split('/').pop()}</a><a href="${e.url}" class="detail-link">查看详情 →</a></div>`:`<a href="${e.url}" class="detail-link">查看详情 →</a>`}
    `;
    panel.style.display='block';
    // Event delegation for detail panel tags
    inner.querySelectorAll('.node-tag').forEach(el=>el.addEventListener('click',()=>applyFilter('tag',el.dataset.tag)));
    inner.querySelectorAll('.node-skill').forEach(el=>el.addEventListener('click',()=>applyFilter('tag',el.dataset.skill)));
    panel.scrollIntoView({behavior:'smooth',block:'nearest'});
  }

  // ─── Stats ───
  function renderStats(){
    const skills=entries.reduce((s,x)=>s+(x.skills_added||[]).length+(x.skills_removed||[]).length,0);
    const repos=entries.filter(x=>x.repo).length;
    const anchors=entries.reduce((s,x)=>s+(x.behavior_changes||[]).length,0);
    animateNum('stat-sessions',entries.length);animateNum('stat-skills',skills);animateNum('stat-repos',repos);animateNum('stat-anchors',anchors);
  }
  function animateNum(id,target){const el=document.getElementById(id);if(!el)return;let c=0;const step=Math.max(1,Math.floor(target/25));const t=setInterval(()=>{c=Math.min(c+step,target);el.textContent=c;if(c>=target)clearInterval(t)},35)}
  function renderLevel(){const n=entries.length,level=Math.floor((n-1)/5)+1,cin=n-(level-1)*5,pct=(cin/5)*100;document.getElementById('levelBadge').textContent='Lv.'+level;document.getElementById('xpBar').style.width=pct+'%';document.getElementById('xpText').textContent=cin+'/5'}

  // ─── Constellation ───
  function renderConstellation(){
    const freq={};entries.forEach(e=>(e.tags||[]).forEach(t=>{freq[t]=(freq[t]||0)+1}));
    const max=Math.max(...Object.values(freq),1);
    document.getElementById('tagConstellation').innerHTML=Object.entries(freq).sort((a,b)=>b[1]-a[1]).map(([t,f])=>{const sz=Math.ceil((f/max)*5);return`<span class="constellation-node size-${sz}${state.filterVal===t?' active':''}" data-tag="${t}">${t} ×${f}</span>`}).join('');
    document.querySelectorAll('.constellation-node').forEach(el=>el.addEventListener('click',()=>applyFilter('tag',el.dataset.tag)));
  }

  // ─── Badges ───
  function renderBadges(){
    const total=entries.length;
    const badges=[{name:'初心者',icon:'🏅',cond:total>=1},{name:'探索者',icon:'🎖️',cond:total>=5},{name:'开拓者',icon:'🏆',cond:total>=10},{name:'先驱者',icon:'👑',cond:total>=20},{name:'传奇',icon:'⭐',cond:total>=50},{name:'工具链大师',icon:'🔧',cond:entries.filter(x=>(x.skills_added||[]).length+(x.skills_removed||[]).length>0).length>=3},{name:'收藏家',icon:'📦',cond:entries.filter(x=>x.repo).length>=3},{name:'锚点守护者',icon:'⚓',cond:entries.reduce((s,x)=>s+(x.behavior_changes||[]).length,0)>=5}];
    document.getElementById('badgeWall').innerHTML=badges.map(b=>`<div class="badge-item ${b.cond?'unlocked':'locked'}" title="${b.cond?'已解锁':'未解锁'}: ${b.name}"><div class="badge-icon">${b.cond?b.icon:'⬜'}</div><div class="badge-name">${b.name}</div></div>`).join('');
  }

  // ─── Archives ───
  function renderArchives(){
    const months={};entries.forEach(e=>{const m=e.date.substring(0,7);if(!months[m])months[m]=[];months[m].push(e)});
    document.getElementById('archiveGrid').innerHTML=Object.entries(months).sort((a,b)=>b[0].localeCompare(a[0])).map(([m,items])=>`<div class="archive-month-card"><div class="archive-month-label">◫ ${m}</div>${items.map(e=>`<div class="archive-entry"><a href="${e.url}">${e.title}</a><span class="archive-entry-day">${e.date.substring(8)}</span></div>`).join('')}</div>`).join('');
  }

  // ─── Dashboard clicks (actual filtering) ───
  function initDash(){
    document.querySelectorAll('.dash-card').forEach(card=>{
      card.addEventListener('click',()=>{
        const f=card.dataset.filter;
        if(state.filter===f && f==='all'){clearFilter();return}
        document.querySelectorAll('.dash-card').forEach(c=>c.classList.remove('active'));
        if(f==='all'){clearFilter()}else{card.classList.add('active');applyFilter(f,null)}
      });
    });
  }

  // ─── Search ───
  function initSearch(){
    const inp=document.getElementById('searchInput');if(!inp)return;
    let timer;inp.addEventListener('input',()=>{clearTimeout(timer);timer=setTimeout(()=>{state.searchQuery=inp.value.trim();state.filter=null;state.filterVal=null;document.querySelectorAll('.dash-card').forEach(c=>c.classList.remove('active'));refresh()},200)});
  }

  // ─── Filter clear ───
  function initFilterClear(){const b=document.getElementById('filterClear');if(b)b.addEventListener('click',clearFilter)}

  // ─── Entry nav ───
  function renderEntryNav(){
    const path=window.location.pathname.replace(/\/$/,''),idx=entries.findIndex(e=>path===('/'+e.url).replace(/\.html$/,'')||path===('/'+e.url));if(idx===-1)return;
    const nav=document.querySelector('.entry-nav');if(!nav)return;
    const prev=idx<entries.length-1?entries[idx+1]:null,next=idx>0?entries[idx-1]:null;
    nav.innerHTML=`${prev?`<a href="../${prev.url}">← ${prev.date}</a>`:'<span></span>'}${next?`<a href="../${next.url}">${next.date} →</a>`:'<span></span>'}`;
  }

  // ═══ INIT ═══
  renderStats();renderLevel();renderChart();renderConstellation();renderBadges();renderArchives();
  initDash();initSearch();initFilterClear();
  if(document.querySelector('.entry-wrapper')) renderEntryNav();

  // ═══ Auto-scoring (exposed for skill) ═══
  window.__autoScore=function(session){
    let score=0;
    score+=(session.skills_changed||0)*2;
    score+=(session.claude_md_modified?3:0);
    score+=(session.projects_created||0)*4;
    score+=(session.key_findings||0)*3;
    score+=(session.behavior_patterns||0)*2;
    score+=(session.repos_linked||0)*1;
    return {score,threshold:5,shouldCreate:score>=5};
  };
})();
