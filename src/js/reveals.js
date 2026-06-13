import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

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

  // the about portrait gets the same clip-path wipe as the project covers,
  // with its caption fading in just after — keeps it consistent with the
  // work grid rather than the plainer [data-reveal] fade
  const portrait = document.querySelector('.about-portrait')
  if (portrait) {
    gsap.fromTo(portrait.querySelector('.portrait-media'),
      { clipPath: 'inset(0 0 100% 0)' },
      {
        clipPath: 'inset(0 0 0% 0)',
        duration: 1.25,
        ease: 'power4.inOut',
        scrollTrigger: { trigger: portrait, start: 'top 82%' },
      },
    )
    gsap.fromTo(portrait.querySelector('figcaption'),
      { opacity: 0, y: 20 },
      {
        opacity: 1,
        y: 0,
        duration: 0.9,
        delay: 0.35,
        ease: 'power3.out',
        scrollTrigger: { trigger: portrait, start: 'top 82%' },
      },
    )
  }

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

// Divider lines draw in right-to-left, scrubbed to scroll: they grow as the
// element rises through the viewport and shrink again on the way back up.
// Reduced motion keeps the static CSS borders instead.
export function initRules(reducedMotion) {
  if (reducedMotion) return

  const hosts = document.querySelectorAll(
    '.section-head, .project-meta, .capability, .stack-row, .contact-link, .site-footer',
  )

  const make = (host, cls) => {
    const s = document.createElement('span')
    s.className = cls
    s.setAttribute('aria-hidden', 'true')
    host.appendChild(s)
    return s
  }

  // long range + smoothed scrub so the draw is slow enough to read; each
  // rule is keyed to its own edge of the host (a bottom rule sits one row
  // lower, so it lags its top rule and the cascade stays consistent). The
  // end is clamped to what that edge can reach at max scroll, otherwise
  // rules near the page bottom would stall half-drawn.
  const draw = (host, span, edge) => {
    gsap.fromTo(span, { scaleX: 0 }, {
      scaleX: 1,
      ease: 'none',
      scrollTrigger: {
        trigger: host,
        start: `${edge} 98%`,
        end: () => {
          const rect = host.getBoundingClientRect()
          const docY = (edge === 'top' ? rect.top : rect.bottom) + window.scrollY
          const reachable = (docY - ScrollTrigger.maxScroll(window)) / window.innerHeight
          const pct = Math.min(0.95, Math.max(0.4, reachable + 0.03)) * 100
          return `${edge} ${pct}%`
        },
        scrub: 0.6,
        invalidateOnRefresh: true,
      },
    })
  }

  hosts.forEach((host) => {
    host.classList.add('has-rule')
    const top = make(host, 'rule')

    if (host.matches('.site-footer')) {
      // the footer never travels far enough up the viewport for a scrub range
      gsap.fromTo(top, { scaleX: 0 }, {
        scaleX: 1,
        duration: 1.2,
        ease: 'power3.inOut',
        scrollTrigger: { trigger: host, start: 'top 99%', toggleActions: 'play none none reverse' },
      })
      return
    }

    draw(host, top, 'top')
    if (host.matches('.capability:last-child, .stack-row:last-child, .contact-link:last-child')) {
      host.classList.add('has-rule-bottom')
      draw(host, make(host, 'rule rule--bottom'), 'bottom')
    }
  })
}

// Scroll-depth parallax: cover interiors drift as projects travel the
// viewport, and the hero type exits at offset speeds when scrolling away
export function initParallax(reducedMotion) {
  if (reducedMotion) return

  document.querySelectorAll('.cover-media').forEach((media) => {
    gsap.fromTo(media,
      { yPercent: -5 },
      {
        yPercent: 5,
        ease: 'none',
        scrollTrigger: {
          trigger: media.closest('.project'),
          start: 'top bottom',
          end: 'bottom top',
          scrub: true,
        },
      },
    )
  })

  const exit = (target, vars) => {
    gsap.to(target, {
      ...vars,
      ease: 'none',
      scrollTrigger: { trigger: '#hero', start: 'top top', end: 'bottom top', scrub: true },
    })
  }
  exit('.hero-name', { yPercent: 24 })
  exit('.hero-tagline', { yPercent: 60, opacity: 0.25 })
  exit('.hero-canvas', { opacity: 0.5 })
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
