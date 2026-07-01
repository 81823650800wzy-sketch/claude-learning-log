/**
 * 滚动动画 · 预加载器 · 导航效果
 * 手工级微交互 — 去AI模板感
 */
(function(){
  // ── 预加载器 ──
  const preloader = document.getElementById('preloader');
  if (preloader) {
    window.addEventListener('load', () => {
      setTimeout(() => {
        preloader.classList.add('hidden');
        // 页面内容淡入
        document.body.style.animation = 'bodyReveal .8s cubic-bezier(0.16,1,0.3,1) forwards';
      }, 800);
    });
  }

  // ── 导航滚动效果 ──
  const nav = document.getElementById('nav');
  if (nav) {
    window.addEventListener('scroll', () => {
      if (window.scrollY > 60) nav.classList.add('scrolled');
      else nav.classList.remove('scrolled');
    }, { passive: true });
  }

  // ── Intersection Observer — 滚动触发显示 ──
  const revealObserver = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        const el = entry.target;

        if (el.classList.contains('reveal')) {
          el.classList.add('visible');
        }
        if (el.classList.contains('reveal-stagger')) {
          el.classList.add('visible');
        }
      }
    }
  }, {
    threshold: 0.12,
    rootMargin: '0px 0px -30px 0px',
  });

  document.querySelectorAll('.reveal, .reveal-stagger').forEach(el => {
    revealObserver.observe(el);
  });
})();
