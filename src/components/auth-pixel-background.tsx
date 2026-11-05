'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { Pause, Play } from 'lucide-react';
import { useAutomaticMotion } from './automatic-motion';

const vertexShader = `
  out vec2 fragCoord;
  uniform vec2 u_resolution;
  void main() {
    gl_Position = vec4(position.xy, 0.0, 1.0);
    fragCoord = (position.xy + 1.0) * 0.5 * u_resolution;
  }
`;

// Adapted from the supplied dot-field shader with continuous waves between cells.
const fragmentShader = `
  precision highp float;
  in vec2 fragCoord;
  out vec4 fragColor;
  uniform float u_time;
  uniform vec2 u_resolution;
  uniform vec3 u_colors[3];
  uniform vec3 u_background;
  uniform float u_ratio;
  float random(vec2 p) {
    return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
  }
  void main() {
    float spacing = 18.0 * u_ratio;
    vec2 cell = floor(fragCoord / spacing);
    vec2 local = fract(fragCoord / spacing);
    float seed = random(cell);
    float distanceFromCenter = distance(cell, u_resolution / spacing * 0.5);
    float wave = 0.5 + 0.5 * sin(distanceFromCenter * 0.24 - u_time * 1.05);
    float drift = 0.5 + 0.5 * sin(cell.x * 0.12 + cell.y * 0.16 - u_time * 0.65);
    float flow = wave * drift;
    float size = mix(0.10, 0.56, flow) * mix(0.5, 1.0, seed);
    vec2 square = abs(local - 0.5);
    float dotMask = (1.0 - step(size * 0.5, square.x)) * (1.0 - step(size * 0.5, square.y));
    vec3 gradient = mix(u_colors[1], u_colors[2], drift);
    vec3 color = mix(u_colors[0], gradient, smoothstep(0.1, 0.85, flow));
    vec3 backdrop = mix(u_background, gradient, flow * 0.065);
    fragColor = vec4(mix(backdrop, color, dotMask * mix(0.25, 0.85, flow)), 1.0);
  }
`;

export function AuthPixelBackground() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const syncMotion = useRef<(() => void) | null>(null);
  const motion = useRef({ allowed: false, paused: true });
  const pathname = usePathname();
  const { allowed, paused } = useAutomaticMotion();

  useEffect(() => {
    motion.current = { allowed, paused };
    syncMotion.current?.();
  }, [allowed, paused]);

  useEffect(() => {
    const element = canvas.current;
    if (!element) return;
    let active = true;
    let dispose: (() => void) | undefined;
    void import('three').then(THREE => {
      if (!active) return;
      let renderer: InstanceType<typeof THREE.WebGLRenderer>;
      try {
        renderer = new THREE.WebGLRenderer({ canvas: element, alpha: true, antialias: false });
      } catch {
        element.dataset.renderer = 'fallback';
        return;
      }
      const signup = pathname === '/sign-up';
      const uniforms = {
        u_time: { value: 0 },
        u_resolution: { value: new THREE.Vector2() },
        u_ratio: { value: 1 },
        u_background: { value: new THREE.Color() },
        u_colors: { value: (signup ? ['#ffffff', '#f447a3', '#b49aff'] : ['#ffffff', '#527cff', '#ffe15a']).map(color => new THREE.Color(color)) },
      };
      const material = new THREE.ShaderMaterial({ vertexShader, fragmentShader, uniforms, glslVersion: THREE.GLSL3, transparent: true, depthTest: false, depthWrite: false });
      const geometry = new THREE.PlaneGeometry(2, 2);
      const scene = new THREE.Scene();
      scene.add(new THREE.Mesh(geometry, material));
      const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
      let frame = 0;
      let previousTime = performance.now();
      let renderedTime = 0;

      function draw() {
        renderer.render(scene, camera);
        element!.dataset.renderer = 'webgl';
        element!.dataset.drawn = 'true';
      }
      function resize() {
        const bounds = element!.getBoundingClientRect();
        const ratio = Math.min(window.devicePixelRatio || 1, 1.5);
        renderer.setPixelRatio(ratio);
        renderer.setSize(bounds.width, bounds.height, false);
        uniforms.u_ratio.value = ratio;
        renderer.getDrawingBufferSize(uniforms.u_resolution.value);
        draw();
      }
      function updateTheme() {
        uniforms.u_background.value.set(getComputedStyle(element!.parentElement!).backgroundColor);
        draw();
      }
      function animate(time: number) {
        frame = 0;
        uniforms.u_time.value += Math.min(time - previousTime, 100) / 1000;
        previousTime = time;
        if (time - renderedTime >= 1000 / 30) {
          draw();
          renderedTime = time;
        }
        frame = requestAnimationFrame(animate);
      }
      function sync() {
        cancelAnimationFrame(frame);
        frame = 0;
        if (active && motion.current.allowed && !motion.current.paused && !document.hidden) {
          previousTime = performance.now();
          frame = requestAnimationFrame(animate);
        }
      }
      const observer = new ResizeObserver(resize);
      const themeObserver = new MutationObserver(updateTheme);
      const themePreference = window.matchMedia('(prefers-color-scheme: dark)');
      dispose = () => {
        cancelAnimationFrame(frame);
        observer.disconnect();
        themeObserver.disconnect();
        themePreference.removeEventListener('change', updateTheme);
        document.removeEventListener('visibilitychange', sync);
        syncMotion.current = null;
        geometry.dispose();
        material.dispose();
        renderer.dispose();
      };
      observer.observe(element);
      themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
      themePreference.addEventListener('change', updateTheme);
      document.addEventListener('visibilitychange', sync);
      syncMotion.current = sync;
      resize();
      updateTheme();
      sync();
    }).catch(() => {
      dispose?.();
      dispose = undefined;
      if (active) element.dataset.renderer = 'fallback';
    });
    return () => { active = false; dispose?.(); };
  }, [pathname]);

  return <canvas ref={canvas} id="auth-pixel-background" className="auth-pixel-background" aria-hidden="true" />;
}

export function AuthPixelMotionControl() {
  const { ready, allowed, paused, toggle } = useAutomaticMotion();
  if (!ready || !allowed) return null;
  return <button type="button" className="auth-pixel-motion" onClick={toggle} aria-controls="auth-pixel-background" aria-label={paused ? 'Resume background motion' : 'Pause background motion'} title={paused ? 'Resume background motion' : 'Pause background motion'}>
    {paused ? <Play size={17} aria-hidden="true" /> : <Pause size={17} aria-hidden="true" />}
  </button>;
}
