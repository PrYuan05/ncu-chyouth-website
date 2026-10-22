/* 小章：彰友會章魚吉祥物的 3D 版（柯南眼鏡、紅色蝴蝶結、拿放大鏡）。
 * 用法：CC.mascot(元素, { onReady }) → 控制器 { look(x, y), pose(名稱), glint(), investigate(), destroy() }
 * 姿勢：wave（預設）、magnify（拿放大鏡看）、glint（推眼鏡鏡片一閃）、surprise（驚訝）、celebrate（慶祝）
 */
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.min.js";

const COLOR = {
  body: 0xE88B66, spot: 0xD8613A, outline: 0x7A4316, blush: 0xFF8FA3,
  cap: 0x5E97DE, capDark: 0x3F74BD, frame: 0x1E293B, bow: 0xD7263D, brass: 0xD69E2E
};

/* Soft studio light for reflections, so the glossy toy look works without image files. */
function studio(renderer) {
  const scene = new THREE.Scene();
  const room = new THREE.Mesh(new THREE.BoxGeometry(10, 10, 10), new THREE.MeshBasicMaterial({ color: 0x5a6070, side: THREE.BackSide }));
  scene.add(room);
  const panel = (w, h, color, pos) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color }));
    m.position.set(...pos); m.lookAt(0, 0, 0); scene.add(m);
  };
  panel(6, 3, 0xffffff, [0, 4.9, 0]);
  panel(3, 3, 0xfff1e0, [-4.9, 1, 2]);
  panel(3, 4, 0xdfe9ff, [4.9, 0.5, -1]);
  panel(4, 2, 0xffffff, [0, 1, 4.9]);
  const pm = new THREE.PMREMGenerator(renderer);
  const tex = pm.fromScene(scene, 0.04).texture;
  pm.dispose();
  return tex;
}

/* Tentacle sway and outline thickness are done in the vertex shader, so the arms flow without rebuilding meshes. */
function shade(mat, shared, { wave = false, outline = 0, rim = false } = {}) {
  mat.customProgramCacheKey = () => `cc-${wave}-${outline}-${rim}`;
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = shared.uTime;
    sh.uniforms.uAmp = shared.uAmp;
    sh.vertexShader = sh.vertexShader
      .replace("#include <common>", `#include <common>
        uniform float uTime; uniform float uAmp;
        ${wave ? "attribute float aT; attribute float aPhase; attribute float aWave;" : ""}`)
      .replace("#include <begin_vertex>", `#include <begin_vertex>
        ${outline ? `transformed += normalize(normal) * ${outline.toFixed(3)};` : ""}
        ${wave ? `float w = aT * aT * uAmp * aWave;
        transformed += vec3(sin(uTime * 1.7 + aT * 3.2 + aPhase), 0.55 * sin(uTime * 1.3 + aT * 2.6 + aPhase * 1.7), cos(uTime * 1.5 + aT * 3.0 + aPhase)) * w;` : ""}`);
    if (rim) {
      sh.fragmentShader = sh.fragmentShader.replace("#include <dithering_fragment>", `#include <dithering_fragment>
        float fr = pow(1.0 - abs(dot(normalize(normal), normalize(vViewPosition))), 2.2);
        gl_FragColor.rgb += vec3(1.0, 0.82, 0.7) * fr * 0.35;`);
    }
  };
  return mat;
}

function tube(points, r0, r1, phase, wave, segs) {
  const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)));
  const T = segs, R = 14;
  const g = new THREE.TubeGeometry(curve, T, 1, R, false);
  const pos = g.attributes.position, nor = g.attributes.normal;
  const aT = [], col = [], P = new THREE.Vector3(), V = new THREE.Vector3(), N = new THREE.Vector3();
  const spotA = new THREE.Color(COLOR.spot), base = new THREE.Color(0xffffff);
  const bodyC = new THREE.Color(COLOR.body);
  const k = spotA.clone().multiply(new THREE.Color(1 / bodyC.r, 1 / bodyC.g, 1 / bodyC.b));
  const up = new THREE.Vector3(0, 0.6, 1).normalize();
  for (let i = 0; i <= T; i++) {
    const t = i / T;
    curve.getPointAt(t, P);
    const r = THREE.MathUtils.lerp(r0, r1, Math.pow(t, 0.85));
    for (let j = 0; j <= R; j++) {
      const idx = i * (R + 1) + j;
      V.fromBufferAttribute(pos, idx).sub(P).multiplyScalar(r).add(P);
      pos.setXYZ(idx, V.x, V.y, V.z);
      aT.push(t);
      N.fromBufferAttribute(nor, idx);
      // Darker sucker spots along the top side, like the original drawing.
      const facing = N.dot(up);
      const s = (Math.abs(t - 0.6) < 0.05 || Math.abs(t - 0.78) < 0.04) && facing > 0.72;
      const c = s ? k : base;
      col.push(c.r, c.g, c.b);
    }
  }
  // A rounded cap on the tip.
  g.setAttribute("aT", new THREE.Float32BufferAttribute(aT, 1));
  g.setAttribute("aPhase", new THREE.Float32BufferAttribute(aT.map(() => phase), 1));
  g.setAttribute("aWave", new THREE.Float32BufferAttribute(aT.map(() => wave), 1));
  g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
  g.computeVertexNormals();
  return { geometry: g, curve };
}

