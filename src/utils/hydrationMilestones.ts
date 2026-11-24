import type { HydrationMilestoneStats } from '../types/profile';

export type MilestoneBadgeId =
  | 'first-liter'
  | 'three-day-streak'
  | 'seven-day-streak'
  | 'ten-liters'
  | 'daily-summit'
  | 'twenty-five-liters';

export type MilestoneCategory = 'volume' | 'streak' | 'daily';

export interface MilestoneBadgeDefinition {
  id: MilestoneBadgeId;
  title: string;
  shortTitle: string;
  category: MilestoneCategory;
  categoryLabel: string;
  tierLabel: string;
  description: string;
  targetValue: number;
  unit: 'L' | 'days' | '%';
  quickActionLabel: string;
  quickActionMl: number;
}

export interface EvaluatedMilestone {
  badge: MilestoneBadgeDefinition;
  unlocked: boolean;
  progressPct: number;
  currentDisplay: string;
  targetDisplay: string;
  remainingDisplay: string;
}

export const ACTIVE_STREAK_DAY_THRESHOLD_ML = 1000;

export const MILESTONE_BADGES: MilestoneBadgeDefinition[] = [
  {
    id: 'first-liter',
    title: 'First Liter',
    shortTitle: '1L First Drop',
    category: 'volume',
    categoryLabel: 'Cumulative Volume',
    tierLabel: 'Bronze Aqua',
    description: 'Log your first 1.0 liter of cumulative hydration.',
    targetValue: 1,
    unit: 'L',
    quickActionLabel: '+500 ml Refill',
    quickActionMl: 500,
  },
  {
    id: 'three-day-streak',
    title: '3-Day Flow',
    shortTitle: '3-Day Flow',
    category: 'streak',
    categoryLabel: 'Consistency Streak',
    tierLabel: 'Brushed Silver',
    description: 'Log at least 1.0 L per day for 3 consecutive days.',
    targetValue: 3,
    unit: 'days',
    quickActionLabel: '+250 ml Glass',
    quickActionMl: 250,
  },
  {
    id: 'seven-day-streak',
    title: '7-Day Streak',
    shortTitle: '7-Day Streak',
    category: 'streak',
    categoryLabel: 'Consistency Streak',
    tierLabel: 'Sunlit Gold',
    description: 'Maintain an active hydration streak (≥ 1.0 L/day) for 7 straight days.',
    targetValue: 7,
    unit: 'days',
    quickActionLabel: '+250 ml Glass',
    quickActionMl: 250,
  },
  {
    id: 'ten-liters',
    title: '10 Liters Total',
    shortTitle: '10L Total',
    category: 'volume',
    categoryLabel: 'Cumulative Volume',
    tierLabel: 'Sapphire Titanium',
    description: 'Reach 10.0 liters of cumulative logged hydration across your sessions.',
    targetValue: 10,
    unit: 'L',
    quickActionLabel: '+500 ml Refill',
    quickActionMl: 500,
  },
  {
    id: 'daily-summit',
    title: 'Daily Goal Summit',
    shortTitle: 'Daily Summit',
    category: 'daily',
    categoryLabel: 'Daily Peak',
    tierLabel: 'Rose Quartz Copper',
    description: 'Hit 100% of your daily hydration target in a single day.',
    targetValue: 100,
    unit: '%',
    quickActionLabel: '+950 ml Flask',
    quickActionMl: 950,
  },
  {
    id: 'twenty-five-liters',
    title: '25L Glacier Legend',
    shortTitle: '25L Legend',
    category: 'volume',
    categoryLabel: 'Cumulative Volume',
    tierLabel: 'Indigo Platinum',
    description: 'Surpass 25.0 liters total — equivalent to 50 single-use plastic bottles saved.',
    targetValue: 25,
    unit: 'L',
    quickActionLabel: '+950 ml Flask',
    quickActionMl: 950,
  },
];

export function getDateKeyOffset(daysOffset: number, baseDate: Date = new Date()): string {
  const d = new Date(baseDate);
  d.setUTCDate(d.getUTCDate() + daysOffset);
  return d.toISOString().slice(0, 10);
}

/**
 * Seeds a realistic 6-day prior hydration history (8,950 ml total across 6 consecutive
 * active days) so new visitors immediately see unlocked Bronze/Silver animated medals
 * while sitting just one log away from unlocking '7-Day Streak' (+250 ml) and
 * '10 Liters Total' (+500 ml) live inside the ProfileDrawer.
 */
export function buildDefaultHydrationHistory(todayKey: string, todayMl: number): Record<string, number> {
  const base = new Date(`${todayKey}T12:00:00Z`);
  return {
    [getDateKeyOffset(-6, base)]: 1450,
    [getDateKeyOffset(-5, base)]: 1550,
    [getDateKeyOffset(-4, base)]: 1600,
    [getDateKeyOffset(-3, base)]: 1400,
    [getDateKeyOffset(-2, base)]: 1500,
    [getDateKeyOffset(-1, base)]: 1450,
    [todayKey]: todayMl,
  };
}

