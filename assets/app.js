/**
 * Claude 学习日志 — 数据驱动渲染引擎
 * 读取 data/entries.json → 渲染时间线、统计、标签云、归档
 * 核心原则: 新增条目只需改 JSON，永远不碰此文件
 */

(async function() {
  const resp = await fetch('data/entries.json');
  if (!resp.ok) { console.error('Failed to load entries.json'); return; }
  const entries = await resp.json();

  // 按日期倒序（最新在前）
  entries.sort((a, b) => b.date.localeCompare(a.date));

  renderStats(entries);
  renderTimeline(entries);
  renderTagCloud(entries);
  renderArchive(entries);
})();

// ── 统计卡片 ──
function renderStats(entries) {
  const sessionCount  = entries.length;
  const skillChanges  = entries.reduce((s, e) => s + (e.skills_added||[]).length + (e.skills_removed||[]).length, 0);
  const repoCount     = entries.filter(e => e.repo).length;
  const anchorCount   = entries.reduce((s, e) => s + (e.behavior_changes||[]).length, 0);

  document.getElementById('stats').innerHTML = [
    { v: sessionCount, l: '次会话记录' },
    { v: skillChanges, l: '次技能变更' },
    { v: repoCount,    l: '个关联仓库' },
    { v: anchorCount,  l: '个行为锚点' },
  ].map(s => `<div class="stat-card">📅<span class="stat-value">${s.v}</span><span class="stat-label">${s.l}</span></div>`).join('');
}

// ── 时间线 ──
function renderTimeline(entries) {
  const html = entries.map(e => `
    <div class="timeline-item">
      <div class="timeline-date">${e.date}</div>
      <div class="timeline-title"><a href="${e.url}">${e.title}</a></div>
      <div class="timeline-summary">${e.summary}</div>
      <div class="timeline-meta">
        ${(e.skills_added||[]).map(s => `<span class="timeline-skill added">+${s}</span>`).join('')}
        ${(e.skills_removed||[]).map(s => `<span class="timeline-skill removed">−${s}</span>`).join('')}
        ${(e.tags||[]).map(t => `<span class="timeline-tag">${t}</span>`).join('')}
        ${e.repo ? `<span class="timeline-repo"><a href="${e.repo}">📦 关联仓库</a></span>` : ''}
      </div>
    </div>
  `).join('');

  document.getElementById('timeline').innerHTML = '<h2>🕐 学习时间线</h2><div class="timeline">' + html + '</div>';
}

// ── 标签云（行为锚点图） ──
function renderTagCloud(entries) {
  const freq = {};
  entries.forEach(e => (e.tags||[]).forEach(t => { freq[t] = (freq[t]||0) + 1; }));

  const maxFreq = Math.max(...Object.values(freq), 1);
  const tags = Object.entries(freq).sort((a, b) => b[1] - a[1]);

  // 将频率映射为 1–5 级
  const html = tags.map(([t, f]) => {
    const size = Math.ceil((f / maxFreq) * 5);
    return `<span class="tag-item size-${size}" title="${t}: ${f} 次">${t}</span>`;
  }).join('');

  document.getElementById('tags').innerHTML = '<h2>🔗 行为锚点图</h2><div class="tag-cloud">' + html + '</div>';
}

// ── 按月归档 ──
function renderArchive(entries) {
  const months = {};
  entries.forEach(e => {
    const m = e.date.substring(0, 7); // "2026-06"
    if (!months[m]) months[m] = [];
    months[m].push(e);
  });

  const html = Object.entries(months).sort((a, b) => b[0].localeCompare(a[0])).map(([m, items]) => `
    <div class="archive-month">
      <div class="archive-month-label">📁 ${m}</div>
      ${items.map(e => `<div class="archive-entry"><a href="${e.url}">${e.date.substring(8)}  ${e.title}</a></div>`).join('')}
    </div>
  `).join('');

  document.getElementById('archive').innerHTML = '<h2>📂 按月归档</h2><div class="archive-tree">' + html + '</div>';
}
