/* HUD：速度仪表、右上角地图、区域信息、到站卡片、视角按钮 */
(function () {
  const $ = (id) => document.getElementById(id);
  const MAXKMH = 400;
  const A0 = 150, SWEEP = 240;

  function pol(cx, cy, r, deg) { const a = deg * Math.PI / 180; return [cx + r * Math.cos(a), cy + r * Math.sin(a)]; }
  function arcPath(cx, cy, r, d0, d1) {
    const [x0, y0] = pol(cx, cy, r, d0), [x1, y1] = pol(cx, cy, r, d1);
    return 'M' + x0.toFixed(2) + ' ' + y0.toFixed(2) + ' A' + r + ' ' + r + ' 0 ' + ((d1 - d0) > 180 ? 1 : 0) + ' 1 ' + x1.toFixed(2) + ' ' + y1.toFixed(2);
  }

  /* ---------- 仪表 ---------- */
  let needle, prog, digital, unitTxt;
  const PROG_LEN = Math.PI * 2 * 112 * (SWEEP / 360);
  function buildGauge() {
    const cx = 150, cy = 118, R = 112;
    let ticks = '', labels = '';
    for (let v = 0; v <= MAXKMH; v += 20) {
      const a = A0 + SWEEP * v / MAXKMH, major = v % 100 === 0, mid = v % 50 === 0;
      const [x0, y0] = pol(cx, cy, R - (major ? 14 : 8), a), [x1, y1] = pol(cx, cy, R - 1, a);
      ticks += '<line x1="' + x0 + '" y1="' + y0 + '" x2="' + x1 + '" y2="' + y1 + '" stroke="' + (v > 350 ? '#ff6a5a' : '#cfe8f6') + '" stroke-width="' + (major ? 2.6 : 1.3) + '" opacity="' + (major ? 1 : .6) + '"/>';
      if (v % 100 === 0 || v === 50 && false) { const [lx, ly] = pol(cx, cy, R - 28, a); labels += '<text x="' + lx + '" y="' + (ly + 4) + '" text-anchor="middle" fill="#a8c8dc" font-size="12" font-weight="600">' + v + '</text>'; }
    }
    $('gauge').innerHTML =
      '<svg viewBox="0 0 300 210">' +
      '<defs><linearGradient id="pg" x1="0" x2="1"><stop offset="0" stop-color="#4fd8ff"/><stop offset=".65" stop-color="#ffcf5a"/><stop offset="1" stop-color="#ff6a5a"/></linearGradient>' +
      '<radialGradient id="bg" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#16314c"/><stop offset="1" stop-color="#0a1626" stop-opacity="0"/></radialGradient>' +
      '<filter id="gl"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>' +
      '<circle cx="' + cx + '" cy="' + cy + '" r="128" fill="url(#bg)"/>' +
      '<path d="' + arcPath(cx, cy, R, A0, A0 + SWEEP) + '" fill="none" stroke="rgba(255,255,255,.12)" stroke-width="9" stroke-linecap="round"/>' +
      '<path id="gprog" d="' + arcPath(cx, cy, R, A0, A0 + SWEEP) + '" fill="none" stroke="url(#pg)" stroke-width="9" stroke-linecap="round" stroke-dasharray="' + PROG_LEN + '" stroke-dashoffset="' + PROG_LEN + '" filter="url(#gl)"/>' +
      ticks + labels +
      '<g id="gneedle" transform="rotate(' + A0 + ' ' + cx + ' ' + cy + ')"><path d="M' + (cx - 14) + ' ' + (cy - 2.4) + 'L' + (cx + R - 18) + ' ' + cy + 'L' + (cx - 14) + ' ' + (cy + 2.4) + 'Z" fill="#ff7a5a" filter="url(#gl)"/></g>' +
      '<circle cx="' + cx + '" cy="' + cy + '" r="9" fill="#1a2a3c" stroke="#4fd8ff" stroke-width="2"/>' +
      '<text id="gdig" x="' + cx + '" y="' + (cy + 52) + '" text-anchor="middle" fill="#fff" font-size="44" font-weight="700" font-family="Segoe UI,Arial" letter-spacing="1">0</text>' +
      '<text x="' + cx + '" y="' + (cy + 70) + '" text-anchor="middle" fill="#8fb0c8" font-size="13" letter-spacing="3">km/h</text>' +
      '</svg>';
    needle = $('gneedle'); prog = $('gprog'); digital = $('gdig');
  }

  /* ---------- 地图 ---------- */
  const OUTLINE = [[73.5,39.5],[75,37],[78.5,35.5],[79,32.5],[81,30],[84,28.5],[88,27.8],[92,27.8],[96,28.3],[97.5,28.5],[98.7,27],[98.7,24.5],[101,21.2],[103,22.5],[106.5,22.8],[108,21.5],[110.2,20.3],[111,21.5],[114,22.3],[117,23.5],[119.5,25.5],[121.2,28],[122,30.5],[121.5,32.5],[120.8,35],[122.5,37],[119,37.5],[117.8,38.5],[121,40.8],[124,40],[126,41.3],[128.5,42],[130.5,42.7],[131,44.5],[133.5,48],[135,48.4],[132,47.7],[130,48.9],[127.5,50],[125,53.4],[121,53.3],[119.5,50.2],[117.5,49.6],[116.5,47.8],[119.7,46.6],[118,45],[113,44.8],[111.5,43.5],[106,42],[100,42.6],[96.4,42.7],[95,44.5],[91,45.1],[90.5,47.9],[87.6,49.2],[85.5,47],[83,47.2],[80.5,45],[80.2,42.5],[76,40.8]];
  const HAINAN = [[108.7,19.5],[110,20.1],[111,19.7],[110.2,18.4],[109,18.3]];
  const TAIWAN = [[120.1,22.6],[121.6,25.1],[121,25.3],[120.1,23.6]];
  const MAJOR = new Set(['昆明', '拉萨', '喀什', '乌鲁木齐', '呼和浩特', '哈尔滨', '北京', '上海', '广州', '三亚', '兰州', '敦煌']);
  let mapCv, mctx, mbase, mpts = [], mcity = [], mapScale, mapOff;

  function buildMap() {
    mapCv = $('map'); mctx = mapCv.getContext('2d');
    const W = mapCv.width, H = mapCv.height;
    // 取外轮廓范围
    let minx = 1e9, maxx = -1e9, minz = 1e9, maxz = -1e9;
    const all = OUTLINE.concat(HAINAN).map(p => Route.proj(p[0], p[1]));
    for (const p of all) { minx = Math.min(minx, p.x); maxx = Math.max(maxx, p.x); minz = Math.min(minz, p.z); maxz = Math.max(maxz, p.z); }
    const pad = 22;
    mapScale = Math.min((W - pad * 2) / (maxx - minx), (H - pad * 2) / (maxz - minz));
    mapOff = [(W - (maxx - minx) * mapScale) / 2 - minx * mapScale, (H - (maxz - minz) * mapScale) / 2 - minz * mapScale];
    const toM = (p) => [p.x * mapScale + mapOff[0], p.z * mapScale + mapOff[1]];

    // 预渲染底图
    mbase = document.createElement('canvas'); mbase.width = W; mbase.height = H;
    const g = mbase.getContext('2d');
    const poly = (arr, fill, stroke) => {
      g.beginPath(); arr.forEach((p, i) => { const [x, y] = toM(Route.proj(p[0], p[1])); i ? g.lineTo(x, y) : g.moveTo(x, y); }); g.closePath();
      g.fillStyle = fill; g.fill(); g.strokeStyle = stroke; g.lineWidth = 2; g.stroke();
    };
    // 网格
    g.strokeStyle = 'rgba(120,190,240,.07)'; g.lineWidth = 1;
    for (let x = 0; x < W; x += 40) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke(); }
    for (let y = 0; y < H; y += 40) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
    poly(OUTLINE, 'rgba(60,120,170,.28)', 'rgba(120,200,255,.55)');
    poly(HAINAN, 'rgba(60,120,170,.28)', 'rgba(120,200,255,.55)');
    poly(TAIWAN, 'rgba(60,120,170,.28)', 'rgba(120,200,255,.55)');

    // 路线采样
    const N = 700;
    for (let i = 0; i <= N; i++) { const p = Route.curve.getPointAt(i / N); mpts.push(toM(p)); }
    mcity = Route.CITIES.map(c => ({ c, xy: toM(c.pos), major: MAJOR.has(c.name) }));
  }

  function drawMap(s, nextCity) {
    const W = mapCv.width, H = mapCv.height, g = mctx;
    g.clearRect(0, 0, W, H); g.drawImage(mbase, 0, 0);
    const N = mpts.length - 1, u = Route.wrap(s) / Route.LENGTH, upto = Math.floor(u * N);
    // 全程虚线
    g.setLineDash([8, 7]); g.strokeStyle = 'rgba(190,225,255,.45)'; g.lineWidth = 3; g.beginPath();
    mpts.forEach((p, i) => i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); g.stroke(); g.setLineDash([]);
    // 已走过
    g.save(); g.shadowColor = '#4fd8ff'; g.shadowBlur = 12; g.strokeStyle = '#4fd8ff'; g.lineWidth = 5; g.lineCap = 'round'; g.lineJoin = 'round';
    g.beginPath(); for (let i = 0; i <= upto; i++) i ? g.lineTo(mpts[i][0], mpts[i][1]) : g.moveTo(mpts[i][0], mpts[i][1]); g.stroke(); g.restore();
    // 城市
    g.font = '600 17px "Microsoft YaHei",sans-serif'; g.textBaseline = 'middle';
    for (const m of mcity) {
      const passed = m.c.s <= Route.wrap(s) + 1, isNext = nextCity && m.c === nextCity;
      g.beginPath(); g.arc(m.xy[0], m.xy[1], isNext ? 6 : m.major ? 5 : 3.5, 0, 7);
      g.fillStyle = passed ? '#ffcf5a' : isNext ? '#ffffff' : 'rgba(255,255,255,.75)'; g.fill();
      if (isNext) { g.strokeStyle = 'rgba(255,255,255,.6)'; g.lineWidth = 2; g.beginPath(); g.arc(m.xy[0], m.xy[1], 10 + (performance.now() % 1200) / 1200 * 8, 0, 7); g.stroke(); }
      if (m.major || isNext) {
        g.fillStyle = isNext ? '#ffffff' : passed ? '#ffe39a' : '#cfe3f2';
        g.lineWidth = 3; g.strokeStyle = 'rgba(8,18,32,.85)';
        const lx = m.xy[0] + 8, txt = m.c.name; g.strokeText(txt, lx, m.xy[1] - 1); g.fillText(txt, lx, m.xy[1] - 1);
      }
    }
    // 列车标记
    const t = mpts[Math.min(N, upto)];
    const pulse = (performance.now() % 1000) / 1000;
    g.beginPath(); g.arc(t[0], t[1], 8 + pulse * 14, 0, 7); g.strokeStyle = 'rgba(255,120,90,' + (1 - pulse) * .8 + ')'; g.lineWidth = 3; g.stroke();
    g.beginPath(); g.arc(t[0], t[1], 7, 0, 7); g.fillStyle = '#ff6a5a'; g.fill(); g.strokeStyle = '#fff'; g.lineWidth = 2.5; g.stroke();
  }

  /* ---------- 视角按钮 ---------- */
  let viewBtns = [];
  function buildViews(names, onPick) {
    const box = $('views'); box.innerHTML = '';
    names.forEach((n, i) => {
      const b = document.createElement('button'); b.innerHTML = '<kbd>' + (i + 1) + '</kbd>' + n;
      b.onclick = () => { onPick(i); b.blur(); }; box.appendChild(b); viewBtns.push(b);
    });
  }
  function setView(i) { viewBtns.forEach((b, k) => b.classList.toggle('on', k === i)); }

  /* ---------- 主控手柄：+10 (最大牵引) … 0 (惰行) … -7 (最大常用制动) ---------- */
  const N_MAX = 10, N_MIN = -7, KNOB_PAD = 17;
  let lever = { n: 0, onChange: null, locked: false, dragging: false };
  function leverY(n) { const h = $('ltrack').clientHeight; return KNOB_PAD + (N_MAX - n) / (N_MAX - N_MIN) * (h - KNOB_PAD * 2); }
  function leverFromY(clientY) {
    const r = $('ltrack').getBoundingClientRect(), sc = r.height / $('ltrack').offsetHeight;   // 兼容整体缩放
    const y = (clientY - r.top) / sc, h = $('ltrack').offsetHeight;
    const f = Math.min(1, Math.max(0, (y - KNOB_PAD) / (h - KNOB_PAD * 2)));
    return Math.round(N_MAX - f * (N_MAX - N_MIN));
  }
  function renderLever() {
    $('lknob').style.top = leverY(lever.n) + 'px';
    $('lever').classList.toggle('brake', lever.n < 0);
    $('lever').classList.toggle('locked', lever.locked);
  }
  function setLever(n, fromUser) {
    n = Math.max(N_MIN, Math.min(N_MAX, n));
    if (n === lever.n) { return; }
    lever.n = n; renderLever();
    if (fromUser && lever.onChange) lever.onChange(n);
  }
  function setLocked(b) { lever.locked = b; renderLever(); }
  function buildLever() {
    const sc = $('lscale'), tr = $('ltrack'); sc.innerHTML = '';
    tr.querySelectorAll('.tk').forEach(e => e.remove());
    const h = 226 - 2;
    for (let n = N_MAX; n >= N_MIN; n--) {
      const y = KNOB_PAD + (N_MAX - n) / (N_MAX - N_MIN) * (h - KNOB_PAD * 2);
      const tk = document.createElement('div'); tk.className = 'tk' + (n === 0 ? ' zero' : ''); tk.style.top = y + 'px'; tr.appendChild(tk);
      let txt = null, cls = '';
      if (n > 0 && n % 2 === 0) { txt = '牵引 ' + n; cls = 'up'; }
      else if (n === 0) { txt = '0 惰行'; cls = 'zero'; }
      else if (n < 0 && n % 2 !== 0) { txt = '制动 ' + (-n); cls = 'dn'; }
      if (txt) { const lb = document.createElement('div'); lb.className = 'lb ' + cls; lb.style.top = (y + 1) + 'px'; lb.textContent = txt; sc.appendChild(lb); }
    }
    const el = $('ltrack');
    const move = (e) => { if (lever.locked) return; setLever(leverFromY(e.clientY), true); };
    el.addEventListener('pointerdown', (e) => { if (lever.locked) { toast('紧急制动中：请先点击“紧急制动”解除'); return; } lever.dragging = true; el.setPointerCapture(e.pointerId); move(e); e.preventDefault(); });
    el.addEventListener('pointermove', (e) => { if (lever.dragging) move(e); });
    const up = () => { lever.dragging = false; };
    el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
    $('lever').addEventListener('wheel', (e) => { e.preventDefault(); if (lever.locked) return; setLever(lever.n + (e.deltaY < 0 ? 1 : -1), true); }, { passive: false });
    sc.addEventListener('pointerdown', (e) => { if (!lever.locked) setLever(leverFromY(e.clientY), true); });
    renderLever();
  }

  /* ---------- 提示 / 卡片 ---------- */
  let toastT, cardT;
  function toast(msg) { const t = $('toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 1800); }
  function card(city, idx, total) {
    $('cn').textContent = city.name; $('cd').textContent = city.desc;
    $('cp').textContent = city.loop ? '🎉 环中国一周完成！' : '第 ' + idx + ' / ' + total + ' 站';
    const e = $('card'); e.classList.add('show'); clearTimeout(cardT); cardT = setTimeout(() => e.classList.remove('show'), city.loop ? 7000 : 4600);
  }

  let lastRegion = '', rnameEl, lastNotch = '';
  function update(o) {
    needle.setAttribute('transform', 'rotate(' + (A0 + SWEEP * Math.min(1, o.kmh / MAXKMH)) + ' 150 118)');
    prog.setAttribute('stroke-dashoffset', PROG_LEN * (1 - Math.min(1, o.kmh / MAXKMH)));
    digital.textContent = Math.round(o.kmh);
    // 手柄读数 + 状态
    const ln = lever.n;
    const n = o.emg ? '紧急制动' : o.cruise ? '定速巡航' : ln > 0 ? '牵引 ' + ln + ' 档' : ln < 0 ? '制动 ' + (-ln) + ' 档' : '惰行';
    if (n !== lastNotch) { $('notch').textContent = n; lastNotch = n; }
    const sb = $('statebadge');
    sb.textContent = o.emg ? '紧急制动' : o.kmh < 1 ? (o.started ? '停车' : '待发') : o.cruise ? '巡航' : o.brake > 0.05 ? '制动中' : o.throttle > 0.05 ? '加速中' : '惰行';
    sb.className = o.emg ? 'emg' : o.cruise ? 'cruise' : '';
    $('clock').textContent = o.clock;
    $('bCruise').classList.toggle('on', o.cruise); $('bEmg').classList.toggle('on', o.emg);
    $('cruiseadj').classList.toggle('show', o.cruise); $('ctarget').textContent = Math.round(o.target);
    $('cruisesub').textContent = o.cruise ? '点击退出巡航' : '保持当前速度';
    $('emgsub').textContent = o.emg ? '点击解除' : '点击立即刹停';
    $('timesub').textContent = o.timeName; $('wxsub').textContent = o.wxLabel; $('qsub').textContent = o.qLabel;
    $('mutesub').textContent = ['全部开启', '无播报', '已静音'][o.soundMode || 0]; $('bMute').classList.toggle('on', (o.soundMode || 0) !== 0);
    $('pausesub').textContent = o.paused ? '点击继续' : '点击暂停'; $('bPause').classList.toggle('on', o.paused);
    // 区域
    if (o.region !== lastRegion) { lastRegion = o.region; $('rname').textContent = o.region; }
    $('rsub').textContent = o.sub;
    $('nextcity').textContent = o.nextName; $('nextdist').textContent = o.nextKm + ' km';
    $('legbar').style.width = (o.leg * 100).toFixed(1) + '%';
    $('pct').textContent = o.pct.toFixed(1) + '%';
    $('odo').textContent = o.odo; $('visited').textContent = o.visited;
    $('speedfx').style.opacity = Math.max(0, (o.kmh - 200) / 200) * 0.9;
  }

  let tcardT;
  function banner(text) { const e = $('tcard'); e.textContent = text; e.classList.add('show'); clearTimeout(tcardT); tcardT = setTimeout(() => e.classList.remove('show'), 4200); }
  function tunnel(name, meters) {
    const e = $('tcard'); e.textContent = '🚇 ' + name + ' · 长 ' + Math.round(meters).toLocaleString() + ' 米';
    e.classList.add('show'); clearTimeout(tcardT); tcardT = setTimeout(() => e.classList.remove('show'), 3800);
  }

  // 绑定中控台：h = { lever(n), horn(), emg(), cruise(), adj(d), time(), mute(), pause() }
  function bindConsole(h) {
    lever.onChange = h.lever;
    $('bHorn').onclick = h.horn; $('bEmg').onclick = h.emg; $('bCruise').onclick = h.cruise;
    $('bTime').onclick = h.time; $('bMute').onclick = h.mute; $('bPause').onclick = h.pause; $('bWeather').onclick = h.weather; $('bQuality').onclick = h.quality;
    $('cMinus').onclick = () => h.adj(-10); $('cPlus').onclick = () => h.adj(10);
    $('guidebtn').onclick = () => $('guide').classList.toggle('show');
    $('guideclose').onclick = () => $('guide').classList.remove('show');
    $('pause').onclick = h.pause;
    // 按钮点击后失焦，避免空格/回车意外触发
    document.querySelectorAll('button').forEach(b => b.addEventListener('mouseup', () => b.blur()));
  }
  function fitConsole() {
    const need = 176 + 300 + 250 + 24, k = Math.min(1, (innerWidth - 24) / need, (innerHeight - 20) / 700);
    document.documentElement.style.setProperty('--ds', k.toFixed(3));
  }

  function init(viewNames, onPick) {
    buildGauge(); buildMap(); buildViews(viewNames, onPick); buildLever(); fitConsole(); addEventListener('resize', fitConsole);
    $('total').textContent = Math.round(Route.LENGTH * Route.KM_PER_UNIT).toLocaleString();
    $('ncity').textContent = Route.CITIES.length - 1;
  }

  window.HUD = { init, update, drawMap, setView, toast, card, tunnel, banner, bindConsole, setLever, setLocked, lever, $ };
})();
