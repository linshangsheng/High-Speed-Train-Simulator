/* 城市建筑原型：玻璃幕墙/石材高楼（裙楼 + 退台 + 塔冠 + 天线 + 航空灯）、住宅板楼（阳台/空调/屋顶水箱）、商业低层。按需生成并注册为 Flora 多材质原型。 */
(function () {
  const B = BKit.box, FH = 3.9, made = {};

  function register(name, fn) {
    if (made[name]) return name;
    const P = new BKit.Proto(); fn(P); Flora.registerMulti(name, P.build(BTex.mat)); made[name] = true; return name;
  }

  // 高楼：style ∈ gl_blue/gl_green/gl_teal/gl_gold/gl_gray/office
  function tower(style, floors, W, D) {
    const name = `tw_${style}_${floors}_${W}x${D}`;
    return register(name, (P) => {
      const [tw, th] = BTex.size(style), H = floors * FH, y0 = 8.5;
      P.add('shop', B(-W / 2 - 5, 0, -D / 2 - 5, W / 2 + 5, 8, D / 2 + 5, 16, 8)); P.add('r_flat', B(-W / 2 - 5.2, 8, -D / 2 - 5.2, W / 2 + 5.2, 8.5, D / 2 + 5.2, 4, 4));
      P.add('dark', B(-W / 2 - 5.3, 7.4, -D / 2 - 5.3, W / 2 + 5.3, 7.6, D / 2 + 5.3, 4, 4));
      let top = y0, w = W, d = D;
      const tiers = floors >= 44 ? [[0.58, 1.0], [0.25, 0.86], [0.17, 0.7]] : floors >= 26 ? [[0.72, 1.0], [0.28, 0.84]] : [[1, 1]];
      tiers.forEach(([fr, k], i) => {
        const h = H * fr, tw_ = W * k, td = D * k;
        P.add(style, B(-tw_ / 2, top, -td / 2, tw_ / 2, top + h, td / 2, tw, th));
        P.add('dark', B(-tw_ / 2 - 0.2, top + h, -td / 2 - 0.2, tw_ / 2 + 0.2, top + h + 0.5, td / 2 + 0.2, 4, 4));
        top += h; w = tw_; d = td;
        if (i < tiers.length - 1) P.add('metal', B(-tw_ / 2 - 0.1, top - 0.4, -td / 2 - 0.1, tw_ / 2 + 0.1, top + 0.15, td / 2 + 0.1, 4, 4));
      });
      // 屋顶机房 + 设备
      P.add('metal', B(-w * 0.28, top + 0.5, -d * 0.28, w * 0.28, top + 4.5, d * 0.28, 4, 4)); P.add('dark', B(-w * 0.3, top + 4.5, -d * 0.3, w * 0.3, top + 4.8, d * 0.3, 4, 4));
      if (floors >= 30) {   // 塔冠：竖向翼片 + 尖顶 + 航空灯
        for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) P.add('metal', B(sx * w * 0.36 - 0.25, top + 0.5, sz * d * 0.36 - 0.25, sx * w * 0.36 + 0.25, top + 11, sz * d * 0.36 + 0.25, 1, 1));
        P.add('metal', BKit.cyl(0.55, 0.9, top + 4.8, top + 26, 8, 2, 4)); P.add('red_light', new THREE.SphereGeometry(0.7, 8, 6), 0, top + 26, 0);
      } else { P.add('metal', BKit.cyl(0.18, 0.25, top + 4.8, top + 14, 6, 2, 4)); P.add('red_light', new THREE.SphereGeometry(0.45, 8, 6), 0, top + 14, 0); }
    });
  }

  // 住宅板楼
  function resi(floors, units, roofType) {
    const name = `rs_${floors}_${units}_${roofType}`;
    return register(name, (P) => {
      const W = units * 10.8, D = 12, FHr = 2.9, H = floors * FHr, [tw, th] = BTex.size('w_resi');
      P.add('stone', B(-W / 2 - 0.2, -1.2, -D / 2 - 0.2, W / 2 + 0.2, 0.5, D / 2 + 0.2, 3, 2));
      P.add('w_resi', B(-W / 2, 0, -D / 2, W / 2, H, D / 2, tw, th));
      P.add('dark', B(-W / 2 - 0.1, 0.5, D / 2 - 0.1, W / 2 + 0.1, 4.0, D / 2 + 0.3, 3, 3));          // 底层架空/店面
      if (roofType === 1) {         // 坡屋顶（红瓦四坡）
        P.add('r_red', BKit.hip(-W / 2, -D / 2, W / 2, D / 2, H, 2.8, 0.5, 4, 4));
      } else {                      // 平屋顶：女儿墙 + 电梯机房 + 水箱 + 太阳能
        P.add('white', B(-W / 2 - 0.1, H, -D / 2 - 0.1, W / 2 + 0.1, H + 1.0, -D / 2 + 0.2, 3, 1)); P.add('white', B(-W / 2 - 0.1, H, D / 2 - 0.2, W / 2 + 0.1, H + 1.0, D / 2 + 0.1, 3, 1));
        P.add('white', B(-W / 2 - 0.1, H, -D / 2, -W / 2 + 0.2, H + 1.0, D / 2, 3, 1)); P.add('white', B(W / 2 - 0.2, H, -D / 2, W / 2 + 0.1, H + 1.0, D / 2, 3, 1));
        P.add('w_resi', B(-4, H, -3, 2, H + 3.2, 3, tw, th)); P.add('r_flat', B(-4.3, H + 3.2, -3.3, 2.3, H + 3.5, 3.3, 4, 4));
        P.add('white', BKit.cyl(1.1, 1.1, H, H + 2.4, 12, 2, 2), W / 2 - 4, 0, 0); P.add('blue_pat', BKit.cyl(1.15, 1.15, H + 2.4, H + 2.7, 12, 2, 2), W / 2 - 4, 0, 0);
        P.add('dark', B(-W / 2 + 3, H, -3.5, -W / 2 + 7, H + 1.7, -2.5, 1, 1)); P.add('metal', B(-W / 2 + 3, H, -2.5, -W / 2 + 7, H + 0.2, -0.5, 1, 1));
      }
    });
  }

  // 商业/办公低层（3-6 层，带玻璃墙）
  function lowrise(floors, W, D) {
    const name = `lr_${floors}_${W}x${D}`;
    return register(name, (P) => {
      const H = floors * 3.9, [tw, th] = BTex.size('office');
      P.add('shop', B(-W / 2, 0, -D / 2, W / 2, 4.2, D / 2, 16, 8)); P.add('office', B(-W / 2, 4.2, -D / 2, W / 2, H, D / 2, tw, th));
      P.add('r_flat', B(-W / 2 - 0.2, H, -D / 2 - 0.2, W / 2 + 0.2, H + 0.5, D / 2 + 0.2, 4, 4));
      P.add('metal', B(-3, H + 0.5, -3, 3, H + 3.5, 3, 4, 4));
    });
  }

  window.Towers = { tower, resi, lowrise, register };
})();
