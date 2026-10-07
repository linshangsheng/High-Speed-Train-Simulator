/* 精准停站挑战（可选玩法）：进站前显示“停车位置标”距离、建议制动档位与目标速度曲线；
   列车在停车点附近停稳后按误差评分（≤0.5 m 完美），随后开门上下客 12 秒、关门提示发车。
   不想停站可以直接通过，不扣分。车头停车点 = 站中心前方 OFFSET 米（8 编组约 206 m，正好停在 240 m 站台中部）。 */
(function () {
  const OFFSET = 100, BRAKE = 2.4, DWELL = 12;
  const GRADES = [[0.5, '完美停车', 3, 100], [2, '精准停车', 2, 60], [10, '良好', 1, 30], [1e9, '偏差较大', 0, 10]];

  function create(el) {
    const $ = (id) => document.getElementById(id);
    const st = { phase: 'idle', city: null, d: 0, still: 0, dwell: 0, done: null, score: 0, stops: 0, perfect: 0, res: null, resT: 0, range0: 0 };

    // 当前最近的停车目标：返回 { city, d }，d>0 表示停车点还在前方
    function target(s) {
      const L = Route.LENGTH, rel = Route.wrap(s);
      let best = null, bd = Infinity;
      for (const c of Route.CITIES) {
        if (c.loop) continue;
        let d = Route.wrap(c.s + OFFSET) - rel; if (d > L / 2) d -= L; if (d < -L / 2) d += L;
        if (d > -150 && d < bd) { bd = d; best = c; }
      }
      return { city: best, d: bd };
    }

    function grade(err) { for (const g of GRADES) if (Math.abs(err) <= g[0]) return g; return GRADES[GRADES.length - 1]; }

    // o: { s, v, leverN, cruise, emg, running }；返回给仪表/HUD 用的状态
    function update(dt, o, fx) {
      const t = target(o.s), out = { show: false };
      st.city = t.city; st.d = t.d;
      if (st.resT > 0) st.resT -= dt;
      if (!o.running || !t.city) { render(out); return out; }
      if (st.done && st.done !== t.city) st.done = null;          // 已离开上一站，清除“已处理”标记

      if (st.phase === 'dwell') {
        st.dwell -= dt;
        if (o.leverN > 0 || st.dwell <= 0) {
          st.phase = 'idle'; st.done = st.city;
          fx.chime && fx.chime(); fx.toast && fx.toast('🚪 车门已关闭 · 可以发车');
        }
        Object.assign(out, { show: true, mode: 'dwell', name: t.city.name, d: t.d, left: Math.max(0, st.dwell) });
        render(out); return out;
      }
      if (st.done === t.city) { render(out); return out; }

      // 只有“还停得住”的时候才出现：车站很密（相距 1~6 km），定速巡航或高速冲过时不打扰
      const d = t.d, v = o.v;
      const a = d > 0.5 ? v * v / (2 * d) : (v > 0.1 ? 9 : 0);
      const range = Math.max(900, v * v / (2 * BRAKE * 0.6) + 500);
      const feasible = a <= BRAKE * 1.05 || v < 1;
      if (!o.cruise && !o.emg && d < range && d > -150 && feasible) {
        if (st.phase !== 'approach' && v > 3) { st.phase = 'approach'; st.range0 = d; }
        if (st.phase === 'approach') {
          const vAdv = Math.sqrt(2 * 1.2 * Math.max(0, d)) * 3.6;                                   // 舒适减速度 1.2 m/s² 的推荐速度曲线
          let tip, tone;
          if (d < -2 && v > 0.5) { tip = '已越过停车点'; tone = 'red'; }
          else if (a > 0.18) { const n = Math.min(7, Math.max(1, Math.ceil(a / BRAKE * 7))); tip = '建议：制动 ' + n + ' 档'; tone = n >= 6 ? 'warn' : 'ok'; }
          else if (v > 0.3) { tip = d > 40 ? '保持惰行，缓慢接近' : '轻轻制动，对准停车标'; tone = 'ok'; }
          else { tip = d > 2 ? '距离停车点还有 ' + d.toFixed(1) + ' m，可缓慢前移' : '已停稳'; tone = 'ok'; }
          Object.assign(out, { show: true, mode: 'approach', name: t.city.name, d, tip, tone, vAdv, k: Math.max(0, Math.min(1, 1 - d / Math.max(1, st.range0 || range))) });
          // 停稳判定
          if (v < 0.05) st.still += dt; else st.still = 0;
          if (st.still > 1.0 && d < 30 && d > -150) {          // 欠标 30 m 以上可以继续往前挪；过标无法倒车，直接评分
            const err = -d, g = grade(err);
            st.stops++; st.score += g[3]; if (g[2] === 3) st.perfect++;
            st.res = { name: t.city.name, err, g }; st.resT = 6;
            st.phase = 'dwell'; st.dwell = DWELL; st.still = 0;
            fx.chime && fx.chime();
            if (g[2] >= 2 && fx.say) fx.say(g[2] === 3 ? '停车精准，完美！' : '停车精准。');
          }
          if (d < -150) { st.phase = 'idle'; }
        }
      } else if (st.phase === 'approach') st.phase = 'idle';
      render(out); return out;
    }

    let lastHTML = '';
    function render(o) {
      let html = '';
      if (st.resT > 0 && st.res) {
        const r = st.res, stars = '★★★'.slice(0, r.g[2]) + '<i>' + '★★★'.slice(r.g[2]) + '</i>';
        const dir = Math.abs(r.err) < 0.05 ? '正中停车标' : (r.err > 0 ? '过标 ' : '欠标 ') + Math.abs(r.err).toFixed(2) + ' m';
        html = '<div class="sr"><div class="st">' + stars + '</div><div class="sg">' + r.g[1] + '</div><div class="sd">' + r.name + '站 · ' + dir + ' · +' + r.g[3] + ' 分</div>' +
          '<div class="ss">累计 ' + st.stops + ' 次停站 · 完美 ' + st.perfect + ' 次 · 总分 ' + st.score + '</div></div>';
        if (o.show && o.mode === 'dwell') html += '<div class="sw">🚪 车门开启 · 旅客上下车 ' + Math.ceil(o.left) + ' s（推手柄可提前关门发车）</div>';
      } else if (o.show && o.mode === 'dwell') {
        html = '<div class="sw">🚪 ' + o.name + '站 · 车门开启 · 旅客上下车 ' + Math.ceil(o.left) + ' s<br><small>推牵引手柄可提前关门发车</small></div>';
      } else if (o.show) {
        const dTxt = o.d > 1000 ? (o.d / 1000).toFixed(2) + ' km' : o.d > 10 ? Math.round(o.d) + ' m' : o.d.toFixed(2) + ' m';
        html = '<div class="sh"><span>🚉 ' + o.name + '站 · 停车位置标</span><b>' + dTxt + '</b></div>' +
          '<div class="sb"><i style="width:' + (o.k * 100).toFixed(1) + '%"></i></div>' +
          '<div class="sf"><span class="' + o.tone + '">' + o.tip + '</span><span>推荐 ≤ ' + Math.round(o.vAdv) + ' km/h</span></div>';
      }
      if (html !== lastHTML) { el.innerHTML = html; lastHTML = html; }
      el.classList.toggle('show', !!html);
    }
    return { update, state: st, OFFSET };
  }
  window.Stops = { create, OFFSET };
})();
