/* 对向列车：在右线上迎面驶来的动车组（随机红/金/蓝涂装），交会时有呼啸声、气浪冲击和车体晃动。
   同一时间最多一列；离开后隔一段时间再来下一列。 */
(function () {
  const SCHEMES = ['red', 'gold'];
  function create(scene, track) {
    const lane = track.lane(Line.LANE);
    const pool = SCHEMES.map(sc => { const t = Train.build(scene, { scheme: sc, light: false }); t.root.visible = false; return t; });
    const st = { active: null, s: 0, v: 0, wait: 18, passed: false, lastGap: null, shake: 0, count: 0 };

    // ourS: 本车车头弧长；ourV: 本车速度；night: 夜间程度
    function update(dt, ourS, ourV, night, tunnelAt) {
      st.shake = Math.max(0, st.shake - dt * 2.5);
      if (!st.active) {
        st.wait -= dt;
        if (st.wait <= 0) {
          st.active = pool[st.count++ % pool.length];
          st.s = ourS + 2900 + Math.random() * 600; st.v = (250 + Math.random() * 100) / 3.6;
          st.passed = false; st.lastGap = null; st.active.root.visible = true;
        }
        return st;
      }
      st.s -= st.v * dt;
      const t = st.active;
      t.update(st.s, lane, night, -1);
      // 车头之间的距离（>0 表示还在前方）
      const gap = st.s - ourS;
      if (!st.passed && st.lastGap !== null && st.lastGap > 0 && gap <= 0) {
        st.passed = true;
        const rel = st.v + ourV, dur = Math.min(2.6, t.totalLen / Math.max(20, rel));
        Sound.pass && Sound.pass(dur, Math.min(1, rel / 160), Tunnels.inside(ourS, 0));
        st.shake = Math.min(1, rel / 140);
      }
      st.lastGap = gap;
      if (gap < -(t.totalLen + 700)) { t.root.visible = false; st.active = null; st.wait = 35 + Math.random() * 55; }
      return st;
    }
    return { update, state: st };
  }
  window.Traffic = { create };
})();
