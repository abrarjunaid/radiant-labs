import * as THREE from 'three'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

/**
 * Hero background: a rotating node-network sphere (points + connecting
 * lines) with an inner wireframe icosahedron. Rotation is driven by
 * scroll, with subtle mouse parallax on desktop.
 */
export function initHero(container, { isMobile }) {
  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 100)
  camera.position.set(0, 0, 7.2)

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  container.appendChild(renderer.domElement)

  const accent = new THREE.Color('#4d8dff')
  const accentBright = new THREE.Color('#7db0ff')

  const group = new THREE.Group()
  scene.add(group)
  // sit the object right-of-center on desktop so the copy has room
  group.position.x = isMobile ? 0 : 2.4
  group.position.y = isMobile ? 1.2 : 0.2

  /* --- node sphere (fibonacci distribution) --- */
  const NODE_COUNT = isMobile ? 90 : 180
  const RADIUS = 2.6
  const nodes = []
  for (let i = 0; i < NODE_COUNT; i++) {
    const phi = Math.acos(1 - (2 * (i + 0.5)) / NODE_COUNT)
    const theta = Math.PI * (1 + Math.sqrt(5)) * i
    nodes.push(
      new THREE.Vector3(
        RADIUS * Math.sin(phi) * Math.cos(theta),
        RADIUS * Math.cos(phi),
        RADIUS * Math.sin(phi) * Math.sin(theta)
      )
    )
  }

  const pointGeo = new THREE.BufferGeometry().setFromPoints(nodes)
  const points = new THREE.Points(
    pointGeo,
    new THREE.PointsMaterial({
      color: accentBright,
      size: isMobile ? 0.045 : 0.055,
      transparent: true,
      opacity: 0.95,
      sizeAttenuation: true,
    })
  )
  group.add(points)

  /* connect each node to its few nearest neighbours */
  const linePositions = []
  const MAX_DIST = RADIUS * 0.62
  for (let i = 0; i < nodes.length; i++) {
    let added = 0
    for (let j = i + 1; j < nodes.length && added < 3; j++) {
      if (nodes[i].distanceTo(nodes[j]) < MAX_DIST) {
        linePositions.push(...nodes[i].toArray(), ...nodes[j].toArray())
        added++
      }
    }
  }
  const lineGeo = new THREE.BufferGeometry()
  lineGeo.setAttribute('position', new THREE.Float32BufferAttribute(linePositions, 3))
  const lines = new THREE.LineSegments(
    lineGeo,
    new THREE.LineBasicMaterial({ color: accent, transparent: true, opacity: 0.22 })
  )
  group.add(lines)

  /* inner wireframe core */
  const core = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(1.15, 1)),
    new THREE.LineBasicMaterial({ color: accentBright, transparent: true, opacity: 0.5 })
  )
  group.add(core)

  /* faint ambient dust */
  const dustCount = isMobile ? 120 : 300
  const dustPos = new Float32Array(dustCount * 3)
  for (let i = 0; i < dustCount * 3; i++) dustPos[i] = (Math.random() - 0.5) * 22
  const dustGeo = new THREE.BufferGeometry()
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3))
  const dust = new THREE.Points(
    dustGeo,
    new THREE.PointsMaterial({ color: accent, size: 0.025, transparent: true, opacity: 0.35 })
  )
  scene.add(dust)

  /* --- interaction state --- */
  const mouse = { x: 0, y: 0 }
  if (!isMobile) {
    window.addEventListener('pointermove', (e) => {
      mouse.x = (e.clientX / window.innerWidth - 0.5) * 2
      mouse.y = (e.clientY / window.innerHeight - 0.5) * 2
    })
  }

  const scrollState = { p: 0 }
  ScrollTrigger.create({
    trigger: container.closest('.hero') || container,
    start: 'top top',
    end: 'bottom top',
    scrub: true,
    onUpdate: (self) => (scrollState.p = self.progress),
  })

  /* --- sizing --- */
  function resize() {
    const w = container.clientWidth
    const h = container.clientHeight
    renderer.setSize(w, h)
    camera.aspect = w / h
    camera.updateProjectionMatrix()
  }
  resize()
  window.addEventListener('resize', resize)

  /* --- render loop (pauses when off-screen) --- */
  let visible = true
  new IntersectionObserver((e) => (visible = e[0].isIntersecting)).observe(container)

  const clock = new THREE.Clock()
  renderer.setAnimationLoop(() => {
    if (!visible) return
    const t = clock.getElapsedTime()

    group.rotation.y = t * 0.08 + scrollState.p * 2.4 + mouse.x * 0.18
    group.rotation.x = Math.sin(t * 0.12) * 0.08 + scrollState.p * 0.6 + mouse.y * 0.12
    core.rotation.y = -t * 0.2
    core.rotation.z = t * 0.1
    dust.rotation.y = t * 0.015

    // breathe + drift back as the user scrolls past
    const s = 1 + Math.sin(t * 0.6) * 0.015 - scrollState.p * 0.25
    group.scale.setScalar(s)
    group.position.z = -scrollState.p * 2.5

    renderer.render(scene, camera)
  })

  // entrance
  gsap.from(group.scale, { x: 0.6, y: 0.6, z: 0.6, duration: 1.6, ease: 'power3.out' })
}
