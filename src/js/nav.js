import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

// Navbar hides on scroll down, reappears on scroll up, always visible near the top
export function initNav() {
  const nav = document.getElementById('site-nav')
  let hidden = false

  const setHidden = (v) => {
    if (hidden === v) return
    hidden = v
    gsap.to(nav, {
      yPercent: v ? -110 : 0,
      duration: 0.6,
      ease: 'power3.out',
      overwrite: 'auto',
    })
  }

  ScrollTrigger.create({
    start: 0,
    end: 'max',
    onUpdate(self) {
      const y = self.scroll()
      nav.classList.toggle('is-scrolled', y > 24)
      if (y < 120) setHidden(false)
      else setHidden(self.direction === 1)
    },
  })

  return { show: () => setHidden(false) }
}
