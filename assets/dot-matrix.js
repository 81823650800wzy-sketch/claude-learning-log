/**
 * 动态点阵伪3D背景 v2
 * 透视投影 · 鼠标视差 · 邻近连线 · 点击涟漪 · 光标尾迹
 */
(function(){
  const C={
    count:180, connectDist:110, mouseForce:.018, baseSpeed:.1,
    perspective:550, depthRange:450, minR:.6, maxR:2.8,
    lineAlpha:.07, dotAlpha:.5, accentRatio:.1, rippleForce:30,
  };
  const canvas=document.getElementById('dotMatrix');
  const ctx=canvas.getContext('2d');
  const accent=R=>`rgba(240,131,58,${R})`;
  let W,H,cx,cy,mx=.5,my=.5,tmx=.5,tmy=.5;
  let particles=[],ripples=[];

  function rnd(a,b){return a+Math.random()*(b-a)}
  function P(){
    return{x:rnd(-W*.85,W*.85),y:rnd(-H*.85,H*.85),z:rnd(-C.depthRange,C.depthRange),
      vx:rnd(-.25,.25),vy:rnd(-.25,.25),vz:rnd(-.12,.12),
      rad:rnd(C.minR,C.maxR),accent:Math.random()<C.accentRatio};
  }

  function init(){particles=[];for(let i=C.count;i--;)particles.push(P());}

  function proj(x,y,z){
    const s=C.perspective/(C.perspective+z);
    return{sx:cx+x*s,sy:cy+y*s,s:s};
  }

  function track(){
    for(const p of particles){
      const px=(tmx-.5)*C.mouseForce*(p.z+C.depthRange);
      const py=(tmy-.5)*C.mouseForce*(p.z+C.depthRange);
      p.x+=p.vx*C.baseSpeed+px*.35;p.y+=p.vy*C.baseSpeed+py*.35;p.z+=p.vz*C.baseSpeed;
      if(Math.abs(p.z)>C.depthRange){p.vz*=-1;p.z=Math.sign(p.z)*C.depthRange;}
      const m=W*.55;if(Math.abs(p.x)>m){p.vx*=-1;p.x=Math.sign(p.x)*m;}
      if(Math.abs(p.y)>m){p.vy*=-1;p.y=Math.sign(p.y)*m;}
      p.vx+=rnd(-.015,.015);p.vy+=rnd(-.015,.015);
      p.vx*=.9995;p.vy*=.9995;
    }
    // 涟漪衰减
    for(let i=ripples.length-1;i>=0;i--){
      ripples[i].life-=.008;
      if(ripples[i].life<=0)ripples.splice(i,1);
    }
  }

  function draw(){
    ctx.clearRect(0,0,W,H);
    mx+=(tmx-mx)*.06;my+=(tmy-my)*.06;

    const projs=particles.map(p=>{
      const pp=proj(p.x+(mx-.5)*70,p.y+(my-.5)*70,p.z);
      // 涟漪偏移
      let rx=0,ry=0;
      for(const r of ripples){
        const dx=pp.sx-r.x,dy=pp.sy-r.y,dist=Math.sqrt(dx*dx+dy*dy);
        if(dist<r.radius&&dist>0){const f=(1-dist/r.radius)*r.life*C.rippleForce;rx+=(dx/dist)*f;ry+=(dy/dist)*f;}
      }
      pp.sx+=rx;pp.sy+=ry;
      return{...pp,particle:p};
    }).sort((a,b)=>b.s-a.s);

    // 连线
    for(let i=0;i<projs.length;i++){
      for(let j=i+1;j<projs.length;j++){
        const a=projs[i],b=projs[j];
        const dx=a.sx-b.sx,dy=a.sy-b.sy,dist=Math.sqrt(dx*dx+dy*dy);
        if(dist<C.connectDist){
          const alpha=(1-dist/C.connectDist)*C.lineAlpha*a.s*b.s;
          const accentLine=a.particle.accent||b.particle.accent;
          ctx.beginPath();ctx.moveTo(a.sx,a.sy);ctx.lineTo(b.sx,b.sy);
          ctx.strokeStyle=accentLine?accent(alpha*2.8):`rgba(120,130,150,${alpha})`;
          ctx.lineWidth=accentLine?.35:.25;ctx.stroke();
        }
      }
    }

    // 粒子
    for(const it of projs){
      const p=it.particle,alpha=C.dotAlpha*it.s,r=p.rad*it.s;
      ctx.beginPath();ctx.arc(it.sx,it.sy,r,0,Math.PI*2);
      if(p.accent){
        ctx.fillStyle=accent(alpha*1.8);
        ctx.shadowColor=accent(.5);ctx.shadowBlur=r*4;
      }else{
        const g=Math.floor(70+it.s*90);
        ctx.fillStyle=`rgba(${g},${g},${g+30},${alpha})`;
        ctx.shadowColor='transparent';ctx.shadowBlur=0;
      }
      ctx.fill();ctx.shadowBlur=0;
    }
  }

  function loop(){track();draw();requestAnimationFrame(loop);}

  function onMouse(e){tmx=e.clientX/W;tmy=e.clientY/H;
    const glow=document.getElementById('cursorGlow');if(glow){glow.style.left=e.clientX+'px';glow.style.top=e.clientY+'px';glow.style.opacity='1';}
  }
  function onTouch(e){if(e.touches.length){tmx=e.touches[0].clientX/W;tmy=e.touches[0].clientY/H;}}
  function onClick(e){
    ripples.push({x:e.clientX,y:e.clientY,radius:rnd(120,220),life:1});
    if(ripples.length>5)ripples.shift();
    const glow=document.getElementById('cursorGlow');if(glow){glow.style.opacity='1';glow.style.width='500px';glow.style.height='500px';setTimeout(()=>{glow.style.width='360px';glow.style.height='360px'},300);}
  }
  function onLeave(){const glow=document.getElementById('cursorGlow');if(glow)glow.style.opacity='0';}

  function resize(){W=canvas.width=window.innerWidth;H=canvas.height=window.innerHeight;cx=W/2;cy=H/2;for(const p of particles){p.x=rnd(-W*.85,W*.85);p.y=rnd(-H*.85,H*.85);}}

  window.addEventListener('mousemove',onMouse,{passive:true});
  window.addEventListener('touchmove',onTouch,{passive:true});
  window.addEventListener('click',onClick);
  window.addEventListener('mouseleave',onLeave);
  window.addEventListener('resize',resize);
  resize();init();loop();
})();
