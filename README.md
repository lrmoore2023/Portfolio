# Liam Moore — Portfolio

Single-page portfolio. Vite + GSAP (ScrollTrigger, Flip) + Three.js + Lenis, PP Neue Montreal self-hosted.

## Develop

```sh
npm install
npm run dev      # local dev server
npm run build    # production build → dist/
npm run preview  # serve the production build locally
```

Deploy by pointing any static host (Netlify, Vercel, GitHub Pages) at `dist/` — `base: './'` is set, so it works from subpaths too.

## Replacing the placeholders

- **Projects** — in `index.html`, each `<li class="project">` carries `data-title/category/year/role/stack/description` (used by the fullscreen overlay) plus visible meta text. Swap each `.cover`'s placeholder div content for a real `<img>`.
- **About** — bio paragraphs and the portrait block are marked with `PLACEHOLDER` comments.
- **Contact** — wired to lrmoore2023@gmail.com and the real LinkedIn profile.
- **Resume** — replace `public/resume.pdf` (currently a placeholder) with the real document.

## Where things live

| File | Responsibility |
| --- | --- |
| `src/styles/main.css` | design tokens, light/dark themes, all layout |
| `src/js/smooth-scroll.js` | Lenis ↔ ScrollTrigger sync, anchor scrolling |
| `src/js/hero-scene.js` | Three.js point-field behind the hero type |
| `src/js/theme.js` | scroll-driven light/dark inversion (`data-theme` per section) |
| `src/js/reveals.js` | hero intro timeline, scroll reveals, rules, parallax |
| `src/js/wayfinder.js` | fixed section indicator + scroll-progress line |
| `src/js/projects.js` | expand-in-place project overlay (GSAP Flip) |
| `src/js/nav.js` | hide-on-scroll-down navbar |
| `src/js/cursor.js` | custom cursor dot (fine pointers only) |

All motion respects `prefers-reduced-motion`.
