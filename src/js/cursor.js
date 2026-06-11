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

  // grow over links / labelled targets
  document.querySelectorAll('a, button, [data-cursor], [data-cursor-label]').forEach((el) => {
    el.addEventListener('pointerenter', () => {
      const text = el.dataset.cursorLabel
      if (text) {
        label.textContent = text
        cursor.classList.add('has-label')
      } else {
        cursor.classList.add('is-hover')
      }
    })
    el.addEventListener('pointerleave', () => {
      cursor.classList.remove('has-label', 'is-hover')
    })
  })
}
