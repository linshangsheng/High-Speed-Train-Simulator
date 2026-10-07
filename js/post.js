/* 后期处理：HDR(半精度)渲染 → 泛光 → 速度径向模糊 + ACES 色调映射 + 暗角 + 胶片颗粒 + sRGB 输出。
   依赖 three examples 里的 EffectComposer 等（CDN）。不可用/不支持时自动退回直接渲染。 */
(function () {
  let renderer, scene, camera, composer, bloom, finalPass, ok = false, level = 0, wasToneMapping, wasEncoding;

  const FinalShader = {
    uniforms: { tDiffuse: { value: null }, uExposure: { value: 1.0 }, uBlur: { value: 0 }, uVig: { value: 0.28 }, uGrain: { value: 0.018 }, uTime: { value: 0 }, uCenter: { value: new THREE.Vector2(0.5, 0.52) }, uSat: { value: 1.0 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }',
    fragmentShader: [
      'uniform sampler2D tDiffuse; uniform float uExposure; uniform float uBlur; uniform float uVig; uniform float uGrain; uniform float uTime; uniform vec2 uCenter; uniform float uSat;',
      'varying vec2 vUv;',
      'float hash(vec2 p){ p = fract(p*vec2(443.897,441.423)); p += dot(p,p+19.19); return fract(p.x*p.y); }',
      'vec3 aces(vec3 x){ return clamp((x*(2.51*x+0.03))/(x*(2.43*x+0.59)+0.14),0.,1.); }',
      'vec3 toSRGB(vec3 c){ return mix(c*12.92, 1.055*pow(c,vec3(1./2.4))-0.055, step(0.0031308,c)); }',
      'void main(){',
      '  vec2 dir = vUv - uCenter;',
      '  float edge = length(dir);',
      '  vec3 col;',
      '  if(uBlur > 0.002){',
      '    col = vec3(0.); float tot = 0.;',
      '    for(int i=0;i<9;i++){ float t = float(i)/8.; float w = 1.-t*0.55; col += texture2D(tDiffuse, vUv - dir*uBlur*0.075*t*smoothstep(0.05,0.6,edge)*2.0).rgb*w; tot += w; }',
      '    col /= tot;',
      '  } else col = texture2D(tDiffuse, vUv).rgb;',
      '  col *= uExposure;',
      '  col = aces(col);',
      '  float l = dot(col, vec3(0.299,0.587,0.114)); col = mix(vec3(l), col, uSat);',
      '  col *= 1. - uVig*smoothstep(0.35,0.95,edge*1.25);',
      '  col = toSRGB(col);',
      '  col += (hash(vUv*vec2(1920.,1080.) + fract(uTime)*37.) - 0.5)*uGrain;',
      '  gl_FragColor = vec4(col, 1.);',
      '}'
    ].join('\n')
  };

  function init(r, s, c) {
    renderer = r; scene = s; camera = c;
    if (!THREE.EffectComposer || !THREE.RenderPass || !THREE.ShaderPass || !THREE.UnrealBloomPass) return false;
    const gl = renderer.getContext(), isGL2 = renderer.capabilities.isWebGL2;
    const hasFloat = isGL2 ? renderer.extensions.has('EXT_color_buffer_float') : renderer.extensions.has('EXT_color_buffer_half_float');
    if (!hasFloat) return false;
    try {
      const sz = renderer.getDrawingBufferSize(new THREE.Vector2());
      const Rt = isGL2 ? THREE.WebGLMultisampleRenderTarget : THREE.WebGLRenderTarget;
      const rt = new Rt(sz.x, sz.y, { type: THREE.HalfFloatType, format: THREE.RGBAFormat, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter });
      if (isGL2) rt.samples = 4;
      composer = new THREE.EffectComposer(renderer, rt);
      composer.addPass(new THREE.RenderPass(scene, camera));
      bloom = new THREE.UnrealBloomPass(new THREE.Vector2(sz.x, sz.y), 0.55, 0.65, 1.5);
      composer.addPass(bloom);
      finalPass = new THREE.ShaderPass(new THREE.ShaderMaterial(FinalShader));
      finalPass.uniforms = THREE.UniformsUtils.clone(FinalShader.uniforms);
      finalPass.material.uniforms = finalPass.uniforms;
      composer.addPass(finalPass);
      ok = true;
    } catch (e) { console.warn('后期处理初始化失败，使用直接渲染', e); ok = false; }
    return ok;
  }

  function refreshMaterials() { scene.traverse(o => { const m = o.material; if (m) (Array.isArray(m) ? m : [m]).forEach(x => x.needsUpdate = true); }); }

  function setLevel(l) {
    if (!ok) { level = 0; return; }
    if (l > 0 && level === 0) {          // 进入后期：由最终 pass 做色调映射与 sRGB
      wasToneMapping = renderer.toneMapping; wasEncoding = renderer.outputEncoding;
      renderer.toneMapping = THREE.NoToneMapping; renderer.outputEncoding = THREE.LinearEncoding; refreshMaterials();
    } else if (l === 0 && level > 0) {
      renderer.toneMapping = wasToneMapping; renderer.outputEncoding = wasEncoding; refreshMaterials();
    }
    level = l;
    if (bloom) bloom.strength = l >= 2 ? 0.6 : 0.4;
  }
  function active() { return ok && level > 0; }
  function resize(w, h, pr) { if (!ok) return; composer.setPixelRatio(pr); composer.setSize(w, h); }
  function render(dt, speedK, exposure) {
    const u = finalPass.uniforms;
    u.uBlur.value = level >= 2 ? Math.pow(Math.min(1, speedK), 1.4) * 0.9 : 0;
    u.uTime.value += dt; u.uExposure.value = exposure || 1.0;
    composer.render(dt);
  }
  function set(name, v) { if (finalPass) finalPass.uniforms[name].value = v; }

  window.Post = { init, setLevel, active, resize, render, set, available: () => ok };
})();
