import { ScrollTrigger } from 'gsap/ScrollTrigger'

// Light/dark inversion driven by which [data-theme] section crosses mid-viewport.
// Colors are CSS variables on <body>; the swap itself transitions in CSS.
export function initTheme() {
  const sections = document.querySelectorAll('section[data-theme]')

  sections.forEach((section) => {
    const theme = section.dataset.theme
    ScrollTrigger.create({
      trigger: section,
      start: 'top 55%',
      end: 'bottom 55%',
      onToggle(self) {
        if (self.isActive) document.body.dataset.theme = theme
      },
    })
  })
}
