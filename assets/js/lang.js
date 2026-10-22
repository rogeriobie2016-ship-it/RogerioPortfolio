/* EN / PT switch. Any element with data-pt="…" swaps its inner HTML; the English original is kept in data-en.
   Choice is remembered per browser. Project texts stay in English until their translations exist. */
(function(){
  var KEY="rb-lang",L="en";
  try{L=localStorage.getItem(KEY)||"en"}catch(e){}
  function apply(root){
    root=root||document;
    document.documentElement.lang=L==="pt"?"pt-BR":"en";
    root.querySelectorAll("[data-pt]").forEach(function(el){
      if(el.dataset.en===undefined)el.dataset.en=el.innerHTML;
      var v=L==="pt"?el.dataset.pt:el.dataset.en;if(el.innerHTML!==v)el.innerHTML=v;
    });
    document.querySelectorAll("[data-lang-toggle]").forEach(function(b){b.textContent=L==="pt"?"EN":"PT";b.setAttribute("aria-label",L==="pt"?"Switch to English":"Mudar para português")});
    document.querySelectorAll("[data-set-lang]").forEach(function(b){b.setAttribute("aria-pressed",String(b.dataset.setLang===L))});
  }
  window.applyLang=apply;window.LANG=function(){return L};
  window.setLang=function(l){L=l;try{localStorage.setItem(KEY,l)}catch(e){}apply();dispatchEvent(new CustomEvent("rb-lang",{detail:l}))};
  document.addEventListener("click",function(e){var t=e.target.closest&&e.target.closest("[data-lang-toggle],[data-set-lang]");if(!t)return;e.preventDefault();setLang(t.dataset.setLang||(L==="pt"?"en":"pt"))});
  if(document.readyState!=="loading")apply();else document.addEventListener("DOMContentLoaded",function(){apply()});
})();
