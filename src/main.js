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
      onComplete: () => (el.dataset.settled = '1'),
    })
  })
}

/* ---------- hero dashboard: numbers keep moving after the count-up ---------- */
const heroApp = document.querySelector('.hero-app')
if (heroApp && !reducedMotion) {
  const leads = heroApp.querySelector('[data-count="1284"]')
  const deals = heroApp.querySelector('[data-count="24"]')
  const bump = (el, by) => {
    if (!el.dataset.settled) return // intro count-up still running
    const now = parseInt(el.textContent.replace(/\D/g, ''), 10) || 0
    el.textContent = (now + by).toLocaleString()
    el.classList.remove('tick')
    void el.offsetWidth // restart the tick animation
    el.classList.add('tick')
    const tag = document.createElement('span')
    tag.className = 'kpi-bump'
    tag.textContent = `+${by}`
    el.parentElement.appendChild(tag)
    setTimeout(() => tag.remove(), 1700)
  }
  let n = 0
  let timer = null
  const start = () => {
    if (timer) return
    timer = setInterval(() => {
      n += 1
      bump(leads, 1 + Math.floor(Math.random() * 3))
      if (n % 4 === 0) bump(deals, 1)
    }, 3600)
  }
  const stop = () => {
    clearInterval(timer)
    timer = null
  }
  // wait for the intro count-up, then only run while the hero is on screen
  ScrollTrigger.create({
    trigger: heroApp,
    start: 'top 90%',
    end: 'bottom 10%',
    onEnter: start,
    onEnterBack: start,
    onLeave: stop,
    onLeaveBack: stop,
  })
  document.addEventListener('visibilitychange', () => (document.hidden ? stop() : ScrollTrigger.isInViewport(heroApp) && start()))
}

/* ---------- process line (home teaser + process page) ---------- */
const processWrap = document.querySelector('.process-wrap')
if (processWrap) {
  const svg = processWrap.querySelector('.process-svg')
  const steps = [...processWrap.querySelectorAll('.process-step')]
  const horizontal = processWrap.classList.contains('process-compact') && window.matchMedia('(min-width: 901px)').matches

  let draw
  if (horizontal) {
    // line runs dot-centre to dot-centre across the row
    const dots = steps.map((s) => s.querySelector('.step-dot').getBoundingClientRect())
    const left = processWrap.getBoundingClientRect().left
    const x1 = dots[0].left + dots[0].width / 2 - left
    const x2 = dots[dots.length - 1].left + dots[dots.length - 1].width / 2 - left
    const w = processWrap.clientWidth
    svg.setAttribute('viewBox', `0 0 ${w} 4`)
    svg.innerHTML = `
      <line class="track" x1="${x1}" y1="2" x2="${x2}" y2="2"></line>
      <line class="draw" x1="${x1}" y1="2" x2="${x2}" y2="2"
        stroke-dasharray="${x2 - x1}" stroke-dashoffset="${x2 - x1}"></line>`
    draw = svg.querySelector('.draw')
  } else {
    const h = processWrap.scrollHeight
    svg.setAttribute('viewBox', `0 0 4 ${h}`)
    svg.innerHTML = `
      <line class="track" x1="2" y1="0" x2="2" y2="${h}"></line>
      <line class="draw" x1="2" y1="0" x2="2" y2="${h}"
        stroke-dasharray="${h}" stroke-dashoffset="${h}"></line>`
    draw = svg.querySelector('.draw')
  }

  if (reducedMotion) {
    draw.style.strokeDashoffset = 0
    steps.forEach((s) => s.classList.add('lit'))
  } else if (horizontal) {
    // short section: play once, lighting each step as the line reaches it
    const tl = gsap.timeline({ scrollTrigger: { trigger: processWrap, start: 'top 75%', once: true } })
    tl.to(draw, { strokeDashoffset: 0, duration: 1.6, ease: 'power2.inOut' })
    steps.forEach((step, i) => tl.call(() => step.classList.add('lit'), null, i * 0.38))
  } else {
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
    steps.forEach((step) => {
      ScrollTrigger.create({
        trigger: step,
        start: 'top 62%',
        onEnter: () => step.classList.add('lit'),
        onLeaveBack: () => step.classList.remove('lit'),
      })
    })
  }
}

