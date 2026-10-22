/* Room v3: rendered cardboard model with hover-to-light plates (same idea as the LA desk on work-desk.html).
   Static:  Room.mount(stage, {dir, prefix, hotspotsUrl, hotspots, ...})           one camera angle
   Orbit:   Room.mount(stage, {orbitUrl, orbit, frameSrc:(i,k)=>url, intro, ...})  N pre-rendered angles
   Common:  keys, labels, aria, pad, hint, onSelect(key|null), sound, maxZoom
   Motion:  every input moves a target; one rAF loop eases the view toward it (orbit crossfades
            between neighbouring renders, zoom and pan glide). Selecting an object zooms to it.
   api.hover(key|null), api.select(key|null) */
(function(){
  const NS = "http://www.w3.org/2000/svg";
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  function grow(pts, pad){
    if (!pad) return pts;
    let cx = 0, cy = 0;
    pts.forEach(p => { cx += p[0]; cy += p[1]; });
    cx /= pts.length; cy /= pts.length;
    return pts.map(([x, y]) => {
      const dx = x - cx, dy = y - cy, d = Math.hypot(dx, dy) || 1;
      return [Math.round(x + dx / d * pad), Math.round(y + dy / d * pad)];
    });
  }

  async function getJSON(url, fallback){
    if (url && location.protocol !== "file:"){
      try { const r = await fetch(url, {cache: "no-cache"}); if (r.ok) return await r.json(); } catch (e) {}
    }
    return fallback || null;
  }

  // ---------- sound: synthesized with WebAudio, silent until the visitor turns it on ----------
  function makeSound(){
    let ac = null, master = null, on = false;
    function noise(sec, brown){
      const b = ac.createBuffer(1, Math.floor(ac.sampleRate * sec), ac.sampleRate), d = b.getChannelData(0);
      let last = 0;
      for (let i = 0; i < d.length; i++){
        const w = Math.random() * 2 - 1;
        if (brown){ last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; } else d[i] = w;
      }
      return b;
    }
    function init(){
      ac = new (window.AudioContext || window.webkitAudioContext)();
      master = ac.createGain(); master.gain.value = 0; master.connect(ac.destination);
      // room tone: warm wind through a slowly breathing low-pass
      const src = ac.createBufferSource(); src.buffer = noise(4, true); src.loop = true;
      const lp = ac.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 520; lp.Q.value = 0.6;
      const lfo = ac.createOscillator(); lfo.frequency.value = 0.06;
      const lg = ac.createGain(); lg.gain.value = 260; lfo.connect(lg); lg.connect(lp.frequency);
      const g = ac.createGain(); g.gain.value = 0.22;
      src.connect(lp); lp.connect(g); g.connect(master); src.start(); lfo.start();
    }
    function env(g, t, peak, a, d){
      g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(peak, t + a);
      g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
    }
    return {
      get on(){ return on; },
      toggle(){
        if (!ac) init();
        on = !on;
        if (ac.state === "suspended") ac.resume();
        master.gain.cancelScheduledValues(ac.currentTime);
        master.gain.setTargetAtTime(on ? 0.9 : 0, ac.currentTime, 0.35);
        return on;
      },
      knock(){   // a finger tapping cardboard
        if (!on) return; const t = ac.currentTime;
        [150, 310].forEach((f, i) => {
          const o = ac.createOscillator(); o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(f * 0.7, t + 0.18);
          const g = ac.createGain(); env(g, t, i ? 0.08 : 0.22, 0.004, 0.18);
          o.connect(g); g.connect(master); o.start(t); o.stop(t + 0.25);
        });
        const n = ac.createBufferSource(); n.buffer = noise(0.1, false);
        const bp = ac.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 1800; bp.Q.value = 1.2;
        const g = ac.createGain(); env(g, t, 0.12, 0.002, 0.05);
        n.connect(bp); bp.connect(g); g.connect(master); n.start(t);
      },
      whoosh(inward){
        if (!on) return; const t = ac.currentTime;
        const n = ac.createBufferSource(); n.buffer = noise(0.9, false);
        const bp = ac.createBiquadFilter(); bp.type = "bandpass"; bp.Q.value = 0.9;
        bp.frequency.setValueAtTime(inward ? 350 : 1600, t); bp.frequency.exponentialRampToValueAtTime(inward ? 1600 : 350, t + 0.6);
        const g = ac.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.09, t + 0.25); g.gain.linearRampToValueAtTime(0, t + 0.75);
        n.connect(bp); bp.connect(g); g.connect(master); n.start(t); n.stop(t + 0.9);
      },
      tick(){
        if (!on) return; const t = ac.currentTime;
        const o = ac.createOscillator(); o.frequency.value = 1250;
        const g = ac.createGain(); env(g, t, 0.025, 0.002, 0.04);
        o.connect(g); g.connect(master); o.start(t); o.stop(t + 0.07);
      }
    };
  }

  async function mount(stage, o){
    let data = null, frameSrc;
    if (o.orbitUrl || o.orbit){
      data = await getJSON(o.orbitUrl, o.orbit);
      if (data) frameSrc = o.frameSrc;
    }
    if (!data){
      const s = await getJSON(o.hotspotsUrl, o.hotspots);
      if (!s) return null;
      data = {w: s.w, h: s.h, home: 0, frames: [{spots: s.spots}]};
      frameSrc = (i, k) => `${o.dir}${o.prefix}-${k}.webp`;
    }
    const W = data.w, H = data.h, F = data.frames, N = F.length, HOME = data.home || 0;
    const keys = o.keys || Object.keys(F[HOME].spots);
    const orbit = N > 1, ZMAX = o.maxZoom || 2.5;
    const snd = o.sound ? makeSound() : null;
    const baseImg = stage.querySelector(".plate.base");

    // ---------- layers ----------
    const cam = document.createElement("div"); cam.className = "cam";   // everything that zooms and pans
    stage.prepend(cam); if (baseImg) cam.append(baseImg);
    let cv = null, ctx = null;
    if (orbit){
      cv = document.createElement("canvas");
      cv.className = "plate base-cv"; cv.setAttribute("aria-hidden", "true");
      baseImg ? baseImg.after(cv) : cam.prepend(cv);
      stage.classList.add("orbit");
    }
    const lit = {};
    keys.forEach(k => {
      const im = new Image();
      im.className = "plate lit"; im.dataset.track = k;
      im.alt = ""; im.setAttribute("aria-hidden", "true"); im.decoding = "async";
      cam.append(im); lit[k] = im;
    });
    const svg = document.createElementNS(NS, "svg");
    svg.setAttribute("class", "hits"); svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    const poly = {};
    keys.forEach(k => {
      const p = document.createElementNS(NS, "polygon");
      p.setAttribute("class", "obj"); p.dataset.track = k;
      p.setAttribute("tabindex", "0"); p.setAttribute("role", "button");
      p.setAttribute("aria-label", (o.aria && o.aria[k]) || k);
      svg.append(p); poly[k] = p;
    });
    cam.append(svg);
    const tag = document.createElement("span");
    tag.className = "tag"; tag.setAttribute("aria-hidden", "true"); stage.append(tag);
    if (o.hint){
      const h = document.createElement("span"); h.className = "hint"; h.textContent = o.hint; stage.append(h);
    }

    // ---------- per-frame geometry (hit polygons, tag anchor, bounding box as fractions) ----------
    const geo = F.map(f => {
      const g = {};
      keys.forEach(k => {
        const raw = f.spots[k];
        if (!raw || !raw.length){ g[k] = null; return; }
        const pts = grow(raw, o.pad || 0);
        const xs = raw.map(q => q[0]), ys = raw.map(q => q[1]);
        const x0 = Math.min(...xs) / W, x1 = Math.max(...xs) / W, y0 = Math.min(...ys) / H, y1 = Math.max(...ys) / H;
        g[k] = {pts: pts.map(q => q.join(",")).join(" "), tag: [(x0 + x1) / 2, y0], box: [x0, y0, x1, y1]};
      });
      return g;
    });

    // ---------- frame images ----------
    const bases = new Array(N).fill(null);
    function loadBase(i){
      if (bases[i]) return bases[i].p;
      const im = new Image(); im.decoding = "async";
      const p = new Promise(res => { im.onload = () => { bases[i].ok = true; dirty = true; kick(); res(); }; im.onerror = res; });
      bases[i] = {im, p, ok: false};
      im.src = frameSrc(i, "base");
      return p;
    }
    async function preload(){
      if (!orbit) return;
      const order = [HOME];
      for (let d = 1; d < N; d++){ if (HOME + d < N) order.push(HOME + d); if (HOME - d >= 0) order.push(HOME - d); }
      let n = 0;
      const worker = async () => { while (n < order.length) await loadBase(order[n++]); };
      await Promise.all([worker(), worker(), worker(), worker()]);
    }
    const ready = i => bases[i] && bases[i].ok;
    function nearestReady(i){
      if (ready(i)) return i;
      for (let d = 1; d < N; d++){ if (ready(i - d)) return i - d; if (ready(i + d)) return i + d; }
      return -1;
    }

    // ---------- state: every input sets a target (…T), the loop eases toward it ----------
    let idx = HOME, idxT = HOME, vel = 0;
    let zoom = 1, zoomT = 1, fx = 0, fy = 0, fxT = 0, fyT = 0;
    let hovered = null, selected = null, drag = null, pinch = null, touched = false;
    let shown = -1, drawnKey = "", dirty = true, tagAt = null, raf = 0, last = 0, nav = null;

    const clampPan = () => { fxT = clamp(fxT, 1 - zoomT, 0); fyT = clamp(fyT, 1 - zoomT, 0); };
    function kick(){ if (!raf){ last = performance.now(); raf = requestAnimationFrame(loop); } }
    function loop(now){
      raf = 0;
      const dt = Math.min(50, now - last); last = now;
      if (!drag && Math.abs(vel) > 0.0004){
        idxT = clamp(idxT + vel * dt, 0, N - 1); vel *= Math.pow(0.9, dt / 16);
        if (idxT <= 0 || idxT >= N - 1) vel = 0;
      }
      const kO = reduce ? 1 : 1 - Math.exp(-dt / 85), kZ = reduce ? 1 : 1 - Math.exp(-dt / 140);
      idx += (idxT - idx) * kO; zoom += (zoomT - zoom) * kZ; fx += (fxT - fx) * kZ; fy += (fyT - fy) * kZ;
      if (Math.abs(idxT - idx) < 0.003) idx = idxT;
      if (Math.abs(zoomT - zoom) < 0.0008) zoom = zoomT;
      if (Math.abs(fxT - fx) < 0.0004) fx = fxT;
      if (Math.abs(fyT - fy) < 0.0004) fy = fyT;
      render();
      const busy = idx !== idxT || zoom !== zoomT || fx !== fxT || fy !== fyT || Math.abs(vel) > 0.0004;
      if (busy || (drag && drag.moved) || pinch){ raf = requestAnimationFrame(loop); last = now; }
      else if (!drag && orbit && Math.round(idxT) !== idxT){ idxT = Math.round(idxT); raf = requestAnimationFrame(loop); last = now; }
    }

    function drawBase(){
      if (!orbit) return;
      const a = Math.floor(clamp(idx, 0, N - 1)), b = Math.min(N - 1, a + 1), t = idx - a;
      const A = nearestReady(a); if (A < 0) return;
      const blend = t > 0.02 && ready(b) && A === a;
      const key = A + (blend ? ":" + b + ":" + t.toFixed(2) : "");
      if (key === drawnKey && !dirty) return;
      const im = bases[A].im;
      if (cv.width !== im.naturalWidth){ cv.width = im.naturalWidth; cv.height = im.naturalHeight; }
      ctx = ctx || cv.getContext("2d");
      ctx.globalAlpha = 1; ctx.drawImage(im, 0, 0, cv.width, cv.height);
      if (blend){ ctx.globalAlpha = t; ctx.drawImage(bases[b].im, 0, 0, cv.width, cv.height); ctx.globalAlpha = 1; }
      drawnKey = key; dirty = false;
    }

    function placeTag(){
      if (!tagAt) return;
      tag.style.left = (fx + zoom * tagAt[0]) * 100 + "%";
      tag.style.top = (fy + zoom * tagAt[1]) * 100 + "%";
    }

    function render(){
      drawBase();
      const i = Math.round(clamp(idx, 0, N - 1));
      if (i !== shown){
        shown = i;
        keys.forEach(k => {
          const g = geo[i][k];
          if (g){ poly[k].setAttribute("points", g.pts); poly[k].style.display = ""; }
          else poly[k].style.display = "none";
        });
      }
      const still = Math.abs(idx - i) < 0.08 && Math.abs(idxT - i) < 0.08 && !(drag && drag.moved && !drag.pan);
      const t = still ? (hovered || selected) : null;
      keys.forEach(k => {
        const im = lit[k];
        if (k === t && geo[i][k]){
          const src = frameSrc(i, k);
          if (im.dataset.src !== src){
            im.classList.remove("on"); im.dataset.src = src; im.src = src;
            (im.decode ? im.decode() : Promise.resolve()).then(() => kick()).catch(() => {});
          } else if (im.complete && im.naturalWidth) im.classList.add("on");
        } else im.classList.remove("on");
      });
      stage.classList.toggle("lit-on", !!(t && geo[i][t]));
      const g = t && geo[i][t];
      if (g){ tag.textContent = (o.labels && o.labels[t]) || t; tagAt = g.tag; }
      tag.classList.toggle("on", !!g);
      placeTag();
      cam.style.transform = zoom > 1.0005 ? `translate(${fx * 100}%, ${fy * 100}%) scale(${zoom})` : "";
      stage.classList.toggle("zoomed", zoomT > 1.001);
      stage.classList.toggle("has-sel", !!selected);
      keys.forEach(k => poly[k].classList.toggle("sel", k === selected));
      if (nav){
        nav.prev.disabled = idxT <= 0.01; nav.next.disabled = idxT >= N - 1.01;
        nav.out.disabled = zoomT <= 1.001; nav.in.disabled = zoomT >= ZMAX - 0.001;
      }
    }

    function zoomTo(z, sx, sy){   // sx, sy: 0..1 inside the stage, kept under the cursor
      z = clamp(z, 1, ZMAX);
      const cx = (sx - fxT) / zoomT, cy = (sy - fyT) / zoomT;
      zoomT = z; fxT = sx - cx * z; fyT = sy - cy * z;
      clampPan(); kick();
    }
    function focus(k){
      const g = k && geo[Math.round(idxT)][k];
      if (!g){ zoomT = 1; fxT = 0; fyT = 0; kick(); return; }
      const [x0, y0, x1, y1] = g.box, cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
      const z = clamp(Math.min(0.4 / Math.max(x1 - x0, 0.01), 0.5 / Math.max(y1 - y0, 0.01)), 1.5, ZMAX * 0.9);
      zoomT = z; fxT = 0.5 - cx * z; fyT = 0.5 - cy * z;
      clampPan(); kick();
    }

    const api = {
      hover(k){ hovered = k; kick(); },
      select(k){
        const was = selected; selected = k || null;
        if (o.focusZoom !== false){ if (selected) focus(selected); else if (was) focus(null); }
        if (snd){ if (selected){ snd.knock(); if (selected !== was) snd.whoosh(true); } else if (was) snd.whoosh(false); }
        kick();
      },
      get selected(){ return selected; }
    };
    const pick = k => { o.onSelect ? o.onSelect(k) : api.select(k === selected ? null : k); };

    keys.forEach(k => {
      const q = poly[k];
      q.addEventListener("pointerenter", () => { if (!drag){ api.hover(k); if (snd) snd.tick(); } });
      q.addEventListener("pointerleave", () => api.hover(null));
      q.addEventListener("focus", () => api.hover(k));
      q.addEventListener("blur", () => api.hover(null));
      q.addEventListener("click", () => pick(k));
      q.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " "){ e.preventDefault(); pick(k); } });
    });

    // ---------- input ----------
    const introOn = () => stage.classList.contains("intro-on");
    const pts = new Map(); let suppress = false;
    const swallowClick = () => { suppress = true; setTimeout(() => { suppress = false; }, 0); };
    const ppf = () => stage.clientWidth / (N * 0.9);

    stage.addEventListener("pointerdown", e => {
      if (introOn() || (e.pointerType === "mouse" && e.button !== 0)) return;
      if (e.target.closest && e.target.closest(".orbit-nav,.skip")) return;
      pts.set(e.pointerId, {x: e.clientX, y: e.clientY});
      touched = true; vel = 0;
      if (pts.size === 2){
        const [p1, p2] = [...pts.values()];
        pinch = {d: Math.hypot(p1.x - p2.x, p1.y - p2.y) || 1, z: zoomT};
        drag = null; stage.classList.remove("dragging"); kick();
        return;
      }
      drag = {x: e.clientX, y: e.clientY, i0: idxT, fx0: fxT, fy0: fyT, pan: zoomT > 1.001, moved: false,
              lx: e.clientX, lt: performance.now(), v: 0, id: e.pointerId};
    });
    stage.addEventListener("pointermove", e => {
      if (pts.has(e.pointerId)) pts.set(e.pointerId, {x: e.clientX, y: e.clientY});
      if (pinch){
        if (pts.size < 2) return;
        const [p1, p2] = [...pts.values()], r = stage.getBoundingClientRect();
        const d = Math.hypot(p1.x - p2.x, p1.y - p2.y) || 1;
        zoomTo(pinch.z * d / pinch.d, ((p1.x + p2.x) / 2 - r.left) / r.width, ((p1.y + p2.y) / 2 - r.top) / r.height);
        return;
      }
      if (!drag || e.pointerId !== drag.id) return;
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      if (!drag.moved){
        if (Math.hypot(dx, drag.pan ? dy : 0) < 6) return;
        drag.moved = true; hovered = null;
        try { stage.setPointerCapture(e.pointerId); } catch (_) {}
        stage.classList.add("dragging");
      }
      if (drag.pan){
        fxT = drag.fx0 + dx / stage.clientWidth; fyT = drag.fy0 + dy / stage.clientHeight;
        clampPan(); fx = fxT; fy = fyT; kick(); return;
      }
      if (!orbit) return;
      idxT = clamp(drag.i0 - dx / ppf(), 0, N - 1);
      const now = performance.now(), dt = now - drag.lt;
      if (dt > 0){ drag.v = 0.6 * (-(e.clientX - drag.lx) / ppf() / dt) + 0.4 * drag.v; drag.lx = e.clientX; drag.lt = now; }
      kick();
    });
    const end = e => {
      pts.delete(e.pointerId);
      if (pinch){ if (pts.size < 2){ pinch = null; swallowClick(); kick(); } return; }
      if (!drag || e.pointerId !== drag.id) return;
      const d = drag; drag = null;
      stage.classList.remove("dragging");
      if (d.moved){
        swallowClick();
        if (!d.pan && performance.now() - d.lt < 90) vel = clamp(d.v, -0.03, 0.03);
        kick();
      }
    };
    stage.addEventListener("pointerup", end);
    stage.addEventListener("pointercancel", end);
    stage.addEventListener("click", e => { if (suppress){ e.stopPropagation(); e.preventDefault(); } }, true);
    stage.addEventListener("click", e => {   // click on the room itself (not an object) lets go of the focus
      if (introOn() || !selected) return;
      if (e.target.closest && e.target.closest(".obj,.orbit-nav,.skip")) return;
      pick(null);
    });

    // wheel: scroll zooms over the room; scrolling back at 1x hands control to the page. Sideways swipe turns.
    stage.addEventListener("wheel", e => {
      if (introOn()) return;
      const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 400 : 1;
      const dx = e.deltaX * unit, dy = e.deltaY * unit;
      if (orbit && !e.ctrlKey && Math.abs(dx) > Math.abs(dy) * 1.2){
        e.preventDefault(); touched = true; vel = 0;
        idxT = clamp(idxT + dx / ppf(), 0, N - 1); kick(); return;
      }
      if (dy > 0 && zoomT <= 1.001 && !e.ctrlKey) return;
      e.preventDefault(); touched = true;
      const r = stage.getBoundingClientRect();
      zoomTo(zoomT * Math.exp(-dy * (e.ctrlKey ? 0.012 : 0.0018)), (e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height);
    }, {passive: false});

    stage.addEventListener("keydown", e => {
      if (e.key === "+" || e.key === "="){ e.preventDefault(); zoomTo(zoomT * 1.5, .5, .5); }
      else if (e.key === "-"){ e.preventDefault(); zoomTo(zoomT / 1.5, .5, .5); }
      else if (e.key === "Escape" && selected){ pick(null); }
      else if (orbit && (e.key === "ArrowLeft" || e.key === "ArrowRight")){
        e.preventDefault(); touched = true; vel = 0;
        idxT = clamp(Math.round(idxT) + (e.key === "ArrowLeft" ? 2 : -2), 0, N - 1); kick();
      }
    });

    // ---------- buttons ----------
    const box = document.createElement("div"); box.className = "orbit-nav";
    const btn = (txt, lab, fn) => {
      const b = document.createElement("button"); b.type = "button"; b.textContent = txt; b.setAttribute("aria-label", lab);
      b.addEventListener("click", () => { touched = true; fn(b); });
      box.append(b); return b;
    };
    const gap = () => { const s = document.createElement("span"); s.className = "gap"; box.append(s); };
    nav = {};
    if (orbit){
      nav.prev = btn("‹", "Turn the room left", () => { vel = 0; idxT = clamp(Math.round(idxT) - 4, 0, N - 1); kick(); });
      nav.next = btn("›", "Turn the room right", () => { vel = 0; idxT = clamp(Math.round(idxT) + 4, 0, N - 1); kick(); });
      gap();
    } else { nav.prev = nav.next = {}; }
    nav.out = btn("−", "Zoom out", () => zoomTo(zoomT / 1.5, .5, .5));
    nav.in = btn("+", "Zoom in", () => zoomTo(zoomT * 1.5, .5, .5));
    if (snd){
      gap();
      const s = btn("♪", "Sound", b => { const on = snd.toggle(); b.setAttribute("aria-pressed", on); b.classList.toggle("on", on); });
      s.setAttribute("aria-pressed", "false"); s.classList.add("snd"); s.title = "Sound";
    }
    stage.append(box);

    // ---------- intro camera move ----------
    function afterIntro(){
      if (!orbit || reduce || touched) return;
      setTimeout(() => { if (!touched){ idxT = HOME + 2.5; kick(); } }, 300);
      setTimeout(() => { if (!touched){ idxT = HOME; kick(); } }, 1300);
    }
    if (o.intro && orbit && !reduce){
      const v = document.createElement("video");
      v.className = "intro-video"; v.muted = true; v.defaultMuted = true; v.playsInline = true;
      v.setAttribute("playsinline", ""); v.setAttribute("aria-hidden", "true");
      v.preload = "auto"; if (o.intro.poster) v.poster = o.intro.poster;
      (o.intro.sources || []).forEach(s => { const so = document.createElement("source"); so.src = s.src; so.type = s.type; v.append(so); });
      const skip = document.createElement("button");
      skip.type = "button"; skip.className = "skip"; skip.textContent = "Skip intro";
      stage.classList.add("intro-on"); stage.append(v, skip);
      let done = false;
      const finish = () => {
        if (done) return; done = true;
        stage.classList.remove("intro-on"); v.classList.add("out"); skip.remove();
        setTimeout(() => v.remove(), 800);
        afterIntro();
      };
      v.addEventListener("ended", finish);
      v.addEventListener("error", finish, true);
      skip.addEventListener("click", finish);
      loadBase(HOME).then(() => { const p = v.play(); if (p && p.catch) p.catch(finish); });
      setTimeout(() => { if (!done && v.currentTime === 0) finish(); }, 6000);
    }

    render();
    preload();
    return api;
  }

  window.Room = { mount };
})();
