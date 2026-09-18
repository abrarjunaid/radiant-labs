import './styles/main.css'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
const isMobile = window.matchMedia('(max-width: 768px)').matches

if (reducedMotion) document.documentElement.classList.add('no-motion')
// gate "hidden until revealed" styles on JS actually animating
else document.documentElement.classList.add('js')

/* ---------- smooth scroll (Lenis) ---------- */
let lenis = null
if (!reducedMotion) {
  import('lenis').then(({ default: Lenis }) => {
    lenis = new Lenis({ lerp: 0.11, wheelMultiplier: 1 })
    lenis.on('scroll', ScrollTrigger.update)
    gsap.ticker.add((time) => lenis.raf(time * 1000))
    gsap.ticker.lagSmoothing(0)
    // page modules (e.g. the case-studies flight) use this for scrollTo
    window.__lenis = lenis
  })
}

/* ---------- header ---------- */
const header = document.querySelector('.site-header')
const onScroll = () => header.classList.toggle('scrolled', window.scrollY > 24)
onScroll()
window.addEventListener('scroll', onScroll, { passive: true })

const toggle = document.querySelector('.nav-toggle')
if (toggle) {
  toggle.addEventListener('click', () => document.body.classList.toggle('nav-open'))
  document.querySelectorAll('.site-nav a').forEach((a) =>
    a.addEventListener('click', () => document.body.classList.remove('nav-open'))
  )
}

/* mark active nav link */
const path = location.pathname.replace(/\/$/, '') || '/index.html'
document.querySelectorAll('.site-nav a').forEach((a) => {
  const href = a.getAttribute('href')
  if (href === path || (path === '/index.html' && href === '/') || (path === '/' && href === '/')) {
    a.classList.add('active')
  } else if (href !== '/' && path.includes(href.replace('.html', ''))) {
    a.classList.add('active')
  }
})

/* ---------- scroll reveals ---------- */
if (!reducedMotion) {
  // group reveals that share a parent [data-reveal-group] into one stagger
  document.querySelectorAll('[data-reveal-group]').forEach((group) => {
    const items = group.querySelectorAll('[data-reveal]')
    gsap.to(items, {
      opacity: 1,
      y: 0,
      duration: 0.9,
      ease: 'power3.out',
      stagger: 0.12,
      scrollTrigger: { trigger: group, start: 'top 82%' },
    })
  })

  document.querySelectorAll('[data-reveal]').forEach((el) => {
    if (el.closest('[data-reveal-group]')) return
    gsap.to(el, {
      opacity: 1,
      y: 0,
      duration: 0.9,
      ease: 'power3.out',
      scrollTrigger: { trigger: el, start: 'top 85%' },
    })
  })

  /* number count-ups */
  document.querySelectorAll('[data-count]').forEach((el) => {
    const target = parseFloat(el.dataset.count)
    const suffix = el.dataset.suffix || ''
    const obj = { v: 0 }
    gsap.to(obj, {
      v: target,
      duration: 1.6,
      ease: 'power2.out',
      scrollTrigger: { trigger: el, start: 'top 88%' },
      onUpdate: () => {
        el.textContent = Math.round(obj.v).toLocaleString() + suffix
      },
    })
  })
}

/* ---------- process line (home teaser + process page) ---------- */
const processWrap = document.querySelector('.process-wrap')
if (processWrap) {
  const svg = processWrap.querySelector('.process-svg')
  const h = processWrap.scrollHeight
  svg.setAttribute('viewBox', `0 0 4 ${h}`)
  svg.innerHTML = `
    <line class="track" x1="2" y1="0" x2="2" y2="${h}"></line>
    <line class="draw" x1="2" y1="0" x2="2" y2="${h}"
      stroke-dasharray="${h}" stroke-dashoffset="${h}"></line>`
  const draw = svg.querySelector('.draw')

  if (!reducedMotion) {
    gsap.to(draw, {
      strokeDashoffset: 0,
      ease: 'none',
      scrollTrigger: {
        trigger: processWrap,
        start: 'top 70%',
        end: 'bottom 55%',
        scrub: 0.6,
      },
    })
    processWrap.querySelectorAll('.process-step').forEach((step) => {
      ScrollTrigger.create({
        trigger: step,
        start: 'top 62%',
        onEnter: () => step.classList.add('lit'),
        onLeaveBack: () => step.classList.remove('lit'),
      })
    })
  } else {
    draw.style.strokeDashoffset = 0
    processWrap.querySelectorAll('.process-step').forEach((s) => s.classList.add('lit'))
  }
}

