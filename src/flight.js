import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js'

/**
 * Case Studies "flight": a scroll-driven journey through space.
 * The page is one tall spacer; scroll progress p in [0,1] flies the camera
 * along a keyframed path past one planet per case study, ending at a sun
 * for the CTA. Case cards are fixed DOM panels faded in/out on scroll
 * envelopes. A HUD rail shows flight progress and telemetry.
 *
 * Planet/sun/sky textures: Solar System Scope (CC BY 4.0), credited in
 * the page footer and README.
 */

/* ---------------- math helpers ---------------- */

const clamp = (v, a, b) => Math.min(b, Math.max(a, v))
const smoothstep = (a, b, x) => {
  const t = clamp((x - a) / (b - a), 0, 1)
  return t * t * (3 - 2 * t)
}
const envelope = (p, a0, a1, b0, b1) =>
  smoothstep(a0, a1, p) * (1 - smoothstep(b0, b1, p))

/* ---------------- journey map ---------------- */
/* 5 case stops now: Earth, Saturn, Mars, Neptune, Jupiter, then the sun. */

export const SECTIONS = [
  { id: 'intro', label: 'Brief', range: [0, 0.07] },
  { id: 'case1', label: 'Case 01', range: [0.07, 0.22] },
  { id: 'case2', label: 'Case 02', range: [0.22, 0.37] },
  { id: 'case3', label: 'Case 03', range: [0.37, 0.52] },
  { id: 'case4', label: 'Case 04', range: [0.52, 0.67] },
  { id: 'case5', label: 'Case 05', range: [0.67, 0.82] },
  { id: 'outro', label: 'Contact', range: [0.82, 1] },
]

const PLANET_1 = { pos: new THREE.Vector3(14, 2, -60), r: 7 } // Earth, Case 01
const PLANET_2 = { pos: new THREE.Vector3(-18, -1, -112), r: 9 } // Saturn, Case 02
const PLANET_3 = { pos: new THREE.Vector3(16, -2, -158), r: 4.2 } // Mars, Case 03
const PLANET_4 = { pos: new THREE.Vector3(-17, 3, -204), r: 5 } // Neptune, Case 04
const PLANET_5 = { pos: new THREE.Vector3(19, 1, -252), r: 7 } // Jupiter, Case 05
const SUN = { pos: new THREE.Vector3(0, 5, -300), r: 10 }

export const CAMERA_KEYS = [
  { p: 0.0, pos: [0, 0.5, 14], tgt: [0, 1, -30], fov: 50 },
  { p: 0.06, pos: [0, 1, -6], tgt: [6, 1.5, -42], fov: 52 },
  { p: 0.145, pos: [-6, 1.5, -36], tgt: [14, 2, -60], fov: 52 },
  { p: 0.21, pos: [-3, 1, -58], tgt: [16, 2, -66], fov: 50 },
  { p: 0.27, pos: [6, 0, -86], tgt: [-18, -1, -104], fov: 52 },
  { p: 0.295, pos: [3, -0.5, -98], tgt: [-20, -1, -112], fov: 50 },
  { p: 0.36, pos: [-4, 0, -124], tgt: [14, -2, -150], fov: 52 },
  { p: 0.41, pos: [2, -1, -142], tgt: [16, -2, -158], fov: 51 },
  { p: 0.445, pos: [6, -1.5, -152], tgt: [18, -2, -160], fov: 50 },
  { p: 0.51, pos: [-2, 1, -176], tgt: [-15, 3, -198], fov: 52 },
  { p: 0.56, pos: [-6, 2, -190], tgt: [-17, 3, -204], fov: 51 },
  { p: 0.595, pos: [-3, 2.5, -198], tgt: [-18, 3, -206], fov: 50 },
  { p: 0.66, pos: [5, 0.5, -224], tgt: [16, 1, -246], fov: 52 },
  { p: 0.71, pos: [9, 0.5, -238], tgt: [18, 1, -252], fov: 51 },
  { p: 0.745, pos: [11, 1, -246], tgt: [19, 1, -254], fov: 50 },
  { p: 0.81, pos: [6, 2, -270], tgt: [2, 5, -296], fov: 49 },
  { p: 0.9, pos: [10, 3, -284], tgt: [4, 6, -300], fov: 47 },
  { p: 1.0, pos: [16, 4, -292], tgt: [8, 7, -300], fov: 46 },
]

/* the ship threads the same route ~12-17 units AHEAD of the camera's z
   at every p (the camera must never overtake it, or it vanishes behind
   you); parked low and centered at the intro so it never blocks the
   headline. Lateral values keep it inside the camera's look direction. */