function capTexture() {
  const c = document.createElement("canvas");
  c.width = 1024; c.height = 512;
  const x = c.getContext("2d");
  x.fillStyle = "#5E97DE"; x.fillRect(0, 0, 1024, 512);
  // Panel seams.
  x.strokeStyle = "#3F74BD"; x.lineWidth = 7;
  for (let i = 0; i < 6; i++) { const u = (i / 6 + 0.25 + 1 / 12) * 1024 % 1024; x.beginPath(); x.moveTo(u, 0); x.lineTo(u, 512); x.stroke(); }
  // NCUCH on the front panel (u = 0.25 faces +z).
  x.fillStyle = "#FFFFFF"; x.font = "900 118px 'Arial Rounded MT Bold', 'Nunito', 'Noto Sans TC', sans-serif";
  x.textAlign = "center"; x.textBaseline = "middle";
  x.save(); x.translate(392, 300); x.scale(0.62, 1); x.shadowColor = "rgba(30,41,59,0.35)"; x.shadowOffsetY = 6; x.fillText("NCUCH", 0, 0); x.restore();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}

function glintMaterial(shared) {
  return new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uGlint: shared.uGlint },
    vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }",
    fragmentShader: `uniform float uGlint; varying vec2 vUv;
      void main(){
        float d = (vUv.x + vUv.y) * 0.5 - uGlint;
        float band = smoothstep(0.09, 0.0, abs(d)) + 0.5 * smoothstep(0.035, 0.0, abs(d - 0.13));
        float base = 0.10 * smoothstep(0.5, 0.0, length(vUv - vec2(0.32, 0.7)));
        gl_FragColor = vec4(vec3(1.0), clamp(band * 0.95 + base, 0.0, 1.0));
      }`
  });
}

