/* burger for the side rail on the standalone pages (the home has its own) */
(function(){
  var b=document.getElementById("menuBtn"),s=document.getElementById("mScrim"),c=document.getElementById("mClose");
  function set(o){document.body.classList.toggle("menu",o);if(b)b.setAttribute("aria-expanded",String(o))}
  if(b)b.addEventListener("click",function(){set(!document.body.classList.contains("menu"))});
  if(s)s.addEventListener("click",function(){set(false)});
  if(c)c.addEventListener("click",function(){set(false)});
  document.addEventListener("keydown",function(e){if(e.key==="Escape")set(false)});
})();
