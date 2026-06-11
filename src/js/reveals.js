import gsap from 'gsap'

// Scroll-triggered reveals:
//  .line > .line-inner   masked line slide-up (pre-hidden in CSS via html.js)
//  [data-reveal]         fade-up blocks
//  .cover                clip-path wipe
export function initReveals(reducedMotion) {
  if (reducedMotion) return

  // hero lines are choreographed by the intro timeline — exclude them
  document.querySelectorAll('section:not(#hero) .line-inner').forEach((el) => {
    // y: 0 overrides the CSS translateY(115%), which GSAP parses as a pixel offset
    gsap.fromTo(el,
      { yPercent: 115, y: 0 },
      {
        yPercent: 0,
        duration: 1.1,
        ease: 'power4.out',
        scrollTrigger: { trigger: el.closest('.line'), start: 'top 88%' },
      },
    )
  })

  document.querySelectorAll('[data-reveal]').forEach((el) => {
    gsap.fromTo(el,
      { opacity: 0, y: 36 },
      {
        opacity: 1,
        y: 0,
        duration: 1.1,
        ease: 'power3.out',
        scrollTrigger: { trigger: el, start: 'top 88%' },
      },
    )
  })

  document.querySelectorAll('.project').forEach((project) => {
    const cover = project.querySelector('.cover')
    gsap.fromTo(cover,
      { clipPath: 'inset(0 0 100% 0)' },
      {
        clipPath: 'inset(0 0 0% 0)',
        duration: 1.25,
        ease: 'power4.inOut',
        scrollTrigger: { trigger: project, start: 'top 82%' },
      },
    )
    gsap.fromTo(project.querySelector('.project-meta'),
      { opacity: 0, y: 20 },
      {
        opacity: 1,
        y: 0,
        duration: 0.9,
        delay: 0.35,
        ease: 'power3.out',
        scrollTrigger: { trigger: project, start: 'top 82%' },
      },
    )
  })
}

// Hero load choreography — runs once fonts are ready
export function heroIntro(reducedMotion) {
  // reduced motion: CSS overrides already keep everything visible
  if (reducedMotion) return

  const lines = document.querySelectorAll('#hero .line-inner')
  const meta = document.querySelectorAll('.hero-meta-item, .hero-scroll')
  const nav = document.getElementById('site-nav')
  const canvas = document.querySelector('.hero-canvas')

  gsap.set(lines, { yPercent: 115, y: 0 }) // y: 0 clears the CSS-derived pixel offset

  const tl = gsap.timeline({ defaults: { ease: 'power4.out' } })
  tl.set(canvas, { opacity: 0 })
    .set(meta, { opacity: 0, y: 14 })
    .set(nav, { opacity: 0 })
    .to('.hero-name .line-inner', { yPercent: 0, duration: 1.4, stagger: 0.09 }, 0.15)
    .to('.hero-role .line-inner', { yPercent: 0, duration: 1.3, stagger: 0.08 }, 0.4)
    .to('.hero-tagline .line-inner', { yPercent: 0, duration: 1.2, stagger: 0.07 }, 0.55)
    .to(canvas, { opacity: 1, duration: 1.6, ease: 'power2.inOut' }, 0.7)
    .to(nav, { opacity: 1, duration: 0.9 }, 0.9)
    .to(meta, { opacity: 1, y: 0, duration: 0.9, stagger: 0.08 }, 1.0)

  return tl
}
