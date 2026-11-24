import { useEffect, useId, useMemo, useState } from 'react';
import { Award, CheckCircle2, Droplets, Flame, Lock, Sparkles } from 'lucide-react';
import type { HydrationMilestoneStats } from '../types/profile';
import {
  evaluateMilestones,
  type EvaluatedMilestone,
  type MilestoneBadgeId,
} from '../utils/hydrationMilestones';

interface MilestoneBadgesPanelProps {
  stats: HydrationMilestoneStats;
  recentlyUnlockedIds?: MilestoneBadgeId[];
  onLogWater: (label: string, ml: number) => void;
  onDismissCelebration?: () => void;
}

interface MedalPalette {
  rimStart: string;
  rimMid: string;
  rimEnd: string;
  coreStart: string;
  coreEnd: string;
  glow: string;
  accent: string;
  waveA: string;
  waveB: string;
}

const MEDAL_PALETTES: Record<MilestoneBadgeId, MedalPalette> = {
  'first-liter': {
    rimStart: '#f5cfa0',
    rimMid: '#c98849',
    rimEnd: '#7d4b20',
    coreStart: '#0e3c52',
    coreEnd: '#061f2d',
    glow: '#38bdf8',
    accent: '#7dd3fc',
    waveA: '#38bdf8',
    waveB: '#0284c7',
  },
  'three-day-streak': {
    rimStart: '#f8fafc',
    rimMid: '#94a3b8',
    rimEnd: '#475569',
    coreStart: '#102a44',
    coreEnd: '#091727',
    glow: '#60a5fa',
    accent: '#bae6fd',
    waveA: '#60a5fa',
    waveB: '#2563eb',
  },
  'seven-day-streak': {
    rimStart: '#fef3c7',
    rimMid: '#f59e0b',
    rimEnd: '#b45309',
    coreStart: '#3d2207',
    coreEnd: '#1c0f03',
    glow: '#fbbf24',
    accent: '#fde68a',
    waveA: '#fbbf24',
    waveB: '#ea580c',
  },
  'ten-liters': {
    rimStart: '#dbeafe',
    rimMid: '#38bdf8',
    rimEnd: '#0369a1',
    coreStart: '#082f49',
    coreEnd: '#041628',
    glow: '#0ea5e9',
    accent: '#7dd3fc',
    waveA: '#38bdf8',
    waveB: '#0284c7',
  },
  'daily-summit': {
    rimStart: '#fce7f3',
    rimMid: '#e495a6',
    rimEnd: '#9d4d63',
    coreStart: '#391524',
    coreEnd: '#1b0911',
    glow: '#f472b6',
    accent: '#fbcfe8',
    waveA: '#f472b6',
    waveB: '#db2777',
  },
  'twenty-five-liters': {
    rimStart: '#e0e7ff',
    rimMid: '#818cf8',
    rimEnd: '#4338ca',
    coreStart: '#161442',
    coreEnd: '#090922',
    glow: '#a5b4fc',
    accent: '#c7d2fe',
    waveA: '#818cf8',
    waveB: '#6366f1',
  },
};

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState<boolean>(() =>
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  return reduced;
}

