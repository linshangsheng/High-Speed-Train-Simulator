/* 电影模式：自动导演。根据前方地形挑选机位并在镜头间淡入淡出切换：
   路边固定机位看列车呼啸而过、隧道口守候、跨河大桥远景、无人机追拍、低机位贴轨、高空环绕、城市摇臂。 */
(function () {
  const L = () => Route.LENGTH;
  function P(track, s, lat, y) { const a = track.at(s); return new THREE.Vector3(a.pos.x - a.tan.z * lat, y, a.pos.z + a.tan.x * lat); }

  function create(track, fadeEl, captionEl) {
    const st = { shot: null, t: 0, dur: 8, idx: 0, usedTunnel: -1, usedBridge: null, fade: 0 };
    const pos = new THREE.Vector3(), look = new THREE.Vector3();

    function pick(o) {
      const s = o.s, v = Math.max(8, o.v);
      if (Tunnels.inside(s, -60)) return { kind: 'tunnelIn', dur: 7, name: '隧道内' };
      // 1) 隧道口守候
      for (let i = 0; i < Tunnels.list.length; i++) {
        const t = Tunnels.list[i], d = Route.wrap(t.s0 - s);
        if (d > 260 && d < 1300 && st.usedTunnel !== i) { st.usedTunnel = i; return { kind: 'portal', name: '隧道口 · ' + t.name, s0: t.s0, lat: -18, y: 4.5, dur: Math.min(16, d / v + 4) }; }
      }
      // 2) 大桥远景
      if (window.Rivers) for (const r of Rivers.list) {
        if (!r.bridge) continue; const d = Route.wrap(r.bridge.s0 - s);
        if (d > 150 && d < 1400 && st.usedBridge !== r) { st.usedBridge = r; return { kind: 'bridge', name: r.bridge.name, r, dur: Math.min(18, (d + (r.bridge.s1 - r.bridge.s0)) / v + 2) }; }
      }
      const list = ['flyby', 'drone', 'low', 'orbit', 'flyby', 'crane', 'side'];
      const k = list[st.idx++ % list.length];
      if (k === 'flyby') { const ahead = Math.min(700, Math.max(160, v * 5)), sp = s + ahead, side = Math.random() < 0.5 ? -1 : 1; return { kind: 'flyby', sp, lat: side < 0 ? -16 : 19, y: 1.7 + Math.random() * 4, dur: Math.min(13, ahead / v + 3.5), name: '路边机位' }; }
      if (k === 'crane') return { kind: 'crane', dur: 9, name: '摇臂' };
      return { kind: k, dur: 7 + Math.random() * 4, name: '' };
    }

    // o: { s, v, head(pos,dir,front), dt }
    function update(o, out) {
      st.t += o.dt;
      let snap = false;
      if (!st.shot || st.t > st.shot.dur) { st.shot = pick(o); st.t = 0; snap = true; st.fade = 1; if (captionEl) captionEl.textContent = st.shot.name || ''; }
      st.fade = Math.max(0, st.fade - o.dt * 2.2);
      if (fadeEl) fadeEl.style.opacity = Math.max(0, st.fade * 1.4 - 0.2).toFixed(2);
      const sh = st.shot, h = o.head, fw = h.dir, R = new THREE.Vector3(-fw.z, 0, fw.x), u = st.t / sh.dur;
      let rate = 4, fov = 55;
      switch (sh.kind) {
        case 'flyby': {
          const g = Terrain.height(sh.sp, sh.lat); pos.copy(P(track, sh.sp, sh.lat, Math.max(g + sh.y, sh.y))); look.copy(h.front); look.y = 2.5; rate = 60; fov = 40 + 18 * u; break;
        }
        case 'portal': {
          pos.copy(P(track, sh.s0 - 70, sh.lat, sh.y)); look.copy(P(track, sh.s0, -2.5, 5)); if (Route.wrap(sh.s0 - o.s) < 160) { look.copy(h.front); look.y = 2.6; } rate = 60; fov = 46; break;
        }
        case 'bridge': {
          const r = sh.r, mid = (r.bridge.s0 + r.bridge.s1) / 2;
          pos.copy(P(track, mid - 120, 260, 30)); look.copy(P(track, mid, 0, 6)).lerp(h.front, 0.35); rate = 60; fov = 38; break;
        }
        case 'tunnelIn': pos.copy(P(track, o.s + 46 - 10 * u, -5.4, 3.2)); look.copy(h.front); look.y = 2.4; rate = 8; fov = 58; break;
        case 'drone': pos.copy(h.front).addScaledVector(fw, -70 + 30 * u).addScaledVector(R, 22 * Math.sin(u * 2)); pos.y = 30 - 10 * u; look.copy(h.front).addScaledVector(fw, 30); look.y = 2; rate = 3; fov = 50; break;
        case 'low': pos.copy(h.front).addScaledVector(fw, 24 - 8 * u).addScaledVector(R, -4.6); pos.y = 0.9; look.copy(h.front).addScaledVector(fw, -6); look.y = 2.4; rate = 6; fov = 62; break;
        case 'orbit': { const a = u * 2.2 + 0.4; pos.copy(h.front).addScaledVector(fw, -60 + Math.cos(a) * 120).addScaledVector(R, Math.sin(a) * 120); pos.y = 70; look.copy(h.front).addScaledVector(fw, -60); look.y = 2; rate = 3; fov = 50; break; }
        case 'crane': pos.copy(h.front).addScaledVector(fw, 40).addScaledVector(R, -18); pos.y = 3 + 40 * u; look.copy(h.front).addScaledVector(fw, -40 * u); look.y = 3; rate = 5; fov = 52; break;
        default: pos.copy(h.front).addScaledVector(fw, -30 + 15 * u).addScaledVector(R, -16); pos.y = 4; look.copy(h.front).addScaledVector(fw, -20); look.y = 2.6; rate = 5; fov = 48;
      }
      // 不钻地
      out.want.copy(pos); out.look.copy(look); out.rate = rate; out.fov = fov; out.snap = snap; out.fixed = rate >= 60;
      return out;
    }
    return { update, state: st };
  }
  window.Cinema = { create };
})();
