import gsap from 'gsap'
import { Flip } from 'gsap/Flip'
import { initCaseStudy } from './case-study.js'

// Expand-in-place project overlay: the clicked cover is re-parented into the
// overlay and FLIP-animated fullscreen; closing reverses it back into the grid.
// Projects with a data-case attribute additionally get "case mode": their
// <template> content is cloned into .pv-case and the panel becomes a
// scrollable long-form document.
export function initProjects(lenis, reducedMotion) {
  const pv = document.querySelector('.pv')
  const backdrop = pv.querySelector('.pv-backdrop')
  const panel = pv.querySelector('.pv-panel')
  const media = pv.querySelector('.pv-media')
  const content = pv.querySelector('.pv-content')
  const closeBtn = pv.querySelector('.pv-close')
  const caseMount = pv.querySelector('.pv-case')
  let caseCtl = null

  let active = null      // the open .project element
  let home = null        // cover's original parent
  let homeNext = null    // sibling the cover sat before, to restore DOM order

  // stand-in that holds the cover's grid slot while the cover is out of flow
  // (re-parented into the overlay, or position:absolute during the Flip) —
  // keeps the page height stable and stops the meta row jumping upward
  const placeholder = document.createElement('div')
  placeholder.style.visibility = 'hidden'
  placeholder.style.width = '100%'
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
    placeholder.style.height = `${cover.offsetHeight}px`

    pv.classList.add('is-open')
    pv.setAttribute('aria-hidden', 'false')
    document.dispatchEvent(new CustomEvent('cursor:clear'))
    panel.scrollTop = 0
    if (lenis) lenis.stop()
    else document.documentElement.style.overflow = 'hidden'

    // case mode must be in place before Flip measures the destination layout
    const tpl = project.dataset.case && document.getElementById(project.dataset.case)
    if (tpl) {
      pv.classList.add('pv--case')
      caseMount.appendChild(tpl.content.cloneNode(true))
      caseCtl = initCaseStudy(panel, reducedMotion)
    }

    const state = Flip.getState(cover)
    media.appendChild(cover)
    home.insertBefore(placeholder, homeNext)

    // Flip makes the cover position:absolute for the animation — in case
    // mode that would collapse the auto-height hero and snap the content
    // below upward, so pin the media's height until the cover settles
    if (caseCtl) media.style.height = `${media.offsetHeight}px`

    const dur = reducedMotion ? 0 : 0.9
    Flip.from(state, {
      duration: dur,
      ease: 'power4.inOut',
      absolute: true,
      onComplete: () => {
        media.style.height = ''
        // trigger positions were measured against the pre-Flip layout
        // (empty hero) — recompute now that the cover is in flow
        if (caseCtl) caseCtl.refresh()
        animating = false
        closeBtn.focus()
      },
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

    const finish = () => {
      placeholder.remove()
      cover.style.zIndex = ''
      document.dispatchEvent(new CustomEvent('cursor:clear'))
      pv.classList.remove('is-open')
      pv.setAttribute('aria-hidden', 'true')
      if (caseCtl) { caseCtl.destroy(); caseCtl = null }
      pv.classList.remove('pv--case')
      caseMount.replaceChildren()
      media.style.height = ''
      gsap.set(pv, { clearProps: 'opacity' })
      if (lenis) lenis.start()
      else document.documentElement.style.overflow = ''
      if (lastFocus) lastFocus.focus?.({ preventScroll: true })
      active = null
      animating = false
    }

    // deep in a case study the hero cover is far offscreen — Flip-flying it
    // back would streak across the document, so fade the overlay out instead
    if (panel.scrollTop > window.innerHeight * 0.5 && !reducedMotion) {
      gsap.to(pv, {
        opacity: 0,
        duration: 0.5,
        ease: 'power2.inOut',
        onComplete: () => {
          home.replaceChild(cover, placeholder)
          finish()
        },
      })
      return
    }

    // same height pin on the way out — the cover leaves the hero's flow
    if (caseCtl) media.style.height = `${media.offsetHeight}px`

    const state = Flip.getState(cover)
    home.replaceChild(cover, placeholder)
    // the cover now lives in the page, UNDER the overlay (z 80) — without a
    // lift it vanishes behind the backdrop until the fade catches up
    cover.style.zIndex = 100

    const dur = reducedMotion ? 0 : 0.8
    Flip.from(state, {
      duration: dur,
      ease: 'power4.inOut',
      absolute: true,
      onComplete: finish,
    })
    // Flip just made the cover absolute — fill its flow slot for the
    // duration of the animation so the meta row doesn't jump upward
    if (!reducedMotion) home.insertBefore(placeholder, homeNext)
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

  return { open }
}
