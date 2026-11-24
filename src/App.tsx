import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { initHeroCanvas } from './webgl/heroCanvas';
import { initSpecsCanvas } from './webgl/specsCanvas';
import {
  PRODUCTS,
  type CategoryId,
  type Product,
} from './data/products';
import {
  CatalogSection,
  type AddToBagPayload,
} from './components/CatalogSection';
import { ProductModal } from './components/ProductModal';
import {
  BagDrawer,
  type BagItemGiftOptions,
  type BagLineItem,
} from './components/BagDrawer';
import { CampusSection } from './components/CampusSection';
import { ProfileDrawer, type ProfileTab } from './components/ProfileDrawer';
import { CompareModal } from './components/CompareModal';
import { SupportSection } from './components/SupportSection';
import { BottleBrandMark } from './components/BottleBrandMark';
import { SiteFooter } from './components/SiteFooter';
import {
  BottleStudio3D,
  type StudioFinishKey,
} from './components/BottleStudio3D';
import { CreativeStudioSection } from './components/CreativeStudioSection';
import { AiConciergeDrawer } from './components/AiConciergeDrawer';
import {
  CraftsmanshipAndImpactLedger,
  CuratedRitualBundles,
  PressAndGuaranteeStrip,
} from './components/LaunchExperienceSection';
import { BottleFinderModal } from './components/BottleFinderModal';
import { FastFlowPriceWave } from './components/FastFlowPriceWave';
import {
  DAYPART_META,
  formatShortLocalTime,
  getDaypartForDate,
  resolveDaypart,
  type Daypart,
  type ThemeMode,
} from './utils/circadianTheme';
import { useAuth } from './contexts/AuthContext';
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Compass,
  Copy,
  Heart,
  Menu,
  Moon,
  PenTool,
  Sparkles,
  Sun,
  Sunrise,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { AtmosphericSoundscapeEngine } from './utils/atmosphericSoundscape';
import bottleStudioLogoImg from './assets/images/waterholic_studio_logo_bottle_1795462018573.jpg';
import bottleRiverLogoImg from './assets/images/waterholic_river_logo_bottle_1795462051322.jpg';
import bottleOutdoorLogoImg from './assets/images/waterholic_outdoor_logo_bottle_1795462017951.jpg';
import bottleColdLogoImg from './assets/images/waterholic_thermal_cold_logo_1795462070545.jpg';
import bottleHotLogoImg from './assets/images/waterholic_thermal_hot_logo_1795462070671.jpg';
import type {
  HydrationLog,
  HydrationMilestoneStats,
  OrderRecord,
  ProductReview,
  SavedAddress,
  UserProfile,
} from './types/profile';
import {
  buildDefaultHydrationHistory,
  computeHydrationMilestoneStats,
  evaluateMilestones,
  type MilestoneBadgeId,
} from './utils/hydrationMilestones';

gsap.registerPlugin(ScrollTrigger);

function readStored<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeStored<T>(key: string, value: T) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage quota or private-mode restrictions
  }
}

function getTodayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

const DEFAULT_PROFILE: UserProfile = {
  name: 'Alex Mercer',
  email: 'alex@state.edu',
  phone: '(303) 555-0194',
  university: 'State University',
  preferredColor: 'Ocean Blue',
  dailyGoalMl: 2500,
  memberSince: 'Nov 2026',
  signedIn: true,
};

const DEFAULT_ADDRESSES: SavedAddress[] = [
  {
    id: 'addr-dorm',
    label: 'Dorm Room',
    recipient: 'Alex Mercer',
    street: '214 Baker Hall, Room 308',
    cityStateZip: 'Boulder, CO 80309',
    isDefault: true,
  },
  {
    id: 'addr-home',
    label: 'Home',
    recipient: 'Alex Mercer',
    street: '742 Alpine Ridge Rd',
    cityStateZip: 'Denver, CO 80205',
    isDefault: false,
  },
];

const DEFAULT_ORDERS: OrderRecord[] = [
  {
    orderNumber: 'WH-3104',
    date: 'Nov 12, 2026',
    customerName: 'Alex Mercer',
    contact: 'alex@state.edu',
    address: '214 Baker Hall, Room 308, Boulder, CO 80309',
    paymentMethod: 'card',
    items: [
      {
        key: `${PRODUCTS[0].id}__${PRODUCTS[0].finishes[0].id}__950 ml`,
        productId: PRODUCTS[0].id,
        name: PRODUCTS[0].name,
        finishName: PRODUCTS[0].finishes[0].name,
        finishId: PRODUCTS[0].finishes[0].id,
        finishHex: PRODUCTS[0].finishes[0].hex,
        finishIsTransparent: PRODUCTS[0].finishes[0].isTransparent,
        finishFilter: PRODUCTS[0].finishes[0].filter,
        sizeLabel: '950 ml',
        price: PRODUCTS[0].price,
        qty: 1,
        image: PRODUCTS[0].image,
      },
    ],
    subtotal: PRODUCTS[0].price,
    discountAmount: Math.round(PRODUCTS[0].price * 0.15),
    discountLabel: 'Student Discount (15% .edu)',
    shippingCost: 0,
    total: PRODUCTS[0].price - Math.round(PRODUCTS[0].price * 0.15),
    statusStep: 4,
  },
];

type FinishId =
  | 'blue'
  | 'pink'
  | 'transparent'
  | 'sage'
  | 'basalt'
  | 'glacier';
type SizeLabel = '750 ml' | '950 ml' | '1.2 L';

const FINISH_META: Record<
  FinishId,
  {
    name: string;
    dot: string;
    filter?: string;
    premiumDelta?: number;
    isTransparent?: boolean;
  }
> = {
  blue: {
    name: 'Ocean Blue',
    dot: '#0284C7',
    filter: 'sepia(0.32) hue-rotate(174deg) saturate(1.65) brightness(1.0)',
  },
  pink: {
    name: 'Rose Pink',
    dot: '#E495A6',
    filter: 'sepia(0.36) hue-rotate(304deg) saturate(1.45) brightness(1.08)',
    premiumDelta: 40,
  },
  transparent: {
    name: 'Transparent',
    dot: '#E8F2F5',
    filter: 'saturate(0.16) brightness(1.22) contrast(0.92) opacity(0.78)',
    isTransparent: true,
  },
  sage: { name: 'Alpine Sage', dot: '#48634B' },
  basalt: {
    name: 'Basalt Black',
    dot: '#222624',
    filter: 'saturate(0.18) brightness(0.76) contrast(1.12)',
  },
  glacier: {
    name: 'Glacier Silver',
    dot: '#B4BDB8',
    filter: 'saturate(0.12) brightness(1.14) contrast(0.95)',
  },
};

const SIZE_OPTIONS: { size: SizeLabel; price: number; scale: number }[] = [
  { size: '750 ml', price: 42, scale: 0.94 },
  { size: '950 ml', price: 48, scale: 1.0 },
  { size: '1.2 L', price: 54, scale: 1.06 },
];

const SHOWCASE_STAGES = [
  {
    src: bottleStudioLogoImg,
    alt: 'Waterholic Ocean Blue bottle with engraved droplet logo standing on honed stone in studio lighting',
    title: 'Ocean Blue Matte',
    sub: 'Laser-etched Waterholic emblem on 18/8 stainless steel',
  },
  {
    src: bottleRiverLogoImg,
    alt: 'Waterholic bottle on a sunlit cedar picnic table beside a clear mountain river',
    title: 'Made for the Outside',
    sub: 'Zero condensation from morning trails to sunny riverbanks',
  },
  {
    src: bottleOutdoorLogoImg,
    alt: 'Waterholic bottle resting on a sunlit granite boulder overlooking an alpine mountain lake',
    title: 'Machined Steel Collar',
    sub: 'Leakproof chug lid built to take a knock',
  },
  {
    src: bottleHotLogoImg,
    alt: 'Waterholic bottle resting on a sunlit alpine ridge at golden sunrise',
    title: 'All-Day Carry',
    sub: 'Built to go from sunny ridge hikes to quiet evening camp',
  },
];