export const ROCKET_KEYS = [
  { p: 0.0, pos: [0, -3.2, 2] },
  { p: 0.07, pos: [2, 0, -28] },
  { p: 0.16, pos: [3, 1, -52] },
  { p: 0.21, pos: [4, 0.5, -70] },
  { p: 0.24, pos: [0, 0, -90] },
  { p: 0.28, pos: [-4, -0.5, -104] },
  { p: 0.32, pos: [-8, -1, -126] },
  { p: 0.4, pos: [7, -1.5, -150] },
  { p: 0.445, pos: [11, -0.5, -168] },
  { p: 0.47, pos: [4, 0, -176] },
  { p: 0.55, pos: [-9, 2, -198] },
  { p: 0.62, pos: [-2, 2, -222] },
  { p: 0.7, pos: [9, 2.5, -246] },
  { p: 0.76, pos: [6, 2, -264] },
  { p: 0.86, pos: [4, 4, -288] },
  { p: 0.95, pos: [9, 4.5, -293] },
  { p: 1.0, pos: [12, 5.5, -296] },
]

function buildCurve(keys) {
  const pts = keys.map((k) => new THREE.Vector3(...k.pos))
  return {
    curve: new THREE.CatmullRomCurve3(pts, false, 'centripetal', 0.5),
    stops: keys.map((k) => k.p),
  }
}

/* map progress to curve parameter, honouring non-uniform key spacing */
function progressToU(p, stops) {
  const n = stops.length
  const c = clamp(p, 0, 1)
  for (let i = 0; i < n - 1; i++) {
    if (c <= stops[i + 1]) {
      const t = (c - stops[i]) / (stops[i + 1] - stops[i])
      return (i + t) / (n - 1)
    }
  }
  return 1
}

const camPos = buildCurve(CAMERA_KEYS)
const camTgt = buildCurve(CAMERA_KEYS.map((k) => ({ p: k.p, pos: k.tgt })))
const rocketPath = buildCurve(ROCKET_KEYS)

function sampleFov(p) {
  const keys = CAMERA_KEYS
  for (let i = 0; i < keys.length - 1; i++) {
    if (p <= keys[i + 1].p) {
      const t = clamp((p - keys[i].p) / (keys[i + 1].p - keys[i].p), 0, 1)
      return keys[i].fov + (keys[i + 1].fov - keys[i].fov) * t
    }
  }
  return keys[keys.length - 1].fov
}

/* ---------------- canvas-generated bits (glows + labels) ---------------- */

function canvasTexture(w, h, draw) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  draw(c.getContext('2d'), w, h)
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

function glowTexture(color) {
  return canvasTexture(256, 256, (ctx) => {
    const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128)
    g.addColorStop(0, color)
    g.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, 256, 256)
  })
}

/* glowing floating label, e.g. "CASE 01" */
function makeLabel(text) {
  const tex = canvasTexture(1024, 256, (ctx, w, h) => {
    ctx.font = '700 110px "Space Grotesk", sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.shadowColor = 'rgba(77, 141, 255, 0.95)'
    ctx.shadowBlur = 42
    ctx.fillStyle = '#eaf2ff'
    ctx.fillText(text, w / 2, h / 2)
    ctx.shadowBlur = 14
    ctx.fillText(text, w / 2, h / 2)
  })
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, opacity: 0 })
  )
  sprite.scale.set(13, 3.25, 1)
  return sprite
}

/* ---------------- scene pieces ---------------- */

function makePlanet({ pos, r }, map, { glow = 'rgba(77,141,255,0.5)', glowScale = 2.9 } = {}) {
  const group = new THREE.Group()
  group.position.copy(pos)
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(r, 64, 48),
    new THREE.MeshStandardMaterial({ map, roughness: 1, metalness: 0 })
  )
  group.add(mesh)
  const atmo = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: glowTexture(glow),
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      opacity: 0.55,
    })
  )
  atmo.scale.setScalar(r * glowScale)
  group.add(atmo)
  return { group, mesh }
}

function makeSaturnRing(inner, outer, map) {
  const geo = new THREE.RingGeometry(inner, outer, 128, 1)
  // remap UVs radially so the ring strip texture reads as concentric bands
  const posAttr = geo.attributes.position
  const uv = geo.attributes.uv
  const v = new THREE.Vector3()
  for (let i = 0; i < posAttr.count; i++) {
    v.fromBufferAttribute(posAttr, i)
    uv.setXY(i, (v.length() - inner) / (outer - inner), 0.5)
  }
  const ring = new THREE.Mesh(
    geo,
    new THREE.MeshBasicMaterial({
      map,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
      opacity: 0.95,
    })
  )
  ring.rotation.x = Math.PI / 2 - 0.35
  ring.rotation.y = 0.12
  return ring
}

function makeSun({ pos, r }, map) {
  const group = new THREE.Group()
  group.position.copy(pos)
  const core = new THREE.Mesh(
    new THREE.SphereGeometry(r, 64, 48),
    new THREE.MeshBasicMaterial({ map })
  )
  group.add(core)
  const glows = [
    { color: 'rgba(255,200,110,0.85)', scale: r * 2.8 },
    { color: 'rgba(255,150,60,0.35)', scale: r * 5 },
    { color: 'rgba(255,120,50,0.14)', scale: r * 8 },
  ].map(({ color, scale }) => {
    const s = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: glowTexture(color),
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      })
    )
    s.scale.setScalar(scale)
    group.add(s)
    return s
  })
  return { group, core, glows }
}

