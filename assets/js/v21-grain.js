/* V21 · living print grain (Paper-style dithering + film grain), no dependencies.
   Applies only to: home hero + home #press, press.html masthead + cover.
   Test switches: ?grain=0 turns it off · ?grain=2 doubles strength · key G toggles. */
(function () {
  var q = new URLSearchParams(location.search).get('grain');
  if (q === '0') return;
  var boost = q === '2' ? 2 : 1;
  var TARGETS = [
    ['.home-page .hero', 0.16],
    ['.home-page #press', 0.11],
    ['.press-page .np-mast', 0.16],
    ['.press-page .np-mast + section', 0.10]
  ];
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var PX = 2;          // one dither cell = 2 CSS px
  var FPS = 12;        // film-like flicker, low CPU

  var VS = 'attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}';
  var FS = [
    'precision mediump float;',
    'uniform float t;uniform vec3 ink;uniform float amt;',
    'float h(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}',
    'float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);',
    ' return mix(mix(h(i),h(i+vec2(1.,0.)),f.x),mix(h(i+vec2(0.,1.)),h(i+1.),f.x),f.y);}',
    'float b2(vec2 a){a=floor(a);return fract(dot(a,vec2(.5,a.y*.75)));}',
    'float b4(vec2 a){return b2(.5*a)*.25+b2(a);}',
    'void main(){',
    ' vec2 p=gl_FragCoord.xy;',
    ' float f=n(p*.018+vec2(t*.035,-t*.02))*.6+n(p*.055-vec2(t*.05,t*.03))*.4;',
    ' float tone=smoothstep(.42,.9,f);',
    ' float d=step(b4(p),tone*.6);',
    ' float g=step(.88,h(p+fract(t*7.13)*91.7));',
    ' gl_FragColor=vec4(ink,(d*.6+g*.4)*amt);',
    '}'
  ].join('\n');

  function inkOf(el) {
    var m = getComputedStyle(el).color.match(/[\d.]+/g) || [20, 20, 20];
    return [m[0] / 255, m[1] / 255, m[2] / 255];
  }

  function mount(el, amt) {
    var c = document.createElement('canvas');
    c.className = 'v21g';
    c.setAttribute('aria-hidden', 'true');
    var gl = c.getContext('webgl', { premultipliedAlpha: false, antialias: false, alpha: true });
    if (!gl) return null;
    if (getComputedStyle(el).position === 'static') el.style.position = 'relative';
    el.appendChild(c);

    function sh(type, src) { var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s; }
    var pr = gl.createProgram();
    gl.attachShader(pr, sh(gl.VERTEX_SHADER, VS));
    gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FS));
    gl.linkProgram(pr);
    if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) { c.remove(); return null; }
    gl.useProgram(pr);
    var b = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, b);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    var loc = gl.getAttribLocation(pr, 'a');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    var uT = gl.getUniformLocation(pr, 't'), uInk = gl.getUniformLocation(pr, 'ink'), uAmt = gl.getUniformLocation(pr, 'amt');

    var st = { el: el, c: c, gl: gl, visible: false, last: 0, t0: performance.now() };
    st.size = function () {
      var r = el.getBoundingClientRect();
      var w = Math.max(1, Math.ceil(r.width / PX)), h = Math.max(1, Math.ceil(r.height / PX));
      if (c.width !== w || c.height !== h) { c.width = w; c.height = h; gl.viewport(0, 0, w, h); }
    };
    st.draw = function (now) {
      var ink = inkOf(el);
      var light = (ink[0] + ink[1] + ink[2]) / 3 > 0.5;
      c.style.mixBlendMode = light ? 'screen' : 'multiply';
      gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform1f(uT, reduce ? 3.0 : (now - st.t0) / 1000);
      gl.uniform3f(uInk, ink[0], ink[1], ink[2]);
      gl.uniform1f(uAmt, Math.min(1, amt * boost));
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };
    st.size(); st.draw(performance.now());
    return st;
  }

  function init() {
    var all = [];
    TARGETS.forEach(function (tg) {
      document.querySelectorAll(tg[0]).forEach(function (el) { var s = mount(el, tg[1]); if (s) all.push(s); });
    });
    if (!all.length) return;
    var ro = new ResizeObserver(function () { all.forEach(function (s) { s.size(); s.draw(performance.now()); }); });
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { all.forEach(function (s) { if (s.el === e.target) s.visible = e.isIntersecting; }); });
    });
    all.forEach(function (s) { ro.observe(s.el); io.observe(s.el); });
    var on = true;
    addEventListener('keydown', function (e) {
      if ((e.key === 'g' || e.key === 'G') && !/INPUT|TEXTAREA/.test(document.activeElement.tagName)) {
        on = !on; all.forEach(function (s) { s.c.style.display = on ? '' : 'none'; });
      }
    });
    if (reduce) return;
    (function loop(now) {
      requestAnimationFrame(loop);
      if (!on || document.hidden) return;
      all.forEach(function (s) {
        if (s.visible && now - s.last > 1000 / FPS) { s.last = now; s.draw(now); }
      });
    })(performance.now());
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
