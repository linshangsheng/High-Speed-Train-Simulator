/* 天空：程序化大气渐变 + 体积感云层(着色器 fbm) + 太阳/月亮/星空 + 昼夜 + 环境反射贴图(PMREM) + 指数雾 */
(function () {
  const C = (h) => new THREE.Color(h);
  const NIGHT_TOP = C(0x050912), NIGHT_HOR = C(0x1a2742), DAWN_HOR = C(0xff9a5c);
  const _tA = new THREE.Color(), _tB = new THREE.Color(), _tC = new THREE.Color();

  const VERT = 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }';
  const FRAG = [
    'uniform vec3 uZenith; uniform vec3 uHorizon; uniform vec3 uGround; uniform vec3 uSunDir; uniform vec3 uSunCol;',
    'uniform vec3 uRbDir; uniform float uRainbow;',
    'uniform float uNight; uniform float uCover; uniform float uDark; uniform float uTime; uniform float uFlash; uniform vec2 uCam;',
    'varying vec3 vP;',
    'float hash(vec2 p){ p = fract(p*vec2(123.34,456.21)); p += dot(p,p+45.32); return fract(p.x*p.y); }',
    'float noise(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);',
    '  return mix(mix(hash(i),hash(i+vec2(1,0)),f.x), mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x), f.y); }',
    'float fbm(vec2 p){ float a=.5,s=0.; for(int i=0;i<5;i++){ s+=a*noise(p); p=p*2.03+vec2(17.1,9.2); a*=.5; } return s; }',
    'vec3 hsv2rgb(float h){ vec4 K = vec4(1., 2./3., 1./3., 3.); vec3 p = abs(fract(vec3(h)+K.xyz)*6. - K.www); return clamp(p - K.xxx, 0., 1.); }',
    'void main(){',
    '  vec3 d = normalize(vP);',
    '  float h = max(d.y,0.);',
    '  vec3 col = mix(uHorizon, uZenith, pow(h, 0.42));',
    '  float sd = max(dot(d,uSunDir),0.);',
    '  float dayK = 1.-uNight;',
    '  col += uSunCol*(pow(sd,5.)*0.16 + pow(sd,40.)*0.30 + pow(sd,900.)*4.0)*dayK*(1.-0.6*uDark);',
    '  col += uSunCol*smoothstep(0.99955,0.99985,sd)*40.*dayK*(1.-0.85*uDark);',
    '  if(uRainbow > 0.001 && d.y > -0.05){',
    '    float ang = degrees(acos(clamp(dot(d, uRbDir), -1., 1.)));',
    '    float t1 = (ang - 39.5)/3.3; float b1 = smoothstep(0.,0.18,t1)*(1.-smoothstep(0.82,1.,t1));',
    '    vec3 c1 = hsv2rgb(0.76*(1.-clamp(t1,0.,1.)));',
    '    float t2 = (ang - 50.0)/3.8; float b2 = smoothstep(0.,0.2,t2)*(1.-smoothstep(0.8,1.,t2));',
    '    vec3 c2 = hsv2rgb(0.76*clamp(t2,0.,1.));',
    '    float inner = smoothstep(42.7,30.,ang)*0.08;',
    '    col += (c1*b1*1.15 + c2*b2*0.38 + vec3(inner*1.4))*uRainbow*smoothstep(-0.03,0.08,d.y);',
    '  }',
    '  if(d.y > 0.0){',
    '    float t = 1./(d.y+0.10);',
    '    vec2 uv = d.xz*t*1.35 + uCam*0.00035 + vec2(uTime*0.0035, uTime*0.0012);',
    '    float n = fbm(uv*0.85);',
    '    float det = fbm(uv*3.3 + n*1.7);',
    '    float shape = n*0.72 + det*0.34;',
    '    float dens = smoothstep(1.-uCover, 1.-uCover+0.30, shape);',
    '    float n2 = fbm((uv + uSunDir.xz*0.10)*0.85)*0.72 + fbm((uv + uSunDir.xz*0.10)*3.3 + n*1.7)*0.34;',
    '    float lit = clamp((shape - n2)*3.2 + 0.55, 0., 1.);',
    '    vec3 litC = mix(vec3(1.0), uSunCol, 0.40)*(1.-0.80*uNight);',
    '    vec3 shC = mix(uZenith*0.75, vec3(0.50,0.56,0.68), 0.5)*(1.-0.85*uNight);',
    '    vec3 cc = mix(shC, litC, lit);',
    '    cc += uSunCol*pow(sd,8.)*0.35*dens*dayK;',
    '    cc *= 1. - 0.62*uDark;',
    '    float al = dens*smoothstep(0.0,0.16,d.y)*0.94;',
    '    col = mix(col, cc, al);',
    '    vec2 uc = vec2(d.x*t*0.5 + uTime*0.002 + uCam.x*0.0001, d.z*t*2.6);',
    '    float ci = smoothstep(0.55,0.95,fbm(uc)) * smoothstep(0.02,0.3,d.y) * (1.-uCover*0.6) * 0.38;',
    '    col = mix(col, mix(vec3(1.), uSunCol, 0.3)*(1.-0.85*uNight), ci);',
    '    col += vec3(0.78,0.85,1.0)*uFlash*(0.35+0.9*fbm(uv*1.4))*(0.4+dens);',
    '  }',
    '  col = mix(col, uGround, smoothstep(0.0,-0.30,d.y));',
    '  gl_FragColor = vec4(col, 1.);',
    '  #include <tonemapping_fragment>',
    '  #include <encodings_fragment>',
    '}'
  ].join('\n');

  function discTexture(inner, outer) {
    const cv = document.createElement('canvas'); cv.width = cv.height = 128;
    const g = cv.getContext('2d');
    const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    gr.addColorStop(0, inner); gr.addColorStop(0.35, inner); gr.addColorStop(1, outer);
    g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
    return srgbTex(new THREE.CanvasTexture(cv));
  }

  function create(scene, renderer) {
    scene.fog = new THREE.FogExp2(0xbfe3ff, 0.00018);
    const uniforms = {
      uZenith: { value: C(0x4aa3f0) }, uHorizon: { value: C(0xbfe3ff) }, uGround: { value: C(0x556050) },
      uSunDir: { value: new THREE.Vector3(0, 1, 0) }, uRbDir: { value: new THREE.Vector3(0, -0.3, 1) }, uRainbow: { value: 0 }, uSunCol: { value: C(0xfff0d0) },
      uNight: { value: 0 }, uCover: { value: 0.45 }, uDark: { value: 0 }, uTime: { value: 0 }, uFlash: { value: 0 }, uCam: { value: new THREE.Vector2() }
    };
    const skyMat = new THREE.ShaderMaterial({ uniforms, vertexShader: VERT, fragmentShader: FRAG, side: THREE.BackSide, depthWrite: false, fog: false });
    const dome = new THREE.Mesh(new THREE.SphereGeometry(9000, 40, 24), skyMat); dome.renderOrder = -10; dome.frustumCulled = false;
    scene.add(dome);

    // 环境反射：用同一天空材质画一个小圆顶，PMREM 预过滤
    const envScene = new THREE.Scene();
    const envDome = new THREE.Mesh(new THREE.SphereGeometry(50, 24, 16), skyMat); envDome.frustumCulled = false; envScene.add(envDome);
    const pmrem = new THREE.PMREMGenerator(renderer);
    let envRT = null, envTimer = 99;
    function refreshEnv() {
      const rt = pmrem.fromScene(envScene, 0, 1, 200);
      if (envRT) envRT.dispose();
      envRT = rt; scene.environment = rt.texture;
    }

    const hemi = new THREE.HemisphereLight(0xcfe8ff, 0x6a5a3a, 0.9); scene.add(hemi);
    const sun = new THREE.DirectionalLight(0xffffff, 2.4); scene.add(sun); scene.add(sun.target);
    sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
    const sc = sun.shadow.camera; sc.left = -110; sc.right = 110; sc.top = 110; sc.bottom = -110; sc.near = 1; sc.far = 500;
    sun.shadow.bias = -0.0003; sun.shadow.normalBias = 0.04;

    const moonSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: discTexture('rgba(235,240,255,1)', 'rgba(150,170,230,0)'), fog: false, depthWrite: false, transparent: true }));
    moonSprite.scale.set(640, 640, 1); scene.add(moonSprite);

    const sg = new THREE.BufferGeometry(), sp = [];
    for (let i = 0; i < 2200; i++) {
      const a = Math.random() * Math.PI * 2, yy = Math.random() * 0.97 + 0.02, r = Math.sqrt(1 - yy * yy);
      sp.push(Math.cos(a) * r * 8500, yy * 8500, Math.sin(a) * r * 8500);
    }
    sg.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3));
    const stars = new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xffffff, size: 1.8, sizeAttenuation: false, transparent: true, opacity: 0, fog: false, depthWrite: false }));
    scene.add(stars);

    const state = { daylight: 1, phase: 0.08, sunElev: 0.5, night: 0, hor: new THREE.Color(), flash: 0 };
    let time = 0;

    // wx: { cover, dark, fog, flash }  由天气系统提供
    function update(dt, s, camPos, rinfo, forcedPhase, tf, wx) {
      tf = tf || 0; wx = wx || {}; time += dt;
      state.phase = forcedPhase != null ? forcedPhase : (0.08 + s / 36000) % 1;
      const ang = state.phase * Math.PI * 2;
      const elev = Math.sin(ang) + 0.18;
      state.sunElev = elev;
      const day = THREE.MathUtils.smoothstep(elev, -0.12, 0.28);
      state.daylight = day; state.night = 1 - day;
      const dusk = Math.max(0, 1 - Math.abs(elev - 0.02) / 0.3);
      const dark = wx.dark || 0, cover = Math.min(1, (wx.cover != null ? wx.cover : 0.45));

      const a = rinfo.a, b = rinfo.b, k = rinfo.k;
      _tA.set(a.sky).lerp(_tB.set(b.sky), k);
      _tC.set(a.fog).lerp(_tB.set(b.fog), k);
      const gray = _tB.setRGB(0.20, 0.23, 0.28);
      const zenith = uniforms.uZenith.value.copy(_tA).lerp(NIGHT_TOP, 1 - day).lerp(gray, dark * 0.75);
      const hor = uniforms.uHorizon.value.copy(_tC).lerp(NIGHT_HOR, 1 - day).lerp(DAWN_HOR, dusk * 0.5).lerp(_tB.setRGB(0.30, 0.32, 0.35).multiplyScalar(0.3 + 0.7 * day), dark * 0.65);
      if (wx.dust) {
        zenith.lerp(_tB.set(0xb59564).multiplyScalar(0.25 + 0.75 * day), wx.dust * 0.7);
        hor.lerp(_tB.set(0xc7a672).multiplyScalar(0.3 + 0.7 * day), wx.dust * 0.85);
      }
      uniforms.uGround.value.set(a.ground).lerp(_tB.set(b.ground), k).multiplyScalar(0.12 + 0.5 * day);

      const sdir = new THREE.Vector3(Math.cos(ang) * 0.9, Math.sin(ang) * 0.9 + 0.15, -0.35).normalize();
      uniforms.uSunDir.value.copy(sdir);
      uniforms.uSunCol.value.set(0xfff4e0).lerp(_tB.set(0xff9a50), dusk * 0.85).lerp(_tB.set(0x8fa8ff), 1 - day);
      // 彩虹位于太阳正对面；太阳过高时假定为 30° 以内，保证弧顶在地平线上方可见
      { const se = Math.min(0.5, Math.max(0.1, Math.asin(Math.max(-1, Math.min(1, sdir.y))))), hx = -sdir.x, hz = -sdir.z, hl = Math.hypot(hx, hz) || 1;
        uniforms.uRbDir.value.set(hx / hl * Math.cos(se), -Math.sin(se), hz / hl * Math.cos(se));
        uniforms.uRainbow.value = (wx.rainbow || 0) * day * (1 - 0.5 * dark); }
      uniforms.uNight.value = 1 - day; uniforms.uCover.value = cover; uniforms.uDark.value = dark;
      uniforms.uTime.value = time; uniforms.uFlash.value = wx.flash || 0; state.flash = wx.flash || 0;
      uniforms.uCam.value.set(camPos.x, camPos.z);
      dome.position.copy(camPos);
      moonSprite.position.copy(camPos).addScaledVector(sdir, -8000);
      moonSprite.material.opacity = (1 - day) * (1 - dark * 0.8);
      stars.position.copy(camPos); stars.material.opacity = Math.max(0, 1 - day * 1.4) * (1 - dark * 0.9) * (1 - Math.max(0, cover - 0.4) * 1.1) * (1 - (wx.dust || 0) * 0.9);

      // 指数雾，颜色与地平线一致，保证远山融入天空
      const fogD = 0.00013 + 0.00022 * (rinfo.fogDensity || 0) + (wx.fog || 0);
      scene.fog.color.copy(hor).multiplyScalar(0.98); scene.fog.density = fogD;
      state.hor.copy(hor);

      sun.position.copy(camPos).addScaledVector(sdir, 250); sun.target.position.copy(camPos);
      sun.color.copy(uniforms.uSunCol.value);
      sun.intensity = (0.06 + 1.9 * day) * (1 - 0.72 * dark) * (1 - 0.35 * cover * (1 - dark));
      hemi.intensity = (0.22 + 0.85 * day) * (1 - 0.15 * dark) + (wx.flash || 0) * 1.6;
      hemi.color.copy(zenith).lerp(_tB.setRGB(1, 1, 1), 0.45);
      hemi.groundColor.copy(uniforms.uGround.value).multiplyScalar(1.5);

      if (tf > 0) {
        sun.intensity *= 1 - 0.92 * tf; hemi.intensity *= 1 - 0.72 * tf;
        scene.fog.color.lerp(_tB.setHex(0x06080c), tf);
        scene.fog.density = scene.fog.density * (1 - tf) + 0.0075 * tf;
      }

      envTimer += dt;
      if (envTimer > 2.2 || !envRT) { envTimer = 0; refreshEnv(); }
    }
    return { update, state, sun, refreshEnv, uniforms };
  }

  window.Sky = { create };
})();