/* hull livery: white paint, panel seams, cyan stripes, callsign */
function makeLiveryTexture() {
  const tex = canvasTexture(1024, 1024, (ctx, S) => {
    ctx.fillStyle = '#f2f3f7'
    ctx.fillRect(0, 0, S, S)
    ctx.strokeStyle = 'rgba(10,14,26,0.06)'
    ctx.lineWidth = 2
    for (let x = 64; x < S; x += 128) {
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, S)
      ctx.stroke()
    }
    for (const y of [560, 700, 860]) {
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(S, y)
      ctx.stroke()
    }
    ctx.fillStyle = '#4d8dff'
    ctx.fillRect(0, 200, S, 34)
    ctx.fillStyle = '#7db0ff'
    ctx.fillRect(0, 252, S, 8)
    ctx.fillStyle = '#14161f'
    ctx.font = "700 46px 'Space Grotesk', sans-serif"
    ctx.textAlign = 'center'
    for (const x of [S * 0.25, S * 0.75]) ctx.fillText('RL-01', x, 350)
  })
  tex.wrapS = THREE.RepeatWrapping
  tex.anisotropy = 8
  return tex
}

/**
 * The hero rocket, matching the reference video: smooth white lathe
 * hull with painted livery, glossy black nose cone, three boosters
 * with black tips, swept fins, and a cyan engine plume. Nose = +Y.
 */
