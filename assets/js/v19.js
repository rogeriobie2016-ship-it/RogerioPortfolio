/* Rogério Bié · v1.9 · reveal on scroll, living mosaic, strip with arrows, photo lightbox, logo pop, responsive map. Every block checks its elements exist. */
(function(){
"use strict";
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const reduce=matchMedia("(prefers-reduced-motion: reduce)").matches;
const PT=()=>window.LANG&&LANG()==="pt";

/* ---------- reveal on scroll: things come up as you scroll down ---------- */
const RV=[".shead",".feature",".g-sel>div",".g-more>.card",".voice",".also",".logos",".imp",".agenda",".pcard",".press-list li",".door",".band-head",".band .card",".step",".timeline .tl",".roombox",".press-cta",".ab-next",".jump",".np-art",".np-box",".np-graphics",".np-vid",".np-year"];
const rvIO=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add("in");rvIO.unobserve(e.target)}}),{rootMargin:"0px 0px -8% 0px",threshold:.08});
function arm(root){
  (root||document).querySelectorAll(RV.join(",")).forEach(el=>{if(el.classList.contains("rv"))return;
    const sib=[...el.parentElement.children].filter(x=>x.matches(RV.join(",")));el.style.setProperty("--d",Math.min(6,sib.indexOf(el)%6));
    el.classList.add("rv");rvIO.observe(el)});
}
arm();
/* tray: selected work slides in from the side, one by one */
$$(".tray li").forEach((li,i)=>{li.classList.add("rv-x");li.style.setProperty("--d",i)});

/* headline: words pop up one by one */
function words(h){
  if(!h)return;
  const walk=n=>{[...n.childNodes].forEach(c=>{
    if(c.nodeType===3){if(!c.textContent.trim())return;const f=document.createDocumentFragment();c.textContent.split(/(\s+)/).forEach(t=>{if(!t)return;if(/^\s+$/.test(t)){f.append(t);return}const s=document.createElement("span");s.className="w";s.textContent=t;f.append(s)});c.replaceWith(f)}
    else if(c.nodeType===1&&!c.classList.contains("w")){if(c.tagName==="MARK"){c.classList.add("w")}else walk(c)}
  })};
  walk(h);h.querySelectorAll(".w").forEach((w,i)=>w.style.setProperty("--w",i));
}
const hl=$(".intro h2.display");
if(hl&&!reduce){words(hl);const io=new IntersectionObserver((es,o)=>{if(es[0].isIntersecting){hl.classList.add("in");o.disconnect()}},{threshold:.3});io.observe(hl);
  addEventListener("rb-lang",()=>{words(hl);requestAnimationFrame(()=>hl.classList.add("in"))})}
const intro=$(".intro");
if(intro)new IntersectionObserver((es,o)=>{if(es[0].isIntersecting){intro.classList.add("in");o.disconnect()}},{threshold:.15}).observe(intro);

/* ---------- photo lightbox ---------- */
let plb=null,group=[],gi=0,pf=null;
function ensure(){if(plb)return;plb=document.createElement("div");plb.className="plb";plb.hidden=true;plb.setAttribute("role","dialog");plb.setAttribute("aria-modal","true");
  plb.innerHTML='<img alt=""><span class="plb-cap"></span><button type="button" class="x" aria-label="Close">✕</button><button type="button" class="p" aria-label="Previous">←</button><button type="button" class="n" aria-label="Next">→</button>';
  document.body.append(plb);
  plb.addEventListener("click",e=>{if(e.target===plb||e.target.classList.contains("x"))close();else if(e.target.classList.contains("p"))show(gi-1);else if(e.target.classList.contains("n"))show(gi+1)});
  document.addEventListener("keydown",e=>{if(plb.hidden)return;if(e.key==="Escape")close();if(e.key==="ArrowLeft")show(gi-1);if(e.key==="ArrowRight")show(gi+1)});
  let x0=null;plb.addEventListener("touchstart",e=>{x0=e.touches[0].clientX},{passive:true});plb.addEventListener("touchend",e=>{if(x0==null)return;const dx=e.changedTouches[0].clientX-x0;if(Math.abs(dx)>50)show(gi+(dx<0?1:-1));x0=null});
}
function show(i){gi=(i+group.length)%group.length;const it=group[gi],im=plb.querySelector("img");im.src=it.src;im.alt=it.cap||"";plb.querySelector(".plb-cap").textContent=it.cap||"";
  plb.querySelector(".p").hidden=plb.querySelector(".n").hidden=group.length<2}
function openLB(items,i){ensure();group=items;pf=document.activeElement;plb.hidden=false;document.documentElement.classList.add("x-lock");show(i);plb.querySelector(".x").focus({preventScroll:true})}
function close(){if(!plb||plb.hidden)return;plb.hidden=true;document.documentElement.classList.remove("x-lock");pf&&pf.focus&&pf.focus({preventScroll:true})}
window.RBLightbox=openLB;
const capOf=f=>{const c=f.querySelector("figcaption");const im=f.querySelector("img:not(.nx)")||f.querySelector("img");return (c&&c.textContent.trim())||(im&&(im.alt||im.dataset.cap))||""};
function bindFigs(sel){const figs=$$(sel);figs.forEach((f,i)=>{f.tabIndex=0;f.setAttribute("role","button");
  const go=()=>{const list=figs.filter(x=>!x.closest("[aria-hidden='true']")||x===f).filter((x,k,a)=>a.findIndex(y=>(y.querySelector("img")||{}).src===(x.querySelector("img")||{}).src)===k);
    const items=list.map(x=>{const im=x.querySelector("img:not(.nx)")||x.querySelector("img");return {src:im.currentSrc||im.src,cap:capOf(x)}});
    const cur=(f.querySelector("img:not(.nx)")||f.querySelector("img"));openLB(items,Math.max(0,items.findIndex(it=>it.src===(cur.currentSrc||cur.src))))};
  f.addEventListener("click",e=>{if(f.closest(".strip-scroll")&&f.closest(".strip-scroll")._moved)return;go()});f.addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();go()}})})}
