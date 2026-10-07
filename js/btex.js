/* 建筑贴图与材质：程序化绘制窗户墙面/幕墙/屋瓦/木料等，并提供夜间亮窗(自发光)、积雪、潮湿。 */
(function () {
  const pow2 = (n) => { let p = 1; while (p < n) p <<= 1; return Math.min(1024, p); };
  const R = (a, b) => a + Math.random() * (b - a);
  function cv(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
  function tex(c, srgb) { const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; if (srgb !== false) t.encoding = THREE.sRGBEncoding; return t; }

  function speckle(g, W, H, n, a) { for (let i = 0; i < n; i++) { g.fillStyle = (Math.random() < 0.5 ? 'rgba(0,0,0,' : 'rgba(255,255,255,') + R(0.01, a) + ')'; g.fillRect(Math.random() * W, Math.random() * H, R(1, 3), R(1, 3)); } }
  function stains(g, W, H, n, a) { for (let i = 0; i < n; i++) { const x = Math.random() * W, y = Math.random() * H, h = R(H * 0.08, H * 0.4), w = R(2, 7); const gr = g.createLinearGradient(0, y, 0, y + h); gr.addColorStop(0, 'rgba(60,50,40,' + a + ')'); gr.addColorStop(1, 'rgba(60,50,40,0)'); g.fillStyle = gr; g.fillRect(x, y, w, h); } }

  /* ---------- 带窗户的墙面（住宅/民居通用）---------- */
  const WALLS = {
    resi:   { tw: 10.8, th: 17.4, bays: 3, floors: 6, wall: '#ece7de', frame: '#59616a', glass: ['#7f9cb5', '#243546'], winW: 0.56, winH: 0.46, winY: 0.26, sill: 1, balcony: 1, ac: 0.35, lit: 0.4, laundry: 0.14, stain: 14, rough: 0.85 },
    farm:   { tw: 12, th: 6.4, bays: 4, floors: 2, wall: '#f1efe8', frame: '#2f78b8', glass: ['#8fb0c8', '#2a4258'], winW: 0.4, winH: 0.46, winY: 0.3, sill: 1, grid: 1, lit: 0.35, stain: 10, rough: 0.8 },
    bai:    { tw: 12, th: 6.4, bays: 3, floors: 2, wall: '#f6f3ec', frame: '#6a4429', glass: ['#3a4048', '#15181c'], winW: 0.34, winH: 0.5, winY: 0.28, lattice: 1, lintel: '#2a2e33', lit: 0.4, stain: 12, rough: 0.9 },
    jn:     { tw: 12, th: 6.6, bays: 3, floors: 2, wall: '#f8f7f3', frame: '#24282c', glass: ['#4a5560', '#1a2128'], winW: 0.24, winH: 0.4, winY: 0.3, sill: 1, lintel: '#2a2e33', lit: 0.4, stain: 34, rough: 0.9 },
    tibet:  { tw: 12, th: 6.2, bays: 3, floors: 2, wall: '#f4f1ea', frame: '#5a2a1c', glass: ['#14100e', '#050403'], winW: 0.26, winH: 0.42, winY: 0.3, trapezoid: 1, curtain: 1, lit: 0.35, stain: 10, rough: 0.95 },
    xj:     { tw: 12, th: 6.2, bays: 3, floors: 2, wall: '#cfb286', frame: '#2e9aa1', glass: ['#2a2a2a', '#0c0c0c'], winW: 0.28, winH: 0.46, winY: 0.28, arch: 1, lit: 0.35, stain: 18, rough: 0.97, mud: 1 },
    hn:     { tw: 12, th: 9.6, bays: 4, floors: 3, wall: '#f0e7cf', frame: '#d8dde0', glass: ['#7fa0b8', '#27394a'], winW: 0.4, winH: 0.42, winY: 0.3, sill: 1, balcony: 1, ac: 0.4, lit: 0.45, laundry: 0.2, stain: 24, rough: 0.85 },
    ne:     { tw: 12, th: 3.2, bays: 3, floors: 1, wall: '#a9743f', frame: '#efe6d6', glass: ['#8aa4b5', '#26343f'], winW: 0.26, winH: 0.42, winY: 0.3, logs: 1, lit: 0.5, stain: 6, rough: 0.9 },
    palace: { tw: 12, th: 6.2, bays: 3, floors: 2, wall: '#a52a20', frame: '#e8dfcf', glass: ['#0d0a09', '#030303'], winW: 0.22, winH: 0.4, winY: 0.3, trapezoid: 1, lit: 0.3, stain: 8, rough: 0.9 },
    church: { tw: 12, th: 7.2, bays: 3, floors: 2, wall: '#a4462f', frame: '#efe6d8', glass: ['#26343f', '#0b1218'], winW: 0.2, winH: 0.62, winY: 0.16, arch: 1, lit: 0.45, stain: 14, rough: 0.9 },
    bamboo: { tw: 8, th: 3.2, bays: 2, floors: 1, wall: '#b79454', frame: '#5b3f22', glass: ['#2a2018', '#100c08'], winW: 0.22, winH: 0.4, winY: 0.3, weave: 1, lit: 0.3, stain: 6, rough: 0.95 }
  };

  function windowWall(o) {
    const W = pow2(o.tw * 44), H = pow2(o.th * 44), cm = cv(W, H), ce = cv(W, H), g = cm.getContext('2d'), ge = ce.getContext('2d');
    g.fillStyle = o.wall; g.fillRect(0, 0, W, H); ge.fillStyle = '#000'; ge.fillRect(0, 0, W, H);
    const bw = W / o.bays, fh = H / o.floors;
    if (o.logs) { for (let y = 0; y < H; y += H / (o.th / 0.22)) { const gr = g.createLinearGradient(0, y, 0, y + H / (o.th / 0.22)); gr.addColorStop(0, 'rgba(255,220,170,.22)'); gr.addColorStop(0.5, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(40,20,0,.45)'); g.fillStyle = gr; g.fillRect(0, y, W, H / (o.th / 0.22)); } }
    if (o.weave) { g.strokeStyle = 'rgba(70,45,15,.35)'; for (let i = -H; i < W; i += 7) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i + H, H); g.stroke(); g.beginPath(); g.moveTo(i + H, 0); g.lineTo(i, H); g.stroke(); } }
    if (o.mud) { for (let i = 0; i < 260; i++) { g.fillStyle = 'rgba(' + (Math.random() < 0.5 ? '120,90,50,' : '240,220,180,') + R(0.04, 0.12) + ')'; g.beginPath(); g.ellipse(Math.random() * W, Math.random() * H, R(6, 26), R(3, 12), 0, 0, 7); g.fill(); } }
    if (o.grid) { g.strokeStyle = 'rgba(120,120,115,.28)'; for (let x = 0; x < W; x += W / (o.tw / 0.3)) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke(); } for (let y = 0; y < H; y += H / (o.th / 0.6)) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); } }
    speckle(g, W, H, W * H / 70, 0.07); stains(g, W, H, o.stain || 8, 0.07);

    for (let f = 0; f < o.floors; f++) for (let b = 0; b < o.bays; b++) {
      const cx = (b + 0.5) * bw, ww = bw * o.winW, wh = fh * o.winH, x = cx - ww / 2, y = f * fh + fh * o.winY;
      // 窗洞
      if (o.lintel) { g.fillStyle = o.lintel; g.fillRect(x - 3, y - 6, ww + 6, 5); }
      if (o.sill) { g.fillStyle = 'rgba(210,205,195,1)'; g.fillRect(x - 4, y + wh, ww + 8, 5); g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(x - 4, y + wh + 5, ww + 8, 3); }
      const path = (gg, ix, iy, iw, ih) => {
        gg.beginPath();
        if (o.arch) { gg.moveTo(ix, iy + ih); gg.lineTo(ix, iy + iw / 2); gg.arc(ix + iw / 2, iy + iw / 2, iw / 2, Math.PI, 0); gg.lineTo(ix + iw, iy + ih); gg.closePath(); }
        else if (o.trapezoid) { const k = iw * 0.14; gg.moveTo(ix + k, iy); gg.lineTo(ix + iw - k, iy); gg.lineTo(ix + iw, iy + ih); gg.lineTo(ix, iy + ih); gg.closePath(); }
        else gg.rect(ix, iy, iw, ih);
      };
      g.fillStyle = o.frame; path(g, x - 3, y - 3, ww + 6, wh + 6); g.fill();
      const gr = g.createLinearGradient(0, y, 0, y + wh); gr.addColorStop(0, o.glass[0]); gr.addColorStop(0.5, o.glass[1]); gr.addColorStop(1, o.glass[1]);
      g.fillStyle = gr; path(g, x, y, ww, wh); g.fill();
      if (o.curtain) { g.fillStyle = 'rgba(245,240,230,.85)'; g.fillRect(x + ww * 0.08, y + wh * 0.04, ww * 0.34, wh * 0.9); g.fillRect(x + ww * 0.58, y + wh * 0.04, ww * 0.34, wh * 0.9); }
      if (o.lattice) { g.strokeStyle = o.frame; g.lineWidth = 2; for (let i = 1; i < 4; i++) { g.beginPath(); g.moveTo(x + ww * i / 4, y); g.lineTo(x + ww * i / 4, y + wh); g.stroke(); g.beginPath(); g.moveTo(x, y + wh * i / 4); g.lineTo(x + ww, y + wh * i / 4); g.stroke(); } }
      else { g.strokeStyle = o.frame; g.lineWidth = 3; g.beginPath(); g.moveTo(cx, y); g.lineTo(cx, y + wh); g.stroke(); if (o.balcony || o.grid) { g.beginPath(); g.moveTo(x, y + wh * 0.35); g.lineTo(x + ww, y + wh * 0.35); g.stroke(); } }
      // 阳台、空调、晾衣
      if (o.balcony) { g.fillStyle = 'rgba(70,70,70,.55)'; g.fillRect(x - 10, y + wh + 6, ww + 20, 7); g.fillStyle = 'rgba(190,210,225,.35)'; g.fillRect(x - 10, y + wh - 14, ww + 20, 20); g.strokeStyle = 'rgba(60,60,60,.6)'; g.strokeRect(x - 10, y + wh - 14, ww + 20, 20); }
      if (o.ac && Math.random() < o.ac) { g.fillStyle = '#d7d9d6'; g.fillRect(x + ww + 4, y + wh * 0.55, 22, 14); g.fillStyle = '#9aa0a0'; g.fillRect(x + ww + 6, y + wh * 0.55 + 4, 18, 3); }
      if (o.laundry && Math.random() < o.laundry) { for (let i = 0; i < 3; i++) { g.fillStyle = ['#e6636a', '#5b8fd6', '#f2d35a', '#ffffff', '#7fc27a'][Math.floor(Math.random() * 5)]; g.fillRect(x + 4 + i * ww / 3.3, y + wh * 0.2, ww / 4, wh * 0.5); } }
      // 夜间亮窗
      if (Math.random() < o.lit) { const k = R(0.55, 1); ge.fillStyle = 'rgb(' + Math.round(255 * k) + ',' + Math.round(222 * k) + ',' + Math.round(150 * k) + ')'; path(ge, x, y, ww, wh); ge.fill(); }
    }
    const m = tex(cm), e = tex(ce);
    return { map: m, emissive: e, rough: o.rough || 0.9 };
  }

  /* ---------- 玻璃幕墙高楼 ---------- */
  const GLASS = { blue: ['#8ec0e6', '#1c4a78', '#2f3a44'], green: ['#88cdbb', '#1c5c54', '#2c3a38'], gold: ['#e0c88e', '#7a5a22', '#3a3326'], gray: ['#a8b5c2', '#37444f', '#2f353b'], teal: ['#7fd0d8', '#1a5a6c', '#26363c'] };
  function glassTower(v) {
    const W = 512, H = 1024, cm = cv(W, H), ce = cv(W, H), g = cm.getContext('2d'), ge = ce.getContext('2d'), c = GLASS[v], bays = 6, fl = 8, bw = W / bays, fh = H / fl;
    g.fillStyle = c[2]; g.fillRect(0, 0, W, H); ge.fillStyle = '#000'; ge.fillRect(0, 0, W, H);
    for (let f = 0; f < fl; f++) for (let b = 0; b < bays; b++) {
      const x = b * bw + 2, y = f * fh;
      g.fillStyle = '#56626e'; g.fillRect(x, y, bw - 4, fh * 0.26);                         // 窗间墙(层间板)
      const gr = g.createLinearGradient(x, y + fh * 0.28, x + bw * 0.7, y + fh); gr.addColorStop(0, c[0]); gr.addColorStop(1, c[1]);
      g.fillStyle = gr; g.fillRect(x, y + fh * 0.28, bw - 4, fh * 0.72 - 2);
      if (Math.random() < 0.14) { g.fillStyle = 'rgba(235,225,200,.55)'; g.fillRect(x, y + fh * 0.28, bw - 4, fh * 0.72 - 2); }   // 拉上窗帘
      g.fillStyle = 'rgba(255,255,255,.10)'; g.beginPath(); g.moveTo(x, y + fh * 0.28); g.lineTo(x + bw * 0.5, y + fh * 0.28); g.lineTo(x, y + fh); g.closePath(); g.fill();
      if (Math.random() < 0.46) { const k = R(0.5, 1), warm = Math.random() < 0.7; ge.fillStyle = warm ? 'rgb(' + Math.round(255 * k) + ',' + Math.round(225 * k) + ',' + Math.round(160 * k) + ')' : 'rgb(' + Math.round(200 * k) + ',' + Math.round(225 * k) + ',' + Math.round(255 * k) + ')'; ge.fillRect(x, y + fh * 0.28, bw - 4, fh * 0.72 - 2); }
    }
    g.strokeStyle = 'rgba(20,24,28,.7)'; g.lineWidth = 3; for (let b = 0; b <= bays; b++) { g.beginPath(); g.moveTo(b * bw, 0); g.lineTo(b * bw, H); g.stroke(); }
    return { map: tex(cm), emissive: tex(ce), tw: 14.4, th: 31.2 };
  }
  function officeTower() {   // 石材外墙 + 竖向条窗
    const W = 512, H = 1024, cm = cv(W, H), ce = cv(W, H), g = cm.getContext('2d'), ge = ce.getContext('2d'), bays = 6, fl = 8, bw = W / bays, fh = H / fl;
    g.fillStyle = '#d8d4cb'; g.fillRect(0, 0, W, H); ge.fillStyle = '#000'; ge.fillRect(0, 0, W, H); speckle(g, W, H, 9000, 0.06);
    for (let f = 0; f < fl; f++) for (let b = 0; b < bays; b++) {
      const x = b * bw + bw * 0.22, w = bw * 0.56, y = f * fh + fh * 0.14, h = fh * 0.62;
      g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(x - 3, y - 3, w + 6, h + 6);
      const gr = g.createLinearGradient(0, y, 0, y + h); gr.addColorStop(0, '#6e8798'); gr.addColorStop(1, '#1f2c38'); g.fillStyle = gr; g.fillRect(x, y, w, h);
      if (Math.random() < 0.45) { ge.fillStyle = 'rgb(255,' + Math.round(R(200, 235)) + ',' + Math.round(R(130, 170)) + ')'; ge.fillRect(x, y, w, h); }
    }
    return { map: tex(cm), emissive: tex(ce), tw: 14.4, th: 31.2 };
  }
  function shopfront() {     // 裙楼/商铺：大玻璃 + 招牌条
    const W = 512, H = 256, cm = cv(W, H), ce = cv(W, H), g = cm.getContext('2d'), ge = ce.getContext('2d');
    g.fillStyle = '#c9c6bf'; g.fillRect(0, 0, W, H); ge.fillStyle = '#000'; ge.fillRect(0, 0, W, H);
    const cols = ['#c8372f', '#2b5fa8', '#e0a62a', '#2f8a5a', '#8a3d8f', '#222'];
    for (let i = 0; i < 4; i++) { const x = i * 128; g.fillStyle = cols[Math.floor(Math.random() * cols.length)]; g.fillRect(x + 6, 12, 116, 40); ge.fillStyle = 'rgb(255,240,200)'; ge.fillRect(x + 6, 12, 116, 40); g.fillStyle = 'rgba(255,255,255,.85)'; g.fillRect(x + 20, 26, 88, 10); g.fillStyle = '#6d90ac'; g.fillRect(x + 6, 62, 116, 180); ge.fillStyle = 'rgb(255,230,180)'; ge.fillRect(x + 8, 64, 112, 176); g.fillStyle = 'rgba(255,255,255,.14)'; g.fillRect(x + 6, 62, 116, 40); g.strokeStyle = '#333'; g.lineWidth = 3; g.strokeRect(x + 6, 62, 116, 180); }
    return { map: tex(cm), emissive: tex(ce), tw: 16, th: 8 };
  }

  /* ---------- 屋面 ---------- */
  function tileRoof(base, hi, lo) {
    const S = 256, c = cv(S, S), g = c.getContext('2d'); g.fillStyle = base; g.fillRect(0, 0, S, S);
    const rows = 12, rh = S / rows, cols = 16, cw = S / cols;
    for (let r = 0; r < rows; r++) for (let k = 0; k < cols; k++) {
      const x = k * cw + (r % 2) * cw / 2, y = r * rh, b = R(-0.07, 0.07);
      const gr = g.createLinearGradient(x, y, x, y + rh); gr.addColorStop(0, hi); gr.addColorStop(0.65, base); gr.addColorStop(1, lo);
      g.globalAlpha = 0.9; g.fillStyle = gr; g.fillRect(x, y, cw - 1, rh - 1); g.globalAlpha = 1;
      g.fillStyle = b > 0 ? 'rgba(255,255,255,' + b + ')' : 'rgba(0,0,0,' + (-b) + ')'; g.fillRect(x, y, cw - 1, rh - 1);
    }
    g.strokeStyle = 'rgba(0,0,0,.28)'; for (let k = 0; k <= cols; k++) { g.beginPath(); g.moveTo(k * cw, 0); g.lineTo(k * cw, S); g.stroke(); }
    return tex(c);
  }
  function steelRoof(base, rib) {
    const S = 256, c = cv(S, S), g = c.getContext('2d'); g.fillStyle = base; g.fillRect(0, 0, S, S);
    for (let x = 0; x < S; x += 16) { const gr = g.createLinearGradient(x, 0, x + 16, 0); gr.addColorStop(0, rib); gr.addColorStop(0.35, base); gr.addColorStop(0.7, 'rgba(0,0,0,.25)'); gr.addColorStop(1, rib); g.fillStyle = gr; g.fillRect(x, 0, 16, S); }
    for (let y = 0; y < S; y += 128) { g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(0, y, S, 2); }
    speckle(g, S, S, 1600, 0.06); return tex(c);
  }
  function thatchRoof() {
    const S = 256, c = cv(S, S), g = c.getContext('2d'); g.fillStyle = '#9a7a3c'; g.fillRect(0, 0, S, S);
    for (let i = 0; i < 2600; i++) { const x = Math.random() * S, y = Math.random() * S, l = R(10, 40); g.strokeStyle = 'rgba(' + (Math.random() < 0.5 ? '70,48,16,' : '235,205,130,') + R(0.1, 0.4) + ')'; g.lineWidth = R(0.6, 1.6); g.beginPath(); g.moveTo(x, y); g.lineTo(x + R(-2, 2), y + l); g.stroke(); }
    return tex(c);
  }
  function noiseTex(base, amt, lines) {
    const S = 128, c = cv(S, S), g = c.getContext('2d'); g.fillStyle = base; g.fillRect(0, 0, S, S); speckle(g, S, S, 900, amt || 0.12);
    if (lines === 'plank') { g.strokeStyle = 'rgba(0,0,0,.35)'; for (let y = 0; y < S; y += 16) { g.beginPath(); g.moveTo(0, y); g.lineTo(S, y); g.stroke(); } for (let i = 0; i < 160; i++) { g.strokeStyle = 'rgba(0,0,0,.12)'; g.beginPath(); const y = Math.random() * S; g.moveTo(Math.random() * S, y); g.lineTo(Math.random() * S, y + R(-1, 1)); g.stroke(); } }
    if (lines === 'brick') { g.strokeStyle = 'rgba(30,20,15,.5)'; for (let y = 0; y < S; y += 10) { g.beginPath(); g.moveTo(0, y); g.lineTo(S, y); g.stroke(); for (let x = (y / 10 % 2) * 12; x < S; x += 24) { g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + 10); g.stroke(); } } }
    if (lines === 'block') { g.strokeStyle = 'rgba(0,0,0,.28)'; for (let y = 0; y < S; y += 32) { g.beginPath(); g.moveTo(0, y); g.lineTo(S, y); g.stroke(); for (let x = (y / 32 % 2) * 32; x < S; x += 64) { g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + 32); g.stroke(); } } }
    return tex(c);
  }

  /* ---------- 材质注册 ---------- */
  const reg = {}, nightMats = [];
  function patch(m, snow) {
    m.onBeforeCompile = (sh) => {
      sh.uniforms.uSnow = Flora.U.uSnow; sh.uniforms.uWet = Flora.U.uWet;
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', 'uniform float uSnow; uniform float uWet;\n#include <common>')
        .replace('#include <color_fragment>', '#include <color_fragment>\n{ vec3 upV = normalize((viewMatrix*vec4(0.,1.,0.,0.)).xyz); float up = clamp(dot(normalize(vNormal), upV), 0., 1.); diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.9,0.93,0.98), uSnow*smoothstep(' + (snow ? '0.45,0.8' : '0.9,0.99') + ', up)*' + (snow ? '0.95' : '0.55') + '); diffuseColor.rgb *= (1.0 - 0.28*uWet); }');
    };
  }
  function std(map, o) {
    const m = new THREE.MeshStandardMaterial(Object.assign({ map, roughness: 0.9, metalness: 0, envMapIntensity: 0.5 }, o || {}));
    patch(m, !(o && o.noSnow)); return m;
  }

  const builders = {
    // 住宅/民居墙
    w_palace: () => wall('palace'), w_church: () => wall('church'), w_resi: () => wall('resi'), w_farm: () => wall('farm'), w_bai: () => wall('bai'), w_jn: () => wall('jn'), w_tibet: () => wall('tibet'),
    w_xj: () => wall('xj'), w_hn: () => wall('hn'), w_ne: () => wall('ne'), w_bamboo: () => wall('bamboo'),
    // 幕墙
    gl_blue: () => glass('blue'), gl_green: () => glass('green'), gl_gold: () => glass('gold'), gl_gray: () => glass('gray'), gl_teal: () => glass('teal'),
    office: () => { const t = officeTower(); return night(std(t.map, { roughness: 0.7 }), t.emissive); },
    shop: () => { const t = shopfront(); return night(std(t.map, { roughness: 0.5, metalness: 0.1 }), t.emissive); },
    // 屋面
    r_gray: () => std(tileRoof('#575b61', '#7a7f86', '#2f3237'), { roughness: 0.8 }),
    r_red: () => std(tileRoof('#9a4a36', '#bd6b50', '#5a261b'), { roughness: 0.8 }),
    r_slate: () => std(tileRoof('#3c4147', '#59606a', '#1f2327'), { roughness: 0.7 }),
    r_gold: () => std(tileRoof('#d9a928', '#f6d35b', '#8a5f10'), { roughness: 0.4, metalness: 0.45 }),
    r_green: () => std(tileRoof('#2f7a5a', '#4ea883', '#164a34'), { roughness: 0.4, metalness: 0.4 }),
    r_blue: () => std(steelRoof('#2f6ea6', '#5a95c8'), { roughness: 0.45, metalness: 0.5 }),
    r_steel: () => std(steelRoof('#b9bec2', '#e3e6e8'), { roughness: 0.5, metalness: 0.55 }),
    r_thatch: () => std(thatchRoof(), { roughness: 1 }),
    r_flat: () => std(noiseTex('#8c8a84', 0.1, 'block'), { roughness: 0.95 }),
    // 通用
    stone: () => std(noiseTex('#a9a69e', 0.14, 'block'), { roughness: 0.95 }),
    brick: () => std(noiseTex('#8d4a3a', 0.14, 'brick'), { roughness: 0.95 }),
    brick_gray: () => std(noiseTex('#7d7770', 0.12, 'brick'), { roughness: 0.95 }),
    red_wall: () => std(noiseTex('#a8281f', 0.1), { roughness: 0.8 }),
    white: () => std(noiseTex('#f1eee8', 0.06), { roughness: 0.85 }),
    marble: () => std(noiseTex('#e8e6df', 0.05, 'block'), { roughness: 0.4, metalness: 0.05, envMapIntensity: 0.9 }),
    ochre: () => std(noiseTex('#cdb27c', 0.14, 'brick'), { roughness: 0.95 }),
    wood: () => std(noiseTex('#7a5030', 0.18, 'plank'), { roughness: 0.85 }),
    red_wood: () => std(noiseTex('#8f2418', 0.12, 'plank'), { roughness: 0.7 }),
    dark: () => std(noiseTex('#2c2f33', 0.08), { roughness: 0.7, metalness: 0.3 }),
    metal: () => std(noiseTex('#9ba1a6', 0.1), { roughness: 0.4, metalness: 0.8, envMapIntensity: 1 }),
    gold: () => std(noiseTex('#d9aa3a', 0.06), { roughness: 0.3, metalness: 0.9, envMapIntensity: 1.2 }),
    green_dome: () => std(noiseTex('#2f8a6a', 0.1), { roughness: 0.35, metalness: 0.5, envMapIntensity: 1 }),
    red_light: () => { const m = new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 0.1, 0.05).multiplyScalar(2.6) }); m.userData.cast = false; return m; },
    lamp_head: () => { const m = new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 0.92, 0.7).multiplyScalar(1.6) }); m.userData.cast = false; return m; },
    pearl: () => { const m = new THREE.MeshStandardMaterial({ color: 0xd98ab8, roughness: 0.25, metalness: 0.7, envMapIntensity: 1.3, emissive: new THREE.Color(1, 0.35, 0.65), emissiveIntensity: 0 }); nightMats.push(m); return m; },
    yellow: () => std(noiseTex('#e8c14a', 0.06), { roughness: 0.6, noSnow: true }),
    maroon: () => std(noiseTex('#5a2018', 0.1, 'plank'), { roughness: 0.85 }),
    blue_pat: () => std(noiseTex('#1f3f7a', 0.12), { roughness: 0.8 }),
    turq: () => std(noiseTex('#2e9aa1', 0.08), { roughness: 0.6 }),
    flag_b: () => std(noiseTex('#2f6df0', 0.05), { roughness: 0.9, noSnow: true }), flag_w: () => std(noiseTex('#f6f6f6', 0.05), { roughness: 0.9, noSnow: true }),
    flag_r: () => std(noiseTex('#e63a2e', 0.05), { roughness: 0.9, noSnow: true }), flag_g: () => std(noiseTex('#2ea84a', 0.05), { roughness: 0.9, noSnow: true }),
    flag_y: () => std(noiseTex('#f4cc2a', 0.05), { roughness: 0.9, noSnow: true }),
    plastic: () => { const m = new THREE.MeshStandardMaterial({ color: 0xeaf1ee, roughness: 0.35, metalness: 0, transparent: true, opacity: 0.72, side: THREE.DoubleSide, depthWrite: false, envMapIntensity: 1 }); m.userData.cast = false; return m; },
    glass_ins: () => std(noiseTex('#7fb0a6', 0.05), { roughness: 0.2, metalness: 0.3 }),
    glow: () => { const m = new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 0.55, 0.8) }); return m; }
  };
  function wall(k) { const t = windowWall(WALLS[k]); return night(std(t.map, { roughness: t.rough }), t.emissive, WALLS[k]); }
  function glass(k) { const t = glassTower(k); return night(std(t.map, { roughness: 0.22, metalness: 0.55, envMapIntensity: 1.3, noSnow: true }), t.emissive); }
  function night(m, e, o) { m.emissiveMap = e; m.emissive = new THREE.Color(1, 1, 1); m.emissiveIntensity = 0; nightMats.push(m); if (o) { m.userData.tw = o.tw; m.userData.th = o.th; } return m; }

  function mat(key) { return reg[key] || (reg[key] = builders[key]()); }
  function setNight(n) { nightMats.forEach(m => { m.emissiveIntensity = n * 1.15; }); }
  function size(key) { const s = WALLS[key.replace(/^w_/, '')]; return s ? [s.tw, s.th] : key.startsWith('gl_') || key === 'office' ? [14.4, 31.2] : key === 'shop' ? [16, 8] : [4, 4]; }

  window.BTex = { mat, setNight, size, WALLS };
})();
