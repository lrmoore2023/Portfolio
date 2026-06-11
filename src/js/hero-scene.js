import * as THREE from 'three'

// Hero WebGL: a field of ink-colored points displaced by simplex noise and
// repelled by the pointer — a quiet, technical texture behind the typography.
export function initHeroScene(reducedMotion) {
  const canvas = document.querySelector('.hero-canvas')
  if (!canvas) return

  const isTouch = window.matchMedia('(pointer: coarse)').matches

  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, isTouch ? 1.5 : 2))

  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100)
  camera.position.z = 14

  // plane of points sized to fill the camera frustum at z=0;
  // dot spacing is constant in world units so density looks the same on any screen
  const DOTS_PER_UNIT = isTouch ? 5.5 : 8
  let mesh = null

  const uniforms = {
    uTime: { value: 0 },
    uMouse: { value: new THREE.Vector2(999, 999) },
    uMouseStrength: { value: isTouch ? 0 : 1 },
    uColor: { value: new THREE.Color('#141412') },
    uPointSize: { value: (isTouch ? 1.6 : 2.0) * Math.min(window.devicePixelRatio, 2) },
  }

  const material = new THREE.ShaderMaterial({
    uniforms,
    transparent: true,
    depthWrite: false,
    vertexShader: /* glsl */ `
      uniform float uTime;
      uniform vec2 uMouse;
      uniform float uMouseStrength;
      uniform float uPointSize;
      varying float vAlpha;

      // simplex-ish value noise, cheap and good enough for ambience
      vec2 hash(vec2 p) {
        p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
        return -1.0 + 2.0 * fract(sin(p) * 43758.5453123);
      }
      float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(
          mix(dot(hash(i + vec2(0.0, 0.0)), f - vec2(0.0, 0.0)),
              dot(hash(i + vec2(1.0, 0.0)), f - vec2(1.0, 0.0)), u.x),
          mix(dot(hash(i + vec2(0.0, 1.0)), f - vec2(0.0, 1.0)),
              dot(hash(i + vec2(1.0, 1.0)), f - vec2(1.0, 1.0)), u.x),
          u.y);
      }

      void main() {
        vec3 pos = position;

        float n = noise(pos.xy * 0.32 + uTime * 0.12);
        float n2 = noise(pos.xy * 0.9 - uTime * 0.07);
        pos.z += n * 1.4 + n2 * 0.5;

        // pointer repulsion
        float d = distance(pos.xy, uMouse);
        float push = exp(-d * d * 0.22) * uMouseStrength;
        pos.z += push * 2.4;

        vec4 mv = modelViewMatrix * vec4(pos, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = uPointSize * (1.0 + pos.z * 0.22);

        vAlpha = 0.16 + (pos.z + 1.9) * 0.14 + push * 0.45;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      varying float vAlpha;
      void main() {
        vec2 uv = gl_PointCoord - 0.5;
        if (dot(uv, uv) > 0.25) discard;
        gl_FragColor = vec4(uColor, clamp(vAlpha, 0.0, 0.85));
      }
    `,
  })

  function buildField() {
    if (mesh) {
      mesh.geometry.dispose()
      scene.remove(mesh)
    }
    const dist = camera.position.z
    const h = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * dist
    const w = h * camera.aspect
    const segX = Math.min(180, Math.round(w * 1.15 * DOTS_PER_UNIT))
    const segY = Math.min(180, Math.round(h * 1.15 * DOTS_PER_UNIT))
    const geo = new THREE.PlaneGeometry(w * 1.15, h * 1.15, segX, segY)
    mesh = new THREE.Points(geo, material)
    scene.add(mesh)
  }

  function resize() {
    const { clientWidth: w, clientHeight: h } = canvas.parentElement
    renderer.setSize(w, h, false)
    camera.aspect = w / h
    camera.updateProjectionMatrix()
    buildField()
  }
  resize()
  window.addEventListener('resize', resize)

  // pointer in world coords at z=0, lerped for weight
  const target = new THREE.Vector2(999, 999)
  if (!isTouch) {
    window.addEventListener('pointermove', (e) => {
      const rect = canvas.getBoundingClientRect()
      if (e.clientY > rect.bottom) return
      const x = (e.clientX / rect.width) * 2 - 1
      const y = -((e.clientY - rect.top) / rect.height) * 2 + 1
      const dist = camera.position.z
      const fh = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * dist
      target.set((x * fh * camera.aspect) / 2, (y * fh) / 2)
    })
  }

  const clock = new THREE.Clock()
  let running = true

  function frame() {
    uniforms.uTime.value = clock.getElapsedTime()
    uniforms.uMouse.value.lerp(target, 0.07)
    renderer.render(scene, camera)
  }

  if (reducedMotion) {
    // single static frame, no animation loop
    uniforms.uTime.value = 4
    renderer.render(scene, camera)
    return
  }

  renderer.setAnimationLoop(() => { if (running) frame() })

  // pause when the hero is offscreen (rAF already pauses on hidden tabs)
  const io = new IntersectionObserver(([entry]) => { running = entry.isIntersecting })
  io.observe(canvas)
}
