import { useEffect, useRef } from 'react';
import gsap from 'gsap';

interface HydrationProgressRingProps {
  consumedMl: number;
  dailyGoalMl: number;
  selectedCapacityMl?: number;
  interactionSignal?: number;
  size?: number;
  variant?: 'on-primary' | 'surface';
  showTooltipTitle?: boolean;
}

/**
 * Dynamic circular SVG progress indicator displaying the user's daily hydration
 * progress percentage alongside a subtle projected-refill arc for the active
 * bottle configurator capacity.
 */
export function HydrationProgressRing({
  consumedMl,
  dailyGoalMl,
  selectedCapacityMl,
  interactionSignal = 0,
  size = 34,
  variant = 'on-primary',
  showTooltipTitle = true,
}: HydrationProgressRingProps) {
  const wrapRef = useRef<HTMLSpanElement | null>(null);
  const prevSignalRef = useRef<number>(interactionSignal);

  const safeGoal = Math.max(250, dailyGoalMl || 2500);
  const rawPct = Math.round((Math.max(0, consumedMl) / safeGoal) * 100);
  const pct = Math.min(100, Math.max(0, rawPct));
  const projectedPct = selectedCapacityMl
    ? Math.min(100, Math.round(((Math.max(0, consumedMl) + selectedCapacityMl) / safeGoal) * 100))
    : pct;

  // SVG circle geometry (36x36 viewBox)
  const radius = 14.5;
  const circumference = 2 * Math.PI * radius;
  const progressOffset = circumference * (1 - pct / 100);
  const projectedOffset = circumference * (1 - projectedPct / 100);
  const hasRefillPreview = Boolean(selectedCapacityMl && projectedPct > pct);

  // Crisp GSAP pulse on configurator interaction
  useEffect(() => {
    if (interactionSignal === prevSignalRef.current) return;
    prevSignalRef.current = interactionSignal;

    const el = wrapRef.current;
    if (!el || typeof window === 'undefined') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    gsap.killTweensOf(el, 'scale');
    gsap
      .timeline({
        onComplete: () => {
          gsap.set(el, { clearProps: 'transform' });
        },
      })
      .to(el, {
        scale: 1.15,
        duration: 0.14,
        ease: 'power2.out',
      })
      .to(el, {
        scale: 1,
        duration: 0.28,
        ease: 'back.out(2.2)',
      });
  }, [interactionSignal]);

  const titleText = showTooltipTitle
    ? `Daily hydration: ${pct}% (${consumedMl.toLocaleString()} / ${safeGoal.toLocaleString()} ml)${
        hasRefillPreview && selectedCapacityMl
          ? ` · +1 refill (${selectedCapacityMl} ml) reaches ${projectedPct}%`
          : ''
      }`
    : undefined;

  return (
    <span
      ref={wrapRef}
      className={`hydration-ring-wrap hydration-ring--${variant}${
        pct >= 100 ? ' is-complete' : ''
      }`}
      style={{ width: size, height: size }}
      title={titleText}
      aria-label={`Daily hydration progress ${pct} percent`}
    >
      <svg
        className="hydration-ring-svg"
        viewBox="0 0 36 36"
        width={size}
        height={size}
        aria-hidden="true"
      >
        {/* Base track */}
        <circle
          className="hydration-ring-track"
          cx="18"
          cy="18"
          r={radius}
          fill="none"
          strokeWidth="2.8"
        />

        {/* Subtle projected refill arc for currently selected bottle capacity */}
        {hasRefillPreview && (
          <circle
            className="hydration-ring-projected"
            cx="18"
            cy="18"
            r={radius}
            fill="none"
            strokeWidth="2.8"
            strokeDasharray={circumference}
            strokeDashoffset={projectedOffset}
            strokeLinecap="round"
            transform="rotate(-90 18 18)"
          />
        )}

        {/* Active daily hydration progress arc */}
        <circle
          className="hydration-ring-fill"
          cx="18"
          cy="18"
          r={radius}
          fill="none"
          strokeWidth="3"
          strokeDasharray={circumference}
          strokeDashoffset={progressOffset}
          strokeLinecap="round"
          transform="rotate(-90 18 18)"
        />
      </svg>
      <span className="hydration-ring-pct tabular-nums">{pct}%</span>
    </span>
  );
}