function makeShip() {
  const group = new THREE.Group()
  const black = new THREE.MeshStandardMaterial({ color: 0x0c0e14, roughness: 0.25, metalness: 0.15 })
  const white = new THREE.MeshStandardMaterial({ color: 0xf2f3f7, roughness: 0.4 })

  // hull: smooth ogive profile (tail at y-1.15, shoulder at y0.9)
  const hullPts = []
  for (let i = 0; i <= 20; i++) {
    const y = -1.15 + (i / 20) * 2.05
    const k = (y + 1.15) / 2.05
    const r = 0.42 * Math.sin(Math.min(1, 0.28 + k * 0.92) * Math.PI * 0.62)
    hullPts.push(new THREE.Vector2(Math.max(r, 0.05), y))
  }
  const hull = new THREE.Mesh(
    new THREE.LatheGeometry(hullPts, 64),
    new THREE.MeshStandardMaterial({ map: makeLiveryTexture(), roughness: 0.4 })
  )
  group.add(hull)

  // glossy black nose cone with rounded tip
  const nosePts = []
  for (let i = 0; i <= 10; i++) {
    const k = i / 10
    nosePts.push(new THREE.Vector2(0.305 * Math.cos(k * Math.PI * 0.5), 0.88 + k * 0.58))
  }
  group.add(new THREE.Mesh(new THREE.LatheGeometry(nosePts, 48), black))

  // three side boosters with black tips
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + Math.PI / 6
    const bx = Math.cos(a) * 0.48
    const bz = Math.sin(a) * 0.48
    const pod = new THREE.Mesh(new THREE.CapsuleGeometry(0.115, 0.62, 6, 14), white)
    pod.position.set(bx, -0.42, bz)
    group.add(pod)
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.115, 0.3, 14), black)
    tip.position.set(bx, 0.1, bz)
    group.add(tip)
  }

  // swept fins
  const finShape = new THREE.Shape()
  finShape.moveTo(0, 0.1)
  finShape.lineTo(0, -0.62)
  finShape.quadraticCurveTo(0.38, -0.56, 0.5, -0.16)
  finShape.lineTo(0.12, 0.1)
  finShape.closePath()
  const finGeo = new THREE.ExtrudeGeometry(finShape, {
    depth: 0.05,
    bevelEnabled: true,
    bevelThickness: 0.012,
    bevelSize: 0.012,
    bevelSegments: 2,
  })
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 - Math.PI / 6
    const fin = new THREE.Mesh(finGeo, black)
    fin.position.set(Math.cos(a) * 0.38, -0.62, Math.sin(a) * 0.38)
    fin.rotation.y = -a
    group.add(fin)
  }

  // engine nozzle
  const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.26, 0.22, 22), black)
  nozzle.position.y = -1.24
  group.add(nozzle)
  group.scale.setScalar(1.35)

  // cyan-white exhaust plume (video look) at the tail
  const flameOuter = new THREE.Mesh(
    new THREE.ConeGeometry(0.22, 1.1, 16),
    new THREE.MeshBasicMaterial({
      color: 0x62e8ff,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  )
  flameOuter.rotation.z = Math.PI
  flameOuter.position.y = -1.75
  group.add(flameOuter)
  const flameInner = new THREE.Mesh(
    new THREE.ConeGeometry(0.11, 0.7, 12),
    new THREE.MeshBasicMaterial({
      color: 0xeaffff,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  )
  flameInner.rotation.z = Math.PI
  flameInner.position.y = -1.55
  group.add(flameInner)
  const flameGlow = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: glowTexture('rgba(110,235,255,0.9)'),
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
  )
  flameGlow.position.y = -1.5
  flameGlow.scale.setScalar(1.1)
  group.add(flameGlow)

  return { group, flameOuter, flameInner, flameGlow }
}

/**
 * Warp streaks: faint lines along the travel axis that appear with
 * scroll velocity, the hyperspace feel from the reference video.
 */
function makeWarp(scene, count) {
  const pos = new Float32Array(count * 6)
  for (let i = 0; i < count; i++) {
    const x = (Math.random() - 0.5) * 100
    const y = (Math.random() - 0.5) * 55
    const z = 30 - Math.random() * 340
    const len = 3 + Math.random() * 6
    pos[i * 6] = x
    pos[i * 6 + 1] = y
    pos[i * 6 + 2] = z
    pos[i * 6 + 3] = x
    pos[i * 6 + 4] = y
    pos[i * 6 + 5] = z - len
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  const lines = new THREE.LineSegments(
    geo,
    new THREE.LineBasicMaterial({
      color: 0xbfd8ff,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  )
  scene.add(lines)
  return lines
}

/** Glowing teal accent ring (the "projects in orbit" look) */
function makeGlowRing(inner, outer, color = 'rgba(98,232,255') {
  const geo = new THREE.RingGeometry(inner, outer, 128, 1)
  const posAttr = geo.attributes.position
  const uv = geo.attributes.uv
  const v = new THREE.Vector3()
  for (let i = 0; i < posAttr.count; i++) {
    v.fromBufferAttribute(posAttr, i)
    uv.setXY(i, (v.length() - inner) / (outer - inner), 0.5)
  }
  const tex = canvasTexture(256, 4, (ctx, w) => {
    const g = ctx.createLinearGradient(0, 0, w, 0)
    g.addColorStop(0, `${color},0)`)
    g.addColorStop(0.25, `${color},0.5)`)
    g.addColorStop(0.5, `${color},0.9)`)
    g.addColorStop(0.75, `${color},0.4)`)
    g.addColorStop(1, `${color},0)`)
    ctx.fillStyle = g
    ctx.fillRect(0, 0, w, 4)
  })
  const ring = new THREE.Mesh(
    geo,
    new THREE.MeshBasicMaterial({
      map: tex,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      opacity: 0.8,
    })
  )
  ring.rotation.x = Math.PI / 2 - 0.42
  return ring
}

function makeStars(scene, count, size, opacity, spread, zNear, zFar, color = 0xffffff) {
  const posArr = new Float32Array(count * 3)
  for (let i = 0; i < count; i++) {
    posArr[i * 3] = (Math.random() - 0.5) * spread
    posArr[i * 3 + 1] = (Math.random() - 0.5) * spread * 0.55
    posArr[i * 3 + 2] = zNear - Math.random() * (zNear - zFar)
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(posArr, 3))
  const stars = new THREE.Points(
    geo,
    new THREE.PointsMaterial({
      color,
      size,
      transparent: true,
      opacity,
      sizeAttenuation: true,
      depthWrite: false,
    })
  )
  scene.add(stars)
  return stars
}

/* ---------------- main init ---------------- */

export function initFlight(container, { isMobile }) {
  const scene = new THREE.Scene()
  scene.fog = new THREE.FogExp2(0x030308, 0.005)

  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 650)
  camera.position.set(0, 0.5, 14)

  const renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setClearColor(0x030308)
  const pixelRatio = Math.min(window.devicePixelRatio, isMobile ? 1.5 : 2)
  renderer.setPixelRatio(pixelRatio)
  container.appendChild(renderer.domElement)

  /* bloom post-processing (desktop), the glow quality from the video */
  let composer = null
  if (!isMobile) {
    composer = new EffectComposer(renderer)
    composer.setPixelRatio(pixelRatio)
    composer.addPass(new RenderPass(scene, camera))
    composer.addPass(
      new UnrealBloomPass(
        new THREE.Vector2(window.innerWidth, window.innerHeight),
        0.55, // strength
        0.65, // radius
        0.72 // threshold: only the bright stuff blooms
      )
    )
    composer.addPass(new OutputPass())
  }

  /* texture loading (Solar System Scope, CC BY 4.0) */
  const loader = new THREE.TextureLoader()
  const maxAniso = renderer.capabilities.getMaxAnisotropy()
  const tex = (path, { srgb = true } = {}) => {
    const t = loader.load(path)
    if (srgb) t.colorSpace = THREE.SRGBColorSpace
    t.anisotropy = Math.min(8, maxAniso)
    return t
  }

  /* milky-way sky, dimmed to keep the premium black look */
  const sky = tex('/textures/6k_stars_milky_way.webp')
  sky.mapping = THREE.EquirectangularReflectionMapping
  scene.background = sky
  scene.backgroundIntensity = 0.25

  /* lights */
  scene.add(new THREE.AmbientLight(0xaebbdd, 0.7))
  const keyLight = new THREE.DirectionalLight(0xffffff, 2.2)
  keyLight.position.set(30, 25, 30)
  scene.add(keyLight)
  const fillLight = new THREE.DirectionalLight(0x8899cc, 0.5)
  fillLight.position.set(-40, -10, -10)
  scene.add(fillLight)
  const sunLight = new THREE.PointLight(0xffb066, 0, 180, 1.6)
  sunLight.position.copy(SUN.pos)
  scene.add(sunLight)

  /* star points on top of the sky for parallax depth */
  makeStars(scene, isMobile ? 550 : 1300, 0.2, 0.5, 240, 60, -340)
  makeStars(scene, isMobile ? 220 : 500, 0.36, 0.8, 170, 60, -340)
  // drifting teal sparkles near the route
  const sparkles = makeStars(scene, isMobile ? 100 : 260, 0.5, 0.65, 95, 40, -300, 0x62e8e0)

  /* soft nebula tints along the route */
  const nebulaSpecs = [
    ['rgba(60,110,255,0.14)', 90, [-60, 20, -70]],
    ['rgba(40,70,180,0.12)', 70, [50, -25, -100]],
    ['rgba(90,140,255,0.1)', 110, [-45, -15, -160]],
    ['rgba(200,110,80,0.1)', 100, [40, -10, -200]],
    ['rgba(255,150,70,0.1)', 120, [-20, 15, -260]],
    ['rgba(255,170,90,0.08)', 100, [30, -5, -295]],
  ]
  const nebulae = nebulaSpecs.map(([color, size, pos]) => {
    const s = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: glowTexture(color),
        transparent: true,
        depthWrite: false,
        opacity: 0.8,
      })
    )
    s.scale.setScalar(size)
    s.position.set(...pos)
    scene.add(s)
    return s
  })

  /* drifting rocks along the route */
  const rockCount = isMobile ? 24 : 70
  const rocks = new THREE.InstancedMesh(
    new THREE.IcosahedronGeometry(0.6, 0),
    new THREE.MeshStandardMaterial({ color: 0x6d7280, roughness: 1, flatShading: true }),
    rockCount
  )
  const m4 = new THREE.Matrix4()
  const q = new THREE.Quaternion()
  const eu = new THREE.Euler()
  for (let i = 0; i < rockCount; i++) {
    eu.set(Math.random() * 3, Math.random() * 3, Math.random() * 3)
    q.setFromEuler(eu)
    m4.compose(
      new THREE.Vector3(
        (Math.random() - 0.5) * 74,
        (Math.random() - 0.5) * 36,
        20 - Math.random() * 300
      ),
      q,
      new THREE.Vector3().setScalar(0.25 + Math.random() * 1.1)
    )
    rocks.setMatrixAt(i, m4)
  }
  scene.add(rocks)

  /* the five case-study planets: Earth, Saturn, Mars, Neptune, Jupiter */
  const earth = makePlanet(PLANET_1, tex('/textures/4k_earth_daymap.webp'), {
    glow: 'rgba(90,160,255,0.65)',
    glowScale: 2.75,
  })
  const clouds = new THREE.Mesh(
    new THREE.SphereGeometry(PLANET_1.r * 1.015, 64, 48),
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      alphaMap: tex('/textures/4k_earth_clouds.webp', { srgb: false }),
      transparent: true,
      depthWrite: false,
      roughness: 1,
    })
  )
  earth.group.add(clouds)
  scene.add(earth.group)

  const saturn = makePlanet(PLANET_2, tex('/textures/2k_saturn.webp'), {
    glow: 'rgba(210,190,150,0.35)',
    glowScale: 2.5,
  })
  saturn.group.add(
    makeSaturnRing(PLANET_2.r * 1.35, PLANET_2.r * 2.45, tex('/textures/2k_saturn_ring_alpha.png'))
  )
  saturn.mesh.rotation.z = 0.18
  scene.add(saturn.group)

  const mars = makePlanet(PLANET_3, tex('/textures/2k_mars.webp'), {
    glow: 'rgba(230,110,80,0.5)',
    glowScale: 2.6,
  })
  scene.add(mars.group)

  const neptune = makePlanet(PLANET_4, tex('/textures/2k_neptune.webp'), {
    glow: 'rgba(80,140,255,0.55)',
    glowScale: 2.8,
  })
  const nepRing = makeGlowRing(PLANET_4.r * 1.5, PLANET_4.r * 2.7)
  neptune.group.add(nepRing)
  scene.add(neptune.group)

  const jupiter = makePlanet(PLANET_5, tex('/textures/2k_jupiter.webp'), {
    glow: 'rgba(230,180,120,0.45)',
    glowScale: 2.4,
  })
  const jupRing = makeGlowRing(PLANET_5.r * 1.35, PLANET_5.r * 2.3, 'rgba(230,190,140')
  jupiter.group.add(jupRing)
  scene.add(jupiter.group)

  const sun = makeSun(SUN, tex('/textures/4k_sun.webp'))
  scene.add(sun.group)

  /* background set dressing: a small distant moon, off the flight path */
  const dressing = [{ file: '2k_moon.webp', r: 1.6, pos: [32, -8, -46], spin: 0.03 }].map(
    ({ file, r, pos, spin }) => {
      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(r, 40, 28),
        new THREE.MeshStandardMaterial({ map: tex(`/textures/${file}`), roughness: 1 })
      )
      mesh.position.set(...pos)
      scene.add(mesh)
      return { mesh, spin }
    }
  )

  /* floating labels above each landmark */
  const labels = [
    { sprite: makeLabel('CASE 01'), anchor: PLANET_1, lift: 11, env: [0.08, 0.14, 0.2, 0.23] },
    { sprite: makeLabel('CASE 02'), anchor: PLANET_2, lift: 14, env: [0.23, 0.29, 0.35, 0.38] },
    { sprite: makeLabel('CASE 03'), anchor: PLANET_3, lift: 7, env: [0.38, 0.44, 0.5, 0.53] },
    { sprite: makeLabel('CASE 04'), anchor: PLANET_4, lift: 8.5, env: [0.53, 0.59, 0.65, 0.68] },
    { sprite: makeLabel('CASE 05'), anchor: PLANET_5, lift: 12, env: [0.68, 0.74, 0.8, 0.83] },
  ]
  labels.forEach((l) => {
    l.sprite.position.copy(l.anchor.pos)
    l.sprite.position.y += l.lift
    scene.add(l.sprite)
  })

  /* rocket + warp streaks */
  const rocket = makeShip()
  scene.add(rocket.group)

  /* the licensed GLB ship becomes a background flyby near Saturn */
  const flyby = new THREE.Group()
  flyby.position.set(-34, 6, -102)
  flyby.rotation.set(0.3, 0.8, 0.2)
  scene.add(flyby)
  new GLTFLoader().load('/models/spaceship1.glb', (gltf) => {
    const model = gltf.scene
    const box = new THREE.Box3().setFromObject(model)
    const size = box.getSize(new THREE.Vector3())
    model.position.sub(box.getCenter(new THREE.Vector3()))
    model.scale.setScalar(3.2 / Math.max(size.x, size.y, size.z, 0.001))
    flyby.add(model)
  })
  const warp = makeWarp(scene, isMobile ? 100 : 260)

  /* teal particle trail behind the ship (pooled sprites) */
  const TRAIL_N = isMobile ? 30 : 70
  const TRAIL_LIFE = 1.1
  const trailTexture = glowTexture('rgba(110,235,255,0.85)')
  const trailPool = Array.from({ length: TRAIL_N }, () => {
    const s = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: trailTexture,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      })
    )
    s.visible = false
    scene.add(s)
    return { sprite: s, age: TRAIL_LIFE + 1 }
  })
  let trailCursor = 0
  let trailAcc = 0
  const tailLocal = new THREE.Vector3(0, -1.5, 0)
  const tailWorld = new THREE.Vector3()

  /* ---------------- scroll state ---------------- */

  const state = { p: 0, v: 0, smoothP: 0 }
  let scrollEnd = 1

  const spacer = document.querySelector('.fl-spacer')
  function measure() {
    const rect = spacer.getBoundingClientRect()
    scrollEnd = Math.max(1, rect.bottom + window.scrollY - window.innerHeight)
  }
  measure()

  /* ---------------- DOM overlays ---------------- */

  const overlays = [
    {
      el: document.querySelector('[data-fl="intro"]'),
      apply(p) {
        const a = 1 - smoothstep(0.04, 0.09, p)
        return { a, x: 0, y: -40 * (1 - a) }
      },
    },
    {
      el: document.querySelector('[data-fl="case1"]'),
      apply(p) {
        const a = envelope(p, 0.1, 0.135, 0.19, 0.215)
        return { a, x: -44 * (1 - a), y: 0 }
      },
    },
    {
      el: document.querySelector('[data-fl="case2"]'),
      apply(p) {
        const a = envelope(p, 0.25, 0.28, 0.335, 0.36)
        return { a, x: 44 * (1 - a), y: 0 }
      },
    },
    {
      el: document.querySelector('[data-fl="case3"]'),
      apply(p) {
        const a = envelope(p, 0.4, 0.43, 0.485, 0.51)
        return { a, x: -44 * (1 - a), y: 0 }
      },
    },
    {
      el: document.querySelector('[data-fl="case4"]'),
      apply(p) {
        const a = envelope(p, 0.55, 0.58, 0.635, 0.66)
        return { a, x: 44 * (1 - a), y: 0 }
      },
    },
    {
      el: document.querySelector('[data-fl="case5"]'),
      apply(p) {
        const a = envelope(p, 0.7, 0.73, 0.785, 0.81)
        return { a, x: -44 * (1 - a), y: 0 }
      },
    },
    {
      el: document.querySelector('[data-fl="outro"]'),
      apply(p) {
        const a = smoothstep(0.85, 0.92, p)
        return { a, x: 44 * (1 - a), y: 0 }
      },
    },
  ].filter((o) => o.el)
  overlays.forEach((o) => (o.last = -1))

  /* card hover tilt (desktop) */
  if (!isMobile) {
    document.querySelectorAll('.fl-card article').forEach((card) => {
      card.addEventListener('mousemove', (e) => {
        const r = card.getBoundingClientRect()
        const x = (e.clientX - r.left) / r.width - 0.5
        const y = (e.clientY - r.top) / r.height - 0.5
        card.style.setProperty('--tiltY', `${x * 6}deg`)
        card.style.setProperty('--tiltX', `${-y * 6}deg`)
      })
      card.addEventListener('mouseleave', () => {
        card.style.setProperty('--tiltY', '0deg')
        card.style.setProperty('--tiltX', '0deg')
      })
    })
  }

  /* ---------------- HUD ---------------- */

  const hudFill = document.querySelector('.fl-rail-fill')
  const hudAlt = document.querySelector('[data-alt]')
  const hudVel = document.querySelector('[data-vel]')
  const hudSec = document.querySelector('[data-sec]')
  const ticks = document.querySelectorAll('.fl-tick')
  let lastHudText = 0
  let lastActiveTick = -1

  ticks.forEach((tick, i) => {
    const s = SECTIONS[i]
    tick.style.top = `${s.range[0] * 100}%`
    tick.addEventListener('click', () => {
      const anchor =
        s.id === 'intro' ? 0 : s.id === 'outro' ? 1 : s.range[0] + (s.range[1] - s.range[0]) * 0.45
      const y = anchor * scrollEnd
      if (window.__lenis) window.__lenis.scrollTo(y, { duration: 2 })
      else window.scrollTo({ top: y, behavior: 'smooth' })
    })
  })

  function sectionIndexAt(p) {
    for (let i = 0; i < SECTIONS.length; i++) {
      if (p <= SECTIONS[i].range[1]) return i
    }
    return SECTIONS.length - 1
  }

  /* ---------------- mouse parallax ---------------- */

  const mouse = { x: 0, y: 0, sx: 0, sy: 0 }
  if (!isMobile) {
    window.addEventListener('pointermove', (e) => {
      mouse.x = (e.clientX / window.innerWidth - 0.5) * 2
      mouse.y = (e.clientY / window.innerHeight - 0.5) * 2
    })
  }

  /* ---------------- sizing ---------------- */

  function resize() {
    renderer.setSize(window.innerWidth, window.innerHeight)
    composer?.setSize(window.innerWidth, window.innerHeight)
    camera.aspect = window.innerWidth / window.innerHeight
    camera.updateProjectionMatrix()
    measure()
  }
  resize()
  window.addEventListener('resize', resize)

  /* dev/deep-link: ?p=0.45 jumps into the flight. The viewport can report
     zero height for the first frames (which makes the vh spacer measure as
     ~0) and Lenis boots async, so re-measure and retry until we land. */
  const pParam = new URLSearchParams(location.search).get('p')
  if (pParam) {
    const pf = clamp(parseFloat(pParam), 0, 1)
    let tries = 0
    const jump = () => {
      measure()
      const target = pf * scrollEnd
      if (scrollEnd > 10) {
        if (window.__lenis) window.__lenis.scrollTo(target, { immediate: true })
        else window.scrollTo(0, target)
      }
      if (++tries < 90 && Math.abs(window.scrollY - target) > 2) requestAnimationFrame(jump)
    }
    requestAnimationFrame(jump)
  }

  /* ---------------- frame loop ---------------- */

  const camPosV = new THREE.Vector3()
  const camTgtV = new THREE.Vector3()
  const rocketDir = new THREE.Vector3()
  const UP = new THREE.Vector3(0, 1, 0)
  const rocketQ = new THREE.Quaternion()

  let lastP = 0
  let lastT = performance.now()

  renderer.setAnimationLoop(() => {
    const now = performance.now()
    const dt = Math.max(0.001, (now - lastT) / 1000)
    lastT = now
    const t = now / 1000

    /* scroll progress + low-passed velocity */
    const p = clamp(window.scrollY / scrollEnd, 0, 1)
    const instV = (p - lastP) / dt
    state.v += (instV - state.v) * Math.min(1, dt * 8)
    lastP = p
    state.p = p

    /* camera trails the scrollbar slightly */
    state.smoothP += (p - state.smoothP) * (1 - Math.exp(-3.2 * dt))
    const sp = state.smoothP

    camPos.curve.getPoint(progressToU(sp, camPos.stops), camPosV)
    camTgt.curve.getPoint(progressToU(sp, camTgt.stops), camTgtV)

    /* mouse parallax + speed shake */
    mouse.sx += (mouse.x - mouse.sx) * Math.min(1, dt * 4)
    mouse.sy += (mouse.y - mouse.sy) * Math.min(1, dt * 4)
    camPosV.x += mouse.sx * 0.5
    camPosV.y -= mouse.sy * 0.3
    const shake = Math.min(Math.abs(state.v) * 5, 1) * 0.05
    camPosV.x += Math.sin(t * 31.7) * shake
    camPosV.y += Math.cos(t * 27.3) * shake

    camera.position.copy(camPosV)
    camera.lookAt(camTgtV)

    const fov = sampleFov(sp)
    if (Math.abs(camera.fov - fov) > 0.01) {
      camera.fov += (fov - camera.fov) * Math.min(1, dt * 6)
      camera.updateProjectionMatrix()
    }

    /* ship */
    const u = progressToU(sp, rocketPath.stops)
    rocketPath.curve.getPoint(u, rocket.group.position)
    rocketPath.curve.getTangent(Math.min(u, 0.9999), rocketDir)
    if (rocketDir.lengthSq() > 1e-6) {
      rocketQ.setFromUnitVectors(UP, rocketDir.normalize())
      rocket.group.quaternion.slerp(rocketQ, Math.min(1, dt * 5))
    }
    const speed = Math.min(Math.abs(state.v) * 4, 1)
    const thrust = 0.55 + speed * 0.7
    const flicker = 0.9 + Math.sin(t * 30) * 0.1 + Math.sin(t * 47) * 0.05
    rocket.flameOuter.scale.set(1, thrust * flicker, 1)
    rocket.flameInner.scale.set(1, thrust * flicker * 1.1, 1)
    rocket.flameGlow.scale.setScalar(1.1 * thrust * flicker)

    /* warp streaks fade in with scroll speed */
    warp.material.opacity = speed * 0.45

    /* teal trail: emit while moving, age out */
    trailAcc += dt
    if (speed > 0.04 && trailAcc > 0.035) {
      trailAcc = 0
      const tp = trailPool[trailCursor]
      trailCursor = (trailCursor + 1) % TRAIL_N
      tailWorld.copy(tailLocal).applyQuaternion(rocket.group.quaternion).add(rocket.group.position)
      tp.sprite.position.copy(tailWorld)
      tp.sprite.position.x += (Math.random() - 0.5) * 0.25
      tp.sprite.position.y += (Math.random() - 0.5) * 0.25
      tp.age = 0
      tp.sprite.visible = true
    }
    for (const tp of trailPool) {
      if (tp.age > TRAIL_LIFE) continue
      tp.age += dt
      const k = tp.age / TRAIL_LIFE
      if (k >= 1) {
        tp.sprite.visible = false
        continue
      }
      tp.sprite.scale.setScalar(0.35 + k * 1.5)
      tp.sprite.material.opacity = (1 - k) * 0.55 * (0.4 + speed * 0.6)
    }

    /* ambient motion */
    earth.mesh.rotation.y = t * 0.05
    clouds.rotation.y = t * 0.065
    saturn.mesh.rotation.y = t * 0.04
    mars.mesh.rotation.y = t * 0.06
    neptune.mesh.rotation.y = t * 0.07
    nepRing.rotation.z = t * 0.05
    jupiter.mesh.rotation.y = t * 0.09
    jupRing.rotation.z = -t * 0.04
    sun.core.rotation.y = t * 0.015
    dressing.forEach((d) => (d.mesh.rotation.y = t * d.spin))
    const pulse = 1 + Math.sin(t * 1.4) * 0.04
    sun.glows[0].scale.setScalar(SUN.r * 2.8 * pulse)
    sun.glows[1].scale.setScalar(SUN.r * 5 * (2 - pulse))
    sunLight.intensity = smoothstep(0.78, 0.97, sp) * 60
    rocks.rotation.y = t * 0.004
    flyby.position.x = -34 + Math.sin(t * 0.1) * 6
    flyby.position.y = 6 + Math.sin(t * 0.23) * 1.5
    flyby.rotation.y = 0.8 + t * 0.02
    sparkles.rotation.z = t * 0.01
    nebulae.forEach((n, i) => {
      n.material.opacity = 0.65 + Math.sin(t * 0.2 + i * 2) * 0.15
    })

    /* labels fade with their section */
    labels.forEach((l) => {
      l.sprite.material.opacity = envelope(p, ...l.env) * 0.95
    })

    /* DOM overlays */
    overlays.forEach((o) => {
      const { a, x, y } = o.apply(p)
      if (Math.abs(a - o.last) < 0.001) return
      o.last = a
      o.el.style.opacity = a.toFixed(3)
      o.el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`
      o.el.style.visibility = a < 0.02 ? 'hidden' : 'visible'
    })

    /* HUD */
    if (hudFill) hudFill.style.transform = `scaleY(${p.toFixed(4)})`
    if (now - lastHudText > 120) {
      lastHudText = now
      if (hudAlt) hudAlt.textContent = `ALT +${(p * 512).toFixed(1)} KM`
      if (hudVel) hudVel.textContent = `VEL ${Math.abs(state.v * 2800).toFixed(0)} M/S`
      const idx = sectionIndexAt(p)
      if (hudSec) hudSec.textContent = `SEC // ${SECTIONS[idx].label.toUpperCase()}`
      if (idx !== lastActiveTick) {
        lastActiveTick = idx
        ticks.forEach((tk, i) => tk.classList.toggle('active', i === idx))
      }
    }

    if (composer) composer.render()
    else renderer.render(scene, camera)
  })
}
