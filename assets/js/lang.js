/* EN / PT switch. Any element with data-pt="…" swaps its inner HTML; the English original is kept in data-en.
   Choice is remembered per browser. Project texts stay in English until their translations exist. */
(function(){
  var KEY="rb-lang",L="en";
  try{L=localStorage.getItem(KEY)||"en"}catch(e){}
  var BR='<svg class="flag" viewBox="0 0 28 20" aria-hidden="true"><rect width="28" height="20" rx="2" fill="#009C3B"/><path d="M14 2.6 25.4 10 14 17.4 2.6 10z" fill="#FFDF00"/><circle cx="14" cy="10" r="4.6" fill="#002776"/><path d="M9.6 9.1c2.9-.5 6.2.1 8.8 1.6" stroke="#fff" stroke-width=".9" fill="none"/></svg>';
  var US='<svg class="flag" viewBox="0 0 28 20" aria-hidden="true"><rect width="28" height="20" rx="2" fill="#fff"/><path d="M0 0h28v1.54H0zm0 3.08h28v1.54H0zm0 3.08h28v1.54H0zm0 3.08h28v1.54H0zm0 3.08h28v1.54H0zm0 3.08h28v1.54H0zm0 3.08h28V20H0z" fill="#B22234"/><rect width="12.6" height="10.8" fill="#3C3B6E"/></svg>';
  function apply(root){
    root=root||document;
    document.documentElement.lang=L==="pt"?"pt-BR":"en";
    root.querySelectorAll("[data-pt]").forEach(function(el){
      if(el.dataset.en===undefined)el.dataset.en=el.innerHTML;
      var v=L==="pt"?el.dataset.pt:el.dataset.en;if(el.innerHTML!==v)el.innerHTML=v;
    });
    document.querySelectorAll("[data-lang-toggle]").forEach(function(b){
      b.classList.add("lang-flags");
      b.innerHTML='<span class="lf'+(L==="en"?" on":"")+'">'+US+'<b>EN</b></span><span class="lf'+(L==="pt"?" on":"")+'">'+BR+'<b>PT</b></span>';
      b.setAttribute("aria-label",L==="pt"?"Idioma: português. Switch to English":"Language: English. Mudar para português");
    });
    document.querySelectorAll("[data-set-lang]").forEach(function(b){
      if(!b.querySelector(".flag"))b.innerHTML=(b.dataset.setLang==="pt"?BR:US)+"<b>"+b.textContent.trim()+"</b>";
      b.setAttribute("aria-pressed",String(b.dataset.setLang===L));
    });
  }
  window.applyLang=apply;window.LANG=function(){return L};
  window.setLang=function(l){L=l;try{localStorage.setItem(KEY,l)}catch(e){}apply();dispatchEvent(new CustomEvent("rb-lang",{detail:l}))};
  document.addEventListener("click",function(e){var t=e.target.closest&&e.target.closest("[data-lang-toggle],[data-set-lang]");if(!t)return;e.preventDefault();setLang(t.dataset.setLang||(L==="pt"?"en":"pt"))});
  if(document.readyState!=="loading")apply();else document.addEventListener("DOMContentLoaded",function(){apply()});
})();
