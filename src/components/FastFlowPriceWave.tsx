import { useEffect, useId, useRef } from 'react';

interface FastFlowPriceWaveProps {
  /** Hex accent tint adapted from the active bottle finish */
  accentHex: string;
  /** Incrementing signal fired whenever the user interacts with finish, size, or engraving */
  interactionSignal: number;
  /** Active capacity label used to subtly tune baseline water level */
  sizeLabel: string;
}

const VIEW_W = 420;
const VIEW_H = 68;
const SAMPLES = 36;

function buildWavePath(
  phase: number,
  baselineY: number,
  amp1: number,
  amp2: number,
  freq1: number,
  freq2: number,
  closed: boolean
): string {
  const stepX = VIEW_W / SAMPLES;
  let d = '';

  for (let i = 0; i <= SAMPLES; i++) {
    const x = i * stepX;
    const norm = i / SAMPLES;
    // Soft edge taper keeps wave calm at left/right walls while lively across the center
    const envelope = 0.72 + 0.28 * Math.sin(norm * Math.PI);
    const y =
      baselineY +
      (Math.sin(norm * Math.PI * 2 * freq1 + phase) * amp1 +
        Math.cos(norm * Math.PI * 2 * freq2 - phase * 1.35) * amp2) *
        envelope;

    if (i === 0) {
      d += `M 0 ${y.toFixed(2)}`;
    } else {
      d += ` L ${x.toFixed(1)} ${y.toFixed(2)}`;
    }
  }

  if (closed) {
    d += ` L ${VIEW_W} ${VIEW_H} L 0 ${VIEW_H} Z`;
  }
  return d;
}

/**
 * Frame-synced (rAF) dual-harmonic SVG water-wave backdrop rendered behind
 * the product price in the order configurator. Responds to user interactions
 * with a damped 'Fast-Flow' velocity & amplitude surge, pauses offscreen,
 * and respects prefers-reduced-motion.
 */
export function FastFlowPriceWave({
  accentHex,
  interactionSignal,
  sizeLabel,
}: FastFlowPriceWaveProps) {
  const uid = useId().replace(/:/g, '');
  const svgRef = useRef<SVGSVGElement | null>(null);
  const backWaveRef = useRef<SVGPathElement | null>(null);
  const frontWaveRef = useRef<SVGPathElement | null>(null);
  const crestLineRef = useRef<SVGPathElement | null>(null);

  // Mutable animation physics state (zero React re-renders per frame)
  const physicsRef = useRef({
    phase: 0,
    surge: 0, // 0 = calm laminar flow, 1 = active Fast-Flow surge
    targetLevel: 38,
    currentLevel: 38,
    inView: true,
  });

  // Tune fluid level subtly to reflect selected capacity (750 ml -> 950 ml -> 1.2 L)
  useEffect(() => {
    const lower = sizeLabel.toLowerCase();
    if (lower.includes('1.2')) {
      physicsRef.current.targetLevel = 30;
    } else if (lower.includes('750') || lower.includes('550')) {
      physicsRef.current.targetLevel = 44;
    } else {
      physicsRef.current.targetLevel = 37;
    }
  }, [sizeLabel]);

  // Trigger a smooth Fast-Flow surge impulse whenever the user configures options
  useEffect(() => {
    if (interactionSignal > 0) {
      physicsRef.current.surge = 1;
    }
  }, [interactionSignal]);

  useEffect(() => {
    const svgEl = svgRef.current;
    if (!svgEl) return;

    const reducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    const drawFrame = () => {
      const p = physicsRef.current;
      const ampFront = 2.1 + p.surge * 4.9;
      const ampBack = 1.6 + p.surge * 3.6;

      if (backWaveRef.current) {
        backWaveRef.current.setAttribute(
          'd',
          buildWavePath(
            p.phase * 0.72 + 1.4,
            p.currentLevel - 3,
            ampBack,
            ampBack * 0.45,
            1.6,
            2.9,
            true
          )
        );
      }
      if (frontWaveRef.current) {
        frontWaveRef.current.setAttribute(
          'd',
          buildWavePath(
            p.phase,
            p.currentLevel + 2,
            ampFront,
            ampFront * 0.4,
            2.1,
            3.7,
            true
          )
        );
      }
      if (crestLineRef.current) {
        crestLineRef.current.setAttribute(
          'd',
          buildWavePath(
            p.phase,
            p.currentLevel + 2,
            ampFront,
            ampFront * 0.4,
            2.1,
            3.7,
            false
          )
        );
      }
    };

    if (reducedMotion) {
      drawFrame();
      return;
    }

    let observer: IntersectionObserver | null = null;
    if (typeof IntersectionObserver !== 'undefined') {
      observer = new IntersectionObserver(
        (entries) => {
          physicsRef.current.inView = entries[0]?.isIntersecting ?? true;
        },
        { threshold: 0 }
      );
      observer.observe(svgEl);
    }

    let rafId = 0;
    let lastTime = performance.now();

    const tick = (now: number) => {
      const dt = Math.min(0.05, Math.max(0.001, (now - lastTime) / 1000));
      lastTime = now;

      const p = physicsRef.current;
      if (p.inView) {
        // Exponentially damp surge back to calm laminar state
        p.surge *= Math.exp(-dt * 2.4);
        if (p.surge < 0.004) p.surge = 0;

        // Smoothly interpolate vertical fluid fill level on capacity switch
        p.currentLevel += (p.targetLevel - p.currentLevel) * Math.min(1, dt * 6);

        // Advance phase faster during active Fast-Flow interaction surge
        const angularSpeed = 1.65 + p.surge * 5.2;
        p.phase = (p.phase + dt * angularSpeed) % (Math.PI * 200);

        drawFrame();
      }

      rafId = window.requestAnimationFrame(tick);
    };

    drawFrame();
    rafId = window.requestAnimationFrame(tick);

    return () => {
      if (rafId) window.cancelAnimationFrame(rafId);
      observer?.disconnect();
    };
  }, []);

  const gradFrontId = `ff-wave-front-${uid}`;
  const gradBackId = `ff-wave-back-${uid}`;
  const gradCrestId = `ff-wave-crest-${uid}`;

  return (
    <svg
      ref={svgRef}
      className="order-price-wave-svg"
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      preserveAspectRatio="none"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id={gradBackId} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={accentHex} stopOpacity="0.16" />
          <stop offset="100%" stopColor={accentHex} stopOpacity="0.03" />
        </linearGradient>
        <linearGradient id={gradFrontId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={accentHex} stopOpacity="0.24" />
          <stop offset="55%" stopColor="#38bdf8" stopOpacity="0.16" />
          <stop offset="100%" stopColor={accentHex} stopOpacity="0.06" />
        </linearGradient>
        <linearGradient id={gradCrestId} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={accentHex} stopOpacity="0" />
          <stop offset="30%" stopColor={accentHex} stopOpacity="0.52" />
          <stop offset="70%" stopColor="#38bdf8" stopOpacity="0.48" />
          <stop offset="100%" stopColor={accentHex} stopOpacity="0" />
        </linearGradient>
      </defs>

      <path ref={backWaveRef} fill={`url(#${gradBackId})`} />
      <path ref={frontWaveRef} fill={`url(#${gradFrontId})`} />
      <path
        ref={crestLineRef}
        fill="none"
        stroke={`url(#${gradCrestId})`}
        strokeWidth="1.35"
        strokeLinecap="round"
      />
    </svg>
  );
}