/* ---------- why now: then vs now meters ---------- */
const whyNow = document.querySelector('#why-now .grid-3')
if (whyNow && !reducedMotion) {
  const cards = [...whyNow.querySelectorAll('.card')]
  const tl = gsap.timeline({ scrollTrigger: { trigger: whyNow, start: 'top 72%', once: true } })
  cards.forEach((card, i) => {
    const at = i * 0.25
    tl.to(card.querySelector('.tn-then i'), { '--p': 1, duration: 0.7, ease: 'power2.out' }, at)
    tl.to(card.querySelector('.tn-now i'), { '--p': 1, duration: 0.6, ease: 'back.out(2)' }, at + 0.55)
    tl.call(() => card.querySelector('.was').classList.add('struck'), null, at + 0.95)
  })
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

/* ---------- AI + human: live work stream ---------- */
const aiStage = document.querySelector('.ai-stage')
if (aiStage && !reducedMotion) {
  const spawn = aiStage.querySelector('.ai-spawn')
  const core = aiStage.querySelector('.ai-core')
  const orb = core.querySelector('.ai-orb')
  const status = core.querySelector('.ai-core-status')
  const cards = {
    done: aiStage.querySelector('.ai-done'),
    team: aiStage.querySelector('.ai-team'),
  }
  const counters = { done: 0, team: 0 }

  const ICONS = {
    lead: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.6-7 8-7s8 3 8 7"/></svg>',
    doc: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4M9 12h6M9 16h6"/></svg>',
    money: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="3"/></svg>',
    chart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 17l6-6 4 4 8-8"/><path d="M14 7h7v7"/></svg>',
    mail: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/></svg>',
  }

  // what comes in, what the AI does with it, and who it goes to
  const JOBS = [
    { icon: 'lead', in: 'New lead, Property Finder', out: 'Qualified, replied in 4s', to: 'done', status: 'Qualifying lead' },
    { icon: 'doc', in: 'Supplier invoice, PDF', out: '14 line items extracted', to: 'done', status: 'Reading invoice' },
    { icon: 'money', in: 'Expense, AED 18,400', out: 'Flagged: 3x above average', to: 'team', action: 'Approve', status: 'Checking pattern' },
    { icon: 'mail', in: '12 leads gone quiet', out: 'Follow-ups drafted', to: 'done', status: 'Drafting replies' },
    { icon: 'doc', in: 'Tenancy contract', out: 'Dates and rent captured', to: 'done', status: 'Extracting terms' },
    { icon: 'lead', in: 'Deal, Villa 14', out: 'Ready to close', to: 'team', action: 'Sign off', status: 'Preparing deal' },
    { icon: 'chart', in: 'Collection rate, live', out: 'Drift alert sent', to: 'done', status: 'Watching numbers' },
    { icon: 'money', in: 'Payment, AED 42,000', out: 'Needs your approval', to: 'team', action: 'Approve', status: 'Routing to you' },
  ]

  const setStatus = (text) => {
    status.classList.add('swap')
    setTimeout(() => {
      status.textContent = text
      status.classList.remove('swap')
    }, 250)
  }

  const center = (el) => {
    const r = el.getBoundingClientRect()
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 }
  }

  // land a finished job in its output card as a row, then retire it
  const land = (job) => {
    const card = cards[job.to]
    const list = card.querySelector('.ai-queue')
    const row = document.createElement('li')
    row.innerHTML =
      job.to === 'team'
        ? `<em>${job.out}</em><button class="ai-approve" type="button" tabindex="-1">${job.action}</button>`
        : `<span class="ai-tick">✓</span><em>${job.out}</em><span class="ai-when">just now</span>`
    list.prepend(row)
    while (list.children.length > 2) list.lastElementChild.remove()
    gsap.from(row, { height: 0, opacity: 0, duration: 0.35, ease: 'power2.out', clearProps: 'height' })

    card.classList.add('flash')
    setTimeout(() => card.classList.remove('flash'), 700)

    const bump = () => {
      counters[job.to] += 1
      const el = card.querySelector('[data-counter]')
      el.textContent = counters[job.to]
      gsap.fromTo(el, { scale: 1.4 }, { scale: 1, duration: 0.4, ease: 'back.out(2)' })
    }

    if (job.to === 'team') {
      // the human presses the button. that is the whole point.
      setTimeout(() => {
        row.classList.add('approved')
        row.querySelector('.ai-approve').textContent = job.action === 'Approve' ? 'Approved' : 'Signed'
        bump()
      }, 1500)
      setTimeout(() => gsap.to(row, { opacity: 0, height: 0, marginTop: -6, duration: 0.4, onComplete: () => row.remove() }), 4200)
    } else {
      bump()
      setTimeout(() => gsap.to(row, { opacity: 0, height: 0, marginTop: -6, duration: 0.4, onComplete: () => row.remove() }), 5200)
    }
  }

  const run = (job) => {
    const el = document.createElement('div')
    el.className = 'ai-job'
    el.innerHTML = `<i>${ICONS[job.icon]}</i><em>${job.in}</em>`
    spawn.appendChild(el)

    const from = center(el)
    const toCore = center(orb)
    const dropAt = () => {
      // aim for the card's queue area
      const r = cards[job.to].querySelector('.ai-queue').getBoundingClientRect()
      return { x: r.left + Math.min(r.width, 250) / 2, y: r.top + 17 }
    }

    const tl = gsap.timeline({ onComplete: () => el.remove() })
    tl.fromTo(el, { opacity: 0, scale: 0.9, y: -8 }, { opacity: 1, scale: 1, y: 0, duration: 0.35, ease: 'power2.out' })
      .to(el, { x: toCore.x - from.x, y: toCore.y - from.y, duration: 1.1, ease: 'power2.inOut' }, '+=0.35')
      .call(() => {
        core.classList.add('busy')
        setStatus(job.status)
      }, null, '-=0.25')
      .to(el, { scale: 0.5, opacity: 0, duration: 0.3, ease: 'power2.in' })
      // the AI works on it
      .call(
        () => {
          el.classList.add('is-result', job.to === 'team' ? 'to-team' : 'to-done')
          el.querySelector('em').textContent = job.out
          core.classList.remove('busy')
          setStatus(job.to === 'team' ? 'Handing to your team' : 'Done')
        },
        null,
        '+=0.75'
      )
      .to(el, { scale: 1, opacity: 1, duration: 0.3, ease: 'back.out(1.6)' })
      .add(() => {
        const d = dropAt()
        gsap.to(el, {
          x: d.x - from.x,
          y: d.y - from.y,
          duration: 0.9,
          ease: 'power2.inOut',
          onComplete: () => {
            gsap.to(el, { opacity: 0, scale: 0.85, duration: 0.25 })
            land(job)
            setTimeout(() => setStatus('Listening'), 900)
          },
        })
      })
      .to({}, { duration: 1.5 })
  }

  // run only while on screen, one job every few seconds
  let timer = null
  let i = 0
  const start = () => {
    if (timer) return
    run(JOBS[i++ % JOBS.length])
    timer = setInterval(() => run(JOBS[i++ % JOBS.length]), 3200)
  }
  const stop = () => {
    clearInterval(timer)
    timer = null
  }
  ScrollTrigger.create({
    trigger: aiStage,
    start: 'top 85%',
    end: 'bottom 15%',
    onEnter: start,
    onEnterBack: start,
    onLeave: stop,
    onLeaveBack: stop,
  })
  document.addEventListener('visibilitychange', () => (document.hidden ? stop() : ScrollTrigger.isInViewport(aiStage) && start()))
} else if (aiStage) {
  // reduced motion: show a settled state
  aiStage.querySelector('.ai-done .ai-queue').innerHTML =
    '<li><span class="ai-tick">✓</span><em>Qualified, replied in 4s</em></li><li><span class="ai-tick">✓</span><em>14 line items extracted</em></li>'
  aiStage.querySelector('.ai-team .ai-queue').innerHTML =
    '<li class="approved"><em>Flagged: 3x above average</em><span class="ai-approve">Approved</span></li>'
  aiStage.querySelector('[data-counter="done"]').textContent = '38'
  aiStage.querySelector('[data-counter="team"]').textContent = '4'
}