export default function App() {
  // Circadian time-of-day dynamic theme (Auto defaults to local time: Soft Amber morning, Glacial Azure day, Deep Indigo evening)
  const [themeMode, setThemeMode] = useState<ThemeMode>(() =>
    readStored<ThemeMode>('wh_theme_mode_v2', 'auto')
  );
  const [clockNow, setClockNow] = useState<Date>(() => new Date());
  const [themeMenuOpen, setThemeMenuOpen] = useState<boolean>(false);
  const themeMenuRef = useRef<HTMLDivElement | null>(null);

  const activeDaypart: Daypart = resolveDaypart(themeMode, clockNow);
  const theme: 'dark' | 'light' = DAYPART_META[activeDaypart].theme;
  const liveClockDaypart: Daypart = getDaypartForDate(clockNow);

  // Subtle circadian atmospheric soundscape (Soft Morning Birds / Alpine Breeze / Gentle Evening Crickets)
  const [soundscapeEnabled, setSoundscapeEnabled] = useState<boolean>(() =>
    readStored<{ enabled: boolean; volume: number }>('wh_soundscape_v1', {
      enabled: true,
      volume: 0.38,
    }).enabled
  );
  const [soundscapeVolume, setSoundscapeVolume] = useState<number>(() =>
    readStored<{ enabled: boolean; volume: number }>('wh_soundscape_v1', {
      enabled: true,
      volume: 0.38,
    }).volume
  );
  const [soundscapePlaying, setSoundscapePlaying] = useState<boolean>(false);
  const soundscapeEngineRef = useRef<AtmosphericSoundscapeEngine | null>(null);
  const [finish, setFinish] = useState<FinishId>('blue');
  const [size, setSize] = useState<SizeLabel>('950 ml');
  const [price, setPrice] = useState<number>(48);
  const [activeStage, setActiveStage] = useState<number>(0);
  const [captionBlur, setCaptionBlur] = useState<boolean>(false);
  const [hasSwipedShowcase, setHasSwipedShowcase] = useState<boolean>(false);
  const [isSwipingShowcase, setIsSwipingShowcase] = useState<boolean>(false);
  const [splitPct, setSplitPct] = useState<number>(50);
  const [splitAnimate, setSplitAnimate] = useState<boolean>(false);

  // Unified multi-product storefront & persistent Web Profile state
  const [selectedCategory, setSelectedCategory] = useState<CategoryId | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [savedIds, setSavedIds] = useState<Set<string>>(
    () => new Set(readStored<string[]>('wh_saved_v1', []))
  );
  const [showSavedOnly, setShowSavedOnly] = useState<boolean>(false);
  const [activeModal, setActiveModal] = useState<{
    product: Product;
    finishId?: string;
  } | null>(null);
  const [bag, setBag] = useState<BagLineItem[]>(() =>
    readStored<BagLineItem[]>('wh_bag_v1', [])
  );
  const [drawerOpen, setDrawerOpen] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showBackTop, setShowBackTop] = useState<boolean>(false);

  const [studentDiscountActive, setStudentDiscountActive] = useState<boolean>(
    () => readStored<{ active: boolean; email: string }>('wh_student_v1', {
      active: false,
      email: '',
    }).active
  );
  const [studentEmail, setStudentEmail] = useState<string>(
    () => readStored<{ active: boolean; email: string }>('wh_student_v1', {
      active: false,
      email: '',
    }).email
  );

  const [profile, setProfile] = useState<UserProfile>(() =>
    readStored<UserProfile>('wh_profile_v1', DEFAULT_PROFILE)
  );
  const [addresses, setAddresses] = useState<SavedAddress[]>(() =>
    readStored<SavedAddress[]>('wh_addresses_v1', DEFAULT_ADDRESSES)
  );
  const [orders, setOrders] = useState<OrderRecord[]>(() =>
    readStored<OrderRecord[]>('wh_orders_v1', DEFAULT_ORDERS)
  );
  const [hydration, setHydration] = useState<HydrationLog>(() => {
    const today = getTodayKey();
    const saved = readStored<HydrationLog>('wh_hydration_v1', {
      dateKey: today,
      consumedMl: 750,
      entries: [
        { id: 'init-1', label: 'Morning Refill', ml: 500, time: '8:30 AM' },
        { id: 'init-2', label: 'Glass of Water', ml: 250, time: '10:15 AM' },
      ],
    });
    if (saved.dateKey !== today) {
      return { dateKey: today, consumedMl: 0, entries: [] };
    }
    return saved;
  });
  const [hydrationHistory, setHydrationHistory] = useState<
    Record<string, number>
  >(() => {
    const today = getTodayKey();
    const fallback = buildDefaultHydrationHistory(today, 750);
    const saved = readStored<Record<string, number>>(
      'wh_hydration_history_v1',
      fallback
    );
    if (!saved || Object.keys(saved).length === 0) {
      return fallback;
    }
    return saved;
  });
  const [recentlyUnlockedBadgeIds, setRecentlyUnlockedBadgeIds] = useState<
    MilestoneBadgeId[]
  >([]);
  const knownUnlockedBadgeIdsRef = useRef<Set<MilestoneBadgeId> | null>(null);
  const [recentlyViewedIds, setRecentlyViewedIds] = useState<string[]>(() =>
    readStored<string[]>('wh_recent_v1', [])
  );
  const [customReviews, setCustomReviews] = useState<
    Record<string, ProductReview[]>
  >(() => readStored<Record<string, ProductReview[]>>('wh_reviews_v1', {}));
  const [profileDrawerOpen, setProfileDrawerOpen] = useState<boolean>(false);
  const [profileInitialTab, setProfileInitialTab] =
    useState<ProfileTab>('overview');
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [compareModalOpen, setCompareModalOpen] = useState<boolean>(false);
  const [conciergeOpen, setConciergeOpen] = useState<boolean>(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [finderOpen, setFinderOpen] = useState<boolean>(false);
  const [announcementVisible, setAnnouncementVisible] = useState<boolean>(true);
  const [launchRibbonRevealed, setLaunchRibbonRevealed] =
    useState<boolean>(false);
  const [promoCopied, setPromoCopied] = useState<boolean>(false);
  const [engravingEnabled, setEngravingEnabled] = useState<boolean>(true);
  const [engravingText, setEngravingText] = useState<string>('ALEX');
  const [engravingFont, setEngravingFont] = useState<'sans' | 'serif' | 'mono'>(
    'serif'
  );
  const [engravingOrientation, setEngravingOrientation] = useState<
    'vertical' | 'horizontal'
  >('vertical');
  const [fastFlowSignal, setFastFlowSignal] = useState<number>(0);
  const [fastFlowSurging, setFastFlowSurging] = useState<boolean>(false);
  const fastFlowTimerRef = useRef<number | null>(null);

  const {
    user,
    cloudOrders,
    loadCloudUserBundle,
    syncProfileToCloud,
    syncHydrationToCloud,
    saveOrderToCloud,
  } = useAuth();
  const cloudHydratedUidRef = useRef<string | null>(null);
  const scrollProgressRef = useRef<HTMLDivElement | null>(null);
  const heroSectionRef = useRef<HTMLElement | null>(null);

  const heroCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const specsCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const heroStageRef = useRef<HTMLDivElement | null>(null);
  const tiltWrapRef = useRef<HTMLDivElement | null>(null);
  const shadowRef = useRef<HTMLDivElement | null>(null);
  const catalogHostRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const showcaseRef = useRef<HTMLElement | null>(null);
  const showcaseFramesWrapRef = useRef<HTMLDivElement | null>(null);
  const showcaseTriggerRef = useRef<ScrollTrigger | null>(null);
  const showcaseSwipeRef = useRef<{
    active: boolean;
    startX: number;
    startY: number;
    lastX: number;
    startTime: number;
    startStage: number;
    lockedAxis: 'x' | 'y' | null;
    viewportWidth: number;
  }>({
    active: false,
    startX: 0,
    startY: 0,
    lastX: 0,
    startTime: 0,
    startStage: 0,
    lockedAxis: null,
    viewportWidth: 375,
  });
  const frameRefs = useRef<(HTMLElement | null)[]>([]);
  const bentoGridRef = useRef<HTMLDivElement | null>(null);
  const compWrapRef = useRef<HTMLDivElement | null>(null);
  const isDraggingRef = useRef<boolean>(false);
  const stageIdxRef = useRef<number>(0);
  const stageTimerRef = useRef<number | null>(null);
  const toastTimerRef = useRef<number | null>(null);
  const selectedConfigRef = useRef<{
    finish: FinishId;
    size: SizeLabel;
    price: number;
  }>({ finish: 'blue', size: '950 ml', price: 48 });

  // Keep Auto circadian theme synced to local clock every minute
  useEffect(() => {
    const id = window.setInterval(() => {
      setClockNow(new Date());
    }, 60_000);
    return () => window.clearInterval(id);
  }, []);

  // Close circadian theme popover on outside pointerdown or Escape
  useEffect(() => {
    if (!themeMenuOpen) return;
    const onPointerDown = (e: PointerEvent) => {
      if (
        themeMenuRef.current &&
        !themeMenuRef.current.contains(e.target as Node)
      ) {
        setThemeMenuOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setThemeMenuOpen(false);
    };
    window.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [themeMenuOpen]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.setAttribute('data-daypart', activeDaypart);
    writeStored('wh_theme_mode_v2', themeMode);
    writeStored('wh_theme_v1', theme);
  }, [theme, activeDaypart, themeMode]);

  // Persist atmospheric soundscape preferences
  useEffect(() => {
    writeStored('wh_soundscape_v1', {
      enabled: soundscapeEnabled,
      volume: soundscapeVolume,
    });
  }, [soundscapeEnabled, soundscapeVolume]);

  // Lifecycle for procedural Web Audio atmospheric soundscape engine
  useEffect(() => {
    const engine = new AtmosphericSoundscapeEngine((unlocked) => {
      setSoundscapePlaying(unlocked);
    });
    soundscapeEngineRef.current = engine;

    const handleVisibility = () => {
      engine.setState({
        daypart: resolveDaypart(
          readStored<ThemeMode>('wh_theme_mode_v2', 'auto'),
          new Date()
        ),
        enabled: readStored<{ enabled: boolean; volume: number }>(
          'wh_soundscape_v1',
          { enabled: true, volume: 0.38 }
        ).enabled,
        volume: readStored<{ enabled: boolean; volume: number }>(
          'wh_soundscape_v1',
          { enabled: true, volume: 0.38 }
        ).volume,
        tabHidden: document.visibilityState === 'hidden',
      });
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      engine.dispose();
      soundscapeEngineRef.current = null;
    };
  }, []);

  // Sync active theme, enabled flag, and volume into soundscape crossfader
  useEffect(() => {
    const engine = soundscapeEngineRef.current;
    if (!engine) return;
    engine.setState({
      daypart: activeDaypart,
      enabled: soundscapeEnabled,
      volume: soundscapeVolume,
      tabHidden: document.visibilityState === 'hidden',
    });
    if (!soundscapeEnabled) {
      setSoundscapePlaying(false);
    } else if (engine.isUnlocked()) {
      setSoundscapePlaying(true);
    }
  }, [activeDaypart, soundscapeEnabled, soundscapeVolume]);

  // Auto-fade in on first user gesture when soundscape is enabled (respects browser autoplay rules)
  useEffect(() => {
    if (!soundscapeEnabled || soundscapePlaying) return;
    const unlockOnGesture = () => {
      const engine = soundscapeEngineRef.current;
      if (!engine) return;
      engine.setState({
        daypart: activeDaypart,
        enabled: true,
        volume: soundscapeVolume,
        tabHidden: document.visibilityState === 'hidden',
      });
      void engine.unlockAndSync();
    };
    window.addEventListener('pointerdown', unlockOnGesture, { once: true });
    window.addEventListener('keydown', unlockOnGesture, { once: true });
    return () => {
      window.removeEventListener('pointerdown', unlockOnGesture);
      window.removeEventListener('keydown', unlockOnGesture);
    };
  }, [soundscapeEnabled, soundscapePlaying, activeDaypart, soundscapeVolume]);

  const showLaunchRibbon = announcementVisible && launchRibbonRevealed;

  useEffect(() => {
    const heroEl = heroSectionRef.current;
    if (!heroEl) return;

    const evaluateHeroPast = () => {
      const rect = heroEl.getBoundingClientRect();
      setLaunchRibbonRevealed(rect.bottom <= 96);
    };

    evaluateHeroPast();

    if (typeof IntersectionObserver !== 'undefined') {
      const observer = new IntersectionObserver(
        (entries) => {
          const entry = entries[0];
          if (!entry) return;
          const pastHero =
            !entry.isIntersecting && entry.boundingClientRect.bottom <= 96;
          setLaunchRibbonRevealed(pastHero);
        },
        {
          root: null,
          rootMargin: '-96px 0px 0px 0px',
          threshold: 0,
        }
      );
      observer.observe(heroEl);
      return () => observer.disconnect();
    }

    window.addEventListener('scroll', evaluateHeroPast, { passive: true });
    return () => window.removeEventListener('scroll', evaluateHeroPast);
  }, []);

  useEffect(() => {
    document.documentElement.style.setProperty(
      '--announcement-h',
      showLaunchRibbon ? '36px' : '0px'
    );
    return () => {
      document.documentElement.style.setProperty('--announcement-h', '0px');
    };
  }, [showLaunchRibbon]);

  useEffect(() => {
    let rafId = 0;
    const updateProgress = () => {
      rafId = 0;
      const el = scrollProgressRef.current;
      if (!el) return;
      const maxScroll = Math.max(
        1,
        document.documentElement.scrollHeight - window.innerHeight
      );
      const ratio = Math.min(1, Math.max(0, window.scrollY / maxScroll));
      el.style.transform = `scaleX(${ratio})`;
    };
    const onScroll = () => {
      if (!rafId) rafId = window.requestAnimationFrame(updateProgress);
    };
    updateProgress();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    return () => {
      if (rafId) window.cancelAnimationFrame(rafId);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  useEffect(() => {
    writeStored('wh_bag_v1', bag);
  }, [bag]);

  useEffect(() => {
    writeStored('wh_saved_v1', Array.from(savedIds));
  }, [savedIds]);

  useEffect(() => {
    writeStored('wh_profile_v1', profile);
  }, [profile]);

  useEffect(() => {
    writeStored('wh_addresses_v1', addresses);
  }, [addresses]);

  useEffect(() => {
    writeStored('wh_orders_v1', orders);
  }, [orders]);

  useEffect(() => {
    writeStored('wh_hydration_v1', hydration);
    setHydrationHistory((prev) => {
      if (prev[hydration.dateKey] === hydration.consumedMl) return prev;
      return {
        ...prev,
        [hydration.dateKey]: hydration.consumedMl,
      };
    });
  }, [hydration]);

  useEffect(() => {
    writeStored('wh_hydration_history_v1', hydrationHistory);
  }, [hydrationHistory]);

  useEffect(() => {
    writeStored('wh_recent_v1', recentlyViewedIds);
  }, [recentlyViewedIds]);

  useEffect(() => {
    writeStored('wh_reviews_v1', customReviews);
  }, [customReviews]);

  useEffect(() => {
    writeStored('wh_student_v1', {
      active: studentDiscountActive,
      email: studentEmail,
    });
  }, [studentDiscountActive, studentEmail]);

  // Hydrate profile, wishlist & today's hydration log from Firebase when Google user signs in
  useEffect(() => {
    if (!user) {
      cloudHydratedUidRef.current = null;
      return;
    }
    if (cloudHydratedUidRef.current === user.uid) return;
    cloudHydratedUidRef.current = user.uid;

    void (async () => {
      try {
        const today = getTodayKey();
        const { profileDoc, hydrationDoc } = await loadCloudUserBundle(today);
        if (profileDoc) {
          setProfile((prev) => ({
            ...prev,
            ...profileDoc.profile,
            name: profileDoc.profile.name || user.displayName || prev.name,
            email: profileDoc.profile.email || user.email || prev.email,
            signedIn: true,
          }));
          if (profileDoc.savedIds.length > 0) {
            setSavedIds(new Set(profileDoc.savedIds));
          }
          if (profileDoc.studentDiscountActive) {
            setStudentDiscountActive(true);
            if (profileDoc.studentEmail) setStudentEmail(profileDoc.studentEmail);
          }
        } else {
          setProfile((prev) => ({
            ...prev,
            name: user.displayName || prev.name,
            email: user.email || prev.email,
            signedIn: true,
          }));
        }
        if (hydrationDoc && hydrationDoc.dateKey === today) {
          setHydration(hydrationDoc);
        }
      } catch {
        // Local storage fallback stays intact
      }
    })();
  }, [user, loadCloudUserBundle]);

  // Merge cloud-synced orders cleanly with local orders
  useEffect(() => {
    if (!user || cloudOrders.length === 0) return;
    setOrders((prev) => {
      const byNum = new Map<string, OrderRecord>();
      for (const ord of cloudOrders) byNum.set(ord.orderNumber, ord);
      for (const ord of prev) {
        if (!byNum.has(ord.orderNumber)) byNum.set(ord.orderNumber, ord);
      }
      return Array.from(byNum.values());
    });
  }, [user, cloudOrders]);

  // Debounced cloud sync whenever profile, saved wishlist, or student discount updates
  useEffect(() => {
    if (!user || cloudHydratedUidRef.current !== user.uid) return;
    const t = window.setTimeout(() => {
      void syncProfileToCloud({
        profile,
        savedIds: Array.from(savedIds),
        studentDiscountActive,
        studentEmail,
      }).catch(() => {});
    }, 650);
    return () => window.clearTimeout(t);
  }, [
    user,
    profile,
    savedIds,
    studentDiscountActive,
    studentEmail,
    syncProfileToCloud,
  ]);

  // Debounced cloud sync for daily hydration tracker
  useEffect(() => {
    if (!user || cloudHydratedUidRef.current !== user.uid) return;
    const t = window.setTimeout(() => {
      void syncHydrationToCloud(hydration).catch(() => {});
    }, 650);
    return () => window.clearTimeout(t);
  }, [user, hydration, syncHydrationToCloud]);

  // Show back-to-top button once scrolled past hero
  useEffect(() => {
    const onScroll = () => {
      setShowBackTop(window.scrollY > 640);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Refresh ScrollTrigger whenever dynamic catalog height changes
  useEffect(() => {
    const host = catalogHostRef.current;
    if (!host || typeof ResizeObserver === 'undefined') return;
    let rafId: number | null = null;
    const observer = new ResizeObserver(() => {
      if (rafId !== null) window.cancelAnimationFrame(rafId);
      rafId = window.requestAnimationFrame(() => {
        ScrollTrigger.refresh();
        rafId = null;
      });
    });
    observer.observe(host);
    return () => {
      observer.disconnect();
      if (rafId !== null) window.cancelAnimationFrame(rafId);
    };
  }, []);

  useEffect(() => {
    const prefersReduced = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;

    const cleanupHeroGl = initHeroCanvas(heroCanvasRef.current);
    const cleanupSpecsGl = initSpecsCanvas(specsCanvasRef.current);

    let lenis: InstanceType<typeof Lenis> | null = null;
    let lenisTicker: ((time: number) => void) | null = null;
    if (!prefersReduced) {
      lenis = new Lenis({
        duration: 1.05,
        easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        smoothWheel: true,
      });
      lenis.on('scroll', ScrollTrigger.update);
      lenisTicker = (time: number) => {
        lenis?.raf(time * 1000);
      };
      gsap.ticker.add(lenisTicker);
      gsap.ticker.lagSmoothing(0);
    }

    let targetRotX = 0;
    let targetRotY = 0;
    let curRotX = 0;
    let curRotY = 0;
    let velX = 0;
    let velY = 0;
    let tiltTicker: (() => void) | null = null;

    const heroStage = heroStageRef.current;
    const onHeroMove = (e: PointerEvent) => {
      if (!heroStage) return;
      const rect = heroStage.getBoundingClientRect();
      const nx = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
      const ny = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
      targetRotY = nx * 14;
      targetRotX = -ny * 10;
    };
    const onHeroLeave = () => {
      targetRotX = 0;
      targetRotY = 0;
    };

    if (heroStage && tiltWrapRef.current && !prefersReduced) {
      heroStage.addEventListener('pointermove', onHeroMove);
      heroStage.addEventListener('pointerleave', onHeroLeave);
      tiltTicker = () => {
        const ax = (targetRotX - curRotX) * 0.08;
        const ay = (targetRotY - curRotY) * 0.08;
        velX = (velX + ax) * 0.82;
        velY = (velY + ay) * 0.82;
        curRotX += velX;
        curRotY += velY;
        if (tiltWrapRef.current) {
          tiltWrapRef.current.style.transform = `rotateX(${curRotX.toFixed(2)}deg) rotateY(${curRotY.toFixed(2)}deg)`;
        }
        if (shadowRef.current) {
          shadowRef.current.style.transform = `translateX(${(-curRotY * 1.4).toFixed(1)}px) scale(${1 - Math.abs(curRotX) * 0.01})`;
        }
      };
      gsap.ticker.add(tiltTicker);
    }

    const gsapCtx = gsap.context(() => {
      if (prefersReduced) return;

      const frames = frameRefs.current.filter(
        (el): el is HTMLElement => el !== null
      );
      if (showcaseRef.current && frames.length === 4) {
        const mm = gsap.matchMedia();

        mm.add('(min-width: 769px)', () => {
          const tl = gsap.timeline({
            scrollTrigger: {
              trigger: showcaseRef.current,
              start: 'top top',
              end: '+=280%',
              pin: true,
              scrub: 0.65,
              onUpdate: (self: { progress: number }) => {
                const t = self.progress * 3.5;
                let nextIdx = 0;
                if (t >= 3.07) nextIdx = 3;
                else if (t >= 2.02) nextIdx = 2;
                else if (t >= 0.97) nextIdx = 1;

                if (nextIdx !== stageIdxRef.current) {
                  stageIdxRef.current = nextIdx;
                  setCaptionBlur(true);
                  if (stageTimerRef.current !== null) {
                    window.clearTimeout(stageTimerRef.current);
                  }
                  stageTimerRef.current = window.setTimeout(() => {
                    stageTimerRef.current = null;
                    setActiveStage(nextIdx);
                    setCaptionBlur(false);
                  }, 100);
                }
              },
            },
          });

          const wipeStarts = [0.25, 1.3, 2.35];
          frames.forEach((frame, i) => {
            if (i === 0) return;
            tl.fromTo(
              frame,
              { clipPath: 'inset(0 0 0 100%)' },
              { clipPath: 'inset(0 0 0 0%)', ease: 'none', duration: 0.8 },
              wipeStarts[i - 1]
            );
          });
          tl.set({}, {}, 3.5);

          showcaseTriggerRef.current = tl.scrollTrigger ?? null;
          return () => {
            showcaseTriggerRef.current = null;
          };
        });

        mm.add('(max-width: 768px)', () => {
          showcaseTriggerRef.current = null;
          frames.forEach((frame, i) => {
            gsap.set(frame, {
              clipPath:
                i <= stageIdxRef.current
                  ? 'inset(0 0 0 0%)'
                  : 'inset(0 0 0 100%)',
            });
          });
        });
      }

      if (bentoGridRef.current) {
        gsap.from('.reveal-tile', {
          y: 28,
          scale: 0.96,
          opacity: 0,
          duration: 0.65,
          stagger: 0.08,
          ease: 'power3.out',
          clearProps: 'transform,opacity',
          scrollTrigger: {
            trigger: bentoGridRef.current,
            start: 'top 82%',
            once: true,
          },
        });
      }
    });

    return () => {
      if (stageTimerRef.current !== null) {
        window.clearTimeout(stageTimerRef.current);
        stageTimerRef.current = null;
      }
      if (toastTimerRef.current !== null) {
        window.clearTimeout(toastTimerRef.current);
        toastTimerRef.current = null;
      }
      cleanupHeroGl();
      cleanupSpecsGl();
      gsapCtx.revert();
      if (tiltTicker) gsap.ticker.remove(tiltTicker);
      if (lenisTicker) gsap.ticker.remove(lenisTicker);
      lenis?.destroy();
      heroStage?.removeEventListener('pointermove', onHeroMove);
      heroStage?.removeEventListener('pointerleave', onHeroLeave);
    };
  }, []);

  // Global keyboard shortcuts: Esc closes drawers/modals, "/" jumps to catalog search
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (drawerOpen) setDrawerOpen(false);
        if (profileDrawerOpen) setProfileDrawerOpen(false);
        if (compareModalOpen) setCompareModalOpen(false);
        if (conciergeOpen) setConciergeOpen(false);
        if (mobileMenuOpen) setMobileMenuOpen(false);
      }
      if (
        e.key === '/' &&
        !drawerOpen &&
        !profileDrawerOpen &&
        !compareModalOpen &&
        !conciergeOpen &&
        !mobileMenuOpen &&
        !activeModal &&
        document.activeElement?.tagName !== 'INPUT' &&
        document.activeElement?.tagName !== 'TEXTAREA' &&
        document.activeElement?.tagName !== 'SELECT'
      ) {
        e.preventDefault();
        catalogHostRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        });
        window.setTimeout(() => searchInputRef.current?.focus(), 220);
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [
    drawerOpen,
    profileDrawerOpen,
    compareModalOpen,
    conciergeOpen,
    mobileMenuOpen,
    activeModal,
  ]);

  const showToast = useCallback((message: string) => {
    setToastMessage(message);
    if (toastTimerRef.current !== null) {
      window.clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = window.setTimeout(() => {
      setToastMessage(null);
      toastTimerRef.current = null;
    }, 3200);
  }, []);

  const selectStage = (idx: number) => {
    const clampedIdx = Math.max(0, Math.min(SHOWCASE_STAGES.length - 1, idx));
    const prefersReduced = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;

    const st = showcaseTriggerRef.current;
    if (st && st.isActive) {
      const stageProgress = [0, 1.15 / 3.5, 2.2 / 3.5, 3.35 / 3.5][clampedIdx];
      const targetScroll = st.start + (st.end - st.start) * stageProgress;
      window.scrollTo({
        top: targetScroll,
        behavior: prefersReduced ? 'auto' : 'smooth',
      });
    }

    const stageChanged = clampedIdx !== stageIdxRef.current;
    stageIdxRef.current = clampedIdx;

    if (stageChanged) {
      setCaptionBlur(true);
      if (stageTimerRef.current !== null) {
        window.clearTimeout(stageTimerRef.current);
      }
      stageTimerRef.current = window.setTimeout(() => {
        stageTimerRef.current = null;
        setActiveStage(clampedIdx);
        setCaptionBlur(false);
      }, 110);
    } else {
      setActiveStage(clampedIdx);
    }

    frameRefs.current.forEach((frame, i) => {
      if (!frame) return;
      const targetClip = i <= clampedIdx ? 'inset(0 0 0 0%)' : 'inset(0 0 0 100%)';
      if (prefersReduced) {
        gsap.set(frame, { clipPath: targetClip });
      } else {
        gsap.to(frame, {
          clipPath: targetClip,
          duration: 0.42,
          ease: 'power3.out',
          overwrite: 'auto',
        });
      }
    });
  };

  const handleShowcaseTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length !== 1) return;
    const target = e.target as HTMLElement | null;
    if (target?.closest('button')) return;

    const touch = e.touches[0];
    const rect = e.currentTarget.getBoundingClientRect();
    showcaseSwipeRef.current = {
      active: true,
      startX: touch.clientX,
      startY: touch.clientY,
      lastX: touch.clientX,
      startTime: performance.now(),
      startStage: stageIdxRef.current,
      lockedAxis: null,
      viewportWidth: Math.max(1, rect.width),
    };
  };

  const handleShowcaseTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    const swipe = showcaseSwipeRef.current;
    if (!swipe.active || e.touches.length !== 1) return;

    const touch = e.touches[0];
    const dx = touch.clientX - swipe.startX;
    const dy = touch.clientY - swipe.startY;
    swipe.lastX = touch.clientX;

    if (swipe.lockedAxis === null) {
      if (Math.hypot(dx, dy) < 8) return;
      if (Math.abs(dx) > Math.abs(dy) * 1.15) {
        swipe.lockedAxis = 'x';
        setIsSwipingShowcase(true);
      } else {
        swipe.lockedAxis = 'y';
        swipe.active = false;
        return;
      }
    }

    if (swipe.lockedAxis !== 'x') return;

    const progress = Math.min(1, Math.abs(dx) / swipe.viewportWidth);
    const { startStage } = swipe;

    if (dx < 0) {
      if (startStage < SHOWCASE_STAGES.length - 1) {
        const nextFrame = frameRefs.current[startStage + 1];
        if (nextFrame) {
          gsap.killTweensOf(nextFrame);
          nextFrame.style.clipPath = `inset(0 0 0 ${((1 - progress) * 100).toFixed(2)}%)`;
        }
      } else if (showcaseFramesWrapRef.current) {
        gsap.killTweensOf(showcaseFramesWrapRef.current);
        showcaseFramesWrapRef.current.style.transform = `translate3d(${(dx * 0.14).toFixed(1)}px, 0, 0)`;
      }
    } else if (dx > 0) {
      if (startStage > 0) {
        const currentFrame = frameRefs.current[startStage];
        if (currentFrame) {
          gsap.killTweensOf(currentFrame);
          currentFrame.style.clipPath = `inset(0 0 0 ${(progress * 100).toFixed(2)}%)`;
        }
      } else if (showcaseFramesWrapRef.current) {
        gsap.killTweensOf(showcaseFramesWrapRef.current);
        showcaseFramesWrapRef.current.style.transform = `translate3d(${(dx * 0.14).toFixed(1)}px, 0, 0)`;
      }
    }
  };

  const handleShowcaseTouchEnd = () => {
    const swipe = showcaseSwipeRef.current;
    if (!swipe.active) return;

    const wasHorizontal = swipe.lockedAxis === 'x';
    const dx = swipe.lastX - swipe.startX;
    const elapsed = Math.max(1, performance.now() - swipe.startTime);
    const velocity = dx / elapsed;
    const { startStage, viewportWidth } = swipe;

    swipe.active = false;
    swipe.lockedAxis = null;
    setIsSwipingShowcase(false);

    if (showcaseFramesWrapRef.current) {
      gsap.to(showcaseFramesWrapRef.current, {
        x: 0,
        duration: 0.32,
        ease: 'power3.out',
        clearProps: 'transform',
      });
    }

    if (!wasHorizontal) return;

    const distanceThreshold = Math.min(54, viewportWidth * 0.16);
    const isFastFlick = Math.abs(velocity) >= 0.35 && Math.abs(dx) >= 22;

    if ((dx <= -distanceThreshold || (isFastFlick && dx < 0)) && startStage < SHOWCASE_STAGES.length - 1) {
      setHasSwipedShowcase(true);
      selectStage(startStage + 1);
    } else if ((dx >= distanceThreshold || (isFastFlick && dx > 0)) && startStage > 0) {
      setHasSwipedShowcase(true);
      selectStage(startStage - 1);
    } else {
      selectStage(startStage);
    }
  };

  const handleShowcaseKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      setHasSwipedShowcase(true);
      selectStage(stageIdxRef.current + 1);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      setHasSwipedShowcase(true);
      selectStage(stageIdxRef.current - 1);
    }
  };

  const updateSplit = (pct: number, animate: boolean) => {
    const clamped = Math.max(0, Math.min(100, pct));
    setSplitAnimate(animate);
    setSplitPct(clamped);
  };

  const handleCompPointerDown = (e: {
    currentTarget: HTMLDivElement;
    pointerId: number;
    clientX: number;
  }) => {
    isDraggingRef.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    const rect = e.currentTarget.getBoundingClientRect();
    updateSplit(((e.clientX - rect.left) / rect.width) * 100, false);
  };

  const handleCompPointerMove = (e: {
    currentTarget: HTMLDivElement;
    clientX: number;
  }) => {
    if (!isDraggingRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    updateSplit(((e.clientX - rect.left) / rect.width) * 100, false);
  };

  const handleCompPointerUp = () => {
    isDraggingRef.current = false;
  };

  const triggerFastFlowPulse = useCallback(() => {
    setFastFlowSignal((n) => n + 1);
    setFastFlowSurging(true);
    if (fastFlowTimerRef.current !== null) {
      window.clearTimeout(fastFlowTimerRef.current);
    }
    fastFlowTimerRef.current = window.setTimeout(() => {
      setFastFlowSurging(false);
    }, 950);
  }, []);

  useEffect(() => {
    return () => {
      if (fastFlowTimerRef.current !== null) {
        window.clearTimeout(fastFlowTimerRef.current);
      }
    };
  }, []);

  const selectFinish = (nextFinish: FinishId) => {
    selectedConfigRef.current.finish = nextFinish;
    setFinish(nextFinish);
    triggerFastFlowPulse();
  };

  const selectSize = (nextSize: SizeLabel, nextPrice: number) => {
    selectedConfigRef.current.size = nextSize;
    selectedConfigRef.current.price = nextPrice;
    setSize(nextSize);
    setPrice(nextPrice);
    triggerFastFlowPulse();
  };

  const handleAddCatalogProduct = useCallback(
    (payload: AddToBagPayload) => {
      const key = `${payload.product.id}__${payload.finish.id}__${payload.sizeLabel}`;
      setBag((prev) => {
        const idx = prev.findIndex((item) => item.key === key);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = { ...next[idx], qty: next[idx].qty + payload.qty };
          return next;
        }
        return [
          ...prev,
          {
            key,
            productId: payload.product.id,
            name: payload.product.name,
            finishName: payload.finish.name,
            finishId: payload.finish.id,
            finishHex: payload.finish.hex,
            finishIsTransparent: payload.finish.isTransparent,
            finishFilter: payload.finish.filter,
            sizeLabel: payload.sizeLabel,
            price: payload.unitPrice,
            qty: payload.qty,
            image: payload.product.image,
          },
        ];
      });
      showToast(`Added ${payload.product.name} (${payload.sizeLabel}) to bag`);
    },
    [showToast]
  );

  const handleCopyLaunchCode = useCallback(() => {
    const code = 'WATER10';
    if (navigator.clipboard?.writeText) {
      void navigator.clipboard.writeText(code).catch(() => {});
    }
    setPromoCopied(true);
    showToast('Copied code WATER10 — apply in your bag for 10% off');
    window.setTimeout(() => setPromoCopied(false), 2400);
  }, [showToast]);

  const addFlagshipToBag = () => {
    const activeCfg = selectedConfigRef.current;
    const finishMeta = FINISH_META[activeCfg.finish];
    const isPinkPremium = activeCfg.finish === 'pink';
    const finalPrice = activeCfg.price + (finishMeta.premiumDelta ?? 0);
    const cleanedMonogram = engravingEnabled
      ? engravingText.trim().slice(0, 12)
      : '';
    const fontTag =
      engravingFont === 'serif'
        ? 'Serif'
        : engravingFont === 'mono'
          ? 'Mono'
          : 'Sans';
    const engravingSuffix = cleanedMonogram
      ? ` · Engraved "${cleanedMonogram}" (${fontTag})`
      : '';
    const key = `${isPinkPremium ? 'wh-001' : 'wh-002'}__${activeCfg.finish}__${activeCfg.size}${
      cleanedMonogram
        ? `__eng_${cleanedMonogram.toLowerCase()}_${engravingFont}_${engravingOrientation}`
        : ''
    }`;
    const roseProduct = PRODUCTS[0];
    setBag((prev) => {
      const idx = prev.findIndex((item) => item.key === key);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], qty: next[idx].qty + 1 };
        return next;
      }
      return [
        ...prev,
        {
          key,
          productId: isPinkPremium ? roseProduct.id : 'wh-002',
          name: isPinkPremium
            ? 'Waterholic Rose Quartz Premium Bottle'
            : 'Waterholic Flagship Flask',
          finishName: finishMeta.name,
          finishId: activeCfg.finish,
          finishHex: finishMeta.dot,
          finishIsTransparent: finishMeta.isTransparent,
          finishFilter: isPinkPremium ? undefined : finishMeta.filter,
          sizeLabel: `${activeCfg.size}${engravingSuffix}`,
          price: finalPrice,
          qty: 1,
          image: isPinkPremium ? roseProduct.image : bottleStudioLogoImg,
        },
      ];
    });
    if (cleanedMonogram) {
      showToast(`Added custom laser-engraved "${cleanedMonogram}" flask to bag`);
    }
    setDrawerOpen(true);
  };

  const handleAddBundleToBag = useCallback(
    (bundleItem: BagLineItem) => {
      setBag((prev) => {
        const idx = prev.findIndex((item) => item.key === bundleItem.key);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = { ...next[idx], qty: next[idx].qty + 1 };
          return next;
        }
        return [...prev, bundleItem];
      });
      showToast(`Added ${bundleItem.name} to bag`);
    },
    [showToast]
  );

  const handleUnlockStudentDiscount = useCallback(
    (email: string) => {
      setStudentEmail(email);
      setStudentDiscountActive(true);
      showToast('15% Student Discount unlocked for your bag');
    },
    [showToast]
  );

  const updateBagQty = (key: string, delta: number) => {
    setBag((prev) => {
      const idx = prev.findIndex((item) => item.key === key);
      if (idx < 0) return prev;
      const next = [...prev];
      const updatedQty = next[idx].qty + delta;
      if (updatedQty <= 0) {
        next.splice(idx, 1);
      } else {
        next[idx] = { ...next[idx], qty: updatedQty };
      }
      return next;
    });
  };

  const updateBagItemGift = useCallback(
    (key: string, gift: BagItemGiftOptions | undefined) => {
      setBag((prev) =>
        prev.map((item) => {
          if (item.key !== key) return item;
          if (!gift) {
            const next = { ...item };
            delete next.gift;
            return next;
          }
          return { ...item, gift };
        })
      );
    },
    []
  );

  const removeBagItem = (key: string) => {
    setBag((prev) => prev.filter((item) => item.key !== key));
  };

  const toggleSaveProduct = useCallback((productId: string) => {
    setSavedIds((prev) => {
      const next = new Set(prev);
      if (next.has(productId)) {
        next.delete(productId);
      } else {
        next.add(productId);
      }
      return next;
    });
  }, []);

  const handleOpenQuickView = useCallback(
    (product: Product, finishId?: string) => {
      setActiveModal({ product, finishId });
      setRecentlyViewedIds((prev) =>
        [product.id, ...prev.filter((id) => id !== product.id)].slice(0, 6)
      );
    },
    []
  );

  const handleToggleCompare = useCallback(
    (productId: string) => {
      setCompareIds((prev) => {
        if (prev.includes(productId)) {
          return prev.filter((id) => id !== productId);
        }
        if (prev.length >= 3) {
          showToast('You can compare up to 3 products side by side');
          return prev;
        }
        return [...prev, productId];
      });
    },
    [showToast]
  );

  const handleUpdateProfile = useCallback(
    (next: UserProfile) => {
      setProfile(next);
      const emailLower = next.email.trim().toLowerCase();
      if (
        emailLower.endsWith('.edu') ||
        emailLower.includes('.edu.') ||
        emailLower.includes('.ac.')
      ) {
        setStudentEmail(next.email.trim());
        setStudentDiscountActive(true);
      }
      showToast('Web profile updated');
    },
    [showToast]
  );

  const milestoneStats: HydrationMilestoneStats = useMemo(
    () =>
      computeHydrationMilestoneStats(
        hydrationHistory,
        hydration.dateKey,
        hydration.consumedMl,
        profile.dailyGoalMl
      ),
    [hydrationHistory, hydration.dateKey, hydration.consumedMl, profile.dailyGoalMl]
  );

  useEffect(() => {
    const evaluated = evaluateMilestones(milestoneStats);
    const currentlyUnlocked = evaluated
      .filter((item) => item.unlocked)
      .map((item) => item.badge.id);

    if (knownUnlockedBadgeIdsRef.current === null) {
      knownUnlockedBadgeIdsRef.current = new Set(currentlyUnlocked);
      return;
    }

    const newlyUnlocked = currentlyUnlocked.filter(
      (id) => !knownUnlockedBadgeIdsRef.current?.has(id)
    );

    if (newlyUnlocked.length > 0) {
      newlyUnlocked.forEach((id) => knownUnlockedBadgeIdsRef.current?.add(id));
      setRecentlyUnlockedBadgeIds((prev) =>
        Array.from(new Set([...prev, ...newlyUnlocked]))
      );
      const titles = newlyUnlocked
        .map(
          (id) => evaluated.find((item) => item.badge.id === id)?.badge.title
        )
        .filter((v): v is string => Boolean(v));
      if (titles.length > 0) {
        showToast(`Milestone Medal Unlocked: ${titles.join(' & ')}`);
      }
    }
  }, [milestoneStats, showToast]);

  const handleLogWater = useCallback(
    (label: string, ml: number) => {
      const today = getTodayKey();
      const timeStr = new Date().toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
      });
      setHydration((prev) => {
        const base =
          prev.dateKey === today
            ? prev
            : { dateKey: today, consumedMl: 0, entries: [] };
        return {
          dateKey: today,
          consumedMl: base.consumedMl + ml,
          entries: [
            { id: `hyd-${Date.now()}`, label, ml, time: timeStr },
            ...base.entries,
          ],
        };
      });
      showToast(`Logged +${ml} ml to today's hydration goal`);
    },
    [showToast]
  );

  const handleResetWater = useCallback(() => {
    setHydration({ dateKey: getTodayKey(), consumedMl: 0, entries: [] });
    showToast('Daily hydration log reset');
  }, [showToast]);

  const handleAddAddress = useCallback(
    (addr: Omit<SavedAddress, 'id'>) => {
      const id = `addr-${Date.now()}`;
      setAddresses((prev) => {
        const list = addr.isDefault
          ? prev.map((a) => ({ ...a, isDefault: false }))
          : prev;
        return [{ ...addr, id }, ...list];
      });
      showToast(`Saved "${addr.label}" address`);
    },
    [showToast]
  );

  const handleDeleteAddress = useCallback((id: string) => {
    setAddresses((prev) => {
      const filtered = prev.filter((a) => a.id !== id);
      if (filtered.length > 0 && !filtered.some((a) => a.isDefault)) {
        filtered[0] = { ...filtered[0], isDefault: true };
      }
      return filtered;
    });
  }, []);

  const handleSetDefaultAddress = useCallback((id: string) => {
    setAddresses((prev) =>
      prev.map((a) => ({ ...a, isDefault: a.id === id }))
    );
  }, []);

  const handleOrderPlaced = useCallback(
    (order: OrderRecord) => {
      setOrders((prev) => [order, ...prev]);
      if (user) {
        void saveOrderToCloud(order).catch(() => {});
      }
    },
    [user, saveOrderToCloud]
  );

  const handleReorderItems = useCallback(
    (itemsToReorder: BagLineItem[]) => {
      setBag((prev) => {
        const next = [...prev];
        for (const incoming of itemsToReorder) {
          const idx = next.findIndex((item) => item.key === incoming.key);
          if (idx >= 0) {
            next[idx] = { ...next[idx], qty: next[idx].qty + incoming.qty };
          } else {
            next.push({ ...incoming });
          }
        }
        return next;
      });
      setDrawerOpen(true);
      showToast('Order items added back to your bag');
    },
    [showToast]
  );

  const handleSubmitReview = useCallback(
    (productId: string, review: Omit<ProductReview, 'id' | 'date'>) => {
      const newRev: ProductReview = {
        ...review,
        id: `rev-${Date.now()}`,
        date: new Date().toLocaleDateString('en-US', {
          month: 'short',
          year: 'numeric',
        }),
      };
      setCustomReviews((prev) => ({
        ...prev,
        [productId]: [newRev, ...(prev[productId] ?? [])],
      }));
      showToast('Thank you — your review is now live');
    },
    [showToast]
  );

  const openProfileAt = useCallback((tab: ProfileTab = 'overview') => {
    setProfileInitialTab(tab);
    setProfileDrawerOpen(true);
  }, []);

  const jumpToSearch = () => {
    catalogHostRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    window.setTimeout(() => {
      searchInputRef.current?.focus();
    }, 280);
  };

  const jumpToCategory = (catId: CategoryId) => {
    setShowSavedOnly(false);
    setSelectedCategory(catId);
    catalogHostRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const recentlyViewedProducts = useMemo(
    () =>
      recentlyViewedIds
        .map((id) => PRODUCTS.find((p) => p.id === id))
        .filter((p): p is Product => Boolean(p)),
    [recentlyViewedIds]
  );

  const comparedProducts = useMemo(
    () =>
      compareIds
        .map((id) => PRODUCTS.find((p) => p.id === id))
        .filter((p): p is Product => Boolean(p)),
    [compareIds]
  );

  const profileInitials =
    profile.name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('') || 'WH';

  const totalQty = bag.reduce((sum, item) => sum + item.qty, 0);
  const activeScale =
    SIZE_OPTIONS.find((s) => s.size === size)?.scale ?? 1.0;
  const heroFlagshipId = finish === 'pink' ? PRODUCTS[0].id : 'wh-002';
  const heroFlagshipName =
    finish === 'pink'
      ? 'Waterholic Rose Quartz Premium Bottle'
      : 'Waterholic Flagship Flask';
  const isHeroFlagshipSaved = savedIds.has(heroFlagshipId);

  const handleToggleHeroWishlist = () => {
    const nextSaved = !isHeroFlagshipSaved;
    toggleSaveProduct(heroFlagshipId);
    showToast(
      nextSaved
        ? `Saved ${heroFlagshipName} to your wishlist`
        : `Removed ${heroFlagshipName} from wishlist`
    );
  };

  return (
    <>
      <div className="scroll-progress-track" aria-hidden="true">
        <div ref={scrollProgressRef} className="scroll-progress-bar" />
      </div>

      <div className="grain-overlay" aria-hidden="true" />

      {announcementVisible && (
        <div
          className={`launch-ribbon${showLaunchRibbon ? ' is-revealed' : ''}`}
          role="region"
          aria-label="Global Launch Announcement"
          aria-hidden={!showLaunchRibbon}
        >
          <div className="container launch-ribbon-inner">
            <div className="launch-ribbon-copy">
              <span className="launch-ribbon-dot" aria-hidden="true" />
              <span className="launch-ribbon-text">
                <strong>Global Launch Edition</strong> · Free Laser Monogramming
                &amp; Express Shipping $60+
              </span>
              <button
                type="button"
                className="launch-ribbon-code-btn"
                onClick={handleCopyLaunchCode}
                aria-label="Copy 10% launch promo code WATER10"
                tabIndex={showLaunchRibbon ? 0 : -1}
              >
                {promoCopied ? (
                  <>
                    <Check size={12} aria-hidden="true" />
                    <span>Copied WATER10</span>
                  </>
                ) : (
                  <>
                    <Copy size={12} aria-hidden="true" />
                    <span>10% Off: WATER10</span>
                  </>
                )}
              </button>
            </div>

            <div className="launch-ribbon-right">
              <button
                type="button"
                className="launch-ribbon-finder-btn"
                onClick={() => setFinderOpen(true)}
                tabIndex={showLaunchRibbon ? 0 : -1}
              >
                <Compass size={13} aria-hidden="true" />
                <span>30s Vessel Finder</span>
              </button>
              <button
                type="button"
                className="launch-ribbon-dismiss"
                aria-label="Dismiss launch announcement"
                onClick={() => setAnnouncementVisible(false)}
                tabIndex={showLaunchRibbon ? 0 : -1}
              >
                <X size={14} aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      )}

      <header className="site-header" id="site-header">
        <div className="container header-inner">
          <a href="#hero" className="brand-lockup" aria-label="Waterholic Home">
            <svg
              className="brand-mark"
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M12 2.5C12 2.5 5.5 10.2 5.5 15a6.5 6.5 0 0 0 13 0c0-4.8-6.5-12.5-6.5-12.5Z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinejoin="round"
              />
              <path
                d="M9.2 15.6a2.8 2.8 0 0 0 2.8 2.8"
                stroke="currentColor"
                strokeWidth="1.9"
                strokeLinecap="round"
              />
            </svg>
            <span className="brand-wordmark">Waterholic</span>
          </a>

          <nav className="header-nav" aria-label="Primary">
            <a href="#catalog" className="nav-link">
              Catalog
            </a>
            <a href="#studio-3d" className="nav-link">
              3D Studio
            </a>
            <a href="#creative-lab" className="nav-link">
              AI Lab
            </a>
            <a href="#campus" className="nav-link">
              Campus
            </a>
            <a href="#support" className="nav-link">
              Support
            </a>

            <button
              type="button"
              className="concierge-nav-btn"
              onClick={() => setConciergeOpen(true)}
              aria-label="Open Waterholic AI Hydration Concierge"
              title="AI Concierge, Search & Maps Grounding, Live Voice"
            >
              <Sparkles size={15} aria-hidden="true" />
              <span>AI Concierge</span>
            </button>

            <button
              type="button"
              className="icon-btn header-search-btn"
              aria-label={`Search ${PRODUCTS.length} products`}
              title="Search products (Press /)"
              onClick={jumpToSearch}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </button>

            <button
              type="button"
              className={`icon-btn soundscape-toggle${
                soundscapeEnabled ? ' is-enabled' : ''
              }${soundscapeEnabled && soundscapePlaying ? ' is-playing' : ''}`}
              id="soundscape-toggle"
              aria-pressed={soundscapeEnabled}
              aria-label={
                soundscapeEnabled
                  ? `Mute atmospheric soundscape (${DAYPART_META[activeDaypart].soundscapeName})`
                  : `Enable atmospheric soundscape (${DAYPART_META[activeDaypart].soundscapeName})`
              }
              title={
                soundscapeEnabled
                  ? `Atmospheric soundscape: ${DAYPART_META[activeDaypart].soundscapeName} (click to mute)`
                  : `Enable atmospheric soundscape (${DAYPART_META[activeDaypart].soundscapeName})`
              }
              onClick={() => {
                const next = !soundscapeEnabled;
                setSoundscapeEnabled(next);
                const engine = soundscapeEngineRef.current;
                if (engine) {
                  engine.setState({
                    daypart: activeDaypart,
                    enabled: next,
                    volume: soundscapeVolume,
                    tabHidden: false,
                  });
                  if (next) {
                    void engine.unlockAndSync();
                  }
                }
                showToast(
                  next
                    ? `Atmospheric soundscape on — ${DAYPART_META[activeDaypart].soundscapeName}`
                    : 'Atmospheric soundscape muted'
                );
              }}
            >
              {soundscapeEnabled ? (
                soundscapePlaying ? (
                  <span className="soundscape-eq" aria-hidden="true">
                    <span />
                    <span />
                    <span />
                  </span>
                ) : (
                  <Volume2 size={18} strokeWidth={2} aria-hidden="true" />
                )
              ) : (
                <VolumeX size={18} strokeWidth={2} aria-hidden="true" />
              )}
            </button>

            <div className="theme-switcher-wrap" ref={themeMenuRef}>
              <button
                type="button"
                className={`icon-btn theme-toggle${
                  themeMode === 'auto' ? ' is-auto-synced' : ''
                }`}
                id="theme-toggle"
                aria-label={`Dynamic theme: ${DAYPART_META[activeDaypart].label} ${DAYPART_META[activeDaypart].paletteName}${
                  themeMode === 'auto' ? ' (Auto)' : ''
                }`}
                aria-expanded={themeMenuOpen}
                aria-haspopup="menu"
                title={`Time-of-day palette: ${DAYPART_META[activeDaypart].paletteName} (${
                  themeMode === 'auto' ? 'Auto' : 'Manual'
                })`}
                onClick={() => setThemeMenuOpen((prev) => !prev)}
              >
                {activeDaypart === 'morning' ? (
                  <Sunrise size={19} strokeWidth={2} aria-hidden="true" />
                ) : activeDaypart === 'evening' ? (
                  <Moon size={18} strokeWidth={2} aria-hidden="true" />
                ) : (
                  <Sun size={19} strokeWidth={2} aria-hidden="true" />
                )}
                {themeMode === 'auto' && (
                  <span className="theme-auto-pip" aria-hidden="true" />
                )}
              </button>

              {themeMenuOpen && (
                <div
                  className="circadian-popover"
                  role="menu"
                  aria-label="Time-of-day brand palette"
                >
                  <div className="circadian-popover-head">
                    <span className="circadian-popover-eyebrow">
                      Dynamic Time Palette
                    </span>
                    <span className="circadian-popover-clock tabular-nums">
                      <Clock size={12} aria-hidden="true" />
                      {formatShortLocalTime(clockNow)}
                    </span>
                  </div>

                  <button
                    type="button"
                    role="menuitemradio"
                    aria-checked={themeMode === 'auto'}
                    className={`circadian-option${
                      themeMode === 'auto' ? ' is-active' : ''
                    }`}
                    onClick={() => {
                      setClockNow(new Date());
                      setThemeMode('auto');
                      setThemeMenuOpen(false);
                      showToast(
                        `Synced to local time — ${DAYPART_META[liveClockDaypart].paletteName} palette`
                      );
                    }}
                  >
                    <span
                      className="circadian-swatch circadian-swatch--auto"
                      aria-hidden="true"
                    />
                    <span className="circadian-option-copy">
                      <span className="circadian-option-title">
                        Auto · Time of Day
                      </span>
                      <span className="circadian-option-sub">
                        Now: {DAYPART_META[liveClockDaypart].label} (
                        {DAYPART_META[liveClockDaypart].paletteName})
                      </span>
                    </span>
                    {themeMode === 'auto' && (
                      <Check size={15} className="circadian-check" aria-hidden="true" />
                    )}
                  </button>

                  {(['morning', 'day', 'evening'] as Daypart[]).map((dp) => {
                    const meta = DAYPART_META[dp];
                    const selected = themeMode === dp;
                    return (
                      <button
                        key={dp}
                        type="button"
                        role="menuitemradio"
                        aria-checked={selected}
                        className={`circadian-option${
                          selected ? ' is-active' : ''
                        }`}
                        onClick={() => {
                          setThemeMode(dp);
                          setThemeMenuOpen(false);
                          if (soundscapeEnabled && soundscapeEngineRef.current) {
                            soundscapeEngineRef.current.setState({
                              daypart: dp,
                              enabled: true,
                              volume: soundscapeVolume,
                              tabHidden: false,
                            });
                            void soundscapeEngineRef.current.unlockAndSync();
                          }
                          showToast(
                            soundscapeEnabled
                              ? `${meta.label} · ${meta.paletteName} (${meta.soundscapeName})`
                              : `Switched to ${meta.label} · ${meta.paletteName} palette`
                          );
                        }}
                      >
                        <span
                          className="circadian-swatch"
                          style={{
                            background: `linear-gradient(135deg, ${meta.swatchSurface} 45%, ${meta.swatchPrimary} 45%)`,
                          }}
                          aria-hidden="true"
                        />
                        <span className="circadian-option-copy">
                          <span className="circadian-option-title">
                            {meta.label} · {meta.paletteName}
                          </span>
                          <span className="circadian-option-sub tabular-nums">
                            {meta.windowLabel}
                          </span>
                        </span>
                        {selected && (
                          <Check
                            size={15}
                            className="circadian-check"
                            aria-hidden="true"
                          />
                        )}
                      </button>
                    );
                  })}

                  <div className="circadian-soundscape-box">
                    <div className="circadian-soundscape-head">
                      <div className="circadian-soundscape-copy">
                        <span className="circadian-soundscape-eyebrow">
                          Atmospheric Soundscape
                        </span>
                        <span className="circadian-soundscape-track">
                          {DAYPART_META[activeDaypart].soundscapeName}
                        </span>
                      </div>
                      <button
                        type="button"
                        className={`circadian-sound-pill${
                          soundscapeEnabled ? ' is-on' : ''
                        }`}
                        aria-pressed={soundscapeEnabled}
                        onClick={() => {
                          const next = !soundscapeEnabled;
                          setSoundscapeEnabled(next);
                          const engine = soundscapeEngineRef.current;
                          if (engine) {
                            engine.setState({
                              daypart: activeDaypart,
                              enabled: next,
                              volume: soundscapeVolume,
                              tabHidden: false,
                            });
                            if (next) void engine.unlockAndSync();
                          }
                        }}
                      >
                        {soundscapeEnabled ? 'On' : 'Off'}
                      </button>
                    </div>
                    <p className="circadian-soundscape-sub">
                      {DAYPART_META[activeDaypart].soundscapeSubtitle}
                    </p>
                    <label className="circadian-volume-row">
                      <span className="circadian-volume-label">Level</span>
                      <input
                        type="range"
                        min={10}
                        max={100}
                        step={2}
                        value={Math.round(soundscapeVolume * 100)}
                        disabled={!soundscapeEnabled}
                        aria-label="Atmospheric soundscape volume"
                        className="circadian-volume-slider"
                        onChange={(e) => {
                          const nextVol = Number(e.target.value) / 100;
                          setSoundscapeVolume(nextVol);
                          if (soundscapeEnabled && soundscapeEngineRef.current) {
                            soundscapeEngineRef.current.setState({
                              daypart: activeDaypart,
                              enabled: true,
                              volume: nextVol,
                              tabHidden: false,
                            });
                            void soundscapeEngineRef.current.unlockAndSync();
                          }
                        }}
                      />
                      <span className="circadian-volume-val tabular-nums">
                        {Math.round(soundscapeVolume * 100)}%
                      </span>
                    </label>
                  </div>
                </div>
              )}
            </div>

            <button
              type="button"
              className="profile-nav-btn"
              aria-label="Open web profile and order history"
              title="Web Profile, Hydration Tracker & Orders"
              onClick={() => openProfileAt('overview')}
            >
              <span className="profile-nav-avatar" aria-hidden="true">
                {profileInitials}
              </span>
              <span className="profile-nav-label">Profile</span>
            </button>

            <button
              type="button"
              className="icon-btn bag-trigger"
              id="bag-trigger"
              aria-label="Open order bag"
              onClick={() => setDrawerOpen(true)}
            >
              <svg
                width="19"
                height="19"
                viewBox="0 0 256 256"
                fill="none"
                aria-hidden="true"
              >
                <rect
                  x="32"
                  y="72"
                  width="192"
                  height="144"
                  rx="16"
                  stroke="currentColor"
                  strokeWidth="18"
                />
                <path
                  d="M88 72V64a40 40 0 0 1 80 0v8"
                  stroke="currentColor"
                  strokeWidth="18"
                  strokeLinecap="round"
                />
              </svg>
              <span className="bag-count tabular-nums" id="bag-count">
                {totalQty}
              </span>
            </button>

            <button
              type="button"
              className="icon-btn mobile-menu-btn"
              aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-nav-drawer"
              onClick={() => setMobileMenuOpen((v) => !v)}
            >
              {mobileMenuOpen ? (
                <X size={19} aria-hidden="true" />
              ) : (
                <Menu size={19} aria-hidden="true" />
              )}
            </button>
          </nav>
        </div>
      </header>

      {/* Mobile Navigation Drawer */}
      <div
        className="mobile-nav-backdrop"
        hidden={!mobileMenuOpen}
        onClick={() => setMobileMenuOpen(false)}
      />
      <nav
        id="mobile-nav-drawer"
        className="mobile-nav-drawer"
        aria-label="Mobile navigation"
        hidden={!mobileMenuOpen}
        data-lenis-prevent
      >
        <div className="mobile-nav-head">
          <span className="mobile-nav-title">Menu</span>
          <button
            type="button"
            className="icon-btn"
            aria-label="Close navigation menu"
            onClick={() => setMobileMenuOpen(false)}
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <div className="mobile-nav-links">
          <a
            href="#catalog"
            className="mobile-nav-link"
            onClick={() => setMobileMenuOpen(false)}
          >
            <span>Catalog ({PRODUCTS.length} Products)</span>
            <span aria-hidden="true">→</span>
          </a>
          <a
            href="#studio-3d"
            className="mobile-nav-link"
            onClick={() => setMobileMenuOpen(false)}
          >
            <span>3D Bottle Studio</span>
            <span aria-hidden="true">→</span>
          </a>
          <a
            href="#creative-lab"
            className="mobile-nav-link"
            onClick={() => setMobileMenuOpen(false)}
          >
            <span>AI Creative Lab</span>
            <span aria-hidden="true">→</span>
          </a>
          <a
            href="#campus"
            className="mobile-nav-link"
            onClick={() => setMobileMenuOpen(false)}
          >
            <span>Campus &amp; Hydration Challenges</span>
            <span aria-hidden="true">→</span>
          </a>
          <a
            href="#bundles"
            className="mobile-nav-link"
            onClick={() => setMobileMenuOpen(false)}
          >
            <span>Curated Ritual Sets (Save $26)</span>
            <span aria-hidden="true">→</span>
          </a>
          <a
            href="#impact"
            className="mobile-nav-link"
            onClick={() => setMobileMenuOpen(false)}
          >
            <span>Materials Lab &amp; Impact Ledger</span>
            <span aria-hidden="true">→</span>
          </a>
          <a
            href="#order"
            className="mobile-nav-link"
            onClick={() => setMobileMenuOpen(false)}
          >
            <span>Bespoke Laser Engraving Studio</span>
            <span aria-hidden="true">→</span>
          </a>
          <a
            href="#support"
            className="mobile-nav-link"
            onClick={() => setMobileMenuOpen(false)}
          >
            <span>Support &amp; Warranty</span>
            <span aria-hidden="true">→</span>
          </a>
        </div>

        <div className="mobile-nav-actions">
          <button
            type="button"
            className="btn btn-primary btn-full"
            onClick={() => {
              setMobileMenuOpen(false);
              setFinderOpen(true);
            }}
          >
            <Compass size={16} aria-hidden="true" />
            <span>Take 30s Vessel Finder</span>
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-full"
            onClick={() => {
              setMobileMenuOpen(false);
              setConciergeOpen(true);
            }}
          >
            <Sparkles size={16} aria-hidden="true" />
            <span>Open AI Concierge</span>
          </button>
          <div className="mobile-nav-action-row">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => {
                setMobileMenuOpen(false);
                jumpToSearch();
              }}
            >
              Search Catalog
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => {
                setMobileMenuOpen(false);
                openProfileAt('overview');
              }}
            >
              Web Profile
            </button>
          </div>
        </div>
      </nav>

      <main>
        {/* SECTION 1: Asymmetric Split Hero */}
        <section id="hero" ref={heroSectionRef} className="hero">
          <canvas
            ref={heroCanvasRef}
            id="hero-gl-canvas"
            className="hero-canvas"
            aria-hidden="true"
          />

          <div className="container hero-grid">
            <div className="hero-copy">
              <h1 className="hero-title">Pure hydration, engineered to flow.</h1>
              <p className="hero-sub">
                From vacuum-insulated steel bottles and UV-C purifiers to dorm
                glass pitchers, mineral springs, and clear iceware — explore{' '}
                {PRODUCTS.length} essentials built for everyday hydration and
                campus life.
              </p>

              <div className="hero-actions">
                <div className="hero-primary-cluster">
                  <a href="#catalog" className="btn btn-primary magnetic-btn">
                    Browse {PRODUCTS.length} Products
                  </a>
                  <button
                    type="button"
                    className={`hero-wishlist-btn${
                      isHeroFlagshipSaved ? ' is-saved' : ''
                    }`}
                    aria-pressed={isHeroFlagshipSaved}
                    aria-label={
                      isHeroFlagshipSaved
                        ? `Remove ${heroFlagshipName} from wishlist`
                        : `Save ${heroFlagshipName} to wishlist`
                    }
                    title={
                      isHeroFlagshipSaved
                        ? `Saved in Wishlist — ${heroFlagshipName}`
                        : `Bookmark ${heroFlagshipName}`
                    }
                    data-testid="hero-wishlist-btn"
                    onClick={handleToggleHeroWishlist}
                  >
                    <Heart
                      size={20}
                      strokeWidth={2}
                      fill={isHeroFlagshipSaved ? 'currentColor' : 'none'}
                      aria-hidden="true"
                    />
                  </button>
                </div>
                <a href="#campus" className="btn btn-ghost">
                  For College Students
                  <svg
                    width="17"
                    height="17"
                    viewBox="0 0 256 256"
                    fill="none"
                    aria-hidden="true"
                  >
                    <line
                      x1="64"
                      y1="64"
                      x2="192"
                      y2="192"
                      stroke="currentColor"
                      strokeWidth="20"
                      strokeLinecap="round"
                    />
                    <polyline
                      points="88 192 192 192 192 88"
                      stroke="currentColor"
                      strokeWidth="20"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </a>
              </div>

              <div className="hero-meta-strip tabular-nums">
                <span>{PRODUCTS.length} Water Essentials</span>
                <span aria-hidden="true">·</span>
                <span>6 Colours Each</span>
                <span aria-hidden="true">·</span>
                <span>15% Off for .edu Students</span>
              </div>
            </div>

            <div className="hero-stage" ref={heroStageRef} id="hero-stage">
              <div
                className="flask-tilt-wrap"
                ref={tiltWrapRef}
                id="flask-tilt-wrap"
              >
                <img
                  src="https://www.gstatic.com/aistudio/starter-apps/flask-applet/flask-cutout.webp"
                  alt="Waterholic Flask 950 ml with engraved Waterholic droplet logo and black chug lid"
                  className="flask-hero-img"
                  id="hero-flask-img"
                  data-finish={finish}
                  width={519}
                  height={940}
                />
                <BottleBrandMark finish={finish} variant="hero" />
              </div>
              <div className="flask-shadow" ref={shadowRef} aria-hidden="true" />

              <div
                className="hero-swatches"
                role="radiogroup"
                aria-label="Select flask finish"
              >
                {(Object.keys(FINISH_META) as FinishId[]).map((key) => {
                  const meta = FINISH_META[key];
                  const isActive = finish === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      role="radio"
                      className={`swatch-btn${isActive ? ' is-active' : ''}`}
                      data-finish={key}
                      aria-checked={isActive}
                      aria-label={`${meta.name} finish`}
                      onClick={() => selectFinish(key)}
                    >
                      <span
                        className={`swatch-dot${meta.isTransparent ? ' swatch-transparent' : ''}`}
                        style={
                          meta.isTransparent
                            ? undefined
                            : { background: meta.dot }
                        }
                      />
                      <span className="swatch-label">{meta.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 1.5: Global Editorial Press Recognition & Brand Guarantee Strip */}
        <PressAndGuaranteeStrip onOpenFinder={() => setFinderOpen(true)} />

        {/* SECTION 2: Full 106-Product Interactive Water Storefront */}
        <div ref={catalogHostRef}>
          <CatalogSection
            selectedCategory={selectedCategory}
            onSelectCategory={setSelectedCategory}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            searchInputRef={searchInputRef}
            savedIds={savedIds}
            onToggleSave={toggleSaveProduct}
            showSavedOnly={showSavedOnly}
            onToggleSavedOnly={setShowSavedOnly}
            compareIds={compareIds}
            onToggleCompare={handleToggleCompare}
            recentlyViewed={recentlyViewedProducts}
            onQuickView={handleOpenQuickView}
            onAddToBag={handleAddCatalogProduct}
          />
        </div>

        {/* SECTION 2.5: Waterholic Campus Edition — Special Use for College Students */}
        <CampusSection
          studentDiscountActive={studentDiscountActive}
          studentEmail={studentEmail}
          profile={profile}
          hydration={hydration}
          onUnlockStudentDiscount={handleUnlockStudentDiscount}
          onQuickViewProduct={handleOpenQuickView}
          onAddBundleToBag={handleAddBundleToBag}
          onLogWater={handleLogWater}
          onShowToast={showToast}
        />

        {/* SECTION 2.6: Curated Launch Ritual Sets */}
        <CuratedRitualBundles
          onQuickViewProduct={handleOpenQuickView}
          onAddProductToBag={handleAddCatalogProduct}
          onOpenFinder={() => setFinderOpen(true)}
          onShowToast={showToast}
        />

        {/* SECTION 2.7: Interactive Three.js 3D Bottle Studio */}
        <BottleStudio3D
          theme={theme}
          daypart={activeDaypart}
          activeFinish={finish}
          onSyncFinish={(nextFinish: StudioFinishKey) => selectFinish(nextFinish)}
          onAddConfiguredToBag={(cfg) => {
            const key = `studio3d__${cfg.finish}__${cfg.sizeLabel}`;
            const isPink = cfg.finish === 'pink';
            setBag((prev) => {
              const idx = prev.findIndex((item) => item.key === key);
              if (idx >= 0) {
                const next = [...prev];
                next[idx] = { ...next[idx], qty: next[idx].qty + 1 };
                return next;
              }
              return [
                ...prev,
                {
                  key,
                  productId: isPink ? PRODUCTS[0].id : 'wh-002',
                  name: isPink
                    ? 'Waterholic 3D Custom Rose Quartz Flask'
                    : 'Waterholic 3D Studio Flagship Flask',
                  finishName: cfg.finishName,
                  finishId: cfg.finish,
                  finishHex: cfg.finishHex,
                  finishIsTransparent: cfg.isTransparent,
                  sizeLabel: cfg.sizeLabel,
                  price: cfg.price,
                  qty: 1,
                  image: isPink ? PRODUCTS[0].image : bottleStudioLogoImg,
                },
              ];
            });
            setDrawerOpen(true);
            showToast(
              `Added 3D Studio ${cfg.finishName} (${cfg.sizeLabel}) to bag`
            );
          }}
          onSnapshotSaved={showToast}
        />

        {/* SECTION 2.8: Waterholic AI Creative Lab (Custom Images, Photo Edit, Text/Photo-to-Video Reels) */}
        <CreativeStudioSection onShowToast={showToast} />

        {/* SECTION 3: Pinned 4-Angle Environmental Showcase */}
        <section id="showcase" ref={showcaseRef} className="showcase-pin">
          <div
            className={`showcase-viewport${isSwipingShowcase ? ' is-swiping' : ''}`}
            id="showcase-viewport"
            role="region"
            aria-roledescription="carousel"
            aria-label="4-angle environmental bottle showcase"
            tabIndex={0}
            onTouchStart={handleShowcaseTouchStart}
            onTouchMove={handleShowcaseTouchMove}
            onTouchEnd={handleShowcaseTouchEnd}
            onTouchCancel={handleShowcaseTouchEnd}
            onKeyDown={handleShowcaseKeyDown}
          >
            <div
              className="showcase-frames"
              id="showcase-frames"
              ref={showcaseFramesWrapRef}
            >
              {SHOWCASE_STAGES.map((stage, i) => (
                <figure
                  key={stage.src}
                  ref={(el: HTMLElement | null) => {
                    frameRefs.current[i] = el;
                  }}
                  className={`showcase-frame${i === 0 ? ' is-active' : ''}`}
                  data-index={i}
                >
                  <img
                    src={stage.src}
                    alt={stage.alt}
                    className="showcase-img"
                    draggable={false}
                  />
                </figure>
              ))}
            </div>

            <div className="showcase-hud">
              <div
                className={`showcase-caption${captionBlur ? ' is-blurring' : ''}`}
                id="showcase-caption"
                aria-live="polite"
              >
                <div className="showcase-kicker tabular-nums">
                  <span>
                    0{activeStage + 1} / 0{SHOWCASE_STAGES.length}
                  </span>
                  {!hasSwipedShowcase && (
                    <span className="showcase-swipe-hint">
                      <span aria-hidden="true">·</span> Swipe to explore
                    </span>
                  )}
                </div>
                <h2 className="caption-title" id="caption-title">
                  {SHOWCASE_STAGES[activeStage].title}
                </h2>
                <p className="caption-sub" id="caption-sub">
                  {SHOWCASE_STAGES[activeStage].sub}
                </p>
              </div>

              <div className="showcase-nav-cluster">
                <button
                  type="button"
                  className="showcase-arrow-btn"
                  aria-label="Previous showcase angle"
                  disabled={activeStage === 0}
                  onClick={() => {
                    setHasSwipedShowcase(true);
                    selectStage(activeStage - 1);
                  }}
                >
                  <ChevronLeft size={18} aria-hidden="true" />
                </button>

                <div
                  className="showcase-dots"
                  role="tablist"
                  aria-label="Showcase angles"
                >
                  {SHOWCASE_STAGES.map((stage, i) => (
                    <button
                      key={stage.title}
                      type="button"
                      role="tab"
                      aria-selected={activeStage === i}
                      className={`stage-dot${activeStage === i ? ' is-active' : ''}`}
                      aria-label={`Angle ${i + 1}: ${stage.title}`}
                      onClick={() => {
                        setHasSwipedShowcase(true);
                        selectStage(i);
                      }}
                    />
                  ))}
                </div>

                <button
                  type="button"
                  className="showcase-arrow-btn"
                  aria-label="Next showcase angle"
                  disabled={activeStage === SHOWCASE_STAGES.length - 1}
                  onClick={() => {
                    setHasSwipedShowcase(true);
                    selectStage(activeStage + 1);
                  }}
                >
                  <ChevronRight size={18} aria-hidden="true" />
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 4: Interactive Thermal Comparison Slider */}
        <section id="thermal" className="thermal-section">
          <div className="container thermal-grid">
            <div
              className="comparison-wrap"
              ref={compWrapRef}
              id="comparison-wrap"
              onPointerDown={handleCompPointerDown}
              onPointerMove={handleCompPointerMove}
              onPointerUp={handleCompPointerUp}
              onPointerCancel={handleCompPointerUp}
            >
              <div className="comparison-layer comparison-hot">
                <img
                  src={bottleHotLogoImg}
                  alt="Waterholic branded bottle in warm alpine sunrise light"
                  className="comparison-img"
                />
              </div>

              <div
                className="comparison-layer comparison-cold"
                id="comparison-cold"
                style={{
                  clipPath: `inset(0 ${100 - splitPct}% 0 0)`,
                  transition: splitAnimate
                    ? 'clip-path 380ms var(--ease-out)'
                    : 'none',
                }}
              >
                <img
                  src={bottleColdLogoImg}
                  alt="Waterholic branded bottle dry on frost-covered alpine ledge in sub-zero air"
                  className="comparison-img"
                />
              </div>

              <div
                className={`comparison-handle${
                  splitPct <= 2 || splitPct >= 98 ? ' is-edge' : ''
                }`}
                id="comparison-handle"
                role="slider"
                tabIndex={0}
                aria-label="Compare cold and hot insulation"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(splitPct)}
                style={{
                  left: `clamp(22px, ${splitPct}%, calc(100% - 22px))`,
                  transition: splitAnimate
                    ? 'left 380ms var(--ease-out)'
                    : 'none',
                }}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowLeft') updateSplit(splitPct - 8, true);
                  if (e.key === 'ArrowRight') updateSplit(splitPct + 8, true);
                }}
              >
                <div className="handle-line" />
                <div className="handle-knob">
                  <svg
                    width="19"
                    height="19"
                    viewBox="0 0 256 256"
                    fill="none"
                    aria-hidden="true"
                  >
                    <polyline
                      points="176 144 208 176 176 208"
                      stroke="currentColor"
                      strokeWidth="20"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <line
                      x1="48"
                      y1="176"
                      x2="208"
                      y2="176"
                      stroke="currentColor"
                      strokeWidth="20"
                      strokeLinecap="round"
                    />
                    <polyline
                      points="80 112 48 80 80 48"
                      stroke="currentColor"
                      strokeWidth="20"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <line
                      x1="208"
                      y1="80"
                      x2="48"
                      y2="80"
                      stroke="currentColor"
                      strokeWidth="20"
                      strokeLinecap="round"
                    />
                  </svg>
                </div>
              </div>
            </div>

            <div className="thermal-copy">
              <h2 className="section-title">Icy cold or piping hot.</h2>
              <p className="section-sub">
                Thick double-wall steel keeps water icy for 24 hours and morning
                coffee steaming for 12, while the outside stays completely dry.
              </p>

              <div
                className="segmented-control"
                role="tablist"
                aria-label="Thermal performance"
              >
                <button
                  type="button"
                  role="tab"
                  className={`seg-btn${splitPct >= 98 ? ' is-active' : ''}`}
                  aria-selected={splitPct >= 98}
                  onClick={() => updateSplit(100, true)}
                >
                  24h Cold
                </button>
                <button
                  type="button"
                  role="tab"
                  className={`seg-btn${splitPct <= 2 ? ' is-active' : ''}`}
                  aria-selected={splitPct <= 2}
                  onClick={() => updateSplit(0, true)}
                >
                  12h Hot
                </button>
              </div>

              <div className="thermal-metrics">
                <div className="metric-item">
                  <span className="metric-value tabular-nums">4°C</span>
                  <span className="metric-label">Cold retention</span>
                </div>
                <div className="metric-item">
                  <span className="metric-value tabular-nums">85°C</span>
                  <span className="metric-label">Heat retention</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 5: Asymmetric 3-Tile Editorial Bento */}
        <section id="craft" className="bento-section">
          <div className="container">
            <div className="section-header-stack">
              <h2 className="section-title">Engineered to endure.</h2>
            </div>

            <div className="bento-grid" ref={bentoGridRef}>
              <article className="bento-tile bento-tall reveal-tile">
                <img
                  src="https://www.gstatic.com/aistudio/starter-apps/flask-applet/flask-bento-lid.webp"
                  alt="Close-up of threaded black chug cap and brushed steel neck"
                  className="bento-img"
                />
                <div className="bento-footer">
                  <h3 className="bento-title">Leakproof Chug Lid</h3>
                  <p className="bento-sub">
                    Dual-threaded seal with integrated carry loop
                  </p>
                </div>
              </article>

              <article className="bento-tile bento-top reveal-tile">
                <img
                  src={bottleRiverLogoImg}
                  alt="Waterholic matte powder coat bottle with laser-etched logo resting on sunlit river timber"
                  className="bento-img"
                />
                <div className="bento-footer">
                  <h3 className="bento-title">Powder Coat</h3>
                  <p className="bento-sub">
                    Tactile matte grip with laser-etched Waterholic emblem
                  </p>
                </div>
              </article>

              <article className="bento-tile bento-bottom reveal-tile">
                <canvas
                  ref={specsCanvasRef}
                  id="specs-gl-canvas"
                  className="specs-canvas"
                  aria-hidden="true"
                />
                <div className="bento-footer bento-footer-specs">
                  <div>
                    <h3 className="bento-title">950 ml</h3>
                    <p className="bento-sub">520 g empty weight</p>
                  </div>
                  <span className="spec-badge">18/8 Steel</span>
                </div>
              </article>
            </div>
          </div>
        </section>

        {/* SECTION 5.5: Materials Lab Metallurgy & Interactive Plastic Impact Ledger */}
        <CraftsmanshipAndImpactLedger />

        {/* SECTION 6: Flagship Finish, Capacity & Bespoke Laser Engraving Studio */}
        <section id="order" className="order-section">
          <div className="container order-grid">
            <div className="order-preview" id="order-preview">
              <div className="order-plinth" aria-hidden="true" />
              <div
                className="order-flask-stage"
                style={{ transform: `scale(${activeScale})` }}
              >
                <img
                  src="https://www.gstatic.com/aistudio/starter-apps/flask-applet/flask-order-cutout.webp"
                  alt="Configured Waterholic Flask three-quarter preview with engraved logo"
                  className="order-flask-img"
                  id="order-flask-img"
                  data-finish={finish}
                  width={519}
                  height={940}
                />
                <BottleBrandMark finish={finish} variant="order" />
                {engravingEnabled && engravingText.trim().length > 0 && (
                  <div
                    className={`bottle-engraving-overlay bottle-engraving--${engravingOrientation} bottle-engraving--${engravingFont}${
                      finish === 'glacier' || finish === 'transparent'
                        ? ' is-dark-ink'
                        : ''
                    }`}
                    aria-label={`Live laser engraving preview: ${engravingText.trim()}`}
                  >
                    <span>{engravingText.trim()}</span>
                  </div>
                )}
              </div>
              <div className="order-preview-caption tabular-nums">
                <span>{FINISH_META[finish].name}</span>
                <span aria-hidden="true">·</span>
                <span>{size}</span>
                {engravingEnabled && engravingText.trim().length > 0 && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span>Laser Etched &ldquo;{engravingText.trim()}&rdquo;</span>
                  </>
                )}
              </div>
            </div>

            <div className="order-panel">
              <span className="launch-eyebrow">
                Bespoke Atelier Configurator
              </span>
              <h2 className="section-title">
                {finish === 'pink'
                  ? 'Waterholic Rose Quartz Premium'
                  : 'Waterholic Flagship Flask'}
              </h2>
              <div
                className={`order-price-wave-stage${
                  fastFlowSurging ? ' is-surging' : ''
                }`}
                onPointerEnter={triggerFastFlowPulse}
              >
                <FastFlowPriceWave
                  accentHex={
                    finish === 'pink'
                      ? '#e495a6'
                      : finish === 'sage'
                        ? '#48634b'
                        : finish === 'glacier' || finish === 'transparent'
                          ? '#38bdf8'
                          : '#0284c7'
                  }
                  interactionSignal={fastFlowSignal}
                  sizeLabel={size}
                />
                <div className="order-price-foreground">
                  <p className="order-price tabular-nums" id="order-price">
                    ${price + (FINISH_META[finish].premiumDelta ?? 0)}
                    {finish === 'pink' && (
                      <span className="order-premium-note">
                        {' '}
                        · Premium Pink Edition
                      </span>
                    )}
                  </p>
                  <span
                    className="order-price-fastflow-tag tabular-nums"
                    title="Fast-Flow dual-vent chug spout engineered for 42 ml/s laminar hydration"
                  >
                    <span
                      className="order-price-fastflow-dot"
                      aria-hidden="true"
                    />
                    Fast-Flow · 42 ml/s
                  </span>
                </div>
              </div>

              <div className="config-group">
                <span className="config-label">Colour (6 Options)</span>
                <div className="option-row" id="order-finish-row">
                  {(Object.keys(FINISH_META) as FinishId[]).map((key) => {
                    const meta = FINISH_META[key];
                    return (
                      <button
                        key={key}
                        type="button"
                        className={`pill-option${
                          finish === key ? ' is-active' : ''
                        }`}
                        onClick={() => selectFinish(key)}
                      >
                        <span
                          className={`dot${meta.isTransparent ? ' swatch-transparent' : ''}`}
                          style={
                            meta.isTransparent
                              ? undefined
                              : { background: meta.dot }
                          }
                        />
                        {meta.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="config-group">
                <span className="config-label">Capacity</span>
                <div className="option-row" id="order-size-row">
                  {SIZE_OPTIONS.map((opt) => (
                    <button
                      key={opt.size}
                      type="button"
                      className={`pill-option${
                        size === opt.size ? ' is-active' : ''
                      }`}
                      onClick={() => {
                        selectSize(opt.size, opt.price);
                      }}
                    >
                      {opt.size}
                    </button>
                  ))}
                </div>
              </div>

              {/* Bespoke Laser Monogram Studio */}
              <div className="engraving-studio-card">
                <div className="engraving-studio-head">
                  <div className="engraving-studio-title-wrap">
                    <PenTool size={15} aria-hidden="true" />
                    <span className="engraving-studio-title">
                      Bespoke Laser Engraving
                    </span>
                    <span className="engraving-free-tag">
                      Complimentary Launch Gift
                    </span>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={engravingEnabled}
                    className={`engraving-switch${
                      engravingEnabled ? ' is-on' : ''
                    }`}
                    onClick={() => {
                      setEngravingEnabled((prev) => !prev);
                      triggerFastFlowPulse();
                    }}
                  >
                    <span className="engraving-switch-thumb" />
                    <span className="sr-only">Toggle custom laser engraving</span>
                  </button>
                </div>

                {engravingEnabled && (
                  <div className="engraving-controls">
                    <div className="engraving-input-row">
                      <input
                        type="text"
                        maxLength={12}
                        value={engravingText}
                        onChange={(e) => {
                          setEngravingText(e.target.value);
                          triggerFastFlowPulse();
                        }}
                        placeholder="Enter initials or name (max 12)"
                        aria-label="Custom laser engraving monogram"
                        className="engraving-text-input"
                      />
                      <span className="engraving-char-count tabular-nums">
                        {engravingText.length}/12
                      </span>
                    </div>

                    <div className="engraving-presets-row">
                      {['ALEX', 'A.M.', 'EST. 26', 'ALPINE'].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          className={`engraving-chip${
                            engravingText === preset ? ' is-active' : ''
                          }`}
                          onClick={() => {
                            setEngravingText(preset);
                            triggerFastFlowPulse();
                          }}
                        >
                          {preset}
                        </button>
                      ))}
                    </div>

                    <div className="engraving-style-grid">
                      <div className="engraving-style-group">
                        <span className="engraving-mini-label">Typography</span>
                        <div className="engraving-seg-row">
                          {(
                            [
                              { id: 'serif', label: 'Atelier Serif' },
                              { id: 'sans', label: 'Editorial Sans' },
                              { id: 'mono', label: 'Tech Mono' },
                            ] as const
                          ).map((f) => (
                            <button
                              key={f.id}
                              type="button"
                              className={`engraving-seg-btn${
                                engravingFont === f.id ? ' is-active' : ''
                              }`}
                              onClick={() => {
                                setEngravingFont(f.id);
                                triggerFastFlowPulse();
                              }}
                            >
                              {f.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="engraving-style-group">
                        <span className="engraving-mini-label">Placement</span>
                        <div className="engraving-seg-row">
                          {(
                            [
                              { id: 'vertical', label: 'Vertical Spine' },
                              { id: 'horizontal', label: 'Horizontal Crest' },
                            ] as const
                          ).map((o) => (
                            <button
                              key={o.id}
                              type="button"
                              className={`engraving-seg-btn${
                                engravingOrientation === o.id ? ' is-active' : ''
                              }`}
                              onClick={() => {
                                setEngravingOrientation(o.id);
                                triggerFastFlowPulse();
                              }}
                            >
                              {o.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="spec-list">
                <div className="spec-row">
                  <span className="spec-key">Insulation</span>
                  <span className="spec-val">24h cold, 12h hot</span>
                </div>
                <div className="spec-row">
                  <span className="spec-key">Steel</span>
                  <span className="spec-val">18/8 pro-grade double wall</span>
                </div>
                <div className="spec-row">
                  <span className="spec-key">Warranty</span>
                  <span className="spec-val">Lifetime replacement</span>
                </div>
              </div>

              <button
                type="button"
                className="btn btn-primary btn-full magnetic-btn"
                id="add-to-bag-btn"
                onClick={addFlagshipToBag}
              >
                <span className="btn-label" id="add-to-bag-label">
                  {engravingEnabled && engravingText.trim()
                    ? `Add Engraved Flask — $${price + (FINISH_META[finish].premiumDelta ?? 0)}`
                    : `Add to Bag — $${price + (FINISH_META[finish].premiumDelta ?? 0)}`}
                </span>
              </button>
            </div>
          </div>
        </section>
        {/* SECTION 7: Support, Lifetime Warranty, FAQ & Hydration Dispatch */}
        <SupportSection
          defaultName={profile.name}
          defaultEmail={profile.email}
          onNewsletterJoined={() =>
            showToast('Subscribed — use code WATER10 in your bag for 10% off')
          }
        />
      </main>

      <SiteFooter
        theme={theme}
        totalBagQty={totalQty}
        savedCount={savedIds.size}
        compareCount={comparedProducts.length}
        studentDiscountActive={studentDiscountActive}
        onToggleTheme={() => {
          const order: ThemeMode[] = ['morning', 'day', 'evening', 'auto'];
          const nextMode =
            order[(order.indexOf(themeMode) + 1) % order.length];
          setThemeMode(nextMode);
          const resolved = resolveDaypart(nextMode, new Date());
          showToast(
            nextMode === 'auto'
              ? `Auto Time Palette active (${DAYPART_META[resolved].paletteName})`
              : `${DAYPART_META[resolved].label} · ${DAYPART_META[resolved].paletteName} palette`
          );
        }}
        onJumpToCategory={jumpToCategory}
        onOpenProfile={openProfileAt}
        onOpenBag={() => setDrawerOpen(true)}
        onOpenCompare={() => {
          if (comparedProducts.length > 0) {
            setCompareModalOpen(true);
          } else {
            catalogHostRef.current?.scrollIntoView({
              behavior: 'smooth',
              block: 'start',
            });
            showToast(
              'Select Compare on up to 3 products in the catalog to view side-by-side'
            );
          }
        }}
        onOpenQuickView={(product) => handleOpenQuickView(product)}
        onNewsletterJoined={() =>
          showToast('Subscribed — use code WATER10 in your bag for 10% off')
        }
        onShowToast={showToast}
      />

      {/* Product Detail Quick View Modal + Verified Reviews */}
      <ProductModal
        product={activeModal?.product ?? null}
        initialFinishId={activeModal?.finishId}
        isSaved={activeModal ? savedIds.has(activeModal.product.id) : false}
        customReviews={
          activeModal ? customReviews[activeModal.product.id] ?? [] : []
        }
        defaultAuthor={profile.name}
        onClose={() => setActiveModal(null)}
        onToggleSave={toggleSaveProduct}
        onAddToBag={handleAddCatalogProduct}
        onSelectProduct={(nextProduct) => handleOpenQuickView(nextProduct)}
        onSubmitReview={handleSubmitReview}
      />

      {/* Slide-Over Multi-Product Order Bag, Promo Codes & Express Checkout Drawer */}
      <BagDrawer
        open={drawerOpen}
        items={bag}
        studentDiscountActive={studentDiscountActive}
        profile={profile}
        addresses={addresses}
        onClose={() => setDrawerOpen(false)}
        onUpdateQty={updateBagQty}
        onUpdateItemGift={updateBagItemGift}
        onRemoveItem={removeBagItem}
        onClearBag={() => setBag([])}
        onOrderPlaced={handleOrderPlaced}
        onViewOrderInProfile={() => openProfileAt('orders')}
      />

      {/* Slide-Over Web Profile Hub: Member Details, Daily Hydration Tracker, Order Tracking, Addresses & Wishlist */}
      <ProfileDrawer
        open={profileDrawerOpen}
        initialTab={profileInitialTab}
        profile={profile}
        addresses={addresses}
        orders={orders}
        hydration={hydration}
        milestoneStats={milestoneStats}
        recentlyUnlockedBadgeIds={recentlyUnlockedBadgeIds}
        savedIds={savedIds}
        studentDiscountActive={studentDiscountActive}
        onClose={() => setProfileDrawerOpen(false)}
        onUpdateProfile={handleUpdateProfile}
        onLogWater={handleLogWater}
        onResetWater={handleResetWater}
        onDismissMilestoneCelebration={() => setRecentlyUnlockedBadgeIds([])}
        onAddAddress={handleAddAddress}
        onDeleteAddress={handleDeleteAddress}
        onSetDefaultAddress={handleSetDefaultAddress}
        onToggleSave={toggleSaveProduct}
        onQuickViewProduct={(product) => handleOpenQuickView(product)}
        onAddToBag={handleAddCatalogProduct}
        onReorderItems={handleReorderItems}
      />

      {/* Side-by-Side Product Comparison Modal */}
      <CompareModal
        open={compareModalOpen}
        products={comparedProducts}
        onClose={() => setCompareModalOpen(false)}
        onRemoveProduct={(id) => {
          setCompareIds((prev) => {
            const next = prev.filter((item) => item !== id);
            if (next.length === 0) setCompareModalOpen(false);
            return next;
          });
        }}
        onAddToBag={handleAddCatalogProduct}
      />

      {/* Interactive 3-Step Bespoke Vessel Finder Modal */}
      <BottleFinderModal
        open={finderOpen}
        onClose={() => setFinderOpen(false)}
        onQuickView={handleOpenQuickView}
        onAddToBag={handleAddCatalogProduct}
      />

      {/* Floating Compare Tray (shown when 1–3 products are selected for comparison) */}
      {comparedProducts.length > 0 && !compareModalOpen && (
        <div
          className="compare-tray"
          role="region"
          aria-label="Product comparison tray"
        >
          <div className="compare-tray-items">
            {comparedProducts.map((p) => (
              <span key={p.id} className="compare-tray-chip">
                <span>{p.name}</span>
                <button
                  type="button"
                  aria-label={`Remove ${p.name} from compare`}
                  onClick={() => handleToggleCompare(p.id)}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
          <div className="compare-tray-actions">
            <button
              type="button"
              className="btn-card-primary"
              onClick={() => setCompareModalOpen(true)}
            >
              Compare ({comparedProducts.length}/3)
            </button>
            <button
              type="button"
              className="bag-remove-btn"
              onClick={() => setCompareIds([])}
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Non-Intrusive Cart & Account Toast */}
      {toastMessage && (
        <div className="cart-toast" role="status" aria-live="polite">
          <span>{toastMessage}</span>
          <button
            type="button"
            className="cart-toast-action"
            onClick={() => {
              setToastMessage(null);
              setDrawerOpen(true);
            }}
          >
            View Bag
          </button>
        </div>
      )}

      {/* Waterholic AI Hydration Concierge Drawer (Chat, Search & Maps Grounding, Transcribe, Live Voice) */}
      <AiConciergeDrawer
        open={conciergeOpen}
        onClose={() => setConciergeOpen(false)}
        dailyGoalMl={profile.dailyGoalMl}
        consumedMl={hydration.consumedMl}
        preferredColor={profile.preferredColor}
        onShowToast={showToast}
      />

      {/* Floating AI Concierge Launcher */}
      {!conciergeOpen && (
        <button
          type="button"
          className="concierge-fab"
          aria-label="Open Waterholic AI Concierge"
          onClick={() => setConciergeOpen(true)}
        >
          <Sparkles size={18} aria-hidden="true" />
          <span>AI Concierge</span>
        </button>
      )}

      {/* Back to Top Utility Button */}
      {showBackTop && (
        <button
          type="button"
          className="back-to-top-btn"
          aria-label="Scroll back to top"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        >
          ↑
        </button>
      )}
    </>
  );
}
