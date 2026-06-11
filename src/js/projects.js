import gsap from 'gsap'
import { Flip } from 'gsap/Flip'

// Expand-in-place project overlay: the clicked cover is re-parented into the
// overlay and FLIP-animated fullscreen; closing reverses it back into the grid.
export function initProjects(lenis, reducedMotion) {
  const pv = document.querySelector('.pv')
  const backdrop = pv.querySelector('.pv-backdrop')
  const media = pv.querySelector('.pv-media')
  const content = pv.querySelector('.pv-content')
  const closeBtn = pv.querySelector('.pv-close')

  let active = null      // the open .project element
  let home = null        // cover's original parent
  let homeNext = null    // sibling the cover sat before, to restore DOM order
  let lastFocus = null
  let animating = false

  const fields = {
    title: pv.querySelector('.pv-title'),
    cat: pv.querySelector('.pv-cat'),
    year: pv.querySelector('.pv-year'),
    desc: pv.querySelector('.pv-desc'),
    role: pv.querySelector('.pv-role'),
    stack: pv.querySelector('.pv-stack'),
  }

  function populate(project) {
    const d = project.dataset
    fields.title.textContent = d.title
    fields.cat.textContent = d.category
    fields.year.textContent = d.year
    fields.desc.textContent = d.description
    fields.role.textContent = d.role
    fields.stack.textContent = d.stack
  }

  function open(project) {
    if (animating || active) return
    animating = true
    active = project
    lastFocus = document.activeElement
    populate(project)

    const cover = project.querySelector('.cover')
    home = cover.parentElement
    homeNext = cover.nextElementSibling

    // pin the grid item's height so removing the cover doesn't shorten the
    // page (which would clamp the scroll position and cause a snap on close)
    home.style.minHeight = `${home.offsetHeight}px`

    pv.classList.add('is-open')
    pv.setAttribute('aria-hidden', 'false')
    pv.scrollTop = 0
    if (lenis) lenis.stop()
    else document.documentElement.style.overflow = 'hidden'

    const state = Flip.getState(cover)
    media.appendChild(cover)

    const dur = reducedMotion ? 0 : 0.9
    Flip.from(state, {
      duration: dur,
      ease: 'power4.inOut',
      absolute: true,
      onComplete: () => { animating = false; closeBtn.focus() },
    })
    gsap.fromTo(backdrop, { opacity: 0 }, { opacity: 1, duration: dur * 0.7, ease: 'power2.out' })
    gsap.fromTo(content,
      { opacity: 0, y: reducedMotion ? 0 : 50 },
      { opacity: 1, y: 0, duration: Math.max(dur, 0.01), delay: dur * 0.35, ease: 'power3.out' },
    )
    gsap.fromTo(closeBtn, { opacity: 0 }, { opacity: 1, duration: 0.5, delay: dur * 0.5 })
  }

  function close() {
    if (animating || !active) return
    animating = true

    const cover = media.querySelector('.cover')
    const state = Flip.getState(cover)
    home.insertBefore(cover, homeNext)

    const dur = reducedMotion ? 0 : 0.8
    Flip.from(state, {
      duration: dur,
      ease: 'power4.inOut',
      absolute: true,
      onComplete: () => {
        pv.classList.remove('is-open')
        pv.setAttribute('aria-hidden', 'true')
        home.style.minHeight = ''
        if (lenis) lenis.start()
        else document.documentElement.style.overflow = ''
        if (lastFocus) lastFocus.focus?.({ preventScroll: true })
        active = null
        animating = false
      },
    })
    gsap.to([content, closeBtn], { opacity: 0, duration: Math.max(dur * 0.4, 0.01) })
    gsap.to(backdrop, { opacity: 0, duration: Math.max(dur * 0.8, 0.01), delay: dur * 0.15 })
  }

  document.querySelectorAll('.project').forEach((project) => {
    project.addEventListener('click', () => open(project))
    project.setAttribute('tabindex', '0')
    project.setAttribute('role', 'button')
    project.setAttribute('aria-label', `Open project: ${project.dataset.title}`)
    project.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(project) }
    })
  })

  closeBtn.addEventListener('click', close)
  backdrop.addEventListener('click', close)
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') close()
  })
}
