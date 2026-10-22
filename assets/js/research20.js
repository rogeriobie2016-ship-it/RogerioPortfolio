/* Rogério Bié · v2.0 · research.html: tabs, map tips, the attention slider, filters, lazy YouTube. Every block checks its elements exist. */
(function(){
"use strict";
const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
const PT=()=>window.LANG&&LANG()==="pt";
const reduce=matchMedia("(prefers-reduced-motion: reduce)").matches;
document.documentElement.classList.add("js");

/* reveal */
if("IntersectionObserver" in window){const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add("in");io.unobserve(e.target)}}),{rootMargin:"0px 0px -8% 0px"});$$(".rs .rv").forEach(el=>io.observe(el))}else $$(".rs .rv").forEach(el=>el.classList.add("in"));

/* three faces: tabs */
const tabs=$$(".rs-tabs [role=tab]"),faces=$$(".rs-face");
tabs.forEach(t=>t.addEventListener("click",()=>{tabs.forEach(x=>x.setAttribute("aria-selected",String(x===t)));faces.forEach(f=>f.classList.toggle("on",f.dataset.k===t.dataset.k))}));
const tl=$(".rs-tabs");if(tl)tl.addEventListener("keydown",e=>{const i=tabs.findIndex(t=>t.getAttribute("aria-selected")==="true");if(e.key==="ArrowRight"){tabs[(i+1)%tabs.length].click();tabs[(i+1)%tabs.length].focus()}if(e.key==="ArrowLeft"){tabs[(i-1+tabs.length)%tabs.length].click();tabs[(i-1+tabs.length)%tabs.length].focus()}});

/* map pins */
const tip=$("#rsMapTip");
$$(".rs-pin").forEach(p=>{const on=()=>{$$(".rs-pin").forEach(x=>x.classList.toggle("on",x===p));if(tip)tip.textContent=p.dataset.tip};p.addEventListener("click",on);p.addEventListener("mouseenter",on);p.setAttribute("tabindex","0");p.addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();on()}})});

/* the attention slider: two waves, one mix */
const att=$("#rsAtt"),wr=$("#wRocket"),wv=$("#wVoice");
if(att&&wr&&wv){
  let t=0;const N=120;
  const wave=(amp,f1,f2,ph,jag)=>{let d="M0,60";for(let i=0;i<=N;i++){const x=i/N*600;const y=60+amp*(Math.sin(i*f1+ph)*0.6+Math.sin(i*f2+ph*1.7)*0.4)+(jag?(Math.random()-.5)*amp*0.5:0);d+=" L"+x.toFixed(1)+","+y.toFixed(1)}return d};
  const draw=()=>{const a=att.value/100;const rocket=1-a*0.85,voice=0.12+a*0.88;
    wr.setAttribute("d",wave(52*rocket,0.9,0.37,t,true));wv.setAttribute("d",wave(46*voice,0.25,0.11,t*0.6,false));
    wr.style.opacity=(0.35+rocket*0.65).toFixed(2);wv.style.opacity=(0.3+voice*0.7).toFixed(2);wr.style.strokeWidth=(1+rocket*2).toFixed(1);wv.style.strokeWidth=(1+voice*2).toFixed(1)};
  att.addEventListener("input",draw);draw();
  if(!reduce){let vis=true;if("IntersectionObserver" in window){new IntersectionObserver(es=>{vis=es[0].isIntersecting},{threshold:.1}).observe(att.closest(".rs-mix"))}
    setInterval(()=>{if(vis){t+=0.18;draw()}},120)}
}

/* filters (framework, timeline, works) */
function wire(fid,sel){const f=$(fid);if(!f)return;f.addEventListener("click",e=>{const b=e.target.closest("button");if(!b)return;$$("button",f).forEach(x=>x.classList.toggle("on",x===b));$$(sel).forEach(c=>c.classList.toggle("hide",b.dataset.f!=="all"&&c.dataset.f!==b.dataset.f))})}
wire("#rsStrands",".rs-ref");wire("#rsEras",".rs-tli");wire("#rsWorks",".rs-work");

/* YouTube on click */
$$(".rs-yt").forEach(y=>{const b=$("button",y);if(!b)return;b.addEventListener("click",()=>{const f=document.createElement("iframe");f.src="https://www.youtube-nocookie.com/embed/"+y.dataset.id+"?autoplay=1&rel=0&modestbranding=1";f.title="Out of the Ashes";f.allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; fullscreen";f.allowFullscreen=true;y.innerHTML="";y.append(f)})});

/* Scaniverse: if the embed is refused, show the link instead */
$$(".rs-embed iframe").forEach(f=>{const cap=f.nextElementSibling;setTimeout(()=>{try{if(f.contentDocument&&f.contentDocument.body&&!f.contentDocument.body.children.length)f.style.display="none"}catch(e){}},6000)});
})();
