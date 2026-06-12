import gsap from 'gsap'

// Custom cursor dot (fine pointers only)
export function initCursor() {
  if (!window.matchMedia('(pointer: fine)').matches) return

  const cursor = document.querySelector('.cursor')
  const label = cursor.querySelector('.cursor-label')

  const xTo = gsap.quickTo(cursor, 'x', { duration: 0.35, ease: 'power3.out' })
  const yTo = gsap.quickTo(cursor, 'y', { duration: 0.35, ease: 'power3.out' })
  gsap.set(cursor, { xPercent: -50, yPercent: -50, x: -100, y: -100 })

  window.addEventListener('pointermove', (e) => {
    xTo(e.clientX)
    yTo(e.clientY)
  })

  // grow over links / labelled targets — delegated so content injected
  // later (e.g. case-study templates) is covered too
  const targets = 'a, button, [data-cursor], [data-cursor-label]'
  document.addEventListener('pointerover', (e) => {
    const el = e.target.closest?.(targets)
    if (!el) return
    const text = el.dataset.cursorLabel
    if (text) {
      label.textContent = text
      cursor.classList.add('has-label')
    } else {
      cursor.classList.add('is-hover')
    }
  })
  document.addEventListener('pointerout', (e) => {
    const el = e.target.closest?.(targets)
    if (!el) return
    if (el.contains(e.relatedTarget)) return
    cursor.classList.remove('has-label', 'is-hover')
  })

  // the element under a stationary pointer can be swapped out from beneath
  // it (e.g. a project card opening into the overlay) without any boundary
  // event firing — let those flows reset the cursor explicitly
  document.addEventListener('cursor:clear', () => {
    cursor.classList.remove('has-label', 'is-hover')
  })
}
