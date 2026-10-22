/* Rogério Bié · v2.0 · The Rogério News: date, scrollytelling, charts, reels, archive filters. Every block checks its elements exist. */
(function(){
"use strict";
const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
const PT=()=>window.LANG&&LANG()==="pt";
const reduce=matchMedia("(prefers-reduced-motion: reduce)").matches;
document.documentElement.classList.add("js");

/* ---------- date ---------- */
const dt=$("#npDate");
const setDate=()=>{if(dt)dt.textContent=new Date().toLocaleDateString(PT()?"pt-BR":"en-US",{weekday:"long",year:"numeric",month:"long",day:"numeric"})};
setDate();addEventListener("rb-lang",setDate);

/* ---------- reveal ---------- */
if("IntersectionObserver" in window){
  const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add("in");io.unobserve(e.target)}}),{rootMargin:"0px 0px -8% 0px"});
  $$(".np20 .rv").forEach(el=>io.observe(el));
}else $$(".np20 .rv").forEach(el=>el.classList.add("in"));

/* ---------- scrollytelling ---------- */
const steps=$$(".np-step"),frames=$$(".np-frames img"),year=$("#npYear"),cap=$("#npCap");
if(steps.length&&frames.length){
  const caps=[["Youth Ambassadors, 2018","Jovens Embaixadores, 2018"],["Santa Quitéria, Ceará","Santa Quitéria, Ceará"],["Cadastra Eu!, Fortaleza","Cadastra Eu!, Fortaleza"],["Expocom Northeast 2023","Expocom Nordeste 2023"],["Cumbe Quilombo, Aracati","Quilombo do Cumbe, Aracati"],["Venice Immersive 2026","Venice Immersive 2026"]];
  const go=i=>{steps.forEach(s=>s.classList.toggle("is-active",+s.dataset.i===i));frames.forEach(f=>f.classList.toggle("on",+f.dataset.i===i));if(year)year.textContent=steps[i].dataset.year;if(cap)cap.textContent=(caps[i]||["",""])[PT()?1:0]};
  const so=new IntersectionObserver(es=>{es.forEach(e=>{if(e.isIntersecting)go(+e.target.dataset.i)})},{rootMargin:"-45% 0px -45% 0px",threshold:0});
  steps.forEach(s=>so.observe(s));go(0);addEventListener("rb-lang",()=>{const a=steps.find(s=>s.classList.contains("is-active"));go(a?+a.dataset.i:0)});
}

/* ---------- charts ---------- */
const S=window.NP_STORIES||[],T=window.NP_TOPICS||{};
const tip=document.createElement("div");tip.className="np-tip";document.body.append(tip);
function showTip(el,txt){tip.innerHTML=txt;const r=el.getBoundingClientRect();tip.style.left=(r.left+r.width/2+scrollX)+"px";tip.style.top=(r.top+scrollY-tip.offsetHeight-6)+"px";tip.classList.add("on")}
function hideTip(){tip.classList.remove("on")}
const label=(en,pt)=>PT()?pt:en;

/* stories per year */
const cy=$("#chYear");
function drawYear(){
  if(!cy)return;const yrs=[2018,2019,2020,2021,2022,2023,2024],by={};S.forEach(s=>by[s.y]=(by[s.y]||0)+1);
  const W=360,H=180,bw=36,step=(W-20)/yrs.length,max=5;
  let h='<svg viewBox="0 0 '+W+' '+H+'" role="img" aria-label="'+label("Stories per year","Matérias por ano")+'"><line x1="10" x2="'+(W-10)+'" y1="146" y2="146" class="ax"/>';
  yrs.forEach((y,i)=>{const n=by[y]||0,bh=n/max*120,x=14+i*step+(step-bw)/2;h+='<g class="yb" data-y="'+y+'" data-n="'+n+'"><rect class="col grow" style="animation-delay:'+(i*90)+'ms" x="'+x+'" y="'+(146-bh)+'" width="'+bw+'" height="'+bh+'"/><text class="v" x="'+(x+bw/2)+'" y="'+(140-bh)+'" text-anchor="middle">'+(n||"")+'</text><text class="y" x="'+(x+bw/2)+'" y="164" text-anchor="middle">'+(i?String(y).slice(2):y)+'</text></g>'});
  cy.innerHTML=h+'</svg>';
  $$(".yb",cy).forEach(g=>{const on=()=>{const n=+g.dataset.n;showTip(g.querySelector("rect"),"<b>"+g.dataset.y+"</b> · "+n+" "+(n===1?label("story","matéria"):label("stories","matérias")))};g.addEventListener("mouseenter",on);g.addEventListener("click",on);g.addEventListener("mouseleave",hideTip)});
}

