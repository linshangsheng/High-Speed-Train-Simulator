/* 驾驶室 / 车窗视角的玻璃雨滴 + 雨刮器（2D 画布叠加层） */
(function () {
  const cv = document.getElementById('drops');
  if (!cv) { window.Drops = { update() {} }; return; }
  const g = cv.getContext('2d');
  let W = 0, H = 0, drops = [], wipeT = 0, wiping = false, clearedAll = true;

  function resize() { W = cv.width = innerWidth; H = cv.height = innerHeight; }
  addEventListener('resize', resize); resize();

  function update(dt, rain, speedKmh, active, view) {
    if (!active || rain < 0.03) {
      if (!clearedAll) { g.clearRect(0, 0, W, H); clearedAll = true; drops.length = 0; }
      return;
    }
    clearedAll = false;
    const k = H / 928, wind = Math.min(1, speedKmh / 250);
    // 生成
    const want = Math.floor(70 + 190 * rain), spawn = rain * 90 * dt;
    for (let i = 0, n = spawn + Math.random(); i < n && drops.length < want; i++) drops.push({ x: Math.random() * W, y: Math.random() * H * 0.9, r: (1.4 + Math.random() * 3.6) * k, vx: 0, vy: 0, a: 1 });
    // 雨刮：驾驶室视角更明显
    const period = 2.6 - 1.2 * rain; wipeT += dt;
    const ph = (wipeT % period) / period;            // 0..1
    const sweep = ph < 0.45 ? ph / 0.45 : ph < 0.9 ? 1 - (ph - 0.45) / 0.45 : 0;
    const wiperOn = view === 0 && rain > 0.12 && ph < 0.9;
    const pivots = [[W * 0.30, H * 1.0], [W * 0.62, H * 1.0]], L = H * 0.72;
    const ang = (Math.PI - 0.25) - sweep * (Math.PI - 0.5);   // 从左向右扫
    // 滑动与合并
    for (let i = drops.length - 1; i >= 0; i--) {
      const d = drops[i];
      const slide = Math.max(0, d.r - 3.2 * k);
      d.vy += (slide * 22 * k - d.vy) * Math.min(1, dt * 4); d.vx += ((wind * 140 * k + (Math.random() - 0.5) * 6) - d.vx) * Math.min(1, dt * 2);
      d.y += d.vy * dt; d.x += d.vx * dt * (0.2 + 0.8 * wind);
      d.r += (d.r < 6.5 * k ? 0.05 * k * dt * 12 * Math.random() : 0);
      if (d.y > H || d.x > W + 20) { drops.splice(i, 1); continue; }
      if (wiperOn) for (const [px, py] of pivots) {                  // 被雨刮扫掉
        const ax = Math.cos(ang), ay = -Math.sin(ang);
        const t = Math.max(0, Math.min(L, (d.x - px) * ax + (d.y - py) * ay)), qx = px + ax * t, qy = py + ay * t;
        if (Math.hypot(d.x - qx, d.y - qy) < 18 * k) { drops.splice(i, 1); break; }
      }
    }
    g.clearRect(0, 0, W, H);
    for (const d of drops) {
      const r = d.r, tail = Math.min(r * 5, d.vy * 0.12);
      g.fillStyle = 'rgba(205,225,245,0.16)'; g.beginPath(); g.ellipse(d.x, d.y, r, r + tail * 0.4, 0, 0, 6.3); g.fill();
      g.strokeStyle = 'rgba(255,255,255,0.28)'; g.lineWidth = 1; g.stroke();
      g.fillStyle = 'rgba(255,255,255,0.55)'; g.beginPath(); g.arc(d.x - r * 0.3, d.y - r * 0.35, Math.max(0.6, r * 0.25), 0, 6.3); g.fill();
      if (tail > 2) { g.fillStyle = 'rgba(205,225,245,0.10)'; g.fillRect(d.x - r * 0.35, d.y - tail * 2, r * 0.7, tail * 2); }
    }
    if (wiperOn) {
      g.lineCap = 'round';
      for (const [px, py] of pivots) {
        const ex = px + Math.cos(ang) * L, ey = py - Math.sin(ang) * L;
        g.strokeStyle = '#0b0d10'; g.lineWidth = 7 * k; g.beginPath(); g.moveTo(px, py); g.lineTo(ex, ey); g.stroke();
        g.strokeStyle = '#2a2f36'; g.lineWidth = 3 * k; g.beginPath(); g.moveTo(px + Math.cos(ang) * L * 0.25, py - Math.sin(ang) * L * 0.25); g.lineTo(ex, ey); g.stroke();
      }
    }
  }
  window.Drops = { update };
})();
