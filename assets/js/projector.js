/* v1.5 · Hero projector, point of view: you stand right behind a carousel slide projector
   and watch it throw each slide onto a plaster wall. The wall is a shader that multiplies the
   projected light by the plaster, so the texture shows through the image like a real projection.
   pjPOV(canvas, stage, slides, hooks) -> {target(k), power(), orbit(p), kill(), video}
   slides: [{kind:"video", src, poster} | {kind:"img", imgs:[name,...], title, sub}]
   hooks: {show(k), shown(), next()} */
(function(){
"use strict";
const SL_AR = 3/2;                       // 35 mm slide aperture
/* Opened straight from disk (file://), Chrome refuses to hand images and video to WebGL.
   Then the projector throws plain white light and the slide itself is an HTML layer laid over
   the lit wall with the same perspective, multiplied into the plaster. Online it all happens in the shader. */
const FILE = location.protocol === "file:";
function quad(w, h, q){                  // CSS matrix3d that maps a w×h box onto the 4 screen points q (tl, tr, br, bl)
  const adj = m => [m[4]*m[8]-m[5]*m[7], m[2]*m[7]-m[1]*m[8], m[1]*m[5]-m[2]*m[4], m[5]*m[6]-m[3]*m[8], m[0]*m[8]-m[2]*m[6], m[2]*m[3]-m[0]*m[5], m[3]*m[7]-m[4]*m[6], m[1]*m[6]-m[0]*m[7], m[0]*m[4]-m[1]*m[3]];
  const mm = (a, b) => { const c = []; for(let i = 0; i < 3; i++) for(let j = 0; j < 3; j++){ let v = 0; for(let k = 0; k < 3; k++) v += a[3*i+k]*b[3*k+j]; c.push(v) } return c };
  const mv = (m, v) => [m[0]*v[0]+m[1]*v[1]+m[2]*v[2], m[3]*v[0]+m[4]*v[1]+m[5]*v[2], m[6]*v[0]+m[7]*v[1]+m[8]*v[2]];
  const basis = p => { const m = [p[0][0], p[1][0], p[2][0], p[0][1], p[1][1], p[2][1], 1, 1, 1], v = mv(adj(m), [p[3][0], p[3][1], 1]); return mm(m, [v[0],0,0, 0,v[1],0, 0,0,v[2]]) };
  const t = mm(basis(q), adj(basis([[0,0],[w,0],[w,h],[0,h]]))), n = t.map(x => x/t[8]);
  return `matrix3d(${n[0]},${n[3]},0,${n[6]},${n[1]},${n[4]},0,${n[7]},0,0,1,0,${n[2]},${n[5]},0,${n[8]})`;
}
window.pjPOV = function(cv, st, S, hooks){
  const T = window.THREE; if(!T || !cv) return null;
  let R; try{ R = new T.WebGLRenderer({canvas:cv, antialias:true, alpha:false, powerPreference:"high-performance"}) }catch(e){ return null }
  if(!R.getContext()) return null;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  R.setPixelRatio(Math.min(2, devicePixelRatio || 1)); R.outputEncoding = T.sRGBEncoding;
  R.toneMapping = T.ACESFilmicToneMapping; R.toneMappingExposure = 1.0; R.setClearColor(0x0b0907, 1);
  R.shadowMap.enabled = true; R.shadowMap.type = T.PCFSoftShadowMap;
  const sc = new T.Scene(), cam = new T.PerspectiveCamera(34, 1, .1, 200);
  sc.fog = new T.Fog(0x0b0907, 30, 70);

  /* ---------- helpers ---------- */
  const lin = c => new T.Color(c).convertSRGBToLinear();
  const M = (c, r=.55, m=0, o={}) => new T.MeshStandardMaterial(Object.assign({color:lin(c), roughness:r, metalness:m}, o));
  const cvs = (w, h) => { const c = document.createElement("canvas"); c.width = w; c.height = h; return c };
  const ctex = (w, h, draw) => { const c = cvs(w, h); draw(c.getContext("2d"), w, h); const t = new T.CanvasTexture(c); t.encoding = T.sRGBEncoding; t.anisotropy = 4; return t };
  const add = (par, geo, mat, x=0, y=0, z=0, sh=true) => { const m = new T.Mesh(geo, mat); m.position.set(x, y, z); if(sh){ m.castShadow = true; m.receiveShadow = true } par.add(m); return m };
  const rbox = (w, h, d, r) => { const s = new T.Shape(), x = -w/2, y = -d/2;
    s.moveTo(x+r, y); s.lineTo(x+w-r, y); s.quadraticCurveTo(x+w, y, x+w, y+r); s.lineTo(x+w, y+d-r); s.quadraticCurveTo(x+w, y+d, x+w-r, y+d);
    s.lineTo(x+r, y+d); s.quadraticCurveTo(x, y+d, x, y+d-r); s.lineTo(x, y+r); s.quadraticCurveTo(x, y, x+r, y);
    const b = Math.min(.045, h/4), g = new T.ExtrudeGeometry(s, {depth:h-2*b, bevelEnabled:true, bevelThickness:b, bevelSize:b, bevelSegments:4, curveSegments:12});
    g.rotateX(-Math.PI/2); g.translate(0, b, 0); return g };

  /* ---------- the plaster wall: albedo + relief, generated once ---------- */
  function plaster(){
    const W = 2048, H = 1024, c = cvs(W, H), x = c.getContext("2d");
    x.fillStyle = "#e3dac9"; x.fillRect(0, 0, W, H);
    // fractal value noise: random low-res canvases blown up with smoothing
    const layer = (gw, gh, a, warm) => { const n = cvs(gw, gh), nx = n.getContext("2d"), id = nx.createImageData(gw, gh);
      for(let i = 0; i < id.data.length; i += 4){ const v = Math.random()*255; id.data[i] = v; id.data[i+1] = v*(warm?.96:1); id.data[i+2] = v*(warm?.88:1); id.data[i+3] = 255 }
      nx.putImageData(id, 0, 0); x.globalAlpha = a; x.imageSmoothingEnabled = true; x.imageSmoothingQuality = "high";
      x.globalCompositeOperation = "overlay"; x.drawImage(n, 0, 0, W, H) };
    layer(6, 3, .34, 1); layer(16, 8, .3, 1); layer(48, 24, .22, 0); layer(160, 80, .16, 0); layer(512, 256, .12, 0);
    x.globalCompositeOperation = "source-over";
    // trowel strokes: long soft swipes, lighter and darker
    for(let i = 0; i < 520; i++){ const px = Math.random()*W, py = Math.random()*H, len = 40 + Math.random()*220, ang = -.5 + Math.random()*1.0 + (Math.random() < .5 ? 0 : Math.PI);
      x.save(); x.translate(px, py); x.rotate(ang); x.globalAlpha = .035 + Math.random()*.06;
      x.fillStyle = Math.random() < .55 ? "#fff8ea" : "#9c8f78"; x.beginPath(); x.ellipse(0, 0, len, 3 + Math.random()*9, 0, 0, 6.29); x.fill(); x.restore() }
    // water stains near the bottom and a damp bloom in one corner
    for(let i = 0; i < 6; i++){ const g = x.createRadialGradient(Math.random()*W, H*(.75 + Math.random()*.3), 10, Math.random()*W, H, 260 + Math.random()*260);
      g.addColorStop(0, "rgba(120,96,64,.16)"); g.addColorStop(1, "rgba(120,96,64,0)"); x.globalAlpha = 1; x.fillStyle = g; x.fillRect(0, 0, W, H) }
    // hairline cracks
    x.lineCap = "round";
    for(let k = 0; k < 4; k++){ let px = Math.random()*W, py = Math.random()*H, a = Math.random()*6.28; x.beginPath(); x.moveTo(px, py);
      const steps = 20 + Math.random()*60; for(let s = 0; s < steps; s++){ a += (Math.random() - .5)*.9; px += Math.cos(a)*6; py += Math.sin(a)*6; x.lineTo(px, py) }
      x.strokeStyle = "rgba(70,58,44,.5)"; x.lineWidth = .7 + Math.random()*.6; x.globalAlpha = .28; x.stroke();
      x.strokeStyle = "rgba(255,250,238,.25)"; x.lineWidth = .7; x.translate(1, 1); x.stroke(); x.setTransform(1, 0, 0, 1, 0, 0) }
    // nail holes and old tape marks: the wall has been used as a screen before
    for(let i = 0; i < 14; i++){ x.globalAlpha = .55; x.fillStyle = "#4d4134"; x.beginPath(); x.arc(Math.random()*W, Math.random()*H*.8, 1.6 + Math.random()*1.6, 0, 6.29); x.fill() }
    for(let i = 0; i < 5; i++){ x.save(); x.translate(Math.random()*W, Math.random()*H*.7); x.rotate((Math.random() - .5)*.6); x.globalAlpha = .07; x.fillStyle = "#fffbe8"; x.fillRect(-34, -9, 68, 18); x.restore() }
    // fine grain
    const id = x.getImageData(0, 0, W, H), d = id.data;
    for(let p = 0; p < d.length; p += 4){ const n = (Math.random() - .5)*22; d[p] += n; d[p+1] += n; d[p+2] += n*.9 }
    x.putImageData(id, 0, 0);
    const t = new T.CanvasTexture(c); t.wrapS = t.wrapT = T.RepeatWrapping; t.anisotropy = 8; t.generateMipmaps = true; return t;
  }

  /* ---------- projector body (seen from behind) ---------- */
  const mBody = M(0x6f553f, .5, .05), mDeck = M(0xd5c8ad, .5, .02), mBase = M(0x1f1913, .7), mBlack = M(0x141311, .4, .1), mChrome = M(0xe6e3dc, .18, 1), mDark = M(0x2c2a26, .5, .2), mLime = M(0xb7de43, .4, 0, {emissive:lin(0x2c3a08)});
  const rig = new T.Group(); sc.add(rig);
  add(rig, rbox(3.08, .2, 2.58, .36), mBase, 0, 0, 0);
  add(rig, rbox(3, 1.0, 2.5, .32), mBody, 0, .18, 0);
  add(rig, rbox(2.86, .07, 2.36, .28), mDeck, 0, 1.16, 0);
  add(rig, rbox(3.02, .035, 2.52, .33), mChrome, 0, .66, 0);
  for(let i = 0; i < 9; i++) add(rig, new T.BoxGeometry(.03, .42, .07), mBlack, -1.505, .42, -.68 + i*.17, false);            // fan grille on the back
  const vents = add(rig, new T.PlaneGeometry(.26, 1.36), new T.MeshBasicMaterial({color:0xffb366, transparent:true, opacity:0, blending:T.AdditiveBlending, depthWrite:false}), -1.52, .42, 0, false);
  vents.rotation.y = -Math.PI/2;                                                                                                   // lamp glow leaking through the grille
  add(rig, new T.BoxGeometry(.06, .025, .5), mChrome, -1.53, .82, .7, false);
  const badge = add(rig, new T.PlaneGeometry(.78, .2), new T.MeshStandardMaterial({roughness:.5, map:ctex(512, 128, (x, w, h) => { x.fillStyle = "#141310"; x.fillRect(0, 0, w, h); x.strokeStyle = "#c9c3b5"; x.lineWidth = 5; x.strokeRect(8, 8, w-16, h-16);
    x.fillStyle = "#efe9dc"; x.font = "800 52px Archivo, Arial Black, sans-serif"; x.textBaseline = "middle"; x.fillText("BIÉ", 30, h/2+2); x.fillStyle = "#b7de43"; x.font = "600 24px Inter Tight, Arial, sans-serif"; x.fillText("CAROUSEL · 140", 170, h/2+2) })}), -1.545, .9, -.55, false);
  badge.rotation.y = -Math.PI/2;
  const rocker = add(rig, new T.BoxGeometry(.05, .12, .22), mLime, -1.55, .42, .92);
  const cord = new T.CatmullRomCurve3([new T.Vector3(-1.5, .3, -.2), new T.Vector3(-2.2, .12, -.5), new T.Vector3(-3.4, .03, -1.2), new T.Vector3(-5.5, .03, -1.4), new T.Vector3(-9, .03, -3)]);
  add(rig, new T.TubeGeometry(cord, 70, .045, 8, false), mBlack);
  [[1.08, -.72], [1.08, -.98]].forEach((p, i) => add(rig, new T.CylinderGeometry(.09, .1, .07, 24), i ? mChrome : mBlack, p[0], 1.25, p[1]));
  const GZ = .62, LY = .62;
  add(rig, new T.BoxGeometry(.18, .7, .8), mBlack, 1.55, LY, GZ);
  const lens = new T.Group(); lens.position.set(1.62, LY, GZ); lens.rotation.z = -Math.PI/2; rig.add(lens);
  add(lens, new T.CylinderGeometry(.27, .3, .62, 48), mBlack, 0, .31, 0);
  add(lens, new T.CylinderGeometry(.31, .31, .12, 48), mChrome, 0, .6, 0);
  [.12, .2, .28, .36].forEach(y => add(lens, new T.TorusGeometry(.29, .012, 8, 48), mDark, 0, y, 0, false).rotation.x = Math.PI/2);
  const LENS = new T.Vector3(2.32, LY, GZ);
  /* tray of slides on the deck */
  const NS = 40, STEP = Math.PI*2/NS, GATE = -Math.PI/2, TR = {x:-.22, z:GZ - .8};
  const tray = new T.Group(); tray.position.set(TR.x, 1.23, TR.z); rig.add(tray);
  const lp = [[.44,0],[1.18,0],[1.21,.03],[1.21,.31],[1.17,.345],[1.13,.32],[1.13,.07],[.52,.07],[.5,.31],[.46,.33],[.44,.3]].map(p => new T.Vector2(p[0], p[1]));
  add(tray, new T.LatheGeometry(lp, 120), Object.assign(M(0x1a1917, .32, .15), {side:T.DoubleSide}));
  const ring = add(tray, new T.RingGeometry(1.13, 1.21, 120), new T.MeshStandardMaterial({roughness:.4, map:ctex(1024, 1024, (x, w) => { x.fillStyle = "#1a1917"; x.fillRect(0, 0, w, w); x.fillStyle = "#d8d2c4"; x.font = "600 15px Inter Tight, Arial, sans-serif"; x.textAlign = "center"; x.textBaseline = "middle";
    for(let k = 0; k < NS; k++){ const a = k*STEP, px = 512 + (1.17/1.21)*512*Math.cos(a), py = 512 - (1.17/1.21)*512*Math.sin(a); x.save(); x.translate(px, py); x.rotate(-a + Math.PI/2); x.fillText(String(k+1), 0, 0); x.restore() } })}), 0, .348, 0, false);
  ring.rotation.x = -Math.PI/2;
  add(tray, new T.CylinderGeometry(.4, .42, .44, 48), mDark, 0, .22, 0);
  const cap = add(tray, new T.CircleGeometry(.4, 48), new T.MeshStandardMaterial({roughness:.4, metalness:.1, map:ctex(512, 512, (x, w) => { x.fillStyle = "#24221e"; x.fillRect(0, 0, w, w); x.fillStyle = "#efe9dc"; x.font = "700 30px Inter Tight, Arial, sans-serif"; x.textAlign = "center";
    const t = "ROGÉRIO BIÉ · DEMO REEL + SELECTED WORK · "; for(let i = 0; i < t.length; i++){ const a = i/t.length*Math.PI*2; x.save(); x.translate(256 + 190*Math.sin(a), 256 - 190*Math.cos(a)); x.rotate(a); x.fillText(t[i], 0, 0); x.restore() }
    x.fillStyle = "#b7de43"; x.beginPath(); x.arc(256, 256, 64, 0, 7); x.fill(); x.fillStyle = "#141a10"; x.font = "800 44px Archivo, Arial Black, sans-serif"; x.textBaseline = "middle"; x.fillText(String(S.length).padStart(2, "0"), 256, 258) })}), 0, .445, 0, false);
  cap.rotation.x = -Math.PI/2;
  const edge = M(0xe9e1cf, .7), blank = M(0xe4dccb, .75), slides = [];
  for(let k = 0; k < NS; k++){ const a = k*STEP, p = S[k];
    const face = p ? new T.MeshStandardMaterial({roughness:.6, map:ctex(256, 256, (x, w, h) => { x.fillStyle = "#efe7d6"; x.fillRect(0, 0, w, h); const g = x.createLinearGradient(0, 40, 0, 200); g.addColorStop(0, k ? "#b7de43" : "#C8321E"); g.addColorStop(1, "#1d1a14"); x.fillStyle = g; x.fillRect(46, 40, 164, 150);
      x.fillStyle = "#2a2620"; x.font = "700 24px Inter Tight, Arial, sans-serif"; x.fillText(String(k+1).padStart(2, "0"), 20, 30) })}) : blank;
    const m = add(tray, new T.BoxGeometry(.5, .5, .03), [edge, edge, edge, edge, face, face], .81*Math.cos(a), .33, -.81*Math.sin(a)); m.rotation.y = a; slides.push(m) }
  const TY = 3.2; rig.position.y = TY;                         // it stands on a table, as in a living room screening
  rig.rotation.z = .045;                                       // the front foot is wound up a little
  rig.updateMatrixWorld(true);

  /* ---------- room: wall + floor + table ---------- */
  const WX = 24, wallW = 44, wallH = 22;
  const albedo = plaster();
  const slideTex = [], AR = [];                               // one texture per slide, with its content aspect
  const blackTex = new T.DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1, T.RGBAFormat); blackTex.needsUpdate = true;
  const whiteTex = new T.DataTexture(new Uint8Array([200, 200, 200, 255]), 1, 1, T.RGBAFormat); whiteTex.needsUpdate = true;
  const projCam = new T.PerspectiveCamera(30, SL_AR, .1, 100);
  const wallU = {
    uAlb:{value:albedo}, uT0:{value:blackTex}, uT1:{value:blackTex}, uA0:{value:1}, uA1:{value:1}, uMix:{value:0},
    uVP:{value:new T.Matrix4()}, uI:{value:0}, uBlur:{value:0}, uTex:{value:new T.Vector2(1/2048, 1/1024)}, uRep:{value:new T.Vector2(1, 1)},
    uJit:{value:new T.Vector2()}, uTime:{value:0}, uSpill:{value:new T.Color(1, .9, .75)}, uAmb:{value:1}
  };
  const wallMat = new T.ShaderMaterial({uniforms:wallU, toneMapped:false,
    vertexShader:`varying vec3 vW;varying vec2 vUv;void main(){vUv=uv;vec4 w=modelMatrix*vec4(position,1.);vW=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}`,
    fragmentShader:`
      uniform sampler2D uAlb,uT0,uT1;uniform float uA0,uA1,uMix,uI,uBlur,uTime,uAmb;uniform mat4 uVP;uniform vec2 uTex,uRep,uJit;uniform vec3 uSpill;
      varying vec3 vW;varying vec2 vUv;
      vec3 s2l(vec3 c){return pow(c,vec3(2.2));}
      float lum(vec2 p){return dot(texture2D(uAlb,p).rgb,vec3(.3,.59,.11));}
      vec3 slide(sampler2D t,float a,vec2 u){                // letterbox the content inside the 3:2 slide window
        vec2 q=u;if(a>1.){q.y=(u.y-.5)*a+.5;}else{q.x=(u.x-.5)/a+.5;}
        float inb=step(0.,q.x)*step(q.x,1.)*step(0.,q.y)*step(q.y,1.);
        vec3 c=texture2D(t,q).rgb;
        if(uBlur>0.){vec2 o=vec2(uBlur);c=(c*2.+texture2D(t,q+o).rgb+texture2D(t,q-o).rgb+texture2D(t,q+vec2(o.x,-o.y)).rgb+texture2D(t,q+vec2(-o.x,o.y)).rgb)/6.;}
        return s2l(c)*inb;}
      void main(){
        vec2 uv=vUv*uRep;
        vec3 alb=s2l(texture2D(uAlb,uv).rgb);
        float hl=lum(uv-vec2(uTex.x*2.,0.)),hr=lum(uv+vec2(uTex.x*2.,0.)),hd=lum(uv-vec2(0.,uTex.y*2.)),hu=lum(uv+vec2(0.,uTex.y*2.));
        vec3 n=normalize(vec3((hl-hr)*3.2,(hd-hu)*3.2,1.));
        float rake=max(0.,dot(n,normalize(vec3(-.85,.32,.42))));      // a dim lamp far to the left grazes the plaster
        float vy=clamp((vW.y)/20.,0.,1.);
        vec3 amb=vec3(.05,.04,.031)*(.25+1.5*rake)*(.55+.6*vy)*uAmb;
        vec4 pc=uVP*vec4(vW,1.);vec2 nd=pc.xy/pc.w;vec2 u=nd*.5+.5+uJit;
        float inF=step(0.,pc.w);
        // the slide mount: soft rounded aperture, a hair out of focus
        vec2 e=abs(u-.5)*2.;vec2 k=max(e-vec2(1.-.035,1.-.035*1.5),0.);float rd=length(k/vec2(.035,.035*1.5))*.035;
        float box=max(e.x,e.y);float ed=1.-smoothstep(.992,1.003,max(box,1.-.035+rd));
        float hot=1.-.42*dot(nd,nd)*.5;                                 // brighter in the middle, as from a single bulb
        vec3 img=mix(slide(uT0,uA0,u),slide(uT1,uA1,u),uMix);
        vec3 lamp=vec3(1.,.95,.87);
        vec3 light=(img*2.6+.02)*lamp*hot*ed*uI*inF;
        vec2 out2=max(abs(u-.5)-.5,0.);float dOut=length(out2*vec2(1.5,1.));
        vec3 halo=uSpill*exp(-dOut*7.)*.045*uI*(1.-ed)*inF;              // light that misses the slide and bounces around
        float grain=fract(sin(dot(gl_FragCoord.xy+uTime*61.,vec2(12.9898,78.233)))*43758.5453)-.5;
        vec3 col=alb*(amb+light*(.82+.36*rake)+halo)+grain*.006*uI*ed;
        col=col/(1.+col*.55);
        gl_FragColor=vec4(pow(max(col,0.),vec3(1./2.2)),1.);
      }`});
  const wall = new T.Mesh(new T.PlaneGeometry(wallW, wallH, 1, 1), wallMat); wall.position.set(WX, wallH/2 - .02, 0); wall.rotation.y = -Math.PI/2; sc.add(wall);
  // floor: dark worn boards that catch the projector's shadow and the light bounced off the wall
  const floorTex = ctex(1024, 1024, (x, w, h) => { x.fillStyle = "#2a2018"; x.fillRect(0, 0, w, h);
    for(let i = 0; i < 16; i++){ const y = i*h/16; x.fillStyle = `hsl(28,${22 + Math.random()*10}%,${11 + Math.random()*6}%)`; x.fillRect(0, y, w, h/16 - 2);
      for(let g = 0; g < 40; g++){ x.globalAlpha = .08; x.strokeStyle = Math.random() < .5 ? "#000" : "#6b5440"; x.beginPath(); const yy = y + Math.random()*h/16; x.moveTo(0, yy); x.bezierCurveTo(w*.3, yy + 3, w*.6, yy - 3, w, yy); x.stroke() } x.globalAlpha = 1 } });
  floorTex.wrapS = floorTex.wrapT = T.RepeatWrapping; floorTex.repeat.set(6, 6);
  const floor = add(sc, new T.PlaneGeometry(80, 80), new T.MeshStandardMaterial({map:floorTex, roughness:.82, metalness:0, color:lin(0x8a7a6a)}), 10, 0, 0, false);
  floor.rotation.x = -Math.PI/2; floor.receiveShadow = true;
  const tblTex = ctex(512, 512, (x, w, h) => { x.fillStyle = "#3a2b1f"; x.fillRect(0, 0, w, h); for(let g = 0; g < 220; g++){ x.globalAlpha = .06 + Math.random()*.06; x.strokeStyle = Math.random() < .5 ? "#120c08" : "#7a5e44"; x.lineWidth = .6 + Math.random()*1.6; const y = Math.random()*h; x.beginPath(); x.moveTo(0, y); x.bezierCurveTo(w*.3, y + 6*Math.random(), w*.7, y - 6*Math.random(), w, y + 3); x.stroke() } });
  const table = add(sc, new T.BoxGeometry(9, .22, 6.4), new T.MeshStandardMaterial({map:tblTex, roughness:.86, metalness:0}), .4, TY - .11, .3);
  add(sc, new T.BoxGeometry(.25, TY, .25), mBase, 4.4, TY/2 - .2, -2.6); add(sc, new T.BoxGeometry(.25, TY, .25), mBase, 4.4, TY/2 - .2, 3.2);
  sc.add(new T.HemisphereLight(0xffe9d0, 0x0c0907, .08));
  const back = new T.DirectionalLight(0xffd9a8, .22); back.position.set(-12, 9, 6); sc.add(back);            // faint lamp somewhere behind you
  const bounce = new T.PointLight(0xffe2c0, 0, 40, 2); bounce.position.set(WX - 4, 4.6, 0); bounce.castShadow = true;
  bounce.shadow.mapSize.set(1024, 1024); bounce.shadow.radius = 6; bounce.shadow.bias = -.002; bounce.shadow.normalBias = .04; sc.add(bounce);    // the lit wall throws the projector's silhouette back at you
  const lampIn = new T.PointLight(0xffb466, 0, 3.5, 2); lampIn.position.set(-1.8, .5, 0); sc.add(lampIn);

  /* ---------- beam + dust ---------- */
  const bg = new T.BufferGeometry(), bpos = new Float32Array(8*3);
  bg.setAttribute("position", new T.BufferAttribute(bpos, 3)); bg.setAttribute("t", new T.BufferAttribute(new Float32Array([0,0,0,0,1,1,1,1]), 1));
  bg.setIndex([0,1,5,0,5,4,1,2,6,1,6,5,2,3,7,2,7,6,3,0,4,3,4,7]);
  const bmat = new T.ShaderMaterial({uniforms:{uI:{value:0}, uTime:{value:0}}, transparent:true, depthWrite:false, blending:T.AdditiveBlending, side:T.DoubleSide,
    vertexShader:"attribute float t;varying float vT;varying vec3 vP;void main(){vT=t;vP=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}",
    fragmentShader:"uniform float uI;uniform float uTime;varying float vT;varying vec3 vP;float h(vec3 p){return fract(sin(dot(p,vec3(12.9,78.2,37.7)))*43758.5);}void main(){float f=.95+.05*sin(uTime*47.)*sin(uTime*13.);float smoke=.75+.25*sin(vP.y*1.7+uTime*.4+sin(vP.z*1.3-uTime*.3)*2.);float a=uI*f*smoke*(.03+.11*pow(1.-vT,2.));gl_FragColor=vec4(vec3(1.,.9,.74)*a,a);}"});
  const beam = new T.Mesh(bg, bmat); beam.frustumCulled = false; sc.add(beam);
  const ND = reduce ? 0 : 420, dpos = new Float32Array(ND*3), dsd = [];
  for(let i = 0; i < ND; i++) dsd.push([Math.random(), Math.random()*2 - 1, Math.random()*2 - 1, .006 + Math.random()*.03, Math.random()*6.28]);
  const dg = new T.BufferGeometry(); dg.setAttribute("position", new T.BufferAttribute(dpos, 3));
  const dmat = new T.PointsMaterial({size:.06, map:ctex(64, 64, x => { const g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, "rgba(255,240,215,1)"); g.addColorStop(1, "rgba(255,240,215,0)"); x.fillStyle = g; x.fillRect(0, 0, 64, 64) }), transparent:true, opacity:0, depthWrite:false, blending:T.AdditiveBlending});
  const dust = new T.Points(dg, dmat); dust.frustumCulled = false; sc.add(dust);
  const glow = new T.Sprite(new T.SpriteMaterial({map:ctex(128, 128, x => { const g = x.createRadialGradient(64, 64, 0, 64, 64, 64); g.addColorStop(0, "rgba(255,246,226,1)"); g.addColorStop(.22, "rgba(255,214,150,.5)"); g.addColorStop(1, "rgba(255,200,120,0)"); x.fillStyle = g; x.fillRect(0, 0, 128, 128) }), transparent:true, depthWrite:false, blending:T.AdditiveBlending, opacity:0}));
  glow.scale.set(1.1, 1.1, 1); sc.add(glow);

  /* ---------- projection geometry ---------- */
  const V = () => new T.Vector3(), ls = V(), dir = V(), tmp = V(), corners = [V(), V(), V(), V()];
  ls.copy(LENS); rig.localToWorld(ls); glow.position.copy(ls).add(new T.Vector3(.05, 0, 0));
  const PITCH = .13;                                          // lens shift + foot: image sits above the lens axis
  dir.set(1, 0, 0).applyAxisAngle(new T.Vector3(0, 0, 1), rig.rotation.z + PITCH);
  projCam.position.copy(ls); projCam.lookAt(tmp.copy(ls).add(dir)); projCam.updateMatrixWorld(); projCam.updateProjectionMatrix();
  const wallPlane = new T.Plane(new T.Vector3(-1, 0, 0), WX - .001), ray = new T.Ray();
  [[1,1],[-1,1],[-1,-1],[1,-1]].forEach((c, i) => { tmp.set(c[0], c[1], .5).unproject(projCam); ray.set(ls, tmp.sub(ls).normalize()); ray.intersectPlane(wallPlane, corners[i]) });
  const imgC = V(); corners.forEach(c => imgC.add(c)); imgC.multiplyScalar(.25);
  const imgW = corners[0].distanceTo(corners[1]), imgH = corners[1].distanceTo(corners[2]);
  bounce.position.set(WX - 5, imgC.y, imgC.z);
  const setVP = () => { wallU.uVP.value.multiplyMatrices(projCam.projectionMatrix, projCam.matrixWorldInverse) }; setVP();
  const lensU = V(), lensV = V();
  { const bd = V().subVectors(imgC, ls).normalize(); lensU.set(0, 0, 1); lensV.crossVectors(lensU, bd).normalize(); }
  for(let i = 0; i < 4; i++){ const c = [[1,1],[-1,1],[-1,-1],[1,-1]][i]; tmp.copy(ls).addScaledVector(lensU, -c[0]*.16).addScaledVector(lensV, c[1]*.11); bpos.set([tmp.x, tmp.y, tmp.z], i*3); bpos.set([corners[i].x, corners[i].y, corners[i].z], (i+4)*3) }
  bg.attributes.position.needsUpdate = true;
  /* ---------- home wall: posters and family photos around the screen (HTML planes mapped onto the plaster) ---------- */
  const deco = [], DX = WX - .03, decoRoot = document.createElement("div");
  decoRoot.className = "pjdecos"; decoRoot.setAttribute("aria-hidden", "true"); st.insertBefore(decoRoot, cv.nextSibling);
  const hang = (src, zc, yc, h, ar, cls, rot) => { const w = h*ar, pw = Math.round(w*120), ph = Math.round(h*120), el = document.createElement("div");
    el.className = "pjdeco " + (cls || ""); el.style.width = pw + "px"; el.style.height = ph + "px";
    el.innerHTML = `<img src="${src}" alt="" decoding="async"><i></i>`; decoRoot.append(el);
    const r = rot || 0, c = Math.cos(r), s2 = Math.sin(r), pt = (dz, dy) => [zc + dz*c - dy*s2, yc + dz*s2 + dy*c];
    deco.push({el, pw, ph, c:[pt(-w/2, h/2), pt(w/2, h/2), pt(w/2, -h/2), pt(-w/2, -h/2)]}) };
  { const L = imgC.z - imgW/2, Rr = imgC.z + imgW/2, top = imgC.y + imgH/2, g = imgW*.045;
    (S.decor || []).forEach(d => hang(d.src, d.side < 0 ? L - g - d.h*imgH*d.ar/2 - (d.dz || 0)*imgW : Rr + g + d.h*imgH*d.ar/2 + (d.dz || 0)*imgW, top - (d.dy || 0)*imgH - d.h*imgH/2, d.h*imgH, d.ar, d.cls, d.rot)) }
  const decoSync = I => { const lit = (.2 + .42*I).toFixed(3); decoRoot.style.setProperty("--lit", lit);
    deco.forEach(d => { const q = d.c.map(p => { tmp.set(DX, p[1], p[0]).project(cam); return [(tmp.x*.5 + .5)*W, (-tmp.y*.5 + .5)*H] }); d.el.style.transform = quad(d.pw, d.ph, q) }) };
  const dustUp = dt => { for(let i = 0; i < ND; i++){ const d = dsd[i]; d[0] += d[3]*dt*.2; if(d[0] > 1) d[0] -= 1; const t = d[0], w = Math.sin(tm*.5 + d[4])*.05;
      const ex = .16 + (imgW/2 - .16)*t, ey = .11 + (imgH/2 - .11)*t;
      tmp.copy(ls).lerp(imgC, t); tmp.z += (d[1] + w)*ex*.95; tmp.y += (d[2] - w)*ey*.95; dpos.set([tmp.x, tmp.y, tmp.z], i*3) }
    dg.attributes.position.needsUpdate = true };

  /* ---------- slides: textures ---------- */
  let video = null;
  const loadImg = src => new Promise(r => { const im = new Image(); im.decoding = "async"; im.onload = () => r(im); im.onerror = () => r(null); im.src = src });
  const slideCanvas = async (s, k) => {
    const W = 1500, H = 1000, c = cvs(W, H), x = c.getContext("2d");
    x.fillStyle = "#0d0b09"; x.fillRect(0, 0, W, H);
    const ims = (await Promise.all((s.imgs || []).map(n => loadImg(`img/${n}.jpg`)))).filter(Boolean);
    const land = ims.filter(i => i.width/i.height > 1.15);
    const cover = (im, dx, dy, dw, dh) => { const r = Math.max(dw/im.width, dh/im.height), sw = dw/r, sh = dh/r; x.drawImage(im, (im.width - sw)/2, (im.height - sh)/2, sw, sh, dx, dy, dw, dh) };
    if(land.length){ cover(land[0], 0, 0, W, H) }
    else if(ims.length){                                          // vertical frames: lay them out like a contact strip
      const n = Math.min(3, ims.length), g = 26, h = H - 2*92, w = Math.min(h*9/16, (W - g*(n + 1))/n), x0 = (W - (n*w + (n - 1)*g))/2;
      ims.slice(0, n).forEach((im, i) => cover(im, x0 + i*(w + g), 92, w, h));
    } else {                                                       // title slide (no still yet)
      const gr = x.createRadialGradient(W*.5, H*.45, 40, W*.5, H*.5, W*.7); gr.addColorStop(0, "#3a2c1f"); gr.addColorStop(1, "#0d0a08"); x.fillStyle = gr; x.fillRect(0, 0, W, H);
      x.textAlign = "center"; x.fillStyle = "#b7de43"; x.font = "700 30px Inter Tight, Arial, sans-serif"; x.fillText((s.kicker || "").toUpperCase(), W/2, H*.36);
      x.fillStyle = "#f3ecdc"; x.font = "900 128px Archivo, Arial Black, sans-serif"; const words = (s.title || "").toUpperCase().split(" "), lines = []; let L = "";
      words.forEach(wd => { const t = L ? L + " " + wd : wd; if(x.measureText(t).width > W*.82 && L){ lines.push(L); L = wd } else L = t }); lines.push(L);
      lines.forEach((l, i) => x.fillText(l, W/2, H*.5 + i*118 - (lines.length - 1)*59 + 36));
      x.fillStyle = "rgba(243,236,220,.75)"; x.font = "500 30px Inter Tight, Arial, sans-serif"; x.fillText(s.sub || "", W/2, H*.5 + lines.length*59 + 90) }
    if(FILE){ c.className = "pjov-l"; ovLayers[k] = c; ov.append(c); slideTex[k] = whiteTex; AR[k] = 1; ovSync(); if(k === curShown) bindTex(); return }
    const t = new T.CanvasTexture(c); t.encoding = T.LinearEncoding; t.minFilter = T.LinearMipMapLinearFilter; t.anisotropy = 4;
    slideTex[k] = t; AR[k] = 1;
    if(k === curShown) bindTex();
  };
  const curT = () => slideTex[curShown] || blackTex;
  let curShown = 0;
  const bindTex = () => { wallU.uT1.value = curT(); wallU.uA1.value = AR[curShown] || 1 };
  const ov = document.createElement("div"), ovLayers = [];
  ov.className = "pjov"; ov.setAttribute("aria-hidden", "true"); ov.style.cssText = "position:absolute;left:0;top:0;width:1500px;height:1000px;transform-origin:0 0;z-index:2;pointer-events:none;mix-blend-mode:multiply;border-radius:34px;overflow:hidden;background:#000;opacity:0;display:" + (FILE ? "block" : "none");
  if(FILE) st.insertBefore(ov, cv.nextSibling);
  const ovSync = () => ovLayers.forEach((l, i) => { if(l) l.style.opacity = i === curShown ? 1 : 0 });
  S.forEach((s, k) => {
    if(s.kind === "video" && FILE){
      video = document.createElement("video"); Object.assign(video, {muted:true, loop:true, playsInline:true, preload:"auto", poster:s.poster});
      video.setAttribute("playsinline", ""); video.setAttribute("muted", ""); video.src = s.src; video.className = "pjov-l";
      ovLayers[k] = video; ov.append(video); slideTex[k] = whiteTex; AR[k] = 1; return;
    }
    if(s.kind === "video"){
      video = document.createElement("video"); Object.assign(video, {muted:true, loop:true, playsInline:true, preload:"auto", crossOrigin:"anonymous"});
      video.setAttribute("playsinline", ""); video.setAttribute("muted", ""); video.src = s.src;
      const vt = new T.VideoTexture(video); vt.encoding = T.LinearEncoding; vt.minFilter = T.LinearFilter; slideTex[k] = vt; AR[k] = (16/9)/SL_AR;
      // until the first frame decodes, project the poster
      loadImg(s.poster).then(im => { if(!im || video.readyState >= 2) return; const pt = new T.Texture(im); pt.needsUpdate = true; slideTex[k] = pt;
        video.addEventListener("loadeddata", () => { slideTex[k] = vt; if(curShown === k) bindTex() }, {once:true}); if(curShown === k) bindTex() });
    } else slideCanvas(s, k);
  });

  /* ---------- layout ---------- */
  let W = 1, H = 1, orb = 0, orbT = 0, px = 0, py = 0, ppx = 0, ppy = 0;
  const camBase = V(), camLook = V();
  const layout = () => { W = st.clientWidth; H = st.clientHeight; if(!W || !H) return; R.setSize(W, H, false); cam.aspect = W/H;
    const mob = W/H < .9, f = mob ? 1.04 : (W/H > 1.9 ? .5 : .6);
    camBase.set(mob ? -12.5 : -9.4, TY + (mob ? 3.2 : 2.5), mob ? 1.3 : 3.6);
    const dist = WX - camBase.x, hf = Math.atan(imgW*.5/f/dist);
    cam.fov = 2*Math.atan(Math.tan(hf)/cam.aspect)*180/Math.PI;
    camLook.set(WX, imgC.y - imgH*(mob ? .3 : .17), imgC.z + (mob ? .4 : .15 - (W/H > 1.25 ? imgW*.06 : 0)));
    cam.updateProjectionMatrix(); place() };
  const place = () => { cam.position.copy(camBase); cam.position.x += orb*2.2; cam.position.z += ppx*.35; cam.position.y += -ppy*.18; cam.lookAt(camLook); cam.updateMatrixWorld() };

  /* ---------- mechanism ---------- */
  let tc = 0, cur = 0, tgtK = 0, drop = 1, lamp = 0, lampT = 0, ang = GATE, tm = 0, last = performance.now(), raf = 0, vis = true, alive = true, fade = 1, settle = 0;
  const ease = k => k < .5 ? 4*k*k*k : 1 - Math.pow(-2*k + 2, 3)/2;
  const swap = k => { wallU.uT0.value = wallU.uT1.value; wallU.uA0.value = wallU.uA1.value; curShown = k; bindTex(); fade = 0; settle = 1; ovSync();
    if(video){ if(k === 0 && vis){ const p = video.play(); p && p.catch(() => {}) } else video.pause() } };
  const frame = now => { if(!alive) return; raf = requestAnimationFrame(frame); if(!vis) return; if(!document.body.contains(cv)){ kill(); return }
    const dt = Math.min(.1, (now - last)/1000); last = now; tm += dt;
    const want = GATE - tgtK*STEP;
    if(cur !== tgtK && now - tc > 1400){ ang = want; cur = tgtK; drop = Math.min(drop, .3) }
    if(reduce){ ang = want; cur = tgtK; drop = 1 }
    else if(cur !== tgtK){ drop = Math.max(0, drop - dt*3.6); if(drop === 0){ ang += (want - ang)*Math.min(1, dt*7); if(Math.abs(want - ang) < .003){ ang = want; cur = tgtK } } }
    else { ang += (want - ang)*Math.min(1, dt*7); if(Math.abs(want - ang) < .01) drop = Math.min(1, drop + dt*2.6) }
    if(cur === tgtK && drop > .55 && hooks.shown() !== cur){ hooks.show(cur) }
    if(cur === tgtK && drop > .5 && curShown !== cur) swap(cur);
    tray.rotation.y = ang; slides.forEach((m, i) => m.position.y = .33 - (i === cur ? ease(drop)*.5 : 0));
    lamp += (lampT - lamp)*Math.min(1, dt*(lampT > lamp ? 1.6 : 5)); const fl = lampT && lamp < .95 ? (.7 + .3*Math.random()) : 1;
    const shutter = .06 + .94*ease(Math.max(0, Math.min(1, (drop - .25)/.75)));
    fade = Math.min(1, fade + dt*(reduce ? 99 : 7)); wallU.uMix.value = fade; settle = Math.max(0, settle - dt*2.4);
    const I = lamp*fl*shutter;
    wallU.uI.value = I; wallU.uTime.value = tm; wallU.uBlur.value = reduce ? 0 : settle*settle*.006;
    wallU.uJit.value.set(reduce ? 0 : (Math.random() - .5)*.0006*I, reduce ? 0 : (Math.sin(tm*1.7)*.0004 + settle*settle*.012));
    bmat.uniforms.uI.value = I; bmat.uniforms.uTime.value = tm; glow.material.opacity = I*.9; dmat.opacity = I*.6;
    bounce.intensity = I*1.25; lampIn.intensity = lamp*1.4; vents.material.opacity = lamp*.35*(.9 + .1*Math.sin(tm*9));
    orb += (orbT - orb)*Math.min(1, dt*(reduce ? 99 : 1.2)); ppx += (px - ppx)*Math.min(1, dt*2.5); ppy += (py - ppy)*Math.min(1, dt*2.5); place(); if(ND) dustUp(dt);
    if(FILE){ const q = [corners[1], corners[0], corners[3], corners[2]].map(c => { tmp.copy(c).project(cam); return [(tmp.x*.5 + .5)*W, (-tmp.y*.5 + .5)*H] });
      ov.style.transform = quad(1500, 1000, q); ov.style.opacity = Math.min(1, I*1.15).toFixed(3) }
    decoSync(I); R.render(sc, cam) };
  const onMove = e => { const r = st.getBoundingClientRect(); px = ((e.clientX - r.left)/r.width - .5)*2; py = ((e.clientY - r.top)/r.height - .5)*2 };
  const onRz = () => { clearTimeout(onRz.t); onRz.t = setTimeout(layout, 120) };
  const io = new IntersectionObserver(es => { vis = es[0].isIntersecting; last = performance.now(); if(video){ if(vis && curShown === 0) { const p = video.play(); p && p.catch(() => {}) } else video.pause() } }, {threshold:0}); io.observe(st);
  if(!reduce && matchMedia("(hover:hover)").matches) st.addEventListener("pointermove", onMove, {passive:true});
  addEventListener("resize", onRz, {passive:true}); cv.addEventListener("click", hooks.next);
  const kill = () => { if(!alive) return; alive = false; cancelAnimationFrame(raf); io.disconnect(); removeEventListener("resize", onRz); st.removeEventListener("pointermove", onMove);
    if(video){ video.pause(); video.removeAttribute("src"); video.load() } ov.remove(); decoRoot.remove();
    sc.traverse(o => { o.geometry && o.geometry.dispose(); if(o.material) [].concat(o.material).forEach(m => { m.map && m.map.dispose(); m.dispose() }) });
    slideTex.forEach(t => t && t.dispose()); albedo.dispose(); R.dispose() };
  layout(); bindTex();
  raf = requestAnimationFrame(frame);
  return {target:k => { tgtK = k; tc = performance.now() }, power:() => { lampT = 1; if(reduce) lamp = 1; if(video && curShown === 0){ const p = video.play(); p && p.catch(() => {}) } }, orbit:p => { orbT = (p - .5)*.8 }, kill, video:() => video};
};
})();
