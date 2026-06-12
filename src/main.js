import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { Flip } from 'gsap/Flip'

import { WIP_MODE } from './config.js'
import { initWipGate } from './js/wip-gate.js'
import { initSmoothScroll, initAnchors } from './js/smooth-scroll.js'
import { initNav } from './js/nav.js'
import { initTheme } from './js/theme.js'
import { initReveals, initRules, initParallax, heroIntro } from './js/reveals.js'
import { initWayfinder } from './js/wayfinder.js'
import { initHeroScene } from './js/hero-scene.js'
import { initProjects } from './js/projects.js'
import { initCoverVideos } from './js/case-study.js'
import { initCursor } from './js/cursor.js'

gsap.registerPlugin(ScrollTrigger, Flip)

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

if (import.meta.env.DEV && new URLSearchParams(location.search).has('radar-cover')) {
  // offline render harness for the project-03 cover: mounts the radar scene
  // alone and exposes deterministic frame seeking for the capture script
  // (scripts/capture-cover.mjs). Dev-only — never part of a build.
  initRadarCoverHarness()
} else if (WIP_MODE) {
  initWipGate(reducedMotion)
} else {
  initSite(reducedMotion)
}

async function initRadarCoverHarness() {
  document.body.innerHTML = '<div style="position:fixed;inset:0;background:#121211"><canvas style="display:block;width:100%;height:100%"></canvas></div>'
  document.body.style.cursor = 'auto'
  const { createRadarScene } = await import('./js/radar-scene.js')
  const scene = createRadarScene(document.querySelector('canvas'), { interactive: false, capture: true })
  scene.setProgress(0.65)
  scene.seek(0)
  window.__radarSeek = (t) => { scene.seek(t); return true }
}

function initSite(reducedMotion) {
  const lenis = initSmoothScroll(reducedMotion)
  initAnchors(lenis)
  initTheme()
  initReveals(reducedMotion)
  initRules(reducedMotion)
  initParallax(reducedMotion)
  initWayfinder(reducedMotion)
  initHeroScene(reducedMotion)
  const projects = initProjects(lenis, reducedMotion)
  initCoverVideos(reducedMotion)
  initNav(lenis, projects.open)
  initCursor()

  // intro waits for fonts so masked lines don't reveal in a fallback face
  document.fonts.ready.then(() => {
    const tl = heroIntro(reducedMotion)
    if (import.meta.env.DEV) { window.gsap = gsap; window.__introTl = tl }
  })

  // footer clock — viewer's local time
  const clock = document.getElementById('clock')
  function tick() {
    clock.textContent = new Date().toLocaleTimeString('en-GB', { hour12: false })
  }
  tick()
  setInterval(tick, 1000)
}