function MilestoneMedalSvg({
  badgeId,
  unlocked,
  progressPct,
  size = 64,
  reducedMotion = false,
}: {
  badgeId: MilestoneBadgeId;
  unlocked: boolean;
  progressPct: number;
  size?: number;
  reducedMotion?: boolean;
}) {
  const uid = useId().replace(/:/g, '');
  const p = MEDAL_PALETTES[badgeId];
  const radius = 44;
  const circumference = 2 * Math.PI * radius;
  const clampedPct = Math.max(0, Math.min(100, progressPct));
  const dashOffset = circumference * (1 - clampedPct / 100);
  const animateSvg = !reducedMotion;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={`medal-svg${unlocked ? ' is-unlocked' : ' is-locked'}`}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={`rim-${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={p.rimStart} />
          <stop offset="52%" stopColor={p.rimMid} />
          <stop offset="100%" stopColor={p.rimEnd} />
        </linearGradient>

        <radialGradient id={`core-${uid}`} cx="38%" cy="32%" r="72%">
          <stop offset="0%" stopColor={p.coreStart} />
          <stop offset="100%" stopColor={p.coreEnd} />
        </radialGradient>

        <linearGradient id={`sheen-${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0" />
          <stop offset="45%" stopColor="#ffffff" stopOpacity="0.48" />
          <stop offset="55%" stopColor="#ffffff" stopOpacity="0.12" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>

        <clipPath id={`clip-${uid}`}>
          <circle cx="50" cy="50" r="35" />
        </clipPath>
      </defs>

      {unlocked ? (
        <>
          {/* Outer breathing halo ring */}
          <circle
            cx="50"
            cy="50"
            r="46"
            fill="none"
            stroke={p.glow}
            strokeWidth="1.4"
            strokeOpacity="0.32"
          >
            {animateSvg && (
              <>
                <animate
                  attributeName="r"
                  values="44.5;47.5;44.5"
                  dur="3.6s"
                  repeatCount="indefinite"
                />
                <animate
                  attributeName="stroke-opacity"
                  values="0.18;0.52;0.18"
                  dur="3.6s"
                  repeatCount="indefinite"
                />
              </>
            )}
          </circle>

          {/* Sculpted metallic bezel */}
          <circle
            cx="50"
            cy="50"
            r="41"
            fill={`url(#rim-${uid})`}
            stroke="rgba(255,255,255,0.42)"
            strokeWidth="1"
          />

          {/* Engraved tick marks around bezel */}
          <circle
            cx="50"
            cy="50"
            r="38"
            fill="none"
            stroke="rgba(255,255,255,0.28)"
            strokeWidth="1"
            strokeDasharray="2 5"
          />

          {/* Medallion inner core */}
          <circle cx="50" cy="50" r="35" fill={`url(#core-${uid})`} />

          {/* Badge-specific live animated emblem */}
          <g clipPath={`url(#clip-${uid})`}>
            {badgeId === 'first-liter' && (
              <g>
                {/* Concentric ripple rings */}
                <circle
                  cx="50"
                  cy="54"
                  r="14"
                  fill="none"
                  stroke={p.accent}
                  strokeWidth="1.2"
                  strokeOpacity="0.45"
                >
                  <animate
                    attributeName="r"
                    values="12;27;12"
                    dur="3.4s"
                    repeatCount="indefinite"
                  />
                  <animate
                    attributeName="stroke-opacity"
                    values="0.55;0;0.55"
                    dur="3.4s"
                    repeatCount="indefinite"
                  />
                </circle>
                {/* Pure hydro droplet */}
                <path
                  d="M50 25 C50 25 36 44 36 55 C36 63 42.3 69 50 69 C57.7 69 64 63 64 55 C64 44 50 25 50 25 Z"
                  fill={p.waveA}
                  fillOpacity="0.92"
                />
                <path
                  d="M44 52 C43 56 44.5 60.5 48 62.5"
                  fill="none"
                  stroke="#ffffff"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeOpacity="0.82"
                />
                <text
                  x="50"
                  y="58"
                  textAnchor="middle"
                  fill="#041826"
                  fontSize="11.5"
                  fontWeight="800"
                  fontFamily="Inter, system-ui, sans-serif"
                >
                  1L
                </text>
              </g>
            )}

            {badgeId === 'three-day-streak' && (
              <g>
                {/* Flowing triple wave ribbon */}
                <path
                  d="M-20 58 Q-5 50 10 58 T40 58 T70 58 T100 58 T130 58 L130 90 L-20 90 Z"
                  fill={p.waveB}
                  fillOpacity="0.55"
                >
                  <animateTransform
                    attributeName="transform"
                    type="translate"
                    from="0 0"
                    to="-30 0"
                    dur="4.2s"
                    repeatCount="indefinite"
                  />
                </path>
                <path
                  d="M-20 63 Q-5 56 10 63 T40 63 T70 63 T100 63 T130 63 L130 90 L-20 90 Z"
                  fill={p.waveA}
                  fillOpacity="0.72"
                >
                  <animateTransform
                    attributeName="transform"
                    type="translate"
                    from="-30 0"
                    to="0 0"
                    dur="3.1s"
                    repeatCount="indefinite"
                  />
                </path>
                {/* 3 Streak Nodes */}
                {[36, 50, 64].map((cx, i) => (
                  <circle key={cx} cx={cx} cy="34" r="3.4" fill={p.accent}>
                    <animate
                      attributeName="opacity"
                      values="0.45;1;0.45"
                      dur="2.2s"
                      begin={`${i * 0.35}s`}
                      repeatCount="indefinite"
                    />
                  </circle>
                ))}
                <text
                  x="50"
                  y="56"
                  textAnchor="middle"
                  fill="#ffffff"
                  fontSize="16"
                  fontWeight="800"
                  fontFamily="Inter, system-ui, sans-serif"
                >
                  3D
                </text>
              </g>
            )}

            {badgeId === 'seven-day-streak' && (
              <g>
                {/* Rotating solar rays halo */}
                <g transform="translate(50,50)">
                  <g>
                    <animateTransform
                      attributeName="transform"
                      type="rotate"
                      from="0"
                      to="360"
                      dur="18s"
                      repeatCount="indefinite"
                    />
                    {Array.from({ length: 12 }).map((_, i) => (
                      <line
                        key={i}
                        x1="0"
                        y1="-25"
                        x2="0"
                        y2="-31"
                        stroke={p.accent}
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeOpacity="0.72"
                        transform={`rotate(${i * 30})`}
                      />
                    ))}
                  </g>
                </g>
                {/* Rising micro-sparks */}
                <circle cx="34" cy="64" r="1.8" fill={p.accent}>
                  <animate
                    attributeName="cy"
                    values="68;30;68"
                    dur="3.6s"
                    repeatCount="indefinite"
                  />
                  <animate
                    attributeName="opacity"
                    values="0;0.9;0"
                    dur="3.6s"
                    repeatCount="indefinite"
                  />
                </circle>
                <circle cx="67" cy="60" r="1.6" fill={p.rimStart}>
                  <animate
                    attributeName="cy"
                    values="70;28;70"
                    dur="4.1s"
                    begin="0.9s"
                    repeatCount="indefinite"
                  />
                  <animate
                    attributeName="opacity"
                    values="0;0.85;0"
                    dur="4.1s"
                    begin="0.9s"
                    repeatCount="indefinite"
                  />
                </circle>
                {/* Central 7-day solar crown numeral */}
                <text
                  x="50"
                  y="54"
                  textAnchor="middle"
                  fill={p.rimStart}
                  fontSize="21"
                  fontWeight="800"
                  fontFamily="Inter, system-ui, sans-serif"
                >
                  7D
                </text>
                <text
                  x="50"
                  y="66"
                  textAnchor="middle"
                  fill={p.accent}
                  fontSize="7.2"
                  fontWeight="700"
                  letterSpacing="1.2"
                  fontFamily="Inter, system-ui, sans-serif"
                >
                  STREAK
                </text>
              </g>
            )}

            {badgeId === 'ten-liters' && (
              <g>
                {/* Live undulating sapphire liquid chamber */}
                <path
                  d="M-24 52 Q-9 44 6 52 T36 52 T66 52 T96 52 T126 52 L126 92 L-24 92 Z"
                  fill={p.waveB}
                  fillOpacity="0.65"
                >
                  <animateTransform
                    attributeName="transform"
                    type="translate"
                    from="0 0"
                    to="-30 0"
                    dur="3.4s"
                    repeatCount="indefinite"
                  />
                </path>
                <path
                  d="M-24 56 Q-9 49 6 56 T36 56 T66 56 T96 56 T126 56 L126 92 L-24 92 Z"
                  fill={p.waveA}
                  fillOpacity="0.82"
                >
                  <animateTransform
                    attributeName="transform"
                    type="translate"
                    from="-30 0"
                    to="0 0"
                    dur="2.6s"
                    repeatCount="indefinite"
                  />
                </path>
                {/* Rising micro-bubbles inside the 10L chamber */}
                <circle cx="38" cy="70" r="2" fill="#e0f2fe" fillOpacity="0.85">
                  <animate
                    attributeName="cy"
                    values="74;40;74"
                    dur="3.2s"
                    repeatCount="indefinite"
                  />
                  <animate
                    attributeName="opacity"
                    values="0;0.9;0"
                    dur="3.2s"
                    repeatCount="indefinite"
                  />
                </circle>
                <circle cx="62" cy="72" r="1.6" fill="#ffffff" fillOpacity="0.8">
                  <animate
                    attributeName="cy"
                    values="76;36;76"
                    dur="2.8s"
                    begin="1.1s"
                    repeatCount="indefinite"
                  />
                  <animate
                    attributeName="opacity"
                    values="0;0.85;0"
                    dur="2.8s"
                    begin="1.1s"
                    repeatCount="indefinite"
                  />
                </circle>
                <text
                  x="50"
                  y="51"
                  textAnchor="middle"
                  fill="#ffffff"
                  fontSize="19"
                  fontWeight="800"
                  fontFamily="Inter, system-ui, sans-serif"
                >
                  10L
                </text>
                <text
                  x="50"
                  y="65"
                  textAnchor="middle"
                  fill="#e0f2fe"
                  fontSize="7"
                  fontWeight="700"
                  letterSpacing="1.3"
                  fontFamily="Inter, system-ui, sans-serif"
                >
                  TOTAL
                </text>
              </g>
            )}

            {badgeId === 'daily-summit' && (
              <g>
                {/* Alpine twin peak silhouette */}
                <path
                  d="M16 74 L41 38 L53 54 L63 42 L84 74 Z"
                  fill={p.waveB}
                  fillOpacity="0.65"
                />
                <path
                  d="M24 74 L41 46 L52 60 L63 47 L78 74 Z"
                  fill={p.waveA}
                  fillOpacity="0.82"
                />
                {/* Summit beacon star */}
                <circle cx="41" cy="34" r="3" fill={p.rimStart}>
                  <animate
                    attributeName="r"
                    values="2.2;4.2;2.2"
                    dur="2.4s"
                    repeatCount="indefinite"
                  />
                  <animate
                    attributeName="opacity"
                    values="0.55;1;0.55"
                    dur="2.4s"
                    repeatCount="indefinite"
                  />
                </circle>
                <text
                  x="50"
                  y="69"
                  textAnchor="middle"
                  fill="#ffffff"
                  fontSize="9.5"
                  fontWeight="800"
                  letterSpacing="0.8"
                  fontFamily="Inter, system-ui, sans-serif"
                >
                  100%
                </text>
              </g>
            )}

            {badgeId === 'twenty-five-liters' && (
              <g>
                {/* Rotating prismatic hexagonal ring */}
                <g transform="translate(50,50)">
                  <polygon
                    points="0,-29 25,-14.5 25,14.5 0,29 -25,14.5 -25,-14.5"
                    fill="none"
                    stroke={p.accent}
                    strokeWidth="1.6"
                    strokeOpacity="0.65"
                  >
                    <animateTransform
                      attributeName="transform"
                      type="rotate"
                      from="0"
                      to="360"
                      dur="22s"
                      repeatCount="indefinite"
                    />
                  </polygon>
                  <polygon
                    points="0,-22 19,-11 19,11 0,22 -19,11 -19,-11"
                    fill="none"
                    stroke={p.glow}
                    strokeWidth="1.2"
                    strokeOpacity="0.45"
                  >
                    <animateTransform
                      attributeName="transform"
                      type="rotate"
                      from="360"
                      to="0"
                      dur="16s"
                      repeatCount="indefinite"
                    />
                  </polygon>
                </g>
                <text
                  x="50"
                  y="54"
                  textAnchor="middle"
                  fill="#ffffff"
                  fontSize="17"
                  fontWeight="800"
                  fontFamily="Inter, system-ui, sans-serif"
                >
                  25L
                </text>
                <text
                  x="50"
                  y="66"
                  textAnchor="middle"
                  fill={p.accent}
                  fontSize="6.8"
                  fontWeight="700"
                  letterSpacing="1.2"
                  fontFamily="Inter, system-ui, sans-serif"
                >
                  GLACIER
                </text>
              </g>
            )}

            {/* Animated metallic light-sheen sweep across the medallion */}
            {animateSvg && (
              <rect
                x="-50"
                y="10"
                width="34"
                height="80"
                fill={`url(#sheen-${uid})`}
                transform="skewX(-22)"
              >
                <animate
                  attributeName="x"
                  values="-50;135;-50"
                  keyTimes="0;0.34;1"
                  dur="5.2s"
                  repeatCount="indefinite"
                />
              </rect>
            )}
          </g>
        </>
      ) : (
        <>
          {/* Locked etched medallion + live radial progress ring */}
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeOpacity="0.14"
            strokeWidth="3.5"
          />
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke={p.rimMid}
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            transform="rotate(-90 50 50)"
            style={{ transition: 'stroke-dashoffset 520ms cubic-bezier(0.22, 1, 0.36, 1)' }}
          />
          <circle
            cx="50"
            cy="50"
            r="36"
            fill="currentColor"
            fillOpacity="0.06"
            stroke="currentColor"
            strokeOpacity="0.16"
            strokeWidth="1.2"
            strokeDasharray="3 3"
          />
          <text
            x="50"
            y="49"
            textAnchor="middle"
            fill="currentColor"
            fillOpacity="0.58"
            fontSize="14.5"
            fontWeight="700"
            fontFamily="Inter, system-ui, sans-serif"
          >
            {badgeId === 'first-liter'
              ? '1L'
              : badgeId === 'three-day-streak'
                ? '3D'
                : badgeId === 'seven-day-streak'
                  ? '7D'
                  : badgeId === 'ten-liters'
                    ? '10L'
                    : badgeId === 'daily-summit'
                      ? '100%'
                      : '25L'}
          </text>
          <text
            x="50"
            y="63"
            textAnchor="middle"
            fill="currentColor"
            fillOpacity="0.45"
            fontSize="8.5"
            fontWeight="600"
            fontFamily="Inter, system-ui, sans-serif"
          >
            {clampedPct}%
          </text>
        </>
      )}
    </svg>
  );
}

export function MilestoneBadgesPanel({
  stats,
  recentlyUnlockedIds = [],
  onLogWater,
  onDismissCelebration,
}: MilestoneBadgesPanelProps) {
  const reducedMotion = usePrefersReducedMotion();
  const evaluated = useMemo(() => evaluateMilestones(stats), [stats]);
  const unlockedCount = useMemo(
    () => evaluated.filter((item) => item.unlocked).length,
    [evaluated]
  );

  // Default selection: highlight the closest locked goal (e.g., 10 Liters Total or 7-Day Streak)
  // or the most recently unlocked badge
  const [selectedId, setSelectedId] = useState<MilestoneBadgeId>('ten-liters');

  useEffect(() => {
    if (recentlyUnlockedIds.length > 0) {
      setSelectedId(recentlyUnlockedIds[recentlyUnlockedIds.length - 1]);
    }
  }, [recentlyUnlockedIds]);

  const selectedMilestone: EvaluatedMilestone =
    evaluated.find((m) => m.badge.id === selectedId) ?? evaluated[0];

  const newlyUnlockedLabels = useMemo(
    () =>
      recentlyUnlockedIds
        .map((id) => evaluated.find((m) => m.badge.id === id)?.badge.title)
        .filter((v): v is string => Boolean(v)),
    [recentlyUnlockedIds, evaluated]
  );

  const totalLitersFormatted = (stats.totalMlAllTime / 1000).toFixed(1);

  return (
    <section
      className="profile-card milestones-card"
      aria-labelledby="milestones-heading"
    >
      <div className="profile-card-head milestones-head">
        <div>
          <div className="milestones-title-row">
            <Award size={16} className="milestones-head-icon" aria-hidden="true" />
            <h3 id="milestones-heading">Hydration Milestones</h3>
          </div>
          <p className="profile-muted">
            Unlock animated metallic medals as you build cumulative volume & streaks.
          </p>
        </div>
        <span className="milestones-count-pill tabular-nums">
          {unlockedCount} / {evaluated.length}
        </span>
      </div>

      {/* Cumulative Telemetry Strip */}
      <div className="milestones-telemetry-row tabular-nums">
        <div className="milestones-telemetry-chip">
          <Droplets size={13} aria-hidden="true" />
          <span>{totalLitersFormatted} L Total</span>
        </div>
        <div className="milestones-telemetry-chip">
          <Flame size={13} aria-hidden="true" />
          <span>{stats.currentStreakDays}-Day Streak</span>
        </div>
        <div className="milestones-telemetry-chip">
          <Sparkles size={13} aria-hidden="true" />
          <span>Best {stats.bestStreakDays}d</span>
        </div>
      </div>

      {/* Live Unlock Celebration Banner */}
      {newlyUnlockedLabels.length > 0 && (
        <div className="milestone-unlock-banner" role="status" aria-live="polite">
          <div className="milestone-unlock-banner-copy">
            <Sparkles size={15} aria-hidden="true" />
            <span>
              <strong>Medal Unlocked:</strong> {newlyUnlockedLabels.join(' & ')}
            </span>
          </div>
          {onDismissCelebration && (
            <button
              type="button"
              className="milestone-banner-dismiss"
              onClick={onDismissCelebration}
              aria-label="Dismiss milestone celebration"
            >
              ×
            </button>
          )}
        </div>
      )}

      {/* 3x2 Interactive Animated SVG Medal Grid */}
      <div
        className="milestone-grid"
        role="listbox"
        aria-label="Hydration milestone medals"
      >
        {evaluated.map((item) => {
          const isSelected = item.badge.id === selectedMilestone.badge.id;
          const isJustUnlocked = recentlyUnlockedIds.includes(item.badge.id);
          return (
            <button
              key={item.badge.id}
              type="button"
              role="option"
              aria-selected={isSelected}
              className={`milestone-tile${item.unlocked ? ' is-unlocked' : ' is-locked'}${
                isSelected ? ' is-selected' : ''
              }${isJustUnlocked ? ' is-just-unlocked' : ''}`}
              onClick={() => setSelectedId(item.badge.id)}
            >
              <span className="milestone-medal-stage">
                <MilestoneMedalSvg
                  badgeId={item.badge.id}
                  unlocked={item.unlocked}
                  progressPct={item.progressPct}
                  size={60}
                  reducedMotion={reducedMotion}
                />
                {!item.unlocked && (
                  <span className="milestone-lock-pin" aria-hidden="true">
                    <Lock size={10} />
                  </span>
                )}
              </span>
              <span className="milestone-tile-title">{item.badge.shortTitle}</span>
              <span className="milestone-tile-status tabular-nums">
                {item.unlocked ? 'Earned' : `${item.progressPct}%`}
              </span>
            </button>
          );
        })}
      </div>

      {/* Selected Medal Precision Inspector */}
      <div className="milestone-inspector">
        <div className="milestone-inspector-medal">
          <MilestoneMedalSvg
            badgeId={selectedMilestone.badge.id}
            unlocked={selectedMilestone.unlocked}
            progressPct={selectedMilestone.progressPct}
            size={74}
            reducedMotion={reducedMotion}
          />
        </div>

        <div className="milestone-inspector-body">
          <div className="milestone-inspector-top">
            <span className="milestone-tier-tag">
              {selectedMilestone.badge.tierLabel}
            </span>
            {selectedMilestone.unlocked ? (
              <span className="milestone-earned-pill">
                <CheckCircle2 size={12} aria-hidden="true" />
                Unlocked
              </span>
            ) : (
              <span className="milestone-pending-pill tabular-nums">
                {selectedMilestone.progressPct}% complete
              </span>
            )}
          </div>

          <h4 className="milestone-inspector-title">
            {selectedMilestone.badge.title}
          </h4>
          <p className="milestone-inspector-desc">
            {selectedMilestone.badge.description}
          </p>

          <div className="milestone-progress-wrap">
            <div className="milestone-progress-bar" aria-hidden="true">
              <div
                className={`milestone-progress-fill${
                  selectedMilestone.unlocked ? ' is-complete' : ''
                }`}
                style={{ width: `${selectedMilestone.progressPct}%` }}
              />
            </div>
            <div className="milestone-progress-meta tabular-nums">
              <span>
                {selectedMilestone.currentDisplay} / {selectedMilestone.targetDisplay}
              </span>
              <span>{selectedMilestone.remainingDisplay}</span>
            </div>
          </div>

          {!selectedMilestone.unlocked && (
            <button
              type="button"
              className="milestone-boost-btn"
              onClick={() =>
                onLogWater(
                  `${selectedMilestone.badge.title} Boost`,
                  selectedMilestone.badge.quickActionMl
                )
              }
            >
              Log {selectedMilestone.badge.quickActionLabel} to advance
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
