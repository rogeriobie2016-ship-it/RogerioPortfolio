/* Rogério Bié · v1.8 · shared behavior for the home, work, feed and about pages. Every block checks its elements exist. */
(function(){
"use strict";
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const reduce=matchMedia("(prefers-reduced-motion: reduce)").matches;
const root=document.documentElement;
const safePlay=v=>{try{const p=v.play();p&&p.catch(()=>{})}catch(e){}};
const PT=()=>window.LANG&&LANG()==="pt";

/* top bar: the small wordmark appears once the big one (or the page head) scrolls away */
const top=$("#top"),wm=$("#wordmark");
if(top){
  if(wm)new IntersectionObserver(es=>top.classList.toggle("scrolled",!es[0].isIntersecting),{rootMargin:"-56px 0px 0px 0px"}).observe(wm);
  else top.classList.add("always");
}
/* active nav link on the home */
const navLinks=$$(".x-nav a[href^='#']");
const secs=navLinks.map(a=>document.getElementById(a.getAttribute("href").slice(1))).filter(Boolean);
if(secs.length){const navIO=new IntersectionObserver(es=>{es.forEach(e=>{if(e.isIntersecting){navLinks.forEach(a=>a.classList.toggle("on",a.getAttribute("href")==="#"+e.target.id))}})},{rootMargin:"-45% 0px -50% 0px"});secs.forEach(s=>navIO.observe(s))}

/* reel: the frame opens up to full bleed as you scroll through it */
const reel=$("#reel"),frame=$("#reelFrame"),loop=$("#reelLoop"),snd=$("#reelSound");
if(reel&&frame&&loop){
  let ticking=false;
  function onScroll(){ticking=false;const r=reel.getBoundingClientRect(),span=r.height-innerHeight;const p=reduce?1:Math.min(1,Math.max(0,(-r.top+innerHeight*.15)/(span*.75)));frame.style.setProperty("--p",p.toFixed(3))}
  addEventListener("scroll",()=>{if(!ticking){ticking=true;requestAnimationFrame(onScroll)}},{passive:true});
  addEventListener("resize",onScroll);onScroll();
  new IntersectionObserver(es=>{if(es[0].isIntersecting)safePlay(loop);else{loop.pause();if(snd&&snd.classList.contains("on"))setSound(false)}},{threshold:.15}).observe(frame);
  /* sound on the wall: unmute the loop without opening the player */
  const WALL=loop.getAttribute("src"),FULL=snd&&snd.dataset.full;
  function label(on){snd.querySelector("span").textContent=on?(PT()?"Som ligado":"Sound on"):(PT()?"Ouvir com som":"Play with sound")}
  function setSound(on){
    if(on&&FULL&&loop.getAttribute("src")!==FULL){loop.src=FULL;loop.loop=false;try{loop.currentTime=0}catch(e){}}
    loop.muted=!on;snd.classList.toggle("on",on);snd.setAttribute("aria-pressed",String(on));label(on);safePlay(loop)}
  if(snd){snd.addEventListener("click",e=>{e.stopPropagation();e.preventDefault();setSound(loop.muted)});addEventListener("rb-lang",()=>label(!loop.muted));label(false);
    loop.addEventListener("ended",()=>{if(loop.getAttribute("src")===FULL){loop.src=WALL;loop.loop=true;loop.muted=true;snd.classList.remove("on");snd.setAttribute("aria-pressed","false");label(false);safePlay(loop)}})}
}
/* reel player: a bigger screen on top of the page, not browser fullscreen */
const player=$("#player"),pv=$("#playerVideo");let lastFocus=null;
function openReel(){if(!player)return;lastFocus=document.activeElement;player.hidden=false;document.body.style.overflow="hidden";loop&&loop.pause();pv.muted=false;try{pv.currentTime=0}catch(e){}safePlay(pv);$("#playerClose").focus()}
function closeReel(){if(!player||player.hidden)return;pv.pause();player.hidden=true;document.body.style.overflow="";loop&&safePlay(loop);lastFocus&&lastFocus.focus&&lastFocus.focus({preventScroll:true})}
if(player){
  $$("[data-reel]").forEach(b=>b.addEventListener("click",e=>{e.preventDefault();e.stopPropagation();openReel()}));
  frame&&frame.addEventListener("click",openReel);
  $("#playerClose").addEventListener("click",closeReel);
  player.addEventListener("click",e=>{if(e.target===player)closeReel()});
  pv.addEventListener("ended",closeReel);
}

/* the mosaic behind the headline wakes up when it scrolls in */
const intro=$(".intro");
if(intro)new IntersectionObserver((es,io)=>{if(es[0].isIntersecting){intro.classList.add("in");io.disconnect()}},{threshold:.2}).observe(intro);

/* moving pictures: stills wake up and cycle while on screen */
const mpIO=new IntersectionObserver(es=>es.forEach(e=>{
  const el=e.target,imgs=[...el.querySelectorAll("img")];
  if(e.isIntersecting){
    el.classList.add("alive");
    if(reduce||imgs.length<2||el._t)return;
    let k=imgs.findIndex(i=>i.classList.contains("on"));if(k<0){k=0;imgs[0].classList.add("on")}
    el._t=setInterval(()=>{imgs[k].classList.remove("on");k=(k+1)%imgs.length;const n=imgs[k];n.style.animation="none";void n.offsetWidth;n.style.animation="";n.classList.add("on")},3400+Math.random()*1200);
  }else if(el._t){clearInterval(el._t);el._t=null}
}),{threshold:.3});
$$("[data-mp]").forEach(m=>mpIO.observe(m));

/* autoplay videos (feature) when in view */
$$("video[data-auto]").forEach(v=>{
  new IntersectionObserver(es=>{const on=es[0].isIntersecting;v.parentElement.classList.toggle("alive",on);if(on&&!reduce){v.preload="auto";safePlay(v)}else v.pause()},{threshold:.35}).observe(v);
});

/* numbers count up once */
const fmt=(v,dec,sep)=>sep?Math.round(v).toLocaleString("en-US"):v.toFixed(dec);
const numIO=new IntersectionObserver((es,io)=>es.forEach(e=>{if(!e.isIntersecting)return;io.unobserve(e.target);
  const b=e.target,to=+b.dataset.to,dec=+(b.dataset.dec||0),suf=b.dataset.suf||"",sep=b.dataset.sep,fin=b.dataset.fin;if(reduce){b.textContent=fin;return}const t0=performance.now();
  const step=t=>{const k=Math.min(1,(t-t0)/1800),v=to*(1-Math.pow(1-k,3));b.textContent=k<1?fmt(v,dec,sep)+suf:fin;if(k<1)requestAnimationFrame(step)};requestAnimationFrame(step);
}),{threshold:.35});
$$(".num b[data-to]").forEach(b=>{b.dataset.fin=b.textContent;if(!reduce)b.textContent=fmt(0,+(b.dataset.dec||0),b.dataset.sep)+(b.dataset.suf||"");numIO.observe(b)});

/* logos: click, it grows (V17) */
const lbox=$("#lbox");
if(lbox){
  const li=lbox.querySelector(".lbox-in");let lf=null;
  const open=l=>{lf=document.activeElement;const c=l.querySelector(".lc"),m=l.querySelector(".lm"),t=l.querySelector(".txt-big"),cap=l.querySelector("small");
    li.innerHTML=(c?`<img src="${c.src}" alt="">`:m?`<img src="${m.src}" alt="">`:`<span class="big">${t?t.textContent:""}</span>`)+`<b>${l.dataset.name||(m&&m.alt)||(t&&t.textContent)||""}</b>`+(cap?`<small>${cap.textContent}</small>`:"");
    lbox.hidden=false;document.body.style.overflow="hidden";lbox.focus()};
  const close=()=>{if(lbox.hidden)return;lbox.hidden=true;document.body.style.overflow="";lf&&lf.focus&&lf.focus({preventScroll:true})};
  
  lbox.addEventListener("click",close);
  document.addEventListener("keydown",e=>{if(e.key==="Escape")close()});
}

/* ---------- likes: double tap, or the heart ---------- */
const LK="rb-likes";let likes={};try{likes=JSON.parse(localStorage.getItem(LK)||"{}")}catch(e){}
const saveLikes=()=>{try{localStorage.setItem(LK,JSON.stringify(likes))}catch(e){}};
const heartSVG='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-7.5-4.6-9.7-9.2C.6 8.3 2.6 4.5 6.4 4.5c2.1 0 3.6 1.1 4.6 2.6 1-1.5 2.5-2.6 4.6-2.6 3.8 0 5.8 3.8 4.1 7.3C19.5 16.4 12 21 12 21z"/></svg>';
function paintLikes(id){$$(`[data-like="${id}"]`).forEach(b=>{const n=likes[id]||0;b.classList.toggle("on",n>0);b.querySelector("i").textContent=n>0?(PT()?"Curtido":"Liked"):(PT()?"Curtir":"Like")})}
function like(id,host){if(!id)return;likes[id]=1;saveLikes();paintLikes(id);
  if(host){let h=host.querySelector(".heart-pop");if(!h){h=document.createElement("span");h.className="heart-pop";h.innerHTML=heartSVG;host.appendChild(h)}h.classList.remove("go");void h.offsetWidth;h.classList.add("go")}}
function toggleLike(id){likes[id]=likes[id]?0:1;saveLikes();paintLikes(id)}
$$("[data-like]").forEach(b=>{paintLikes(b.dataset.like);b.addEventListener("click",e=>{e.stopPropagation();toggleLike(b.dataset.like)})});
/* double tap on a card or a slide */
function dbl(el,get){let t=0,x=0,y=0;
  el.addEventListener("pointerup",e=>{const now=performance.now(),near=Math.hypot(e.clientX-x,e.clientY-y)<40;x=e.clientX;y=e.clientY;
    if(now-t<320&&near){t=0;e.preventDefault();like(get(),el);el._dblHit=true;setTimeout(()=>el._dblHit=false,350)}else t=now});
  el.addEventListener("dblclick",e=>e.preventDefault());
}

/* ---------- video feed ---------- */
const shelf=$("#shelf"),cards=$$(".vcard");
const loadV=v=>{if(v&&!v.src&&v.dataset.src){v.src=v.dataset.src}};
const hover=matchMedia("(hover:hover)").matches;
if(shelf){
  cards.forEach(c=>{const v=c.querySelector("video");
    if(hover){c.addEventListener("pointerenter",()=>{if(reduce)return;loadV(v);safePlay(v)});c.addEventListener("pointerleave",()=>{v.pause()})}
    dbl(c.querySelector(".vbtn"),()=>c.dataset.id);
  });
  if(!hover&&!reduce){const io=new IntersectionObserver(es=>es.forEach(e=>{const v=e.target.querySelector("video");if(e.isIntersecting){loadV(v);safePlay(v)}else v.pause()}),{root:shelf.classList.contains("grid-shelf")?null:shelf,threshold:.85});cards.forEach(c=>io.observe(c))}
  const pa=$(".shelf-arrow.prev"),na=$(".shelf-arrow.next");
  pa&&pa.addEventListener("click",()=>shelf.scrollBy({left:-shelf.clientWidth*.8,behavior:"smooth"}));
  na&&na.addEventListener("click",()=>shelf.scrollBy({left:shelf.clientWidth*.8,behavior:"smooth"}));
  let filter="all";
  $$(".fbtn").forEach(b=>b.addEventListener("click",()=>{
    filter=b.dataset.p;$$(".fbtn").forEach(x=>x.classList.toggle("on",x===b));
    cards.forEach(c=>c.hidden=!(filter==="all"||c.dataset.p===filter));
    $$(".vslide").forEach(s=>s.hidden=!(filter==="all"||s.dataset.p===filter));
    shelf.scrollTo({left:0,behavior:"smooth"});
  }));
}
/* full-screen vertical viewer */
const viewer=$("#viewer"),stack=$("#vstack"),slides=$$(".vslide"),count=$("#vcount"),muteBtn=$("#vmute");
let muted=false,cur=-1,vFocus=null;
const visibleSlides=()=>slides.filter(s=>!s.hidden);
function setCurrent(s){
  const i=+s.dataset.i;if(i===cur)return;cur=i;
  slides.forEach(x=>{const v=x.querySelector("video");if(x!==s){v.pause()}});
  const v=s.querySelector("video");loadV(v);v.muted=muted;try{v.currentTime=0}catch(e){}safePlay(v);
  const vis=visibleSlides();count.textContent=(vis.indexOf(s)+1)+" / "+vis.length;
  const nx=vis[vis.indexOf(s)+1];if(nx){const nv=nx.querySelector("video");loadV(nv);nv.preload="auto"}
}
function openViewer(i){
  vFocus=document.activeElement;cards.forEach(c=>c.querySelector("video").pause());
  viewer.hidden=false;document.body.style.overflow="hidden";cur=-1;muted=false;muteBtn.textContent=PT()?"Mudo":"Mute";
  const s=slides[i];stack.scrollTop=s.offsetTop;requestAnimationFrame(()=>setCurrent(s));$("#vclose").focus({preventScroll:true});
}
function closeViewer(){if(!viewer||viewer.hidden)return;slides.forEach(s=>s.querySelector("video").pause());viewer.hidden=true;document.body.style.overflow="";cur=-1;vFocus&&vFocus.focus&&vFocus.focus({preventScroll:true});if(location.hash.startsWith("#v-"))history.replaceState(null,"",location.pathname)}
if(viewer){
  const vio=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting&&!viewer.hidden)setCurrent(e.target)}),{root:stack,threshold:.6});
  slides.forEach(s=>{vio.observe(s);const v=s.querySelector("video"),bar=s.querySelector(".vprog i"),ph=s.querySelector(".vphone");
    v.addEventListener("timeupdate",()=>{if(v.duration)bar.style.width=(v.currentTime/v.duration*100)+"%"});
    v.addEventListener("click",()=>{setTimeout(()=>{if(ph._dblHit)return;v.paused?safePlay(v):v.pause()},330)});
    dbl(ph,()=>s.dataset.id);
  });
  cards.forEach(c=>c.querySelector(".vbtn").addEventListener("click",()=>{setTimeout(()=>{if(c.querySelector(".vbtn")._dblHit)return;openViewer(+c.dataset.i)},330)}));
  $("#vclose").addEventListener("click",closeViewer);
  muteBtn.addEventListener("click",()=>{muted=!muted;muteBtn.textContent=muted?(PT()?"Som":"Sound on"):(PT()?"Mudo":"Mute");slides.forEach(s=>s.querySelector("video").muted=muted)});
  const step=d=>{const vis=visibleSlides(),k=vis.findIndex(s=>+s.dataset.i===cur),n=vis[Math.max(0,Math.min(vis.length-1,k+d))];n&&stack.scrollTo({top:n.offsetTop,behavior:reduce?"auto":"smooth"})};
  $("#vup").addEventListener("click",()=>step(-1));$("#vdown").addEventListener("click",()=>step(1));
  document.addEventListener("keydown",e=>{
    if(!viewer.hidden){if(e.key==="Escape")closeViewer();if(e.key==="ArrowDown"||e.key==="j"){e.preventDefault();step(1)}if(e.key==="ArrowUp"||e.key==="k"){e.preventDefault();step(-1)}if(e.key===" "){e.preventDefault();const v=slides[cur]&&slides[cur].querySelector("video");v&&(v.paused?safePlay(v):v.pause())}if(e.key==="l"){const s=slides[cur];s&&like(s.dataset.id,s.querySelector(".vphone"))}}
    else if(player&&!player.hidden&&e.key==="Escape")closeReel();
  });
  /* deep link: feed.html#v-<id> opens that video */
  const want=location.hash.startsWith("#v-")&&location.hash.slice(3);
  if(want){const s=slides.find(x=>x.dataset.id===want);if(s)setTimeout(()=>openViewer(+s.dataset.i),200)}
}else if(player){document.addEventListener("keydown",e=>{if(!player.hidden&&e.key==="Escape")closeReel()})}

