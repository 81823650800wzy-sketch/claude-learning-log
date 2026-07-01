/**
 * 滚动动画 · 导航变化 · 技能条填充 · 数字递增
 */
(function(){
  const nav=document.getElementById('nav');
  const skillBars=document.querySelectorAll('.skill-bar-fill');
  let barsDone=false;

  // Intersection Observer — 元素进入视口时触发动画
  const observer=new IntersectionObserver((entries)=>{
    for(const e of entries){
      if(e.isIntersecting){
        const el=e.target;
        const delay=parseInt(el.dataset.delay)||0;
        setTimeout(()=>el.classList.add('visible'),delay);
        // 技能条
        if(el.classList.contains('skill-bars')&&!barsDone){
          barsDone=true;
          skillBars.forEach((bar,i)=>{
            setTimeout(()=>bar.classList.add('visible'),i*120);
          });
        }
      }
    }
  },{threshold:.15,rootMargin:'0px 0px -40px 0px'});

  document.querySelectorAll('[data-animate]').forEach(el=>observer.observe(el));
  // 也观察技能条容器
  const sb=document.querySelector('.skill-bars');
  if(sb)observer.observe(sb);

  // 导航栏滚动效果
  let lastScroll=0;
  window.addEventListener('scroll',()=>{
    const y=window.scrollY;
    if(y>80){nav.classList.add('scrolled')}else{nav.classList.remove('scrolled')}
    lastScroll=y;
  },{passive:true});

  // 技能条在 dark section 中需单独触发
  const darkObserver=new IntersectionObserver((entries)=>{
    for(const e of entries){
      if(e.isIntersecting&&!barsDone){
        barsDone=true;
        skillBars.forEach((bar,i)=>{
          setTimeout(()=>bar.classList.add('visible'),i*120);
        });
      }
    }
  },{threshold:.3});
  if(sb)darkObserver.observe(sb);

})();
