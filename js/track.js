/* 线路几何查询：中心线位置/切向，以及左右股道（线间距 5m）。轨道、路基、桥梁等可见结构由 line.js 按区块生成。 */
(function () {
  function build() {
    const curve = Route.curve, L = Route.LENGTH;
    const _p = new THREE.Vector3(), _t = new THREE.Vector3();
    // s 处中心线的位置/朝向（返回共享向量，调用方需立即使用或拷贝）
    function at(s) {
      const u = Route.wrap(s) / L;
      curve.getPointAt(u, _p); curve.getTangentAt(u, _t); _t.y = 0; _t.normalize();
      return { pos: _p, tan: _t };
    }
    // 某条股道（侧向偏移 off，右为正）的查询函数
    function lane(off) {
      const p = new THREE.Vector3(), t = new THREE.Vector3(), out = { pos: p, tan: t };
      return function (s) {
        const a = at(s); t.copy(a.tan); p.set(a.pos.x - a.tan.z * off, 0, a.pos.z + a.tan.x * off);
        return out;
      };
    }
    return { at, lane, updateGround() {} };
  }
  window.Track = { build };
})();