/* ---------- visibility: icons draw themselves in ---------- */
const visBand = document.querySelector('.vis-band')
if (visBand && !reducedMotion) {
  const items = [...visBand.querySelectorAll('.vis-item')]
  const shapes = items.map((item) => [...item.querySelectorAll('.vis-icon svg *')])
  shapes.flat().forEach((el) => {
    const len = el.getTotalLength()
    el.style.strokeDasharray = len
    el.style.strokeDashoffset = len
  })
  const tl = gsap.timeline({
    scrollTrigger: { trigger: visBand, start: 'top 75%', once: true },
    onComplete: () => {
      // free the dash arrays so the heartbeat can take over
      shapes.flat().forEach((el) => {
        el.style.strokeDasharray = ''
        el.style.strokeDashoffset = ''
      })
      visBand.querySelector('.vis-live').classList.add('beat')
    },
  })
  items.forEach((item, i) => {
    tl.from(item, { y: 18, opacity: 0, duration: 0.6, ease: 'power2.out' }, i * 0.15)
    tl.to(shapes[i], { strokeDashoffset: 0, duration: 0.9, ease: 'power2.inOut', stagger: 0.12 }, i * 0.15 + 0.2)
  })
} else if (visBand) {
  visBand.querySelector('.vis-live').classList.add('beat')
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