/* ---------- the shift: six tools vs one system ---------- */
const shift = document.querySelector('.shift-diagram')
if (shift) {
  const oldStage = shift.querySelector('.shift-old .shift-stage')
  const oldNode = oldStage.querySelector('.shift-node')
  const links = oldStage.querySelector('.shift-links')
  const targets = [...oldStage.querySelectorAll('.shift-targets li')]
  const newStage = shift.querySelector('.shift-new .shift-stage')
  const newNode = newStage.querySelector('.shift-node')
  const arrow = newStage.querySelector('.shift-arrow')
  const arrowLabel = arrow.querySelector('span')
  const erp = newStage.querySelector('.shift-erp')
  const modules = [...erp.querySelectorAll('.shift-modules li')]
  const counts = [...shift.querySelectorAll('.shift-count strong')]
  let drawn = reducedMotion

  // one curve per target, from the right edge of "You" to the left edge of each box.
  // a second dashed copy of each curve carries the idle "marching" animation.
  const drawLinks = () => {
    const box = oldStage.getBoundingClientRect()
    const from = oldNode.getBoundingClientRect()
    const x1 = from.right - box.left
    const y1 = from.top + from.height / 2 - box.top
    links.setAttribute('viewBox', `0 0 ${box.width} ${box.height}`)
    links.innerHTML = targets
      .map((li) => {
        const to = li.getBoundingClientRect()
        const x2 = to.left - box.left
        const y2 = to.top + to.height / 2 - box.top
        const mx = (x1 + x2) / 2
        const d = `M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`
        return `<path class="base" d="${d}"></path><path class="flow" d="${d}"></path>`
      })
      .join('')
    links.querySelectorAll('path.base').forEach((path) => {
      const len = path.getTotalLength()
      path.style.strokeDasharray = drawn ? '' : len
      path.style.strokeDashoffset = drawn ? '' : len
    })
  }
  drawLinks()
  new ResizeObserver(drawLinks).observe(oldStage)

  if (!reducedMotion) {
    counts.forEach((c) => (c.textContent = '0'))
    gsap.set([oldNode, newNode], { scale: 0.7, opacity: 0 })
    gsap.set(targets, { x: -18, opacity: 0 })
    gsap.set(arrow, { scaleX: 0 })
    gsap.set(arrowLabel, { opacity: 0, y: 6 })
    gsap.set(erp, { scale: 0.92, opacity: 0 })
    gsap.set(modules, { y: 10, opacity: 0 })

    const countTo = (el) => {
      const state = { v: 0 }
      const end = Number(el.dataset.count)
      return gsap.to(state, {
        v: end,
        duration: 0.7,
        ease: 'power1.out',
        onUpdate: () => (el.textContent = Math.round(state.v)),
      })
    }

    const tl = gsap.timeline({
      scrollTrigger: { trigger: shift, start: 'top 68%', once: true },
      onComplete: () => shift.classList.add('shift-live'),
    })
    tl.to(oldNode, { scale: 1, opacity: 1, duration: 0.45, ease: 'back.out(1.8)' })
      .add(countTo(counts[0]), '<')
      .to(
        oldStage.querySelectorAll('path.base'),
        { strokeDashoffset: 0, duration: 0.7, ease: 'power2.inOut', stagger: 0.09 },
        '-=0.1'
      )
      .to(targets, { x: 0, opacity: 1, duration: 0.45, ease: 'power2.out', stagger: 0.09 }, '<+0.35')
      .call(() => {
        drawn = true
        oldStage.querySelectorAll('path.base').forEach((p) => {
          p.style.strokeDasharray = ''
          p.style.strokeDashoffset = ''
        })
      })
      // new way
      .to(newNode, { scale: 1, opacity: 1, duration: 0.45, ease: 'back.out(1.8)' }, '-=0.5')
      .add(countTo(counts[1]), '<')
      .to(arrow, { scaleX: 1, duration: 0.55, ease: 'power3.inOut' }, '-=0.15')
      .to(arrowLabel, { opacity: 1, y: 0, duration: 0.35 }, '-=0.2')
      .to(erp, { scale: 1, opacity: 1, duration: 0.6, ease: 'back.out(1.4)' }, '-=0.25')
      .to(modules, { y: 0, opacity: 1, duration: 0.4, ease: 'power2.out', stagger: 0.07 }, '-=0.3')
  } else {
    shift.classList.add('shift-live')
  }
}

/* ---------- lazy-load 3D scenes ---------- */
function lazyScene(selector, loader) {
  const el = document.querySelector(selector)
  if (!el || reducedMotion) return
  const io = new IntersectionObserver(
    (entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        io.disconnect()
        loader(el, { isMobile, lenis })
      }
    },
    { rootMargin: '200px' }
  )
  io.observe(el)
}

lazyScene('.hero-canvas', async (el, ctx) => {
  const { initHero } = await import('./hero3d.js')
  initHero(el, ctx)
})

/* ---------- case studies flight (scroll-driven 3D journey) ---------- */
const flightCanvas = document.querySelector('.flight-canvas')
if (flightCanvas && !reducedMotion) {
  document.documentElement.classList.add('flight-on')
  import('./flight.js').then(({ initFlight }) => {
    initFlight(flightCanvas, { isMobile })
  })
}

/* ---------- contact form (client-side only) ---------- */
const form = document.querySelector('.contact-form form')
if (form) {
  form.addEventListener('submit', (e) => {
    e.preventDefault()
    form.style.display = 'none'
    document.querySelector('.form-success').classList.add('show')
  })
}

/* recalc after fonts/layout settle */
window.addEventListener('load', () => ScrollTrigger.refresh())
