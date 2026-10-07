/* WebAudio 实时合成音效（无需音频文件）：车轮隆隆、柔和风声、钢轨接缝、鸣笛，
   以及随天气变化的声音：小雨/暴雨、雷声、雪天的静谧、大雾的闷、沙尘的呼啸、晴天鸟鸣、夜晚虫鸣；隧道回响；驾驶室内外闷/亮。
   页面不可见或游戏暂停时自动挂起，不会在后台出声。 */
(function () {
  let ac, master, bus, envLP, dryG, wetG, started = false, muted = false, suspendedByGame = false;
  let nb = {}, birdT = 2, tickAcc = 0;
  const L = {};

  /* ---------- 噪声缓冲 ---------- */
  function makeNoise(type, secs) {
    const len = Math.floor(ac.sampleRate * secs), buf = ac.createBuffer(1, len, ac.sampleRate), d = buf.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0, last = 0;
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      if (type === 'brown') { last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; }
      else if (type === 'pink') {          // Paul Kellet
        b0 = 0.99886 * b0 + w * 0.0555179; b1 = 0.99332 * b1 + w * 0.0750759; b2 = 0.96900 * b2 + w * 0.1538520;
        b3 = 0.86650 * b3 + w * 0.3104856; b4 = 0.55000 * b4 + w * 0.5329522; b5 = -0.7616 * b5 - w * 0.0168980;
        d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11; b6 = w * 0.115926;
      } else d[i] = w;
    }
    return buf;
  }
  function loopSrc(buf) { const s = ac.createBufferSource(); s.buffer = buf; s.loop = true; s.start(0, Math.random() * buf.duration * 0.9); return s; }
  function filt(type, f, q) { const n = ac.createBiquadFilter(); n.type = type; n.frequency.value = f; if (q != null) n.Q.value = q; return n; }
  function gain(v) { const g = ac.createGain(); g.gain.value = v; return g; }
  function chain(src, ...nodes) { let p = src; for (const n of nodes) { p.connect(n); p = n; } return p; }

  function impulse(secs, decay) {            // 隧道/空旷回响
    const len = Math.floor(ac.sampleRate * secs), buf = ac.createBuffer(2, len, ac.sampleRate);
    for (let c = 0; c < 2; c++) { const d = buf.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay); }
    return buf;
  }

  function start() {
    if (started) { if (ac.state === 'suspended' && !suspendedByGame && !document.hidden) ac.resume(); return; }
    try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return; }
    started = true;
    nb = { pink: makeNoise('pink', 5), brown: makeNoise('brown', 5), white: makeNoise('white', 3) };

    const comp = ac.createDynamicsCompressor(); comp.threshold.value = -16; comp.ratio.value = 4; comp.attack.value = 0.01; comp.release.value = 0.25;
    master = gain(muted ? 0 : 0.75); master.connect(comp); comp.connect(ac.destination);
    bus = gain(1); envLP = filt('lowpass', 12000, 0.5);
    dryG = gain(1); wetG = gain(0);
    const conv = ac.createConvolver(); conv.buffer = impulse(2.4, 2.4);
    bus.connect(envLP); envLP.connect(dryG); dryG.connect(master); envLP.connect(conv); conv.connect(wetG); wetG.connect(master);

    // 车轮隆隆（棕噪）
    L.rumbleF = filt('lowpass', 120, 0.7); L.rumbleG = gain(0);
    chain(loopSrc(nb.brown), L.rumbleF, L.rumbleG, bus);
    // 轮轨“嗡”（粉噪，中低频，随速度）
    L.whirF = filt('bandpass', 260, 0.8); L.whirG = gain(0);
    chain(loopSrc(nb.pink), L.whirF, L.whirG, bus);
    // 轮轨滚动摩擦“轰轰”声：中频粉噪（笔记本小喇叭也听得清），用车轮转速做幅度调制，产生滚滚向前的颗粒感
    L.roarF = filt('bandpass', 700, 0.7); L.roarAM = gain(1); L.roarG = gain(0);
    chain(loopSrc(nb.pink), filt('highpass', 180), L.roarF, L.roarAM, L.roarG, bus);
    L.wheel = ac.createOscillator(); L.wheel.frequency.value = 1; L.wheelDepth = gain(0);
    L.wheel.connect(L.wheelDepth); L.wheelDepth.connect(L.roarAM.gain); L.wheel.start();
    // 钢轨高频“嘶嘶”摩擦（很轻，增加金属感）
    L.hissF = filt('bandpass', 3000, 1.2); L.hissG = gain(0);
    chain(loopSrc(nb.pink), L.hissF, L.hissG, bus);
    // 风：粉噪低通 + 慢速阵风起伏（比白噪声柔和很多）
    L.windF = filt('lowpass', 500, 0.4); L.windG = gain(0);
    chain(loopSrc(nb.pink), filt('highpass', 70), L.windF, L.windG, bus);
    const lfo = ac.createOscillator(), lfoG = gain(0.012); lfo.frequency.value = 0.17; lfo.connect(lfoG); lfoG.connect(L.windG.gain); lfo.start();
    // 雨：雨幕(粉噪带通) + 低频轰鸣
    L.rainF = filt('bandpass', 2400, 0.45); L.rainG = gain(0);
    chain(loopSrc(nb.pink), L.rainF, L.rainG, bus);
    L.rainLowF = filt('lowpass', 420, 0.5); L.rainLowG = gain(0);
    chain(loopSrc(nb.pink), L.rainLowF, L.rainLowG, bus);
    // 雪天静谧：很轻的低频“嘘”
    L.hushG = gain(0); chain(loopSrc(nb.pink), filt('lowpass', 380), L.hushG, bus);
    // 呼啸：窄带粉噪，频率缓慢摆动（暴风/沙尘/雪天大风）
    L.howlF = filt('bandpass', 520, 7); L.howlG = gain(0);
    chain(loopSrc(nb.pink), L.howlF, L.howlG, bus);
    const hl = ac.createOscillator(), hlG = gain(160); hl.frequency.value = 0.23; hl.connect(hlG); hlG.connect(L.howlF.frequency); hl.start();
    // 沙粒
    L.gritG = gain(0); chain(loopSrc(nb.white), filt('highpass', 3200), filt('lowpass', 7500), L.gritG, bus);
    // 夜虫：高频正弦被脉冲调幅
    const co = ac.createOscillator(); co.frequency.value = 4400; L.cricketG = gain(0);
    const cl = ac.createOscillator(), clG = gain(0); cl.type = 'square'; cl.frequency.value = 15; cl.connect(clG); clG.connect(L.cricketG.gain); L.cricketDepth = clG;
    co.connect(L.cricketG); L.cricketG.connect(bus); co.start(); cl.start();
  }

  /* ---------- 即发声：雨点 / 鸟鸣 ---------- */
  function drip(vol, bright) {
    const s = ac.createBufferSource(); s.buffer = nb.white;
    const f = filt('bandpass', (bright ? 3200 : 1700) + Math.random() * 1800, 3), g = gain(0), t = ac.currentTime;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0005, t + 0.035);
    chain(s, f, g, bus); s.start(t, Math.random() * 2, 0.05);
  }
  function chirp(vol) {
    const t0 = ac.currentTime, notes = 2 + Math.floor(Math.random() * 4), base = 2600 + Math.random() * 2200, dir = Math.random() < 0.5 ? 1 : -1;
    for (let i = 0; i < notes; i++) {
      const o = ac.createOscillator(), g = gain(0), t = t0 + i * (0.09 + Math.random() * 0.05);
      o.type = 'sine'; o.frequency.setValueAtTime(base * (1 + 0.12 * i * dir), t); o.frequency.exponentialRampToValueAtTime(base * (1 + 0.12 * i * dir) * (1.25 + Math.random() * 0.3), t + 0.07);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + 0.012); g.gain.exponentialRampToValueAtTime(0.0003, t + 0.09);
      chain(o, g, bus); o.start(t); o.stop(t + 0.1);
    }
  }

  // v: m/s；W: 天气状态 {rain,snow,fog,dust,storm,wind}；day: 白天程度 0..1
  function update(v, dist, inCab, tf, W, day, dt) {
    if (!started || ac.state !== 'running') return;
    tf = tf || 0; W = W || {}; day = day == null ? 1 : day; dt = dt || 0.016;
    const k = Math.min(1, v / 97.2), t = ac.currentTime, rain = W.rain || 0, snow = W.snow || 0, dust = W.dust || 0, storm = W.storm || 0, wind = W.wind || 0.3;
    const fogK = Math.min(1, (W.fog || 0) / 0.0017), tn = 1 - tf * 0.85;

    // 轮轨声：起步就能听到（开方曲线），随速度增强；隧道里更响
    const kr = Math.sqrt(k), move = Math.min(1, v / 2);
    // 老式列车：以“哐当”节奏为主，底下垫一层低沉的隆隆声，轮轨轰鸣和高频嘶嘶很轻
    L.rumbleG.gain.setTargetAtTime(kr * move * (inCab ? 0.7 : 0.85) * (1 + 0.6 * tf), t, 0.2);
    L.rumbleF.frequency.setTargetAtTime(110 + k * 260 + tf * 120, t, 0.25);
    L.whirG.gain.setTargetAtTime((0.02 + 0.06 * Math.pow(k, 1.1)) * move * (1 + 0.5 * tf), t, 0.25);
    L.whirF.frequency.setTargetAtTime(220 + k * 300, t, 0.3);
    L.roarG.gain.setTargetAtTime(kr * move * (inCab ? 0.05 : 0.07) * (1 + 0.5 * tf), t, 0.2);
    L.roarF.frequency.setTargetAtTime(520 + k * 900, t, 0.3);
    L.wheel.frequency.setTargetAtTime(Math.max(0.5, v / (Math.PI * 0.92)), t, 0.1);   // 车轮直径 0.92 m 的转速
    L.wheelDepth.gain.setTargetAtTime(0.35 * move, t, 0.3);
    L.hissG.gain.setTargetAtTime(Math.pow(k, 1.4) * move * (inCab ? 0.006 : 0.01) * (1 + 0.4 * tf), t, 0.3);
    L.windG.gain.setTargetAtTime(0.014 + Math.pow(k, 1.6) * 0.075 * (1 + 0.6 * tf) + Math.max(0, wind - 0.35) * 0.05, t, 0.3);
    L.windF.frequency.setTargetAtTime(380 + k * 700 + wind * 250, t, 0.3);

    L.rainG.gain.setTargetAtTime(rain * (inCab ? 0.07 : 0.14) * tn, t, 0.5);
    L.rainF.frequency.setTargetAtTime(inCab ? 1500 + 600 * (1 - rain) : 2600 + 600 * (1 - rain), t, 0.5);
    L.rainLowG.gain.setTargetAtTime(rain * rain * 0.22 * tn, t, 0.5);
    L.hushG.gain.setTargetAtTime(snow * 0.07, t, 0.8);
    L.howlG.gain.setTargetAtTime(Math.max(dust * 0.11, storm * 0.06, snow * 0.03 * wind) * tn, t, 0.6);
    L.gritG.gain.setTargetAtTime(dust * (inCab ? 0.018 : 0.04) * tn, t, 0.5);

    // 环境闷度：驾驶室内更闷，雪/雾更闷
    const base = inCab ? 4200 : 12000;
    envLP.frequency.setTargetAtTime(base * (1 - 0.55 * snow) * (1 - 0.4 * fogK), t, 0.4);
    wetG.gain.setTargetAtTime(tf * 0.5, t, 0.2); dryG.gain.setTargetAtTime(1 - tf * 0.25, t, 0.2);

    // 钢轨接缝

    // 雨点敲击车顶/车窗
    if (rain > 0.05 && tf < 0.5) {
      tickAcc += dt * rain * (inCab ? 24 : 9) * (0.5 + k);
      let n = 0; while (tickAcc >= 1 && n++ < 3) { tickAcc -= 1; drip((0.012 + Math.random() * 0.03) * (inCab ? 1.3 : 0.7), !inCab); }
      if (tickAcc > 3) tickAcc = 0;
    }
    // 晴天鸟鸣
    const calm = day > 0.55 && k < 0.6 && tf < 0.2 && rain < 0.12 && storm < 0.1 && dust < 0.3 && snow < 0.25;
    birdT -= dt;
    if (birdT <= 0) { birdT = 1.2 + Math.random() * 3.8; if (calm) chirp(0.035 * (1 - k * 0.9) * (inCab ? 0.6 : 1)); }
    // 夜晚虫鸣
    const cr = day < 0.35 && k < 0.5 && tf < 0.2 && rain < 0.25 && snow < 0.3 ? 0.012 * Math.max(0, 1 - k * 1.6) : 0;
    L.cricketG.gain.setTargetAtTime(cr * 0.5, t, 0.8); L.cricketDepth.gain.setTargetAtTime(cr * 0.5, t, 0.8);
  }

  function horn() {
    if (!started) start(); if (!ac) return;
    const t = ac.currentTime, g = gain(0);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.32, t + 0.06); g.gain.setValueAtTime(0.32, t + 1.2); g.gain.linearRampToValueAtTime(0, t + 1.7);
    g.connect(bus);
    for (const f of [392, 494, 587]) {
      const o = ac.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f;
      const lp = filt('lowpass', 1300); o.connect(lp); lp.connect(g); o.start(t); o.stop(t + 1.8);
    }
  }
  function chime() {
    if (!started) return;
    const t = ac.currentTime;
    [659, 523, 784].forEach((f, i) => {
      const o = ac.createOscillator(), g = gain(0); o.type = 'sine'; o.frequency.value = f;
      g.gain.setValueAtTime(0, t + i * 0.28); g.gain.linearRampToValueAtTime(0.2, t + i * 0.28 + 0.04); g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.28 + 0.9);
      o.connect(g); g.connect(bus); o.start(t + i * 0.28); o.stop(t + i * 0.28 + 1);
    });
  }
  // 雷声：近处有尖锐的“咔嚓”，之后是滚动的低频轰鸣
  function thunder() {
    if (!started || ac.state !== 'running') return;
    const t = ac.currentTime, near = Math.random() < 0.45;
    if (near) {
      const s = ac.createBufferSource(); s.buffer = nb.white; const g = gain(0);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.5, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0005, t + 0.35);
      chain(s, filt('highpass', 1200), g, bus); s.start(t, Math.random(), 0.4);
    }
    const n = 3 + Math.floor(Math.random() * 3);
    for (let i = 0; i < n; i++) {
      const st = t + (near ? 0.04 : 0) + i * (0.4 + Math.random() * 0.7), s = ac.createBufferSource(); s.buffer = nb.brown;
      const f = filt('lowpass', 520, 0.6), g = gain(0), peak = (near ? 1.1 : 0.7) * Math.pow(0.72, i), dur = 1.4 + Math.random() * 1.6;
      f.frequency.setValueAtTime(560, st); f.frequency.exponentialRampToValueAtTime(110, st + dur);
      g.gain.setValueAtTime(0.0001, st); g.gain.exponentialRampToValueAtTime(peak, st + 0.12); g.gain.exponentialRampToValueAtTime(0.0005, st + dur);
      chain(s, f, g, bus); s.start(st, Math.random() * 3, dur + 0.2);
    }
  }

  function setMuted(m) { muted = !!m; if (master) master.gain.value = muted ? 0 : 0.75; }
  // 会车：先一下气压冲击（低频闷响），随后是持续的呼啸（带通扫频），隧道内更响
  function pass(dur, k, tunnel) {
    if (!started || ac.state !== 'running') return;
    const t = ac.currentTime, amp = (0.35 + 0.65 * k) * (tunnel ? 1.6 : 1);
    const thump = ac.createBufferSource(); thump.buffer = nb.brown; const tf = filt('lowpass', 160, 0.7), tg = gain(0);
    tg.gain.setValueAtTime(0.0001, t); tg.gain.exponentialRampToValueAtTime(0.9 * amp, t + 0.03); tg.gain.exponentialRampToValueAtTime(0.0005, t + 0.45);
    chain(thump, tf, tg, bus); thump.start(t, Math.random() * 2, 0.5);
    const w = ac.createBufferSource(); w.buffer = nb.pink; const bp = filt('bandpass', 500, 0.9), wg = gain(0);
    bp.frequency.setValueAtTime(380, t); bp.frequency.exponentialRampToValueAtTime(1500, t + dur * 0.5); bp.frequency.exponentialRampToValueAtTime(420, t + dur + 0.4);
    wg.gain.setValueAtTime(0.0001, t); wg.gain.exponentialRampToValueAtTime(0.55 * amp, t + 0.12); wg.gain.setValueAtTime(0.5 * amp, t + dur); wg.gain.exponentialRampToValueAtTime(0.0005, t + dur + 0.6);
    chain(w, bp, wg, bus); w.start(t, Math.random() * 2, dur + 0.8);
    // 车轮“哒哒”连续掠过
    for (let i = 0; i < 16; i++) { const at = t + 0.05 + i * dur / 16, s = ac.createBufferSource(); s.buffer = nb.white; const f = filt('bandpass', 900 + Math.random() * 500, 3), g = gain(0); g.gain.setValueAtTime(0.12 * amp, at); g.gain.exponentialRampToValueAtTime(0.0005, at + 0.06); chain(s, f, g, bus); s.start(at, Math.random(), 0.08); }
  }
  function toggleMute() { muted = !muted; if (master) master.gain.value = muted ? 0 : 0.75; return muted; }
  // 游戏暂停 / 页面隐藏：挂起音频，彻底静音
  function setPaused(p) { suspendedByGame = p; if (!ac) return; if (p) ac.suspend(); else if (!document.hidden) ac.resume(); }
  document.addEventListener('visibilitychange', () => { if (!ac) return; if (document.hidden) ac.suspend(); else if (!suspendedByGame) ac.resume(); });
  addEventListener('pagehide', () => { if (ac && ac.state !== 'closed') ac.close(); });

  window.Sound = { start, update, horn, chime, toggleMute, setMuted, pass, thunder, setPaused, state: () => (ac ? ac.state : "none") };
})();
