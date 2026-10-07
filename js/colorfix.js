/* 色彩管线：three r128 没有自动色彩管理。这里让 0xRRGGBB 十六进制按 sRGB 解读并转为线性，
   配合 renderer.outputEncoding = sRGBEncoding，才能得到正确的明暗与饱和度（之前画面发白就是缺这一步）。
   必须在任何 THREE.Color(hex) 之前加载。 */
(function () {
  const setHex = THREE.Color.prototype.setHex;
  THREE.Color.prototype.setHex = function (hex) {
    setHex.call(this, hex);
    return this.convertSRGBToLinear();
  };
  // 颜色贴图（canvas）一律标记为 sRGB
  window.srgbTex = function (t) { t.encoding = THREE.sRGBEncoding; return t; };
})();
