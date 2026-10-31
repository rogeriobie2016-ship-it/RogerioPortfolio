/* Rogério Bié · look switch. ?look=cassaco turns on the Cassaco-inspired layer (remembered per browser), ?look=classic turns it off.
   Loaded in <head> right after the page stylesheets so the layer's CSS comes last. */
(function(){
  var KEY="rb-look",DEF="",v=DEF,q=/[?&]look=([a-z0-9-]+)/.exec(location.search);
  try{v=localStorage.getItem(KEY)||DEF}catch(e){}
  if(q){v=q[1]==="classic"?"classic":q[1];try{localStorage.setItem(KEY,v)}catch(e){}}
  if(v!=="cassaco")return;
  var d=document.documentElement;d.setAttribute("data-look","cassaco");
  document.write('<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>'+
    '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Anybody:wdth,wght@50..150,700..900&family=IBM+Plex+Mono:wght@400;500;600&display=swap">'+
    '<link rel="stylesheet" href="assets/css/look-cassaco.css">');
  var PT=function(){return window.LANG&&LANG()==="pt"};
  function ready(){
    var $=function(s,r){return (r||document).querySelector(s)};

    /* home intro: a second button to the reel and the rotating seal */
    var it=$(".intro .intro-txt");
    if(it&&!$(".lk-row",it)){
      var btn=$(".btn",it),row=document.createElement("div");row.className="lk-row";
      if(btn){btn.before(row);row.append(btn);var r=document.createElement("a");r.className="btn lk-ghost";r.href="#reel";r.setAttribute("data-pt","Ver o reel");r.dataset.en="Watch the reel";r.textContent=PT()?"Ver o reel":"Watch the reel";row.append(r)}
      var seal=document.createElement("a");seal.className="lk-seal";seal.href="#reel";seal.setAttribute("aria-label",PT()?"Ver o reel":"Watch the reel");
      seal.innerHTML='<svg viewBox="0 0 200 200" aria-hidden="true"><defs><path id="lkc" d="M100,100 m-74,0 a74,74 0 1,1 148,0 a74,74 0 1,1 -148,0"/></defs><circle cx="100" cy="100" r="98" class="lk-s-bg"/><g class="lk-s-rot"><text textLength="462" lengthAdjust="spacing"><textPath href="#lkc" textLength="462" lengthAdjust="spacing">ROGÉRIO BIÉ · XR · DOC · REELS · LA ⇄ CE · </textPath></text></g><circle cx="100" cy="100" r="44" class="lk-s-in"/><path d="M90 80l28 20-28 20z" class="lk-s-play"/></svg>';
      $(".intro").append(seal);
    }

    /* compare: a small pill to go back to the classic look while this one is a preview */
    if(!DEF){var t=document.createElement("a");t.className="lk-switch";t.href="?look=classic"+location.hash;t.textContent=PT()?"Visual novo · voltar ao antigo":"New look · back to classic";document.body.append(t);
      addEventListener("rb-lang",function(){t.textContent=PT()?"Visual novo · voltar ao antigo":"New look · back to classic"})}
  }
  if(document.readyState!=="loading")ready();else document.addEventListener("DOMContentLoaded",ready);
})();
