import gsap from 'gsap'
import { initHeroScene } from './hero-scene.js'
import { initCursor } from './cursor.js'
import '../styles/wip.css'

// Temporary under-construction gate — the hero recast as a status board.
// Active only when WIP_MODE (src/config.js) is true; delete this file
// together with the flag and wip.css at launch.

const MARQUEE = 'Work in Progress — AI × Development × Research — Returning Soon — '
const PERCENT_START = 87
const PERCENT_CAP = 93

export function initWipGate(reducedMotion) {
  document.documentElement.classList.add('wip')
  document.title = 'Liam Moore — Work in Progress'

  // keep the placeholder out of search indexes while gated
  const robots = document.createElement('meta')
  robots.name = 'robots'
  robots.content = 'noindex'
  document.head.appendChild(robots)

  const gate = document.createElement('div')
  gate.className = 'wip-gate'
  // each marquee half repeats enough to outspan ultrawide viewports —
  // the loop wraps at exactly -50%, so the halves must be identical
  const half = MARQUEE.repeat(5)
  gate.innerHTML = `
    <canvas class="wip-canvas" aria-hidden="true"></canvas>
    <header class="wip-top">
      <span class="wip-brand" data-reveal>LM<span class="wip-brand-c">©</span></span>
      <span class="wip-status label" data-reveal>Status&nbsp;—&nbsp;In Assembly</span>
    </header>
    <div class="wip-center">
      <h1 class="wip-title">
        <span class="line"><span class="line-inner">WORK IN</span></span>
        <span class="line"><span class="line-inner">PROGRESS<span class="wip-caret">_</span></span></span>
      </h1>
      <p class="wip-sub">
        <span class="line"><span class="line-inner">Liam Moore&nbsp;—&nbsp;Creative Technologist</span></span>
      </p>
      <div class="wip-progress">
        <span class="wip-percent">(&nbsp;<span class="wip-odo"><span class="wip-odo-strip"><span>00</span><span>${PERCENT_START}</span></span></span>%&nbsp;)</span>
        <span class="wip-rule" aria-hidden="true"><span class="wip-rule-fill"></span></span>
      </div>
    </div>
    <footer class="wip-bottom">
      <div class="wip-foot">
        <nav class="wip-links" data-reveal>
          <a href="mailto:lrmoore2023@gmail.com">Email&nbsp;↗</a>
          <a href="https://www.linkedin.com/in/liam-moore-eng/" target="_blank" rel="noopener">LinkedIn&nbsp;↗</a>
          <a href="/resume.pdf" target="_blank" rel="noopener">Resume&nbsp;↗</a>
        </nav>
        <span class="wip-clock label" data-reveal>Local&nbsp;—&nbsp;<span class="wip-clock-time">00:00:00</span></span>
      </div>
      <div class="wip-marquee" aria-hidden="true" data-reveal>
        <div class="wip-marquee-track"><span>${half}</span><span>${half}</span></div>
      </div>
    </footer>
  `
  document.body.appendChild(gate)

  initHeroScene(reducedMotion, gate.querySelector('.wip-canvas'))
  initCursor()

  // gate clock — viewer's local time, same format as the footer
  const time = gate.querySelector('.wip-clock-time')
  const tick = () => { time.textContent = new Date().toLocaleTimeString('en-GB', { hour12: false }) }
  tick()
  setInterval(tick, 1000)

  const odo = gate.querySelector('.wip-odo-strip')
  const fill = gate.querySelector('.wip-rule-fill')
  let percent = PERCENT_START

  if (reducedMotion) {
    // CSS overrides already show lines, reveals, canvas and rule track —
    // pin the odometer and fill to their final state, skip all loops
    gsap.set(odo, { yPercent: -50 })
    gsap.set(fill, { scaleX: percent / 100 })
    return
  }

  // "still building" detail — every so often the percent ticks up one
  function rollTo(next) {
    odo.innerHTML = `<span>${percent}</span><span>${next}</span>`
    gsap.fromTo(odo, { yPercent: 0 }, { yPercent: -50, duration: 0.9, ease: 'power4.inOut' })
    gsap.to(fill, { scaleX: next / 100, duration: 0.9, ease: 'power4.inOut' })
    percent = next
  }
  function drift() {
    if (percent >= PERCENT_CAP) return
    gsap.delayedCall(gsap.utils.random(6, 12), () => {
      rollTo(percent + 1)
      drift()
    })
  }

  // intro waits for fonts so masked lines don't reveal in a fallback face
  document.fonts.ready.then(() => {
    const titleLines = gate.querySelectorAll('.wip-title .line-inner')
    const subLine = gate.querySelectorAll('.wip-sub .line-inner')
    const reveals = gate.querySelectorAll('[data-reveal]')
    const canvas = gate.querySelector('.wip-canvas')
    const rule = gate.querySelector('.wip-rule')
    const caret = gate.querySelector('.wip-caret')
    const track = gate.querySelector('.wip-marquee-track')

    gsap.set([...titleLines, ...subLine], { yPercent: 115, y: 0 })
    gsap.set(reveals, { opacity: 0, y: 12 })

    const tl = gsap.timeline({
      defaults: { ease: 'power4.out' },
      onComplete: () => {
        gsap.to(track, { xPercent: -50, duration: 22, ease: 'none', repeat: -1 })
        gsap.to(caret, { opacity: 0, duration: 0.53, ease: 'steps(1)', repeat: -1, yoyo: true })
        drift()
      },
    })
    tl.to(rule, { scaleX: 1, duration: 1.25, ease: 'power4.inOut' }, 0)
      .to(titleLines, { yPercent: 0, duration: 1.4, stagger: 0.09 }, 0.15)
      .to(subLine, { yPercent: 0, duration: 1.3 }, 0.4)
      .to(odo, { yPercent: -50, duration: 1.6, ease: 'power3.inOut' }, 0.55)
      .to(fill, { scaleX: percent / 100, duration: 1.6, ease: 'power3.inOut' }, 0.55)
      .to(canvas, { opacity: 1, duration: 1.6, ease: 'power2.inOut' }, 0.7)
      .to(reveals, { opacity: 1, y: 0, duration: 0.9, stagger: 0.08, ease: 'power3.out' }, 0.9)
  })
}
