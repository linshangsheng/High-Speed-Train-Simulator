/* 确定性噪声：整数哈希 + 值噪声/fbm/脊形噪声（地形与植被分布共用） */
(function () {
  function hash(ix, iz) {
    let h = (ix * 374761393 + iz * 668265263) | 0;
    h = (h ^ (h >>> 13)) * 1274126177 | 0;
    h = h ^ (h >>> 16);
    return (h >>> 0) / 4294967295;
  }
  function vnoise(x, z) {
    const ix = Math.floor(x), iz = Math.floor(z), fx = x - ix, fz = z - iz;
    const ux = fx * fx * (3 - 2 * fx), uz = fz * fz * (3 - 2 * fz);
    const a = hash(ix, iz), b = hash(ix + 1, iz), c = hash(ix, iz + 1), d = hash(ix + 1, iz + 1);
    return a + (b - a) * ux + (c - a) * uz + (a - b - c + d) * ux * uz;
  }
  function fbm(x, z, oct) {
    let a = 0.5, s = 0, n = 0;
    for (let i = 0; i < oct; i++) { s += a * vnoise(x, z); n += a; x = x * 2.03 + 17.1; z = z * 2.03 + 9.2; a *= 0.5; }
    return s / n;
  }
  // 脊形多重分形：山脊线明显，返回 0..1
  function ridged(x, z, oct) {
    let a = 0.5, s = 0, n = 0, w = 1;
    for (let i = 0; i < oct; i++) {
      let r = 1 - Math.abs(2 * vnoise(x, z) - 1); r *= r; r *= w; w = Math.min(1, r * 1.8);
      s += a * r; n += a; x = x * 2.1 + 31.7; z = z * 2.1 + 5.3; a *= 0.5;
    }
    return s / n;
  }
  const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  window.Noise = { hash, vnoise, fbm, ridged, smooth };
})();
