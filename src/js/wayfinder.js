import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

// Fixed wayfinding: "01 — WORK" at the left edge, crossfading per section
// (hidden while in the hero), plus a scroll-progress hairline at the top.
export function initWayfinder(reducedMotion) {
  const wf = document.querySelector('.wayfinder')
  const text = wf.querySelector('.wf-text')

  const setLabel = (label) => {
    if (text.textContent === label) return
    if (reducedMotion) {
      text.textContent = label
      return
    }
    gsap.timeline()
      .to(text, { opacity: 0, x: -6, duration: 0.25, ease: 'power2.in' })
      .add(() => { text.textContent = label })
      .to(text, { opacity: 1, x: 0, duration: 0.35, ease: 'power2.out' })
  }

  document.querySelectorAll('main > section').forEach((section, i) => {
    const label = `0${i} — ${section.id.toUpperCase()}`
    ScrollTrigger.create({
      trigger: section,
      start: 'top 55%',
      end: 'bottom 55%',
      onToggle(self) {
        if (!self.isActive) return
        if (section.id === 'hero') {
          wf.classList.remove('is-visible')
        } else {
          wf.classList.add('is-visible')
          setLabel(label)
        }
      },
    })
  })

  if (!reducedMotion) {
    gsap.to('.progress', {
      scaleX: 1,
      ease: 'none',
      scrollTrigger: { start: 0, end: 'max', scrub: 0.4 },
    })
  }
}