function build(shared, quality) {
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  const segs = quality === "low" ? 36 : 60;

  const skin = shade(new THREE.MeshPhysicalMaterial({
    color: COLOR.body, roughness: 0.42, clearcoat: 0.55, clearcoatRoughness: 0.3,
    sheen: 0.35, sheenColor: new THREE.Color(0xffc4a8), sheenRoughness: 0.5, emissive: 0x3a1208, emissiveIntensity: 0.2
  }), shared, { rim: true });
  const skinTent = shade(new THREE.MeshPhysicalMaterial({
    color: COLOR.body, roughness: 0.42, clearcoat: 0.55, clearcoatRoughness: 0.3, vertexColors: true,
    sheen: 0.35, sheenColor: new THREE.Color(0xffc4a8), sheenRoughness: 0.5, emissive: 0x3a1208, emissiveIntensity: 0.2
  }), shared, { wave: true, rim: true });
  const line = (wave) => shade(new THREE.MeshBasicMaterial({ color: COLOR.outline, side: THREE.BackSide }), shared, { wave, outline: 0.03 });
  const lineStatic = line(false), lineWave = line(true);

  // Head and mantle: one smooth lathe, squashed a little front to back.
  const prof = [[0, -0.06], [0.52, 0.0], [0.78, 0.14], [0.9, 0.34], [0.97, 0.6], [1.0, 0.95], [0.98, 1.27], [0.88, 1.57], [0.66, 1.81], [0.36, 1.96], [0, 2.02]];
  const headG = new THREE.LatheGeometry(prof.map(([r, y]) => new THREE.Vector2(r, y)), quality === "low" ? 40 : 64);
  headG.scale(1, 1, 0.92);
  headG.computeVertexNormals();
  const head = new THREE.Mesh(headG, skin);
  body.add(head, new THREE.Mesh(headG, lineStatic));
  // Depth of the head surface at (x, y), used to sit the face features on the skin.
  const surf = (x, y) => {
    let r = 0;
    for (let i = 1; i < prof.length; i++) if (y <= prof[i][1]) { const [r0, y0] = prof[i - 1], [r1, y1] = prof[i]; r = r0 + (r1 - r0) * (y - y0) / (y1 - y0); break; }
    return Math.sqrt(Math.max(0, r * r - x * x)) * 0.92;
  };

  // Eight tentacles: two raised arms and six legs. Angle 0 faces the viewer.
  const tentacles = new THREE.Group();
  body.add(tentacles);
  const legs = [[-38, 1.0, 1], [38, 1.0, 2], [-72, 0.95, 3], [72, 0.95, 4], [-118, 0.9, 5], [118, 0.9, 6]];
  const place = (deg, pts) => {
    const a = THREE.MathUtils.degToRad(deg), s = Math.sin(a), c = Math.cos(a);
    return pts.map(([d, h]) => [s * d, h, c * d * 0.95]);
  };
  legs.forEach(([deg, len, ph]) => {
    const pts = place(deg, [[0.45, 0.3], [0.85, -0.02], [1.3 * len, -0.24], [1.72 * len, -0.18], [1.95 * len, 0.06], [1.92 * len, 0.26]]);
    const { geometry } = tube(pts, 0.3, 0.07, ph, 1, segs);
    tentacles.add(new THREE.Mesh(geometry, skinTent), new THREE.Mesh(geometry, lineWave));
  });
  // Left arm waves; right arm holds the magnifier on a pivot so it can swing to the face.
  const leftArm = tube(place(-92, [[0.6, 0.6], [1.05, 0.48], [1.45, 0.72], [1.62, 1.12], [1.5, 1.42]]), 0.27, 0.07, 7, 1.3, segs);
  tentacles.add(new THREE.Mesh(leftArm.geometry, skinTent), new THREE.Mesh(leftArm.geometry, lineWave));

  const armPivot = new THREE.Group();
  armPivot.position.set(0.62, 0.62, 0);
  body.add(armPivot);
  const rightArm = tube([[0, 0, 0], [0.42, -0.1, 0.05], [0.85, 0.15, 0.12], [1.02, 0.6, 0.2], [0.95, 0.95, 0.26]], 0.27, 0.08, 8, 0, segs);
  armPivot.add(new THREE.Mesh(rightArm.geometry, skinTent), new THREE.Mesh(rightArm.geometry, lineWave));

  // Magnifying glass gripped by the arm tip.
  const glass = new THREE.Group();
  const brass = new THREE.MeshPhysicalMaterial({ color: COLOR.brass, metalness: 0.75, roughness: 0.28, clearcoat: 0.6 });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.05, 16, 56), brass);
  const lens = new THREE.Mesh(new THREE.CircleGeometry(0.33, 48), new THREE.MeshPhysicalMaterial({
    color: 0xdff1ff, transparent: true, opacity: 0.22, roughness: 0.02, metalness: 0, clearcoat: 1, side: THREE.DoubleSide
  }));
  const lensGlint = new THREE.Mesh(new THREE.CircleGeometry(0.33, 48), glintMaterial(shared));
  lensGlint.position.z = 0.004;
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.065, 0.55, 20), new THREE.MeshPhysicalMaterial({ color: 0x3b2414, roughness: 0.4, clearcoat: 0.5 }));
  handle.position.set(0, -0.62, 0);
  const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.1, 20), brass);
  collar.position.set(0, -0.36, 0);
  glass.add(ring, lens, lensGlint, handle, collar);
  glass.position.set(0.97, 1.47, 0.3);
  glass.rotation.set(-0.15, -0.35, -0.35);
  armPivot.add(glass);

  // Face: glossy eyes with highlights, smile, blush.
  const face = new THREE.Group();
  body.add(face);
  const eyeMat = new THREE.MeshPhysicalMaterial({ color: 0x0b0b12, roughness: 0.12, clearcoat: 1 });
  const white = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const eyes = [];
  [-0.3, 0.3].forEach((x) => {
    const g = new THREE.Group();
    const e = new THREE.Mesh(new THREE.SphereGeometry(0.13, 24, 16), eyeMat);
    e.scale.set(0.82, 1.28, 0.55);
    const h1 = new THREE.Mesh(new THREE.SphereGeometry(0.038, 12, 8), white);
    h1.position.set(0.035, 0.07, 0.06);
    const h2 = new THREE.Mesh(new THREE.SphereGeometry(0.016, 8, 6), white);
    h2.position.set(-0.03, -0.06, 0.06);
    g.add(e, h1, h2);
    g.position.set(x, 1.02, surf(x, 1.02) + 0.01);
    g.rotation.y = x * 0.9;
    face.add(g); eyes.push(g);
  });
  const smile = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.024, 10, 32, Math.PI * 0.7), new THREE.MeshBasicMaterial({ color: 0x14141c }));
  smile.position.set(0, 0.74, surf(0, 0.74) + 0.01);
  smile.rotation.z = -Math.PI / 2 - Math.PI * 0.35;
  smile.rotation.x = -0.25;
  face.add(smile);
  const mouthO = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.024, 10, 28), smile.material);
  mouthO.position.set(0, 0.72, surf(0, 0.72) + 0.01); mouthO.rotation.x = -0.25; mouthO.visible = false;
  face.add(mouthO);
  const blushMat = new THREE.MeshBasicMaterial({ color: COLOR.blush, transparent: true, opacity: 0.75 });
  [-0.52, 0.52].forEach((x) => {
    const b = new THREE.Mesh(new THREE.CircleGeometry(0.11, 24), blushMat);
    b.scale.set(1.3, 0.75, 1);
    b.position.set(x, 0.8, surf(x, 0.8) + 0.012);
    b.rotation.y = x * 0.75;
    face.add(b);
  });

  // Conan's round glasses with a glint that sweeps across the lenses.
  const frameMat = new THREE.MeshPhysicalMaterial({ color: COLOR.frame, roughness: 0.25, clearcoat: 1 });
  const glasses = new THREE.Group();
  [-0.31, 0.31].forEach((x) => {
    const g = new THREE.Group();
    g.add(new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.032, 12, 48), frameMat));
    const l = new THREE.Mesh(new THREE.CircleGeometry(0.235, 40), new THREE.MeshPhysicalMaterial({ color: 0xffffff, transparent: true, opacity: 0.12, roughness: 0, clearcoat: 1 }));
    const gl = new THREE.Mesh(new THREE.CircleGeometry(0.235, 40), glintMaterial(shared));
    gl.position.z = 0.003;
    g.add(l, gl);
    g.position.set(x, 1.03, surf(x, 1.03) + 0.13);
    g.rotation.y = x * 0.75;
    glasses.add(g);
  });
  const bridge = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.024, 8, 20, Math.PI), frameMat);
  bridge.position.set(0, 1.07, surf(0, 1.07) + 0.15);
  glasses.add(bridge);
  [-1, 1].forEach((s) => {
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.7, 8), frameMat);
    arm.rotation.x = Math.PI / 2; arm.rotation.z = s * 0.1;
    arm.position.set(s * 0.55, 1.07, 0.62);
    arm.rotation.y = s * 0.55;
    glasses.add(arm);
  });
  body.add(glasses);

  // Red bow tie at the neck.
  const bowMat = new THREE.MeshPhysicalMaterial({ color: COLOR.bow, roughness: 0.35, clearcoat: 0.8 });
  const bow = new THREE.Group();
  [-1, 1].forEach((s) => {
    const w = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.3, 24), bowMat);
    w.rotation.z = s * Math.PI / 2;
    w.position.x = s * 0.15;
    w.scale.set(1, 1, 0.55);
    bow.add(w);
  });
  const knot = new THREE.Mesh(new THREE.SphereGeometry(0.075, 16, 12), bowMat);
  knot.scale.set(1, 1, 0.7);
  bow.add(knot);
  bow.position.set(0, 0.36, surf(0, 0.36) + 0.06);
  bow.rotation.x = -0.35;
  body.add(bow);

  // NCUCH baseball cap, tilted like the original.
  const cap = new THREE.Group();
  const capMat = new THREE.MeshPhysicalMaterial({ map: capTexture(), roughness: 0.6, sheen: 0.4, sheenColor: new THREE.Color(0xbcd6ff) });
  const crownG = new THREE.SphereGeometry(1.06, 64, 24, 0, Math.PI * 2, 0, Math.PI * 0.47);
  crownG.scale(1, 1, 0.94);
  const crown = new THREE.Mesh(crownG, capMat);
  cap.add(crown, new THREE.Mesh(crownG, lineStatic));
  const btn = new THREE.Mesh(new THREE.SphereGeometry(0.09, 16, 10), new THREE.MeshPhysicalMaterial({ color: COLOR.capDark, roughness: 0.5 }));
  btn.position.y = 1.06; btn.scale.y = 0.6;
  cap.add(btn);
  // Brim: a crescent from the crown edge out to the front.
  const brimShape = new THREE.Shape();
  brimShape.absellipse(0, 0, 1.1, 1.78, Math.PI * 0.02, Math.PI * 0.98, false);
  brimShape.absarc(0, 0, 1.04, Math.PI * 0.96, Math.PI * 0.04, true);
  const brimG = new THREE.ExtrudeGeometry(brimShape, { depth: 0.04, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 3, curveSegments: 40 });
  brimG.rotateX(Math.PI / 2);
  brimG.scale(1, 1, 0.94);
  const brimMat = new THREE.MeshPhysicalMaterial({ color: COLOR.cap, roughness: 0.6, sheen: 0.4, sheenColor: new THREE.Color(0xbcd6ff) });
  const brim = new THREE.Group();
  brim.add(new THREE.Mesh(brimG, brimMat), new THREE.Mesh(brimG, lineStatic));
  brim.position.y = 0.12;
  brim.rotation.x = 0.3;
  cap.add(brim);
  cap.position.set(0.02, 1.08, 0);
  cap.rotation.set(-0.3, -0.7, 0.08);
  body.add(cap);

  return { root, body, tentacles, armPivot, glass, eyes, face, glasses, mouthO, smile, cap, leftArm };
}

