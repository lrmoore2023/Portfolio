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

  // drop the difference blend over media — otherwise the dot inverts the
  // image/video beneath it into a negative. a point test on the pointer
  // isn't enough: the dot has size and lags the pointer (quickTo), so its
  // edges can overlap media before/around the pointer crossing, flashing a
  // half-inverted dot at boundaries. instead, sample the dot's *rendered*
  // footprint each frame and toggle on any overlap. the loop only ticks
  // while the dot is travelling and idles once it has caught up.
  const media = 'img, video'
  let targetX = -100, targetY = -100, ticking = false

  function trackMedia() {
    const r = cursor.getBoundingClientRect()
    const cx = r.left + r.width / 2
    const cy = r.top + r.height / 2
    const reach = r.width / 2 + 2 // footprint radius + a small buffer for the leading edge

    let overMedia = !!document.elementFromPoint(cx, cy)?.closest(media)
    for (let i = 0; i < 8 && !overMedia; i++) {
      const a = (i / 8) * Math.PI * 2
      const el = document.elementFromPoint(cx + Math.cos(a) * reach, cy + Math.sin(a) * reach)
      overMedia = !!el?.closest(media)
    }
    cursor.classList.toggle('over-media', overMedia)

    if (Math.hypot(targetX - cx, targetY - cy) > 0.5) {
      requestAnimationFrame(trackMedia)
    } else {
      ticking = false // settled — stop sampling until the next move
    }
  }

  window.addEventListener('pointermove', (e) => {
    targetX = e.clientX
    targetY = e.clientY
    if (!ticking) { ticking = true; requestAnimationFrame(trackMedia) }
  })

  // the element under a stationary pointer can be swapped out from beneath
  // it (e.g. a project card opening into the overlay) without any boundary
  // event firing — let those flows reset the cursor explicitly
  document.addEventListener('cursor:clear', () => {
    cursor.classList.remove('has-label', 'is-hover', 'over-media')
  })
}