bindFigs(".photos figure");

/* ---------- mosaic: slowly moving, many photos, clickable ---------- */
const mo=$(".mo-grid");
if(mo){
  const POOL=(mo.dataset.pool||"").split(",").filter(Boolean);
  const figs=[...mo.querySelectorAll("figure")];
  figs.forEach(f=>{const a=f.querySelector("img");a.classList.add("kb");a.style.animationDelay=(-Math.random()*16).toFixed(1)+"s";const b=a.cloneNode();b.classList.add("nx");b.removeAttribute("src");f.append(b)});
  let k=0;const used=new Set(figs.map(f=>f.querySelector("img").getAttribute("src")));
  if(POOL.length&&!reduce)setInterval(()=>{if(document.hidden||!intro||!intro.classList.contains("in"))return;
    const f=figs[Math.floor(Math.random()*figs.length)];const cur=f.querySelector("img:not(.nx)"),nx=f.querySelector("img.nx");
    let src;for(let t=0;t<12;t++){src=POOL[(k++)%POOL.length];if(!used.has(src))break}
    const pre=new Image();pre.onload=()=>{used.delete(cur.getAttribute("src"));used.add(src);nx.src=src;nx.alt="";nx.classList.add("kb");requestAnimationFrame(()=>{nx.classList.remove("nx");cur.classList.add("nx")});};pre.src=src},2300);
  figs.forEach(f=>{f.tabIndex=-1;f.addEventListener("click",()=>{const items=figs.map(x=>{const im=x.querySelector("img:not(.nx)");return {src:im.src,cap:""}});openLB(items,figs.indexOf(f))})});
  mo.removeAttribute("aria-hidden");
}

/* ---------- strip: drifts on its own, arrows and a real scrollbar ---------- */
const sc=$(".strip-scroll");
if(sc){
  const track=sc.querySelector(".strip-track");let paused=false,resumeT=0,half=0,acc=0;
  const measure=()=>{half=track.scrollWidth/2};measure();addEventListener("resize",measure);
  const hold=ms=>{paused=true;clearTimeout(resumeT);resumeT=setTimeout(()=>paused=false,ms||3500)};
  if(!reduce){const tick=()=>{if(!paused&&!document.hidden){acc+=.45;if(acc>=1){const n=Math.floor(acc);acc-=n;sc.scrollLeft+=n;if(half&&sc.scrollLeft>=half)sc.scrollLeft-=half}}requestAnimationFrame(tick)};requestAnimationFrame(tick)}
  sc.addEventListener("pointerenter",()=>{paused=true;clearTimeout(resumeT)});sc.addEventListener("pointerleave",()=>hold(1500));
  sc.addEventListener("touchstart",()=>hold(4000),{passive:true});sc.addEventListener("wheel",()=>hold(3000),{passive:true});
  /* drag with the mouse */
  let dx=null,sl=0;sc.addEventListener("pointerdown",e=>{if(e.pointerType!=="mouse")return;dx=e.clientX;sl=sc.scrollLeft;sc._moved=false});
  addEventListener("pointermove",e=>{if(dx==null)return;const d=e.clientX-dx;if(Math.abs(d)>4){sc._moved=true;sc.classList.add("drag")}sc.scrollLeft=sl-d});
  addEventListener("pointerup",()=>{if(dx==null)return;dx=null;sc.classList.remove("drag");setTimeout(()=>sc._moved=false,30)});
  const step=d=>{hold(4500);let t=sc.scrollLeft+d*sc.clientWidth*.75;if(t<0)t+=half;sc.scrollTo({left:t,behavior:reduce?"auto":"smooth"})};
  const pa=$(".strip-arrow.prev"),na=$(".strip-arrow.next");pa&&pa.addEventListener("click",()=>step(-1));na&&na.addEventListener("click",()=>step(1));
  bindFigs(".strip figure");
}

/* ---------- logos: colored, a small jump when clicked (no pop-up) ---------- */
$$(".logo").forEach(l=>{const go=()=>{l.classList.remove("pop");void l.offsetWidth;l.classList.add("pop");clearTimeout(l._t);l._t=setTimeout(()=>l.classList.remove("pop"),1600)};
  l.addEventListener("click",go);l.addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();go()}})});

/* ---------- about map: glows and answers clicks ---------- */
const map=$("#map");
if(map){
  const box=map.closest(".mapbox");
  map.addEventListener("click",e=>{
    const pin=e.target.closest(".pin"),uf=e.target.closest(".uf");
    box.classList.remove("ping");void box.offsetWidth;box.classList.add("ping");
    if(pin){pin.classList.remove("flash");void pin.offsetWidth;pin.classList.add("flash");const st=$$(".step").find(s=>(s.dataset.pin||"").split(",").includes(pin.dataset.k));st&&st.scrollIntoView({behavior:reduce?"auto":"smooth",block:"center"});return}
    if(uf){uf.classList.add("glow");setTimeout(()=>uf.classList.remove("glow"),1200);if(uf.classList.contains("ce")){const st=$$(".step")[0];st&&st.scrollIntoView({behavior:reduce?"auto":"smooth",block:"center"})}}
  });
}
})();