const POSES = {
  wave:      { arm: [0, 0, 0], eye: 1, mouth: "smile", bodyRot: [0, -0.18, 0], capRot: [-0.3, -0.7, 0.08], glint: -1 },
  magnify:   { arm: [0.6, -1.2, 0], glassY: 1.2, eye: 1.25, mouth: "o", bodyRot: [0.05, -0.05, 0], capRot: [-0.3, -0.7, 0.08], glint: -1 },
  glint:     { arm: [0, 0, 0], eye: 1, mouth: "smile", bodyRot: [0, -0.1, 0], capRot: [-0.3, -0.7, 0.08], glint: 0.5 },
  surprise:  { arm: [0, 0, -0.25], eye: 1.35, mouth: "o", bodyRot: [-0.08, 0, 0], capRot: [-0.42, -0.7, 0.12], glint: -1 },
  celebrate: { arm: [0, 0, -0.55], eye: 1, mouth: "smile", bodyRot: [0, -0.12, 0.06], capRot: [-0.3, -0.7, 0.08], glint: 0.62 }
};

function mount(el, opts = {}) {
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const small = Math.min(el.clientWidth, el.clientHeight) < 260 || matchMedia("(pointer: coarse)").matches;
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: !!opts.capture });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, small ? 1.5 : 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.95;
  renderer.setClearColor(0x000000, 0);
  el.appendChild(renderer.domElement);
  renderer.domElement.style.cssText = "display:block;width:100%;height:100%";

  const scene = new THREE.Scene();
  scene.environment = studio(renderer);
  scene.add(new THREE.HemisphereLight(0xfff4e6, 0x30405e, 0.9));
  const key = new THREE.DirectionalLight(0xffffff, 1.5); key.position.set(-2, 4, 5); scene.add(key);
  const rim = new THREE.DirectionalLight(0x9cc2ff, 1.6); rim.position.set(3, 2, -4); scene.add(rim);

  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
  camera.position.set(0, 1.05, 9.2);
  camera.lookAt(0, 0.85, 0);

  const shared = { uTime: { value: 0 }, uAmp: { value: reduce ? 0 : 0.16 }, uGlint: { value: -1 } };
  const m = build(shared, small ? "low" : "high");
  m.root.position.y = -0.05;
  scene.add(m.root);

  const state = { look: [0, 0], lookS: [0, 0], pose: "wave" };
  const cur = { arm: [0, 0, 0], glassY: 0, eye: 1, bodyRot: [0, -0.18, 0], capRot: [-0.3, -0.7, 0.08] };

  function resize() {
    const w = el.clientWidth, h = el.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  resize();
  const ro = "ResizeObserver" in window ? new ResizeObserver(resize) : null;
  if (ro) ro.observe(el);

  function apply(p, k) {
    const t = POSES[p];
    const lerp = (a, b) => a + (b - a) * k;
    cur.arm = cur.arm.map((v, i) => lerp(v, t.arm[i]));
    cur.eye = lerp(cur.eye, t.eye);
    cur.glassY = lerp(cur.glassY, t.glassY || 0);
    cur.bodyRot = cur.bodyRot.map((v, i) => lerp(v, t.bodyRot[i]));
    cur.capRot = cur.capRot.map((v, i) => lerp(v, t.capRot[i]));
    m.armPivot.rotation.set(cur.arm[0], cur.arm[1], cur.arm[2]);
    m.glass.rotation.y = -0.35 + cur.glassY;
    m.eyes.forEach((e) => e.scale.setScalar(cur.eye));
    m.mouthO.visible = t.mouth === "o"; m.smile.visible = t.mouth !== "o";
    m.cap.rotation.set(cur.capRot[0], cur.capRot[1], cur.capRot[2]);
  }

  let raf = 0, visible = true, last = performance.now(), clock = 0, glintT = -1, nextIdle = 4 + Math.random() * 4, idleUntil = -1;
  function frame(now) {
    raf = 0;
    const dt = Math.max(0, Math.min(0.05, (now - last) / 1000)); last = Math.max(last, now);
    clock += dt;
    shared.uTime.value = clock;
    // Ease toward the pointer.
    state.lookS[0] += (state.look[0] - state.lookS[0]) * Math.min(1, dt * 4);
    state.lookS[1] += (state.look[1] - state.lookS[1]) * Math.min(1, dt * 4);
    const pose = idleUntil > clock ? "magnify" : state.pose;
    apply(pose, Math.min(1, dt * 5));
    m.body.rotation.set(cur.bodyRot[0] - state.lookS[1] * 0.22, cur.bodyRot[1] + state.lookS[0] * 0.5, cur.bodyRot[2] - state.lookS[0] * 0.05);
    m.root.position.y = -0.05 + Math.sin(clock * 1.4) * 0.07;
    if (state.pose === "celebrate") m.root.position.y += Math.abs(Math.sin(clock * 5)) * 0.18;
    // Blink every few seconds.
    const blink = ((clock + 2) % 4.2) < 0.12 ? 0.12 : 1;
    m.eyes.forEach((e) => { e.scale.y = cur.eye * blink; });
    // Idle: now and then he lifts the magnifier for a closer look.
    if (opts.idle !== false && state.pose === "wave" && clock > nextIdle) { idleUntil = clock + 1.6; nextIdle = clock + 7 + Math.random() * 5; }
    if (glintT >= 0) { glintT += dt * 1.6; shared.uGlint.value = -0.3 + glintT * 1.6; if (glintT > 1) { glintT = -1; shared.uGlint.value = POSES[state.pose].glint; } }
    renderer.render(scene, camera);
    if (visible && !reduce) raf = requestAnimationFrame(frame);
  }
  function kick() { if (!raf) { last = performance.now(); raf = requestAnimationFrame(frame); } }

  const io = "IntersectionObserver" in window ? new IntersectionObserver((es) => { visible = es[0].isIntersecting && !document.hidden; if (visible) kick(); }) : null;
  if (io) io.observe(el);
  const onVis = () => { visible = !document.hidden; if (visible) kick(); };
  document.addEventListener("visibilitychange", onVis);

  const api = {
    el, renderer, model: m,
    look(x, y) { state.look = [Math.max(-1, Math.min(1, x)), Math.max(-1, Math.min(1, y))]; if (reduce) kick(); },
    pose(p, instant) {
      if (!POSES[p]) return;
      state.pose = p;
      shared.uGlint.value = POSES[p].glint;
      if (instant) apply(p, 1);
      kick();
    },
    glint() { glintT = 0; kick(); },
    investigate() { idleUntil = clock + 1.6; kick(); },
    render() { frame(performance.now()); },
    snapshot() { renderer.render(scene, camera); return renderer.domElement.toDataURL("image/png"); },
    destroy() {
      cancelAnimationFrame(raf); if (io) io.disconnect(); if (ro) ro.disconnect();
      document.removeEventListener("visibilitychange", onVis);
      renderer.dispose(); renderer.domElement.remove();
    }
  };
  api.pose(opts.pose || "wave", true);
  kick();
  if (opts.onReady) opts.onReady(api);
  return api;
}

window.CCMascot = { mount, POSES: Object.keys(POSES) };
window.dispatchEvent(new Event("cc:mascot"));