export function computeHydrationMilestoneStats(
  dailyTotals: Record<string, number>,
  todayKey: string,
  todayConsumedMl: number,
  dailyGoalMl: number
): HydrationMilestoneStats {
  const merged: Record<string, number> = {
    ...dailyTotals,
    [todayKey]: Math.max(0, todayConsumedMl),
  };

  let totalMlAllTime = 0;
  let daysGoalMet = 0;
  const safeGoal = Math.max(500, dailyGoalMl);

  Object.values(merged).forEach((ml) => {
    const val = Math.max(0, Number(ml) || 0);
    totalMlAllTime += val;
    if (val >= safeGoal) {
      daysGoalMet += 1;
    }
  });

  // Compute current active streak (consecutive days >= ACTIVE_STREAK_DAY_THRESHOLD_ML).
  // If today hasn't reached threshold yet, count consecutive qualifying days ending yesterday
  // so the user sees their active streak in progress before logging today.
  const base = new Date(`${todayKey}T12:00:00Z`);
  const todayQualifies = (merged[todayKey] ?? 0) >= ACTIVE_STREAK_DAY_THRESHOLD_ML;
  let currentStreakDays = 0;
  let cursorOffset = todayQualifies ? 0 : -1;

  for (let i = 0; i < 365; i += 1) {
    const key = getDateKeyOffset(cursorOffset - i, base);
    if ((merged[key] ?? 0) >= ACTIVE_STREAK_DAY_THRESHOLD_ML) {
      currentStreakDays += 1;
    } else {
      break;
    }
  }

  // Compute all-time best streak across sorted recorded date keys
  const qualifyingDates = Object.entries(merged)
    .filter(([, ml]) => (Number(ml) || 0) >= ACTIVE_STREAK_DAY_THRESHOLD_ML)
    .map(([dateStr]) => dateStr)
    .sort();

  let bestStreakDays = currentStreakDays;
  let run = 0;
  let prevTime: number | null = null;
  for (const dateStr of qualifyingDates) {
    const time = Date.parse(`${dateStr}T00:00:00Z`);
    if (Number.isNaN(time)) continue;
    if (prevTime !== null && Math.round((time - prevTime) / 86_400_000) === 1) {
      run += 1;
    } else {
      run = 1;
    }
    if (run > bestStreakDays) bestStreakDays = run;
    prevTime = time;
  }

  return {
    dailyTotals: merged,
    totalMlAllTime,
    currentStreakDays,
    bestStreakDays,
    daysGoalMet,
    dailyGoalMl: safeGoal,
    todayConsumedMl: Math.max(0, todayConsumedMl),
  };
}

export function evaluateMilestones(stats: HydrationMilestoneStats): EvaluatedMilestone[] {
  const totalLiters = stats.totalMlAllTime / 1000;
  const todayGoalPct = Math.min(
    100,
    Math.round((stats.todayConsumedMl / Math.max(500, stats.dailyGoalMl)) * 100)
  );
  const streakForBadges = Math.max(stats.currentStreakDays, stats.bestStreakDays);

  return MILESTONE_BADGES.map((badge) => {
    if (badge.category === 'volume') {
      const unlocked = totalLiters >= badge.targetValue;
      const progressPct = Math.min(100, Math.round((totalLiters / badge.targetValue) * 100));
      const remainingL = Math.max(0, badge.targetValue - totalLiters);
      return {
        badge,
        unlocked,
        progressPct,
        currentDisplay: `${totalLiters.toFixed(1)} L`,
        targetDisplay: `${badge.targetValue} L`,
        remainingDisplay: unlocked
          ? 'Unlocked'
          : `${remainingL.toFixed(1)} L to unlock`,
      };
    }

    if (badge.category === 'streak') {
      const unlocked = streakForBadges >= badge.targetValue;
      const progressPct = Math.min(
        100,
        Math.round((streakForBadges / badge.targetValue) * 100)
      );
      const remainingDays = Math.max(0, badge.targetValue - streakForBadges);
      const todayShortfallMl = Math.max(
        0,
        ACTIVE_STREAK_DAY_THRESHOLD_ML - stats.todayConsumedMl
      );
      const remainingDisplay = unlocked
        ? 'Unlocked'
        : remainingDays === 1 && todayShortfallMl > 0
          ? `Log +${todayShortfallMl} ml today to complete Day ${badge.targetValue}`
          : `${remainingDays} more active ${remainingDays === 1 ? 'day' : 'days'} needed`;

      return {
        badge,
        unlocked,
        progressPct,
        currentDisplay: `${streakForBadges} ${streakForBadges === 1 ? 'day' : 'days'}`,
        targetDisplay: `${badge.targetValue} days`,
        remainingDisplay,
      };
    }

    // Daily Peak ('daily-summit')
    const unlocked = stats.daysGoalMet > 0 || todayGoalPct >= 100;
    const progressPct = unlocked ? 100 : todayGoalPct;
    const remainingMl = Math.max(0, stats.dailyGoalMl - stats.todayConsumedMl);
    return {
      badge,
      unlocked,
      progressPct,
      currentDisplay: unlocked ? '100%' : `${todayGoalPct}%`,
      targetDisplay: `${(stats.dailyGoalMl / 1000).toFixed(1)} L / day`,
      remainingDisplay: unlocked
        ? 'Unlocked'
        : `${remainingMl} ml left for today's goal`,
    };
  });
}
