/* Rogério Bié · v1.9 · shared chrome behavior: side drawer, copy email, grain filter. Works on every page. */
(function(){
  "use strict";
  document.documentElement.classList.add("js");
  var d=document.getElementById("xDrawer"),b=document.getElementById("xMenu"),c=document.getElementById("xClose"),s=document.getElementById("xScrim"),last=null;
  function open(){if(!d)return;last=document.activeElement;s.hidden=false;requestAnimationFrame(function(){s.classList.add("on");d.classList.add("on")});d.setAttribute("aria-hidden","false");b&&b.setAttribute("aria-expanded","true");document.documentElement.classList.add("x-lock");window.__lenis&&__lenis.stop&&__lenis.stop();setTimeout(function(){c&&c.focus({preventScroll:true})},60)}
  function close(){if(!d||!d.classList.contains("on"))return;d.classList.remove("on");s.classList.remove("on");d.setAttribute("aria-hidden","true");b&&b.setAttribute("aria-expanded","false");document.documentElement.classList.remove("x-lock");window.__lenis&&__lenis.start&&__lenis.start();setTimeout(function(){s.hidden=true},380);last&&last.focus&&last.focus({preventScroll:true})}
  if(d){
    b&&b.addEventListener("click",open);c&&c.addEventListener("click",close);s&&s.addEventListener("click",close);
    document.addEventListener("keydown",function(e){if(e.key==="Escape")close()});
    d.addEventListener("click",function(e){var a=e.target.closest("a");if(a)setTimeout(close,40)});
  }
  /* small name in the bar shows once the big one leaves (home only) */
  var top=document.getElementById("top"),wm=document.getElementById("wordmark");
  if(top&&wm&&"IntersectionObserver" in window){top.classList.add("x-hide-mark");new IntersectionObserver(function(es){top.classList.toggle("scrolled",!es[0].isIntersecting)},{rootMargin:"-58px 0px 0px 0px"}).observe(wm)}
  else if(top){addEventListener("scroll",function(){top.classList.toggle("scrolled",scrollY>10)},{passive:true})}
  /* copy email */
  document.addEventListener("click",function(e){var t=e.target.closest&&e.target.closest("[data-copy]");if(!t)return;var ct=t.querySelector(".x-ct"),pt=window.LANG&&LANG()==="pt";
    var done=function(){if(ct){ct.textContent=pt?"copiado":"copied";setTimeout(function(){ct.textContent=pt?"copiar":"copy"},1600)}};
    try{navigator.clipboard.writeText(t.dataset.copy).then(done,function(){location.href="mailto:"+t.dataset.copy})}catch(err){location.href="mailto:"+t.dataset.copy}});
  /* grain filter used by the titles */
  if(!document.getElementById("ink19")){var w=document.createElement("div");w.innerHTML='<svg width="0" height="0" style="position:absolute" aria-hidden="true"><filter id="ink19"><feTurbulence type="fractalNoise" baseFrequency=".85" numOctaves="2" seed="3" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="1.5" xChannelSelector="R" yChannelSelector="G" result="d"/><feComposite in="d" in2="n" operator="arithmetic" k1="0" k2="1" k3="-.11" k4="0"/></filter></svg>';document.body.appendChild(w.firstChild)}
})();
