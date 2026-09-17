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
