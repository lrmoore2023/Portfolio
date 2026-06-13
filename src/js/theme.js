import { ScrollTrigger } from 'gsap/ScrollTrigger'

// Light/dark inversion driven by which [data-theme] section crosses mid-viewport.
// Colors are CSS variables on <body>; the swap itself transitions in CSS.
export function initTheme() {
  const sections = document.querySelectorAll('section[data-theme]')
  let current = document.body.dataset.theme
  let locked = false

  sections.forEach((section) => {
    const theme = section.dataset.theme
    ScrollTrigger.create({
      trigger: section,
      start: 'top 55%',
      end: 'bottom 55%',
      onToggle(self) {
        if (self.isActive) {
          current = theme
          if (!locked) document.body.dataset.theme = theme
        }
      },
    })
  })

  // The project overlay is designed on ink, so pin the theme dark while one
  // is open: a window resize refreshes ScrollTrigger, which can re-fire a
  // light section's toggle behind the overlay and paint the whole case
  // paper. Track the computed theme meanwhile and restore it on close.
  document.addEventListener('overlay:open', () => {
    locked = true
    document.body.dataset.theme = 'dark'
  })
  document.addEventListener('overlay:close', () => {
    locked = false
    document.body.dataset.theme = current
  })
}
