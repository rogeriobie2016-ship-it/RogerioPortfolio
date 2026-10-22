/* Rogério Bié · v2.0 · Miro round: selected-work strip under the numbers, mosaic without clicks, feed scrubbing, USA map. Every block checks its elements exist. */
(function(){
"use strict";
const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
const PT=()=>window.LANG&&LANG()==="pt";

/* ---------- selected work: move the tray from the intro to right under the numbers ---------- */
const tray=$(".intro .tray"),numbers=$(".numbers");
if(tray&&numbers){
  const lab=document.createElement("div");lab.className="tray-lab";
  const t=document.createElement("span");t.textContent=PT()?"Trabalhos selecionados":"Selected work";t.setAttribute("data-pt","Trabalhos selecionados");lab.append(t);
  tray.classList.add("tray-h","in");numbers.after(lab,tray);tray.style.display="";$$("*",tray).forEach(el=>{el.classList.remove("rv","rv-x","w");el.classList.add("in");el.style.opacity="";el.style.transform=""});
  /* keep the strip's language in sync */
  addEventListener("rb-lang",()=>{t.textContent=PT()?"Trabalhos selecionados":"Selected work"});
}

/* ---------- mosaic: no clicks, only a small highlight ---------- */
const mo=$(".mo-grid");
if(mo){mo.addEventListener("click",e=>{e.stopPropagation();e.preventDefault()},true);$$("figure",mo).forEach(f=>{f.removeAttribute("tabindex");f.removeAttribute("role");f.style.cursor="default"})}

/* ---------- feed: scrub the playhead, jump 10s ---------- */
const fmt=s=>{s=Math.max(0,s|0);return (s/60|0)+":"+("0"+(s%60)).slice(-2)};
$$(".vslide").forEach(sl=>{
  const ph=$(".vphone",sl),v=$("video",sl),bar=$(".vprog",sl),info=$(".vinfo",sl);
  if(!ph||!v||!bar)return;
  bar.setAttribute("role","slider");bar.setAttribute("tabindex","0");bar.setAttribute("aria-label",PT()?"Posição do vídeo":"Video position");
  const time=document.createElement("span");time.className="vtime";time.textContent="0:00";ph.append(time);
  const seekAt=x=>{const r=bar.getBoundingClientRect();const p=Math.min(1,Math.max(0,(x-r.left)/r.width));if(v.duration){v.currentTime=p*v.duration;$("i",bar).style.width=(p*100)+"%"}};
  let drag=false;
  bar.addEventListener("pointerdown",e=>{e.stopPropagation();drag=true;bar.classList.add("drag");bar.setPointerCapture(e.pointerId);seekAt(e.clientX)});
  bar.addEventListener("pointermove",e=>{if(drag)seekAt(e.clientX)});
  const end=e=>{if(!drag)return;drag=false;bar.classList.remove("drag")};
  bar.addEventListener("pointerup",end);bar.addEventListener("pointercancel",end);
  bar.addEventListener("click",e=>e.stopPropagation());
  bar.addEventListener("keydown",e=>{if(e.key==="ArrowRight"){e.preventDefault();e.stopPropagation();v.currentTime=Math.min(v.duration||0,v.currentTime+5)}if(e.key==="ArrowLeft"){e.preventDefault();e.stopPropagation();v.currentTime=Math.max(0,v.currentTime-5)}});
  v.addEventListener("timeupdate",()=>{time.textContent=fmt(v.currentTime)+" / "+fmt(v.duration||0)});
  if(info){
    const row=document.createElement("div");row.className="vscrub";
    const mk=(d,lab)=>{const b=document.createElement("button");b.type="button";b.innerHTML=(d<0?'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><path d="M11 19l-7-7 7-7M20 19l-7-7 7-7"/></svg>':'')+'<span>'+lab+'</span>'+(d>0?'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><path d="M13 5l7 7-7 7M4 5l7 7-7 7"/></svg>':'');
      b.setAttribute("aria-label",(d<0?(PT()?"Voltar ":"Back "):(PT()?"Avançar ":"Forward "))+Math.abs(d)+"s");
      b.addEventListener("click",e=>{e.stopPropagation();v.currentTime=Math.min(v.duration||0,Math.max(0,v.currentTime+d))});return b};
    row.append(mk(-10,"10s"),mk(10,"10s"));info.append(row);
  }
});

/* ---------- about: the USA map, drawn next to Brazil ---------- */
const br=$(".mapbox:not(.usa)");
if(br&&br.closest(".about-page, body")&&$("#map",br)){
  const box=document.createElement("div");box.className="mapbox usa";
  const pins=[["Los Angeles",9,36,"ASU California Center · 2025–",true],["Austin",40,51,"SXSW 2026 · Reality Looks Back",false],["Boca Chica",42,62,"The Sound of a Sacrifice Zone",true],["Navajo Nation",22,40,"uranium · a comparative case",false]];
  const us="M2,9 L20,7 L40,7 L58,8 L61,12 L64,10 L67,15 L69,12 L73,10 L76,8 L80,5 L84,7 L83,13 L79,17 L77,22 L75,26 L73,30 L74,34 L73,40 L71,44 L70,49 L71,54 L75,60 L73,63 L69,56 L64,51 L60,53 L55,49 L50,52 L46,52 L44,56 L42,63 L38,59 L35,52 L30,47 L24,44 L18,41 L12,40 L10,36 L7,30 L4,22 L2,14 Z";
  const tx="M38,37 L42,37 L44,41 L47,41 L50,45 L53,47 L50,52 L46,52 L44,56 L42,63 L38,59 L35,52 L34,47 L36,45 L35,41 L37,40 Z";
  const ca="M2,9 L10,10 L10,26 L15,32 L14,38 L12,40 L10,36 L7,30 L4,22 L2,14 Z";
  box.innerHTML='<svg viewBox="0 0 100 70" role="img" aria-labelledby="usmt"><title id="usmt">Map of the United States with the places of this story marked</title>'+
    '<path class="us" d="'+us+'"/><path class="us-state" d="'+tx+'"/><path class="us-state" d="'+ca+'"/>'+
    '<path class="us-route" d="M9,36 C22,44 34,52 42,62"/>'+
    pins.map(p=>'<g class="us-pin'+(p[4]?'':' alt')+'" data-tip="'+p[3]+'"><circle cx="'+p[1]+'" cy="'+p[2]+'" r="1.6"/><text x="'+(p[1]+2.6)+'" y="'+(p[2]+(p[0]==="Boca Chica"?-2.2:1.2))+'">'+p[0]+'</text></g>').join('')+
    '</svg><span class="us-cap" data-pt="Estados Unidos · 2025–">United States · 2025–</span><span class="us-coords">25.99°N · 97.15°W</span>';
  br.after(box);
  $$(".us-pin",box).forEach(p=>p.addEventListener("click",()=>{const c=box.querySelector(".us-coords");c.textContent=p.dataset.tip}));
}
})();
