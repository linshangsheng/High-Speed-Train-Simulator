/* 路线：环中国一周。经纬度 -> 世界坐标 (1 单位 = 1 米)，闭合 Catmull-Rom 曲线 */
(function () {
  const DEG = 520; // 每度对应的世界单位

  // 区域（决定沿途风景）
  const REGIONS = {
    yunnan:   { name: '云南',   sky: 0x7ec8ff, fog: 0xbfe3d8, ground: 0x4f9a3a, type: 'yunnan' },
    tibet:    { name: '西藏',   sky: 0x4aa3f0, fog: 0xcfe4f5, ground: 0x9a8f6a, type: 'tibet' },
    xinjiang: { name: '新疆',   sky: 0x8fc4f0, fog: 0xf0dcb0, ground: 0xd2b27a, type: 'xinjiang' },
    gansu:    { name: '甘肃',   sky: 0x86c3f2, fog: 0xe6d3a8, ground: 0xc4a468, type: 'gobi' },
    neimeng:  { name: '内蒙古', sky: 0x62b4f5, fog: 0xd6ecd0, ground: 0x7fb54a, type: 'grassland' },
    dongbei:  { name: '东北',   sky: 0x9ec9e8, fog: 0xe4eef5, ground: 0xe8eef2, type: 'snowforest' },
    huabei:   { name: '华北',   sky: 0x8ec6ee, fog: 0xd9dfe4, ground: 0xb7b66a, type: 'plain' },
    jiangnan: { name: '江南',   sky: 0x84c4ee, fog: 0xd2e6e0, ground: 0x6fae52, type: 'water' },
    huanan:   { name: '华南',   sky: 0x6fc2f2, fog: 0xc8e8d8, ground: 0x3f9a4c, type: 'tropical' }
  };

  // 城市：lon, lat, 所属区域, 简介
  const CITIES = [
    { name: '昆明',     lon: 102.7, lat: 25.0, region: 'yunnan',   desc: '四季如春的春城，滇池畔海鸥翩飞。' },
    { name: '大理',     lon: 100.2, lat: 25.6, region: 'yunnan',   desc: '苍山洱海，风花雪月。' },
    { name: '林芝',     lon: 94.4,  lat: 29.6, region: 'tibet',    desc: '雅鲁藏布江畔，西藏的江南。' },
    { name: '拉萨',     lon: 91.1,  lat: 29.6, region: 'tibet',    desc: '日光之城，布达拉宫巍然屹立。' },
    { name: '日喀则',   lon: 88.9,  lat: 29.3, region: 'tibet',    desc: '后藏重镇，遥望珠穆朗玛。' },
    { name: '阿里',     lon: 81.1,  lat: 30.4, region: 'tibet',    desc: '世界屋脊之巅，神山冈仁波齐在侧。' },
    { name: '喀什',     lon: 75.99, lat: 39.5, region: 'xinjiang', desc: '丝路明珠，千年古城。' },
    { name: '库尔勒',   lon: 86.1,  lat: 41.8, region: 'xinjiang', desc: '香梨之乡，孔雀河穿城而过。' },
    { name: '乌鲁木齐', lon: 87.6,  lat: 43.8, region: 'xinjiang', desc: '天山脚下，远离海洋最远的城市。' },
    { name: '敦煌',     lon: 94.7,  lat: 40.1, region: 'gansu',    desc: '大漠孤烟，鸣沙月牙泉。' },
    { name: '兰州',     lon: 103.8, lat: 36.1, region: 'gansu',    desc: '黄河穿城，牛肉面飘香。' },
    { name: '呼和浩特', lon: 111.7, lat: 40.8, region: 'neimeng',  desc: '青色的城，草原之都。' },
    { name: '呼伦贝尔', lon: 119.8, lat: 49.2, region: 'neimeng',  desc: '一望无际的大草原。' },
    { name: '哈尔滨',   lon: 126.6, lat: 45.8, region: 'dongbei',  desc: '冰城夏都，松花江畔的东方莫斯科。' },
    { name: '沈阳',     lon: 123.4, lat: 41.8, region: 'dongbei',  desc: '共和国长子，盛京故都。' },
    { name: '北京',     lon: 116.4, lat: 39.9, region: 'huabei',   desc: '千年古都，红墙金瓦。' },
    { name: '青岛',     lon: 120.4, lat: 36.1, region: 'huabei',   desc: '红瓦绿树，碧海蓝天。' },
    { name: '上海',     lon: 121.5, lat: 31.2, region: 'jiangnan', desc: '东方明珠，不夜之城。' },
    { name: '杭州',     lon: 120.2, lat: 30.3, region: 'jiangnan', desc: '西湖烟雨，人间天堂。' },
    { name: '广州',     lon: 113.3, lat: 23.1, region: 'huanan',   desc: '花城羊城，千年商都。' },
    { name: '三亚',     lon: 109.5, lat: 18.3, region: 'huanan',   desc: '椰风海韵，天涯海角。' },
    { name: '昆明',     lon: 102.7, lat: 25.0, region: 'yunnan',   desc: '环中国一周，回到春城。', loop: true }
  ];

  const LON0 = 105, LAT0 = 35;
  function proj(lon, lat) {
    return new THREE.Vector3((lon - LON0) * DEG * 0.82, 0, -(lat - LAT0) * DEG); // 0.82≈cos(35°)，使地图比例更接近真实
  }

  // 去掉最后一个重复的昆明作为曲线控制点，闭合
  const pts = CITIES.slice(0, -1).map(c => proj(c.lon, c.lat));
  const curve = new THREE.CatmullRomCurve3(pts, true, 'centripetal');
  const LENGTH = curve.getLength();
  curve.arcLengthDivisions = 4000;
  curve.updateArcLengths();

  // 每个城市的曲线弧长位置 (最近点搜索)
  const SAMPLES = 6000;
  const samplePts = [];
  for (let i = 0; i <= SAMPLES; i++) samplePts.push(curve.getPointAt(i / SAMPLES));
  CITIES.forEach((c, idx) => {
    const p = proj(c.lon, c.lat);
    let best = 0, bd = 1e18;
    for (let i = 0; i < SAMPLES; i++) {
      const d = samplePts[i].distanceToSquared(p);
      if (d < bd) { bd = d; best = i; }
    }
    c.s = c.loop ? LENGTH : (best / SAMPLES) * LENGTH;
    c.pos = samplePts[best].clone();
    c.pos2 = p;
  });
  // 保证第一个城市从 s=0 开始
  CITIES[0].s = 0;
  // 城市按 s 排序（环线顺序本就如此，但保险起见）
  const ORDER = CITIES.slice(0, -1).slice().sort((a, b) => a.s - b.s);
  ORDER.push(CITIES[CITIES.length - 1]);

  // 真实里程缩放：环线约 2 万公里在游戏里 -> 显示里程
  const KM_PER_UNIT = 0.2137;          // 每个世界单位折合的“真实公里”，改线路后总里程随之变化

  function wrap(s) { return ((s % LENGTH) + LENGTH) % LENGTH; }

  // 某弧长处所属区域（取上一个城市的区域，与下一个城市区域混合时按距离过渡）
  function regionAt(s) {
    s = wrap(s);
    let prev = ORDER[0], next = ORDER[1];
    for (let i = 0; i < ORDER.length - 1; i++) {
      if (s >= ORDER[i].s && s < ORDER[i + 1].s) { prev = ORDER[i]; next = ORDER[i + 1]; break; }
    }
    const span = Math.max(1, next.s - prev.s);
    const t = (s - prev.s) / span;
    // 区间前 45% 属于 prev 区域，之后属于 next 区域，中间平滑过渡
    return { a: REGIONS[prev.region], b: REGIONS[next.region], k: smooth(0.4, 0.6, t), prev, next, t, span };
  }
  function smooth(a, b, x) { x = Math.min(1, Math.max(0, (x - a) / (b - a))); return x * x * (3 - 2 * x); }

  window.Route = { REGIONS, CITIES: ORDER, curve, LENGTH, KM_PER_UNIT, proj, wrap, regionAt, DEG, smooth };
})();