/* topics donut */
const ct=$("#chTopic");let topicFilter="all";
function drawTopic(){
  if(!ct)return;const cnt={};S.forEach(s=>cnt[s.topic]=(cnt[s.topic]||0)+1);const keys=Object.keys(T).filter(k=>cnt[k]);const tot=S.length;
  let a0=-Math.PI/2,paths='';const R=72,r=42,cx=80,cyy=80;
  keys.forEach(k=>{const a1=a0+cnt[k]/tot*Math.PI*2;const x0=cx+R*Math.cos(a0),y0=cyy+R*Math.sin(a0),x1=cx+R*Math.cos(a1),y1=cyy+R*Math.sin(a1),xi0=cx+r*Math.cos(a0),yi0=cyy+r*Math.sin(a0),xi1=cx+r*Math.cos(a1),yi1=cyy+r*Math.sin(a1),big=a1-a0>Math.PI?1:0;
    paths+='<path data-k="'+k+'" d="M'+x0+','+y0+' A'+R+','+R+' 0 '+big+' 1 '+x1+','+y1+' L'+xi1+','+yi1+' A'+r+','+r+' 0 '+big+' 0 '+xi0+','+yi0+' Z" fill="'+T[k][2]+'" stroke="var(--card)" stroke-width="2"/>';a0=a1});
  const leg=keys.map(k=>'<li data-k="'+k+'"><i style="background:'+T[k][2]+'"></i><span>'+label(T[k][0],T[k][1])+'</span><b>'+cnt[k]+'</b></li>').join('');
  ct.innerHTML='<div class="np-donut"><svg viewBox="0 0 160 160">'+paths+'<text x="80" y="76" text-anchor="middle" style="font-size:30px;font-weight:900">'+tot+'</text><text x="80" y="94" text-anchor="middle" class="y">'+label("stories","matérias")+'</text></svg><ul class="np-leg">'+leg+'</ul></div>';
  const sync=()=>{$$("path,li",ct).forEach(el=>{el.classList.toggle("on",el.dataset.k===topicFilter);el.classList.toggle("dim",topicFilter!=="all"&&el.dataset.k!==topicFilter)})};
  $$("path,li",ct).forEach(el=>{el.addEventListener("click",()=>{setFilter(topicFilter===el.dataset.k?"all":el.dataset.k);$("#np-archive")&&$("#np-archive").scrollIntoView({behavior:reduce?"auto":"smooth",block:"start"})});
    el.addEventListener("mouseenter",()=>showTip(el,"<b>"+label(T[el.dataset.k][0],T[el.dataset.k][1])+"</b> · "+cnt[el.dataset.k]+" · "+Math.round(cnt[el.dataset.k]/tot*100)+"%"));el.addEventListener("mouseleave",hideTip)});
  sync();ct._sync=sync;
}

/* outlets */
const co=$("#chOutlet");
function drawOutlet(){
  if(!co)return;const cnt={};S.forEach(s=>{const o=s.outlet.split(" · ")[0];cnt[o]=(cnt[o]||0)+1});
  const list=Object.entries(cnt).sort((a,b)=>b[1]-a[1]);const max=list[0][1];
  co.innerHTML='<ul class="np-obars">'+list.map(([o,n],i)=>'<li><span>'+o+'</span><span class="bar"><i style="--w:'+(n/max*100)+'%;transition-delay:'+(i*70)+'ms"></i></span><b>'+n+'</b></li>').join('')+'</ul>';
  requestAnimationFrame(()=>requestAnimationFrame(()=>$$(".bar i",co).forEach(i=>i.style.width=i.style.getPropertyValue("--w"))));
}

