import { useEffect, useRef } from 'react';
import type { Daypart } from '../utils/circadianTheme';

interface AmbientCursorGlowProps {
  daypart: Daypart;
}

const INTERACTIVE_SELECTOR =
  'a, button, [role="button"], input, select, .product-card, .bento-tile, .ritual-bundle-card';

/**
 * Subtle, compositor-only radial gradient glow that follows fine desktop
 * pointers with silky inertia across the landing page. Colors derive directly
 * from the active circadian theme palette (Morning Soft Amber, Midday Glacial
 * Azure, Evening Deep Indigo) via CSS custom properties.
 *
 * Automatically disables on touch-only devices and when prefers-reduced-motion
 * is active, and pauses its rAF loop at rest for zero idle CPU/GPU overhead.
 */
export function AmbientCursorGlow({ daypart }: AmbientCursorGlowProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const orbRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const finePointer = window.matchMedia('(pointer: fine)');
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (!finePointer.matches || reducedMotion.matches) return;

    const host = hostRef.current;
    const orb = orbRef.current;
    if (!host || !orb) return;

    let targetX = window.innerWidth * 0.5;
    let targetY = window.innerHeight * 0.35;
    let currentX = targetX;
    let currentY = targetY;
    let currentScale = 1;
    let targetScale = 1;
    let visible = false;
    let rafId: number | null = null;

    const applyTransform = () => {
      orb.style.transform = `translate3d(${currentX.toFixed(1)}px, ${currentY.toFixed(1)}px, 0) translate(-50%, -50%) scale(${currentScale.toFixed(3)})`;
    };

    const tick = () => {
      rafId = null;
      const dx = targetX - currentX;
      const dy = targetY - currentY;
      const ds = targetScale - currentScale;

      currentX += dx * 0.13;
      currentY += dy * 0.13;
      currentScale += ds * 0.12;
      applyTransform();

      if (Math.abs(dx) > 0.35 || Math.abs(dy) > 0.35 || Math.abs(ds) > 0.004) {
        rafId = window.requestAnimationFrame(tick);
      }
    };

    const scheduleTick = () => {
      if (rafId === null) {
        rafId = window.requestAnimationFrame(tick);
      }
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (e.pointerType && e.pointerType !== 'mouse' && e.pointerType !== 'pen') {
        return;
      }
      targetX = e.clientX;
      targetY = e.clientY;

      if (!visible) {
        currentX = targetX;
        currentY = targetY;
        visible = true;
        applyTransform();
        host.classList.add('is-visible');
      }

      const targetEl = e.target as Element | null;
      const overInteractive = Boolean(targetEl?.closest(INTERACTIVE_SELECTOR));
      targetScale = overInteractive ? 1.08 : 1;
      host.classList.toggle('is-interactive', overInteractive);

      scheduleTick();
    };

    const handleHide = () => {
      if (!visible) return;
      visible = false;
      host.classList.remove('is-visible', 'is-interactive');
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    document.addEventListener('pointerleave', handleHide);
    window.addEventListener('blur', handleHide);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('pointerleave', handleHide);
      window.removeEventListener('blur', handleHide);
      if (rafId !== null) window.cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <div
      ref={hostRef}
      className="ambient-cursor-glow"
      data-daypart={daypart}
      aria-hidden="true"
    >
      <div ref={orbRef} className="ambient-cursor-orb" />
    </div>
  );
}
