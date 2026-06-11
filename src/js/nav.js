import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

// Navbar: hides on scroll down / reappears on scroll up, reveals the Home
// link once past the hero, and builds the Work dropdown from the project
// cards (click → scroll to the project, then open its overlay).
export function initNav(lenis, openProject) {
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

  // Home link fades in once the hero has scrolled past the navbar
  const home = nav.querySelector('.nav-home')
  ScrollTrigger.create({
    trigger: '#hero',
    start: 'bottom 120px',
    onEnter: () => home.classList.add('is-visible'),
    onLeaveBack: () => home.classList.remove('is-visible'),
  })

  // Work dropdown, generated from the live project cards so it stays in sync
  const drop = document.getElementById('nav-drop-projects')
  document.querySelectorAll('.project').forEach((project, i) => {
    const btn = document.createElement('button')
    btn.type = 'button'
    btn.className = 'nav-drop-link'
    btn.setAttribute('data-cursor', '')
    btn.innerHTML = `<sup>${String(i + 1).padStart(2, '0')}</sup>${project.dataset.title}`
    btn.addEventListener('click', () => {
      btn.blur() // collapse the dropdown
      if (lenis) {
        lenis.scrollTo(project, {
          offset: -100,
          duration: 1.4,
          onComplete: () => openProject(project),
        })
      } else {
        project.scrollIntoView()
        openProject(project)
      }
    })
    drop.appendChild(btn)
  })

  return { show: () => setHidden(false) }
}