/* reach, log scale */
const cr=$("#chReach");
function drawReach(){
  if(!cr)return;
  const d=[["cases.html#p-bcon",6200000,"6.2M","6,2 mi","views in 7 months, Brazil Conference at Harvard & MIT","visualizações em 7 meses, Brazil Conference at Harvard & MIT"],["cases.html#p-g20",500000,"500K+","500 mil+","people reached by the G20 youth newsroom","pessoas alcançadas pela redação jovem do G20"],["cases.html#p-seduc",350000,"350K","350 mil","public high school students reached by SEDUC campaigns","estudantes do ensino médio público alcançados pelas campanhas da SEDUC"],["cases.html#p-wind",15000,"15K+","15 mil+","views of Children of the Wind","visualizações de Filhos do Vento"],["cases.html#p-siggraph",6000,"6,000+","6.000+","visitors guided at SIGGRAPH 2026","visitantes guiados no SIGGRAPH 2026"],["cases.html#p-impacta",5700,"5,700+","5.700+","free mentorships, ImpactaJovem","mentorias gratuitas, ImpactaJovem"]];
  const lo=3,hi=7.2;
  cr.innerHTML='<ol class="np-rbars">'+d.map((x,i)=>'<li><a href="'+x[0]+'"><span class="np-bar"><i style="--w:'+((Math.log10(x[1])-lo)/(hi-lo)*100).toFixed(1)+'%;transition-delay:'+(i*80)+'ms"></i></span><b>'+label(x[2],x[3])+'</b><span>'+label(x[4],x[5])+'</span></a></li>').join('')+'</ol><div class="np-scale"><span>1K</span><span>10K</span><span>100K</span><span>1M</span><span>10M</span></div>';
  requestAnimationFrame(()=>requestAnimationFrame(()=>$$(".np-bar i",cr).forEach(i=>i.style.width=i.style.getPropertyValue("--w"))));
}
function drawAll(){drawYear();drawTopic();drawOutlet();drawReach()}
if("IntersectionObserver" in window&&cy){const go=new IntersectionObserver(es=>{if(es.some(e=>e.isIntersecting)){drawAll();go.disconnect()}},{rootMargin:"0px 0px -10% 0px"});go.observe(cy)}else drawAll();
addEventListener("rb-lang",()=>{if(cy&&cy.innerHTML)drawAll()});

/* ---------- archive filters ---------- */
const fl=$("#npFilters"),cards=$$(".np-acard");
function setFilter(k){topicFilter=k;$$("button",fl).forEach(b=>b.classList.toggle("on",b.dataset.f===k));cards.forEach(c=>c.classList.toggle("hide",k!=="all"&&c.dataset.topic!==k));if(ct&&ct._sync)ct._sync()}
if(fl)fl.addEventListener("click",e=>{const b=e.target.closest("button");if(b)setFilter(b.dataset.f)});

/* ---------- reels: hover to play, arrows ---------- */
const track=$("#reelTrack");
if(track){
  const reels=$$(".np-reel",track);
  const load=v=>{if(!v.src&&v.dataset.src)v.src=v.dataset.src};
  reels.forEach(r=>{const v=$("video",r);
    r.addEventListener("mouseenter",()=>{load(v);v.play().catch(()=>{})});
    r.addEventListener("mouseleave",()=>{v.pause()});
    r.addEventListener("focus",()=>{load(v);v.play().catch(()=>{})});r.addEventListener("blur",()=>v.pause());
  });
  /* on touch screens, the reel in the middle of the strip plays */
  if(matchMedia("(hover:none)").matches&&"IntersectionObserver" in window){
    const ro=new IntersectionObserver(es=>es.forEach(e=>{const v=$("video",e.target);if(e.intersectionRatio>.8){load(v);v.play().catch(()=>{})}else v.pause()}),{root:track,threshold:[.8]});reels.forEach(r=>ro.observe(r));
  }
  const step=d=>track.scrollBy({left:d*Math.min(track.clientWidth*.8,540),behavior:reduce?"auto":"smooth"});
  $(".np-rarr.prev")&&$(".np-rarr.prev").addEventListener("click",()=>step(-1));$(".np-rarr.next")&&$(".np-rarr.next").addEventListener("click",()=>step(1));
}
})();
