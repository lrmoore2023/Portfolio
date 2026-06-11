import Lenis from 'lenis'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

// Lenis smooth scroll, driven by the GSAP ticker and synced with ScrollTrigger
export function initSmoothScroll(reducedMotion) {
  if (reducedMotion) return null

  const lenis = new Lenis({
    duration: 1.15,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
  })

  lenis.on('scroll', ScrollTrigger.update)
  gsap.ticker.add((time) => lenis.raf(time * 1000))
  gsap.ticker.lagSmoothing(0)

  return lenis
}

// Anchor links scroll through Lenis (falls back to native scroll)
export function initAnchors(lenis) {
  document.querySelectorAll('a[data-scroll]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const target = document.querySelector(a.getAttribute('href'))
      if (!target) return
      e.preventDefault()
      if (lenis) lenis.scrollTo(target, { offset: 0, duration: 1.6 })
      else target.scrollIntoView({ behavior: 'smooth' })
    })
  })
}
