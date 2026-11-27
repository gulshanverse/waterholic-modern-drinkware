import { useId, useMemo } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { getDateKeyOffset } from '../utils/hydrationMilestones';

interface WeeklyHydrationChartProps {
  dailyTotals: Record<string, number>;
  todayKey: string;
  todayConsumedMl: number;
  dailyGoalMl: number;
}

interface DayPoint {
  dateKey: string;
  dayLabel: string;
  fullDate: string;
  ml: number;
  goalPct: number;
  metGoal: boolean;
  isToday: boolean;
}

const SHORT_WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const SHORT_MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

function formatDateMeta(dateKey: string, isToday: boolean) {
  const parsed = new Date(`${dateKey}T12:00:00Z`);
  if (Number.isNaN(parsed.getTime())) {
    return { dayLabel: isToday ? 'Today' : dateKey.slice(5), fullDate: dateKey };
  }
  const weekday = SHORT_WEEKDAYS[parsed.getUTCDay()];
  const month = SHORT_MONTHS[parsed.getUTCMonth()];
  const dayNum = parsed.getUTCDate();
  return {
    dayLabel: isToday ? 'Today' : weekday,
    fullDate: `${weekday}, ${month} ${dayNum}`,
  };
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: DayPoint }>;
  dailyGoalMl: number;
}

function HydrationTooltip({
  active,
  payload,
  dailyGoalMl,
}: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const point = payload[0]?.payload;
  if (!point) return null;

  return (
    <div className="weekly-chart-tooltip">
      <div className="weekly-chart-tooltip-date">
        {point.isToday ? `Today · ${point.fullDate}` : point.fullDate}
      </div>
      <div className="weekly-chart-tooltip-val tabular-nums">
        {point.ml.toLocaleString()} ml
      </div>
      <div className="weekly-chart-tooltip-meta tabular-nums">
        {point.goalPct}% of {dailyGoalMl.toLocaleString()} ml goal
      </div>
    </div>
  );
}

export function WeeklyHydrationChart({
  dailyTotals,
  todayKey,
  todayConsumedMl,
  dailyGoalMl,
}: WeeklyHydrationChartProps) {
  const gradId = useId().replace(/:/g, '');
  const safeGoal = Math.max(500, dailyGoalMl);

  const { data, weeklyTotalMl, dailyAvgMl, daysMetGoal, yDomainMax } =
    useMemo(() => {
      const base = new Date(`${todayKey}T12:00:00Z`);
      const points: DayPoint[] = [];

      for (let offset = -6; offset <= 0; offset += 1) {
        const key = getDateKeyOffset(offset, base);
        const isToday = offset === 0;
        const rawMl = isToday ? todayConsumedMl : (dailyTotals[key] ?? 0);
        const ml = Math.max(0, Math.round(Number(rawMl) || 0));
        const { dayLabel, fullDate } = formatDateMeta(key, isToday);
        points.push({
          dateKey: key,
          dayLabel,
          fullDate,
          ml,
          goalPct: Math.round((ml / safeGoal) * 100),
          metGoal: ml >= safeGoal,
          isToday,
        });
      }

      const total = points.reduce((sum, p) => sum + p.ml, 0);
      const avg = Math.round(total / 7);
      const metCount = points.filter((p) => p.metGoal).length;
      const peak = Math.max(safeGoal, ...points.map((p) => p.ml));
      const maxAxis = Math.ceil((peak * 1.12) / 500) * 500;

      return {
        data: points,
        weeklyTotalMl: total,
        dailyAvgMl: avg,
        daysMetGoal: metCount,
        yDomainMax: Math.max(1000, maxAxis),
      };
    }, [dailyTotals, todayKey, todayConsumedMl, safeGoal]);

  return (
    <div
      className="profile-card weekly-hydration-card"
      data-testid="weekly-hydration-chart"
    >
      <div className="profile-card-head">
        <div>
          <h3>Weekly Hydration Trends</h3>
          <p className="profile-muted tabular-nums">
            Last 7 days · {dailyAvgMl.toLocaleString()} ml avg/day
          </p>
        </div>
        <div className="weekly-hydration-total tabular-nums">
          <span className="weekly-hydration-total-val">
            {(weeklyTotalMl / 1000).toFixed(1)} L
          </span>
          <span className="weekly-hydration-total-sub">
            {daysMetGoal}/7 goals
          </span>
        </div>
      </div>

      <div
        className="weekly-chart-host"
        role="img"
        aria-label={`Weekly hydration chart showing ${weeklyTotalMl.toLocaleString()} ml consumed over the last 7 days, averaging ${dailyAvgMl.toLocaleString()} ml per day against a ${safeGoal.toLocaleString()} ml daily goal.`}
      >
        <ResponsiveContainer width="100%" height={188} minWidth={0}>
          <BarChart
            data={data}
            margin={{ top: 10, right: 6, left: -12, bottom: 0 }}
            barCategoryGap="24%"
          >
            <defs>
              <linearGradient
                id={`wh-bar-today-${gradId}`}
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop offset="0%" stopColor="var(--accent)" stopOpacity={1} />
                <stop
                  offset="100%"
                  stopColor="var(--accent)"
                  stopOpacity={0.72}
                />
              </linearGradient>
              <linearGradient
                id={`wh-bar-past-${gradId}`}
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop
                  offset="0%"
                  stopColor="var(--accent)"
                  stopOpacity={0.62}
                />
                <stop
                  offset="100%"
                  stopColor="var(--accent)"
                  stopOpacity={0.28}
                />
              </linearGradient>
            </defs>

            <CartesianGrid
              vertical={false}
              strokeDasharray="3 3"
              stroke="var(--border)"
            />

            <XAxis
              dataKey="dayLabel"
              axisLine={false}
              tickLine={false}
              tick={{
                fill: 'var(--text-secondary)',
                fontSize: 11.5,
                fontWeight: 500,
              }}
              dy={6}
            />

            <YAxis
              domain={[0, yDomainMax]}
              axisLine={false}
              tickLine={false}
              width={46}
              tickCount={4}
              tickFormatter={(value: number) =>
                value === 0 ? '0' : `${value}`
              }
              tick={{
                fill: 'var(--text-secondary)',
                fontSize: 11,
              }}
            />

            <Tooltip
              cursor={{
                fill: 'var(--surface-elevated)',
                opacity: 0.65,
                radius: 6,
              }}
              content={<HydrationTooltip dailyGoalMl={safeGoal} />}
            />

            <ReferenceLine
              y={safeGoal}
              stroke="var(--accent)"
              strokeDasharray="4 4"
              strokeOpacity={0.7}
            />

            <Bar
              dataKey="ml"
              name="Consumed (ml)"
              radius={[6, 6, 2, 2]}
              maxBarSize={32}
              isAnimationActive
              animationDuration={420}
            >
              {data.map((entry) => (
                <Cell
                  key={entry.dateKey}
                  fill={
                    entry.isToday || entry.metGoal
                      ? `url(#wh-bar-today-${gradId})`
                      : `url(#wh-bar-past-${gradId})`
                  }
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="weekly-chart-footer tabular-nums">
        <span>Consumed (ml)</span>
        <span aria-hidden="true">·</span>
        <span>Dashed line: {safeGoal.toLocaleString()} ml daily goal</span>
      </div>
    </div>
  );
}
