/* Rogério Bié · v2.1 · Miro round, Oct 24: the field photos become cards that drift sideways; click one to stop and read it, click it again to see the photo big. Every block checks its elements exist. */
(function(){
"use strict";
const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
const PT=()=>window.LANG&&LANG()==="pt";
const reduce=matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ---------- strip: take over from v1.9 (clone drops its listeners) ---------- */
const old=$(".strip");
if(old){
  const strip=old.cloneNode(true);old.replaceWith(strip);
  const sc=$(".strip-scroll",strip),track=$(".strip-track",strip),figs=$$("figure",strip);
  let half=0,acc=0,hoverP=false,on=null,resumeT=0,holdP=false;
  const measure=()=>{half=track.scrollWidth/2};measure();addEventListener("resize",measure);addEventListener("load",measure);$$("img",track).forEach(i=>i.addEventListener("load",measure));
  const hold=ms=>{holdP=true;clearTimeout(resumeT);resumeT=setTimeout(()=>holdP=false,ms||3500)};
  if(!reduce){const tick=()=>{if(!hoverP&&!holdP&&!on&&!document.hidden){acc+=.55;if(acc>=1){const n=Math.floor(acc);acc-=n;sc.scrollLeft+=n;if(half&&sc.scrollLeft>=half)sc.scrollLeft-=half}}requestAnimationFrame(tick)};requestAnimationFrame(tick)}
  sc.addEventListener("pointerenter",e=>{if(e.pointerType==="mouse")hoverP=true});sc.addEventListener("pointerleave",()=>{hoverP=false;hold(1200)});
  sc.addEventListener("touchstart",()=>hold(4000),{passive:true});sc.addEventListener("wheel",()=>hold(3000),{passive:true});

  /* drag with the mouse */
  let dx=null,sl=0,moved=false;
  sc.addEventListener("pointerdown",e=>{if(e.pointerType!=="mouse")return;dx=e.clientX;sl=sc.scrollLeft;moved=false});
  addEventListener("pointermove",e=>{if(dx==null)return;const d=e.clientX-dx;if(Math.abs(d)>4){moved=true;sc.classList.add("drag")}sc.scrollLeft=sl-d});
  addEventListener("pointerup",()=>{if(dx==null)return;dx=null;sc.classList.remove("drag");setTimeout(()=>moved=false,30)});

  const step=d=>{hold(4500);let t=sc.scrollLeft+d*sc.clientWidth*.75;if(t<0)t+=half;sc.scrollTo({left:t,behavior:reduce?"auto":"smooth"})};
  const pa=$(".strip-arrow.prev",strip),na=$(".strip-arrow.next",strip);pa&&pa.addEventListener("click",()=>step(-1));na&&na.addEventListener("click",()=>step(1));

  /* a card: first click stops the strip and opens it, second click shows the photo big */
  const hintTxt=()=>PT()?"Pausado · clique para ampliar":"Paused · click to enlarge";
  figs.forEach(f=>{const h=document.createElement("span");h.className="strip-hint";h.setAttribute("aria-hidden","true");h.textContent=hintTxt();f.append(h)});
  addEventListener("rb-lang",()=>$$(".strip-hint",strip).forEach(h=>h.textContent=hintTxt()));
  const capOf=f=>{const c=$("figcaption",f);return c?c.textContent.trim():""};
  const setOn=f=>{if(on)on.classList.remove("is-on");on=f;if(f)f.classList.add("is-on");strip.classList.toggle("has-on",!!f);if(!f)hold(1500)};
  const big=f=>{if(!window.RBLightbox)return;const seen=new Set(),items=[];
    figs.forEach(x=>{const im=$("img",x);const src=im.currentSrc||im.src;if(seen.has(src))return;seen.add(src);items.push({src,cap:capOf(x)})});
    const im=$("img",f);RBLightbox(items,Math.max(0,items.findIndex(it=>it.src===(im.currentSrc||im.src))))};
  const act=f=>{if(on===f)big(f);else setOn(f)};
  figs.forEach(f=>{
    if(f.getAttribute("aria-hidden")!=="true"){f.tabIndex=0;f.setAttribute("role","button")}
    f.addEventListener("click",e=>{if(moved)return;e.stopPropagation();act(f)});
    f.addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();act(f)}if(e.key==="Escape")setOn(null)});
  });
  document.addEventListener("click",e=>{if(on&&!e.target.closest(".strip figure")&&!e.target.closest(".plb"))setOn(null)});
  document.addEventListener("keydown",e=>{if(e.key==="Escape"&&on&&!$(".plb:not([hidden])"))setOn(null)});
}
})();
