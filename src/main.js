import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { Flip } from 'gsap/Flip'

import { initSmoothScroll, initAnchors } from './js/smooth-scroll.js'
import { initNav } from './js/nav.js'
import { initTheme } from './js/theme.js'
import { initReveals, heroIntro } from './js/reveals.js'
import { initHeroScene } from './js/hero-scene.js'
import { initProjects } from './js/projects.js'
import { initCursor } from './js/cursor.js'

gsap.registerPlugin(ScrollTrigger, Flip)

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

const lenis = initSmoothScroll(reducedMotion)
initAnchors(lenis)
initNav()
initTheme()
initReveals(reducedMotion)
initHeroScene(reducedMotion)
initProjects(lenis, reducedMotion)
initCursor(reducedMotion)

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
