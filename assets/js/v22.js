/* Rogério Bié · v2.2 · the duotone photo grid behind the intro, and photos that don't fit their frame shown whole on a blurred copy (any page, including pages that render later). Every block checks its elements exist. */
(function(){
"use strict";
const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];

/* ---------- intro: a quiet grid built from the field photos ---------- */
const intro=$(".intro");
if(intro&&!$(".i22-bg",intro)){
  const srcs=[...new Set($$(".strip figure:not([aria-hidden]) img").map(i=>i.getAttribute("src")))];
  if(srcs.length){
    const cols=10,n=cols*5,bg=document.createElement("div"),g=document.createElement("div");
    bg.className="i22-bg";bg.setAttribute("aria-hidden","true");g.className="g";g.style.setProperty("--cols",cols);
    for(let i=0;i<n;i++){const s=document.createElement("span");s.style.backgroundImage=`url("${srcs[(i*7)%srcs.length]}")`;g.append(s)}
    bg.append(g);intro.prepend(bg);
  }
}

/* ---------- photos that don't fit their frame ---------- */
const SEL=".mp img,.feature-media img,.feature-stills img,.card img,.krow img,.cgi img,.case .hero img,.aside-poster img,.np-aimg img";
const fit=im=>{
  if(!im.naturalWidth||im.closest(".strip"))return;
  const b=im.getBoundingClientRect();if(b.width<40||b.height<40)return;
  const r=(im.naturalWidth/im.naturalHeight)/(b.width/b.height),bad=r<.72||r>1.8;
  if(bad===im.classList.contains("fit"))return;
  if(bad){
    const p=im.parentElement,cs=getComputedStyle(im);
    if(getComputedStyle(p).position==="static")p.style.position="relative";
    p.style.overflow="hidden";
    if(cs.position==="static"){im.style.position="relative";im.style.zIndex="1"}
    let bgEl=im.previousElementSibling;
    if(!bgEl||!bgEl.classList.contains("fit-bg")){bgEl=document.createElement("span");bgEl.className="fit-bg";bgEl.setAttribute("aria-hidden","true");im.before(bgEl)}
    bgEl.style.backgroundImage=`url("${im.currentSrc||im.src}")`;
    im.classList.add("fit");
  }else{
    im.classList.remove("fit");const s=im.previousElementSibling;if(s&&s.classList.contains("fit-bg"))s.remove();
  }
};
const watch=im=>{if(im.dataset.fit22)return;im.dataset.fit22="1";if(im.complete)fit(im);im.addEventListener("load",()=>fit(im))};
const scan=()=>$$(SEL).forEach(watch);
scan();
new MutationObserver(()=>scan()).observe(document.body,{childList:true,subtree:true});
let rt=0;addEventListener("resize",()=>{clearTimeout(rt);rt=setTimeout(()=>$$(SEL).forEach(fit),200)});
addEventListener("load",()=>$$(SEL).forEach(fit));
})();
