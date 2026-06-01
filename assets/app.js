/**
 * 十一的Claude成长节点记录 — 渲染引擎 v2
 * 粒子背景 · 伪3D卡片 · 节点时间轴 · 星座图 · 滚动动画
 */
(async function(){
  const resp = await fetch('data/entries.json');
  if(!resp.ok) return;
  const entries = await resp.json();
  entries.sort((a,b) => b.date.localeCompare(a.date));

  initParticles();
  init3DCards();
  initScrollHint();
  renderStats(entries);
  renderNodes(entries);
  renderConstellation(entries);
  renderArchives(entries);
})();

/* ═══ Particle Background ═══ */
function initParticles(){
  const canvas = document.getElementById('particles');
  if(!canvas) return;
  const ctx = canvas.getContext('2d');
  let w,h,particles=[];

  function resize(){w=canvas.width=window.innerWidth;h=canvas.height=window.innerHeight}
  resize();window.addEventListener('resize',resize);

  const count = Math.min(80, Math.floor(w * h / 15000));
  for(let i=0;i<count;i++){
    particles.push({
      x:Math.random()*w,y:Math.random()*h,
      r:Math.random()*1.5+.3,
      vx:(Math.random()-.5)*.3,vy:(Math.random()-.5)*.3,
      o:Math.random()*.5+.2
    });
  }

  function draw(){
    ctx.clearRect(0,0,w,h);
    // connection lines
    for(let i=0;i<particles.length;i++){
      for(let j=i+1;j<particles.length;j++){
        const dx=particles[i].x-particles[j].x,dy=particles[i].y-particles[j].y;
        const dist=Math.sqrt(dx*dx+dy*dy);
        if(dist<120){
          ctx.beginPath();ctx.moveTo(particles[i].x,particles[i].y);ctx.lineTo(particles[j].x,particles[j].y);
          ctx.strokeStyle=`rgba(99,102,241,${.04*(1-dist/120)})`;ctx.lineWidth=.5;ctx.stroke();
        }
      }
    }
    // particles
    for(const p of particles){
      ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);
      ctx.fillStyle=`rgba(200,200,240,${p.o})`;ctx.fill();
      p.x+=p.vx;p.y+=p.vy;
      if(p.x<0)p.x=w;if(p.x>w)p.x=0;if(p.y<0)p.y=h;if(p.y>h)p.y=0;
    }
    requestAnimationFrame(draw);
  }
  draw();
}

/* ═══ 3D Tilt Effect ═══ */
function init3DCards(){
  document.querySelectorAll('[data-3d]').forEach(card=>{
    card.addEventListener('mousemove',e=>{
      const rect=card.getBoundingClientRect();
      const x=(e.clientX-rect.left)/rect.width-.5;
      const y=(e.clientY-rect.top)/rect.height-.5;
      card.style.setProperty('--mx',`${(e.clientX-rect.left)/rect.width*100}%`);
      card.style.setProperty('--my',`${(e.clientY-rect.top)/rect.height*100}%`);
      card.style.transform=`perspective(800px) rotateY(${x*8}deg) rotateX(${-y*8}deg) translateY(-4px)`;
    });
    card.addEventListener('mouseleave',()=>{card.style.transform=''});
  });
}

/* ═══ Scroll Hint ═══ */
function initScrollHint(){
  const hint=document.getElementById('scrollHint');
  if(!hint) return;
  hint.addEventListener('click',()=>{
    document.getElementById('dashboard').scrollIntoView({behavior:'smooth'});
  });
}

/* ═══ Stats ═══ */
function renderStats(entries){
  const skills=entries.reduce((s,e)=>s+(e.skills_added||[]).length+(e.skills_removed||[]).length,0);
  const repos=entries.filter(e=>e.repo).length;
  const anchors=entries.reduce((s,e)=>s+(e.behavior_changes||[]).length,0);
  animateNum('stat-sessions',entries.length);
  animateNum('stat-skills',skills);
  animateNum('stat-repos',repos);
  animateNum('stat-anchors',anchors);
}
function animateNum(id,target){
  const el=document.getElementById(id);if(!el) return;
  let cur=0;const step=Math.max(1,Math.floor(target/30));
  const t=setInterval(()=>{cur=Math.min(cur+step,target);el.textContent=cur;if(cur>=target)clearInterval(t)},40);
}

/* ═══ Node Timeline ═══ */
function renderNodes(entries){
  const container=document.getElementById('nodeTimeline');
  const html = entries.map((e,i)=>(`
    <div class="node-item" style="animation-delay:${i*0.1}s">
      <div class="node-dot"></div>
      <div class="node-card glass" data-3d>
        <div class="node-date">${e.date}</div>
        <div class="node-title"><a href="${e.url}">${e.title}</a></div>
        <div class="node-summary">${e.summary}</div>
        <div class="node-tags">
          ${(e.skills_added||[]).map(s=>`<span class="node-skill add">+${s}</span>`).join('')}
          ${(e.skills_removed||[]).map(s=>`<span class="node-skill del">−${s}</span>`).join('')}
          ${(e.tags||[]).map(t=>`<span class="node-tag">${t}</span>`).join('')}
        </div>
        ${e.repo?`<div class="node-repo"><a href="${e.repo}">📦 ${e.repo.split('/').pop()}</a></div>`:''}
      </div>
    </div>
  `)).join('');
  container.innerHTML = html;
  // re-init 3D for newly created cards
  setTimeout(init3DCards, 100);
  // intersection observer for scroll animation
  const observer = new IntersectionObserver((entries)=>{
    entries.forEach(en=>{if(en.isIntersecting){en.target.style.animationPlayState='running';observer.unobserve(en.target)}});
  },{threshold:.15});
  container.querySelectorAll('.node-item').forEach(el=>{el.style.animationPlayState='paused';observer.observe(el)});
}

/* ═══ Constellation ═══ */
function renderConstellation(entries){
  const freq={};
  entries.forEach(e=>(e.tags||[]).forEach(t=>{freq[t]=(freq[t]||0)+1}));
  const max=Math.max(...Object.values(freq),1);
  const tags=Object.entries(freq).sort((a,b)=>b[1]-a[1]);
  const html=tags.map(([t,f])=>{
    const size=Math.ceil((f/max)*5);
    return `<span class="constellation-node size-${size}" data-count="${f}">${t}</span>`;
  }).join('');
  document.getElementById('tagConstellation').innerHTML=html;
}

/* ═══ Archives ═══ */
function renderArchives(entries){
  const months={};
  entries.forEach(e=>{
    const m=e.date.substring(0,7);
    if(!months[m]) months[m]=[];
    months[m].push(e);
  });
  const html=Object.entries(months).sort((a,b)=>b[0].localeCompare(a[0])).map(([m,items])=>`
    <div class="archive-month-card glass" data-3d>
      <div class="archive-month-label">📁 ${m}</div>
      ${items.map(e=>`<div class="archive-entry"><a href="${e.url}">${e.title}</a><span class="archive-entry-day">${e.date.substring(8)}</span></div>`).join('')}
    </div>
  `).join('');
  document.getElementById('archiveGrid').innerHTML=html;
  setTimeout(init3DCards,100);
}
