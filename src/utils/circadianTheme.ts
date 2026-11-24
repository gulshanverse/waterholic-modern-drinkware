export type Daypart = 'morning' | 'day' | 'evening';
export type ThemeMode = 'auto' | Daypart;

export interface DaypartMeta {
  id: Daypart;
  label: string;
  paletteName: string;
  windowLabel: string;
  theme: 'light' | 'dark';
  swatchPrimary: string;
  swatchSurface: string;
  soundscapeName: string;
  soundscapeSubtitle: string;
}

export const DAYPART_META: Record<Daypart, DaypartMeta> = {
  morning: {
    id: 'morning',
    label: 'Morning',
    paletteName: 'Soft Amber',
    windowLabel: '5:00 AM – 11:59 AM',
    theme: 'light',
    swatchPrimary: '#c26d18',
    swatchSurface: '#fdf9f3',
    soundscapeName: 'Soft Morning Birds',
    soundscapeSubtitle: 'Dawn songbirds & warm breeze loop',
  },
  day: {
    id: 'day',
    label: 'Midday',
    paletteName: 'Glacial Azure',
    windowLabel: '12:00 PM – 5:59 PM',
    theme: 'light',
    swatchPrimary: '#0284c7',
    swatchSurface: '#f5fafd',
    soundscapeName: 'Alpine Breeze',
    soundscapeSubtitle: 'Whisper-quiet glacial air & stream',
  },
  evening: {
    id: 'evening',
    label: 'Evening',
    paletteName: 'Deep Indigo',
    windowLabel: '6:00 PM – 4:59 AM',
    theme: 'dark',
    swatchPrimary: '#818cf8',
    swatchSurface: '#090b1d',
    soundscapeName: 'Gentle Crickets',
    soundscapeSubtitle: 'Twilight meadow chorus & night air',
  },
};

export function getDaypartForDate(date: Date = new Date()): Daypart {
  const hour = date.getHours();
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 18) return 'day';
  return 'evening';
}

export function resolveDaypart(mode: ThemeMode, date: Date = new Date()): Daypart {
  return mode === 'auto' ? getDaypartForDate(date) : mode;
}

export function formatShortLocalTime(date: Date = new Date()): string {
  return date.toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  });
}