/* ---------- theme ---------- */
const tb=$("#theme"),mq=matchMedia("(prefers-color-scheme: dark)");
const isDark=()=>root.dataset.theme?root.dataset.theme==="dark":mq.matches;
const label=()=>{if(tb)tb.textContent=isDark()?(PT()?"Claro":"Light"):(PT()?"Escuro":"Dark")};
try{const s=localStorage.getItem("rb-theme");if(s)root.dataset.theme=s}catch(e){}
if(tb){tb.addEventListener("click",()=>{root.dataset.theme=isDark()?"light":"dark";try{localStorage.setItem("rb-theme",root.dataset.theme)}catch(e){}label()});mq.addEventListener&&mq.addEventListener("change",label);label();addEventListener("rb-lang",label)}

/* ---------- copy email ---------- */
const cp=$("#copy"),em=$("#email");
if(cp&&em)cp.addEventListener("click",()=>{const done=()=>{cp.textContent=PT()?"Copiado":"Copied";setTimeout(()=>cp.textContent=PT()?"Copiar":"Copy",1600)};
  const sel=()=>{const r=document.createRange();r.selectNodeContents(em);const s=getSelection();s.removeAllRanges();s.addRange(r);cp.textContent=PT()?"Selecionado":"Selected"};
  try{navigator.clipboard.writeText(em.textContent.trim()).then(done,sel)}catch(e){sel()}});
addEventListener("rb-lang",()=>{$$("[data-like]").forEach(b=>paintLikes(b.dataset.like))});
})();
