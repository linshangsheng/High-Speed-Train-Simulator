/* 主程序：场景组装、列车物理、六种视角、主循环 */
(function () {
  const VIEWS = ['驾驶室', '车顶追随', '侧面跟拍', '迎面特写', '空中俯瞰', '车窗', '电影模式'];
  const VMAX = 350 / 3.6;               // 最高 350 km/h
  const $ = HUD.$;

  if (!window.THREE) { $('loading').textContent = '无法加载 three.js，请检查网络连接后刷新页面。'; return; }

  /* ---------- 渲染器 ---------- */
  const canvas = $('stage');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(68, 1, 0.3, 12000);
  scene.add(camera);                                   // 驾驶室模型挂在相机上
  function resize() { renderer.setSize(innerWidth, innerHeight, false); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); if (window.Post) Post.resize(innerWidth, innerHeight, renderer.getPixelRatio()); }
  addEventListener('resize', resize); resize();
  if (window.Post) Post.init(renderer, scene, camera);

  /* ---------- 世界 ---------- */
  const track = Track.build(scene);
  Terrain.init(scene, track.at);
  Tunnels.build(scene);
  Rivers.build(scene, Terrain.waterMat(false));
  Bridges.build(scene, track);
  Scenery.init(scene, track);
  const ourLane = track.lane(-Line.LANE);          // 本车走左线（中国铁路左侧行车）
  const sky = Sky.create(scene, renderer);
  const train = Train.build(scene);
  const weather = Weather.create(scene);
  const traffic = Traffic.create(scene, track);
  const cab = Cab.create(camera);
  const cabin = Interior.build(train.cars[2]);        // 第 3 节车厢客室内景（车窗视角）
  const stops = Stops.create($('stopbox')); stops.state.done = Route.CITIES[0];   // 从昆明站停车位置标出发
  const stopFx = { toast: (t) => HUD.toast(t), chime: () => Sound.chime(), say: (t) => Voice.say(t) };
  const TEMP = { yunnan: 21, tibet: 9, xinjiang: 19, gobi: 24, grassland: 16, snowforest: -11, plain: 23, water: 25, tropical: 30 };
  const cine = Cinema.create(track, $('fade'), $('caption')), cineOut = { want: new THREE.Vector3(), look: new THREE.Vector3() };
  HUD.init(VIEWS, setView);

  // 区域附加参数：薄雾浓度、云量
  const FOGD = { yunnan: 0.35, tibet: 0, xinjiang: 0.15, gobi: 0.1, grassland: 0.05, snowforest: 0.5, plain: 0.3, water: 0.4, tropical: 0.25 };
  const CLEAR = { yunnan: 0.1, tibet: 0.4, xinjiang: 0.7, gobi: 0.8, grassland: 0.2, snowforest: 0, plain: 0.2, water: 0, tropical: 0.1 };

  /* ---------- 状态 ---------- */
  const L = Route.LENGTH;
  const st = { s: Stops.OFFSET, v: 0, throttle: 0, brake: 0, leverN: 0, emg: false, muted: false, soundMode: 0, announced: -1, prevRel: null, cruise: false, target: 0, started: false, nextIdx: 1, visited: 0, view: 0, paused: false, timeMode: 0, phaseOverride: null, running: false, odo: 0, wxMode: 0, quality: 2 };
  const TIME_MODES = [['自动昼夜', null], ['清晨', 0.03], ['正午', 0.25], ['黄昏', 0.46], ['深夜', 0.76]];
  const _v3 = new THREE.Vector3(), _look = new THREE.Vector3(), _want = new THREE.Vector3(), _right = new THREE.Vector3(), _fw = new THREE.Vector3();
  let switchT = 0, camInit = false, orbit = 0, roll = 0, lastYaw = null, shakeT = 0;
  const lookSm = new THREE.Vector3();

  const QUALITY = [
    { name: '低', dpr: 1, shadow: 0, post: 0 },
    { name: '中', dpr: 1.5, shadow: 1024, post: 1 },
    { name: '高', dpr: 2, shadow: 2048, post: 2 }
  ];
  function applyQuality(q) {
    st.quality = q; const Q = QUALITY[q];
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, Q.dpr)); resize();
    const sun = sky.sun;
    sun.castShadow = Q.shadow > 0;
    if (Q.shadow && sun.shadow.mapSize.x !== Q.shadow) { sun.shadow.mapSize.set(Q.shadow, Q.shadow); if (sun.shadow.map) { sun.shadow.map.dispose(); sun.shadow.map = null; } }
    if (window.Post) Post.setLevel(Q.post);
  }

  function setView(i) {
    st.view = (i + VIEWS.length) % VIEWS.length;
    HUD.setView(st.view); switchT = 1.1;
    train.lamps.forEach(l => { l.visible = st.view !== 0; });
    $('cab').classList.toggle('on', false); $('win').classList.toggle('on', false);
    document.body.classList.toggle('cabmode', st.view === 0); document.body.classList.toggle('cinema', st.view === 6);
    if (st.view !== 6) $('fade').style.opacity = 0; else cine.state.shot = null;
    HUD.toast('视角：' + VIEWS[st.view]);
  }
  setView(0);

  // 把 nextIdx 对齐到当前位置（起始时昆明在 s=0，之后要去大理）
  function cityIdxFor(rel) { for (let i = 1; i < Route.CITIES.length; i++) if (Route.CITIES[i].s > rel) return i; return Route.CITIES.length - 1; }

  /* ---------- 中控台（鼠标 / 触屏操作，无键盘控制） ---------- */
  function applySound() { st.muted = st.soundMode === 2; Sound.setMuted(st.muted); Voice.setEnabled(st.soundMode === 0); }
  function setPause(p) { st.paused = p; $('pause').classList.toggle('show', p); Sound.setPaused(p); if (p) Voice.cancel(); }
  HUD.bindConsole({
    lever(n) {
      if (st.cruise) { st.cruise = false; HUD.toast('已退出定速巡航'); }
      st.leverN = n; if (n > 0) st.started = true;
    },
    horn() { Sound.start(); Sound.horn(); },
    emg() {
      st.emg = !st.emg;
      if (st.emg) { st.cruise = false; st.leverN = -7; HUD.setLever(-7, false); HUD.setLocked(true); HUD.toast('紧急制动！停稳后再点一次解除'); }
      else { st.leverN = 0; HUD.setLocked(false); HUD.setLever(0, false); HUD.toast('已解除紧急制动，手柄回到惰行档'); }
    },
    cruise() {
      if (st.emg) { HUD.toast('请先解除紧急制动'); return; }
      if (st.cruise) { st.cruise = false; HUD.toast('已退出定速巡航'); return; }
      if (st.v < 5) { HUD.toast('速度太低：先推手柄加速，再开启定速巡航'); return; }
      st.cruise = true; st.target = st.v; st.leverN = 0; HUD.setLever(0, false);
      HUD.toast('定速巡航 ' + Math.round(st.v * 3.6) + ' km/h · 用 −10 / ＋10 调整');
    },
    adj(d) { if (st.cruise) st.target = Math.max(0, Math.min(VMAX, st.target + d / 3.6)); },
    time() { st.timeMode = (st.timeMode + 1) % TIME_MODES.length; st.phaseOverride = TIME_MODES[st.timeMode][1]; HUD.toast('时间：' + TIME_MODES[st.timeMode][0]); },
    mute() {
      st.soundMode = (st.soundMode + 1) % 3; applySound();
      HUD.toast(['声音：全部开启（含中文播报）', '声音：关闭中文播报，保留音效', '声音：已静音'][st.soundMode]);
    },
    pause() { if (st.running) setPause(!st.paused); },
    weather() { st.wxMode = (st.wxMode + 1) % Weather.MODES.length; HUD.toast('天气：' + Weather.MODES[st.wxMode]); },
    quality() { applyQuality((st.quality + 2) % 3); HUD.toast('画质：' + QUALITY[st.quality].name); }
  });

  // 全屏：点“开始旅程”时自动进入（浏览器要求必须由点击触发），按 ESC 退出；双击画面可再次进入
  function enterFullscreen() {
    const el = document.documentElement, fn = el.requestFullscreen || el.webkitRequestFullscreen || el.msRequestFullscreen;
    if (!fn || document.fullscreenElement || document.webkitFullscreenElement) return;
    try { const p = fn.call(el, { navigationUI: 'hide' }); if (p && p.catch) p.catch(() => {}); } catch (e) {}
  }
  let fsHinted = false;
  document.addEventListener('fullscreenchange', () => {
    if (document.fullscreenElement && !fsHinted) { fsHinted = true; setTimeout(() => HUD.toast('已全屏 · 按 ESC 退出全屏，双击画面可再次全屏'), 600); }
  });
  canvas.addEventListener('dblclick', () => { if (st.running) enterFullscreen(); });

  function startGame() {
    enterFullscreen();
    Sound.start();
    st.running = true; $('start').classList.add('hide');
    $('guide').classList.add('show');
    Sound.horn();
    Voice.welcome(Route.CITIES[1]);
  }
  $('go').addEventListener('click', startGame);

  /* ---------- 物理 ---------- */
  function physics(dt) {
    const n = st.leverN;
    if (st.emg) {
      st.throttle = 0; st.brake += (1 - st.brake) * Math.min(1, dt * 8);
    } else if (st.cruise) {
      const err = st.target - st.v;
      const tT = Math.max(0, Math.min(1, err * 0.35)), bT = Math.max(0, Math.min(0.45, -err * 0.35));
      st.throttle += (tT - st.throttle) * Math.min(1, dt * 3); st.brake += (bT - st.brake) * Math.min(1, dt * 3);
    } else {
      const tT = n > 0 ? n / 10 : 0, bT = n < 0 ? -n / 7 : 0;
      st.throttle += (tT - st.throttle) * Math.min(1, dt * (tT > st.throttle ? 1.4 : 4));
      st.brake += (bT - st.brake) * Math.min(1, dt * (bT > st.brake ? 2.2 : 5));
    }
    const r = Math.max(0, 1 - st.v / VMAX);
    let a = st.throttle * (2.0 * Math.pow(r, 0.8) + 0.02);
    a -= 0.012 + 0.00003 * st.v * st.v;                     // 滚动 + 空气阻力
    if (st.v > 0.01) a -= st.brake * (st.emg ? 3.8 : 2.4);
    st.v = Math.max(0, st.v + a * dt);
    if (st.v < 0.02 && a < 0) st.v = 0;
    st.s += st.v * dt; st.odo += st.v * dt;
  }

  /* ---------- 相机 ---------- */
  function updateCamera(dt, head) {
    const view = st.view;
    if (st.resetCam) { camInit = false; st.resetCam = false; lastYaw = null; }
    _fw.copy(head.dir);
    _right.set(-_fw.z, 0, _fw.x);
    const speedK = st.v / VMAX;
    let rate = 6, fov = 64 + 16 * speedK, eyeOnly = false;
    switchT = Math.max(0, switchT - dt);

    if (view === 0) {                    // 驾驶室
      _want.copy(head.pos).addScaledVector(_fw, Train.CAR_L / 2 - 6.2); _want.y = 3.62;
      _look.copy(_want).addScaledVector(_fw, 80); _look.y -= 1.2;
      rate = 40; fov = 72; eyeOnly = true;          // 视场角固定：驾驶台挂在相机上，变焦会让仪表屏缩小发糊
    } else if (view === 1) {             // 车顶追随
      _want.copy(head.front).addScaledVector(_fw, -50); _want.y = 11;
      _look.copy(head.front).addScaledVector(_fw, 70); _look.y = 2.5;
      rate = 5;
    } else if (view === 2) {             // 侧面跟拍
      _want.copy(head.front).addScaledVector(_fw, -34).addScaledVector(_right, 17); _want.y = 4.2;
      _look.copy(head.front).addScaledVector(_fw, -24); _look.y = 2.6;
      rate = 4; fov = 52 + 10 * speedK;
    } else if (view === 3) {             // 迎面特写（车头前方低机位回看）
      _want.copy(head.front).addScaledVector(_fw, 34).addScaledVector(_right, -4.8); _want.y = 2.1;   // 在本线左侧，避开对向股道
      _look.copy(head.front).addScaledVector(_fw, -2); _look.y = 2.4;
      rate = 5; fov = 58 + 18 * speedK;
    } else if (view === 4) {             // 空中俯瞰
      orbit += dt * 0.16;
      const c = _v3.copy(head.front).addScaledVector(_fw, -40);
      _want.set(c.x + Math.cos(orbit) * 80, 62, c.z + Math.sin(orbit) * 80);
      _look.copy(c); _look.y = 3;
      rate = 3; fov = 55;
    } else if (view === 6) {             // 电影模式（自动导演）
      const o = cine.update({ s: st.s, v: st.v, head, dt }, cineOut);
      _want.copy(o.want); _look.copy(o.look); rate = o.rate; fov = o.fov; eyeOnly = o.fixed;
      if (o.snap) { camera.position.copy(_want); lookSm.copy(_look); }
    } else {                             // 车窗：坐在第 3 节车厢右侧靠窗座位上
      const car = train.cars[2]; car.updateMatrixWorld();
      _want.copy(cabin.eye).applyMatrix4(car.matrixWorld);
      _look.copy(cabin.eye).add(cabin.lookDir).applyMatrix4(car.matrixWorld);
      rate = 1e4; fov = 58; eyeOnly = true;
    }
    if (switchT > 0 && view !== 6 && view !== 5) rate = Math.min(rate, 3.2);

    // 速度前馈，抵消稳态滞后
    if (!eyeOnly) { _want.addScaledVector(_fw, st.v / rate); _look.addScaledVector(_fw, st.v / rate); }
    if (!camInit) { camera.position.copy(_want); lookSm.copy(_look); camInit = true; }
    const k = 1 - Math.exp(-dt * rate);
    camera.position.lerp(_want, k);
    lookSm.lerp(_look, 1 - Math.exp(-dt * Math.min(rate * 1.4, 40)));
    if (view === 5) { camera.position.copy(_want); lookSm.copy(_look); }   // 与车厢刚性固连

    // 车体颠簸 + 弯道侧倾
    shakeT += dt;
    const sh = speedK * (view === 0 || view === 5 ? 1 : 0.25);
    camera.position.y += Math.sin(shakeT * 31) * 0.012 * sh + Math.sin(shakeT * 13.3) * 0.01 * sh;
    const pk = traffic.state.shake * (view === 0 || view === 5 ? 1 : 0.3);   // 会车气浪
    if (pk > 0.01) { camera.position.addScaledVector(_right, Math.sin(shakeT * 47) * 0.05 * pk); camera.position.y += Math.sin(shakeT * 39) * 0.03 * pk; }
    const yaw = head.yaw;
    let yawRate = 0;
    if (lastYaw !== null && dt > 0) { let d = yaw - lastYaw; d = Math.atan2(Math.sin(d), Math.cos(d)); yawRate = d / dt; }
    lastYaw = yaw;
    roll += (Math.max(-0.07, Math.min(0.07, yawRate * 0.7 * Math.min(1, speedK * 2))) - roll) * Math.min(1, dt * 3);
    if (view === 0 || view === 5) camera.up.set(0, 1, 0).addScaledVector(_right, -roll * 1.0).normalize(); else camera.up.set(0, 1, 0);
    camera.lookAt(lookSm);

    if (st.dbg) { camera.position.set(...st.dbg.pos(head)); camera.up.set(0, 1, 0); camera.lookAt(...st.dbg.look(head)); }   // 调试用相机
    if (Math.abs(camera.fov - fov) > 0.05) { camera.fov += (fov - camera.fov) * Math.min(1, dt * 3); camera.updateProjectionMatrix(); }
  }

  /* ---------- 主循环 ---------- */
  const _info = { a: null, b: null, k: 0, fogDensity: 0, cloudClear: 0 };
  let last = performance.now(), frame = 0, lastTunnel = -1, lastBridge = null;
  const _glow = new THREE.Color(), _white = new THREE.Color(1, 1, 1);

  const aq = { t: 0, n: 0, cool: 6 };
  function autoQuality(real) {
    // 只会自动从“高”降到“中”，不会自动降到“低”（低画质分辨率只有 1 倍，文字和仪表会明显发糊）；需要连续两次检测都偏低才降
    if (!st.running || st.paused || real > 0.25 || st.quality <= 1) { aq.t = 0; aq.n = 0; return; }
    aq.cool -= real; if (aq.cool > 0) return;
    aq.t += real; aq.n++;
    if (aq.t > 4) {
      aq.low = aq.n / aq.t < 26 ? (aq.low || 0) + 1 : 0;
      if (aq.low >= 2) { applyQuality(st.quality - 1); HUD.toast('帧率偏低，已自动降为 ' + QUALITY[st.quality].name + ' 画质（可在“画质”按钮手动调整）'); aq.cool = 8; aq.low = 0; }
      aq.t = 0; aq.n = 0;
    }
  }

  function frameStep() {
    requestAnimationFrame(frameStep);
    const now = performance.now();
    let dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (st.paused) dt = 0;
    autoQuality((now - (frameStep.prev || now)) / 1000); frameStep.prev = now;
    if (st.running && !st.paused) physics(dt);

    const head = train.update(st.s, ourLane, sky.state.night);
    if (st.running) traffic.update(dt, st.s, st.v, sky.state.night);
    const ri = Route.regionAt(st.s);
    _info.a = ri.a; _info.b = ri.b; _info.k = ri.k;
    _info.fogDensity = FOGD[ri.a.type] * (1 - ri.k) + FOGD[ri.b.type] * ri.k;
    _info.cloudClear = CLEAR[ri.a.type] * (1 - ri.k) + CLEAR[ri.b.type] * ri.k;

    updateCamera(dt, head);

    // 隧道：洞内视角变暗；外部视角下山体半透明，露出洞内的列车
    const interior = st.view === 0 || st.view === 5;
    const camS = st.view === 0 ? st.s - 6 : st.view === 5 ? st.s - 64 : st.s;
    const cf = Tunnels.factor(camS), tf = interior ? cf.tf : 0;
    let cutIdx = -1;
    Tunnels.list.forEach((t, i) => { const s = Route.wrap(st.s); if (s > t.s0 - 40 && s - 225 < t.s1 + 10) cutIdx = i; });
    Tunnels.setCutaway(cutIdx, !interior && cutIdx >= 0 ? 0.14 : 1, dt);
    const hf = Tunnels.factor(st.s);
    if (hf.idx >= 0 && hf.tf > 0.3) { if (hf.idx !== lastTunnel) { lastTunnel = hf.idx; const t = Tunnels.list[hf.idx]; HUD.tunnel(t.name, t.len); } }
    else if (hf.idx < 0) lastTunnel = -1;
    const br = Bridges.at(st.s);
    if (br && br !== lastBridge) { lastBridge = br; HUD.banner('🌉 ' + br.bridge.name + ' · 跨越' + br.name); Voice.say && Voice.say('列车正在通过' + br.bridge.name); }
    else if (!br) lastBridge = null;

    const W = weather.update(dt, st.s, camera.position, head.dir, st.v, st.wxMode, Sound, tf, 0.12 + 0.88 * sky.state.daylight);
    sky.update(dt, st.s, camera.position, _info, st.phaseOverride, tf, W);
    if (sky.state.hor) { _glow.copy(sky.state.hor).lerp(_white, 0.45).multiplyScalar(0.4 + 0.75 * sky.state.daylight); }
    Tunnels.setGlow(cf.idx, _glow, interior && cf.tf > 0.15);
    Cities.setNight(sky.state.night);
    Scenery.update(dt, st.s + 0, false, camera);
    Flora.tick(dt, W.wind, W.snowCover, W.wet); Terrain.tick(dt); Terrain.setWeather(W.snowCover, W.wet);
    const dom = ri.k < 0.5 ? ri.a : ri.b;
    Drops.update(dt, W.rain * (1 - tf), st.v * 3.6, interior, st.view);
    Sound.update(st.v, st.odo, interior, tf, W, sky.state.daylight, dt);
    if (W.rbNew) { W.rbNew = false; HUD.toast('🌈 雨过天晴，天边出现了彩虹'); }

    // 城市到达
    const lap = Math.floor(st.s / L), rel = st.s - lap * L;
    const cities = Route.CITIES;
    const absIdx = lap * (cities.length - 1) + st.nextIdx;
    if (st.prevRel == null) st.prevRel = rel;
    if (st.running && st.nextIdx < cities.length) {
      const c = cities[st.nextIdx];
      // 穿越检测：越过城市弧长（终点昆明在圈首尾相接处，用回绕判断），避免高速下漏掉
      const crossed = c.loop ? (st.prevRel > L * 0.9 && rel < L * 0.1) : (st.prevRel < c.s && rel >= c.s && rel - st.prevRel < 400);
      if (crossed) {
        st.visited++; HUD.card(c, st.nextIdx, cities.length - 1); Sound.chime();
        st.nextIdx++; if (st.nextIdx >= cities.length) st.nextIdx = 1;   // 环线：下一圈从大理开始
        Voice.arrive(c, cities[st.nextIdx]); st.holdUntil = performance.now() + 14000;   // 到站播报期间不插播预告
      }
    }
    st.prevRel = rel;
    // 保证 nextIdx 与位置一致（防止跳站、圈数切换后错位）
    if (st.running && frame % 30 === 0) {
      const expect = cityIdxFor(rel);
      if (expect !== st.nextIdx && !(st.nextIdx === 1 && expect === cities.length - 1)) st.nextIdx = expect;
    }
    const nextC = cities[st.nextIdx], prevC = cities[Math.max(0, st.nextIdx - 1)];
    let distToNext = nextC.s - rel; if (distToNext < 0) distToNext += L;
    const legSpan = Math.max(1, nextC.s - prevC.s);
    if (st.running && !st.paused && st.announced !== st.nextIdx && distToNext < Math.min(1500, legSpan * 0.55) && distToNext > 150 && st.v > 8 && performance.now() > (st.holdUntil || 0)) {
      st.announced = st.nextIdx; Voice.approach(nextC); HUD.toast('📢 前方到站：' + nextC.name + '站');
    }

    // 精准停站
    const so = stops.update(dt, { s: st.s, v: st.v, leverN: st.leverN, cruise: st.cruise, emg: st.emg, running: st.running }, stopFx);

    {   // 3D 驾驶室仪表
      const hour = ((6 + sky.state.phase * 24) % 24 + 24) % 24, ahead = [];
      for (let k = 0; k < 3; k++) { const c = cities[(st.nextIdx - 1 + k) % (cities.length - 1) + 1]; let d = c.s - rel; if (d < 0) d += L; ahead.push({ name: c.name, km: Math.round(d * Route.KM_PER_UNIT).toLocaleString() }); }
      const stopA = so.show && so.mode === 'approach' && !st.cruise;
      const limit = st.cruise ? st.target * 3.6 : stopA ? Math.min(350, so.vAdv) : 350;
      cab.update(dt, st.view === 0 && !st.dbg, {
        stop: stopA ? { d: so.d, name: so.name, tip: so.tip, tone: so.tone } : null, doors: so.show && so.mode === 'dwell',
        kmh: st.v * 3.6, limit, over: st.v * 3.6 > limit + 3, next: nextC.name, nextKm: Math.max(0, Math.round(distToNext * Route.KM_PER_UNIT)).toLocaleString(),
        mode: st.emg ? '紧急制动' : st.cruise ? '定速巡航 · CTCS-3 完全监控' : 'CTCS-3 完全监控', leg: Math.min(1, Math.max(0, 1 - distToNext / legSpan)),
        clock: String(Math.floor(hour)).padStart(2, '0') + ':' + String(Math.floor((hour % 1) * 60)).padStart(2, '0'),
        throttle: st.throttle, brake: st.brake, region: dom.name, weather: W.label, ahead, leverN: st.leverN, emg: st.emg, cruise: st.cruise, night: sky.state.night
      });
      const temp = Math.round((TEMP[ri.a.type] * (1 - ri.k) + TEMP[ri.b.type] * ri.k) - 6 * sky.state.night - 8 * (W.snowCover || 0) - 3 * (W.wet || 0));
      cabin.update(dt, st.view === 5 && !st.dbg, { train: '2026', next: nextC.name, nextKm: ahead[0].km, kmh: st.v * 3.6, temp, dark: Math.max(sky.state.night, tf) });
    }

    frame++;
    if (frame % 2 === 0) {
      const hour = ((6 + sky.state.phase * 24) % 24 + 24) % 24;
      HUD.update({
        kmh: st.v * 3.6, throttle: st.throttle, brake: st.brake, cruise: st.cruise, started: st.started, emg: st.emg,
        target: st.target * 3.6, muted: st.muted, soundMode: st.soundMode, paused: st.paused, timeName: TIME_MODES[st.timeMode][0], wxLabel: W.label, qLabel: QUALITY[st.quality].name,
        clock: String(Math.floor(hour)).padStart(2, '0') + ':' + String(Math.floor((hour % 1) * 60)).padStart(2, '0'),
        region: dom.name, sub: prevC.name + ' → ' + nextC.name,
        nextName: nextC.name, nextKm: Math.max(0, Math.round(distToNext * Route.KM_PER_UNIT)).toLocaleString(),
        leg: Math.min(1, Math.max(0, 1 - distToNext / legSpan)),
        pct: ((rel / L) * 100), odo: Math.round(st.odo * Route.KM_PER_UNIT).toLocaleString(), visited: Math.min(st.visited, cities.length - 1)
      });
      HUD.drawMap(st.s, nextC);
    }
    if (window.Post && Post.active()) Post.render(dt, (st.v / VMAX) * (st.view === 0 ? 0 : st.view === 5 ? 0 : st.view === 6 ? 0.6 : 1)); else renderer.render(scene, camera);
  }

  /* ---------- 启动 ---------- */
  const t0 = track.at(st.s); // 预热
  train.update(st.s, ourLane, 0);
  Scenery.update(0, st.s, true);
  applyQuality(2);
  $('go').disabled = false; $('go').textContent = '开始旅程'; $('loading').textContent = '点击按钮发车 · 全程鼠标操作中控台 · 建议使用 Chrome / Edge，需联网加载 three.js';
  window.__game = { st, train, camera, scene, renderer, sky, Scenery, weather, traffic, setView, cabin, startGame, stops };   // 调试用
  frameStep();
})();
