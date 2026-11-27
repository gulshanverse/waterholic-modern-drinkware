import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import gsap from 'gsap';
import {
  Box,
  Camera,
  Check,
  ChevronDown,
  ChevronUp,
  ImagePlus,
  Info,
  Layers,
  Loader2,
  Move,
  QrCode,
  RefreshCw,
  RotateCcw,
  RotateCw,
  Scan,
  ShoppingBag,
  Smartphone,
  Sparkles,
  Video,
  VideoOff,
  X,
} from 'lucide-react';
import { HydrationProgressRing } from './HydrationProgressRing';
import { ARDeskPreviewModal, type ArPreviewMode } from './ARDeskPreviewModal';
import {
  triggerAddToBagHaptic,
  triggerFlyToBagAnimation,
  triggerMicroHapticTick,
} from '../utils/hapticFeedback';
import {
  AR_METER_SCALE,
  checkWebXrArSupport,
  requestWebXrArSession,
} from '../utils/webxrSupport';
import { useCurrency } from '../contexts/CurrencyContext';

export type StudioFinishKey =
  | 'blue'
  | 'pink'
  | 'transparent'
  | 'sage'
  | 'basalt'
  | 'glacier';

export type StudioSizeKey = '750 ml' | '950 ml' | '1.2 L';
type CameraPresetKey = 'hero' | 'cap' | 'base' | 'cutaway';

const DEFAULT_STUDIO_FINISH: StudioFinishKey = 'blue';
const DEFAULT_STUDIO_SIZE: StudioSizeKey = '950 ml';
const DEFAULT_ENGRAVING_ENABLED = true;
const DEFAULT_ENGRAVING_TEXT = 'ALEX';
const DEFAULT_ENGRAVING_FONT: 'sans' | 'serif' | 'mono' = 'serif';
const DEFAULT_ENGRAVING_ORIENTATION: 'vertical' | 'horizontal' = 'vertical';

interface StudioFinishSpec {
  id: StudioFinishKey;
  label: string;
  hex: string;
  roughness: number;
  metalness: number;
  clearcoat: number;
  isGlass?: boolean;
  priceDelta?: number;
  bootHex: string;
  logoInk: string;
}

const STUDIO_FINISHES: StudioFinishSpec[] = [
  {
    id: 'blue',
    label: 'Ocean Blue',
    hex: '#0284C7',
    roughness: 0.42,
    metalness: 0.25,
    clearcoat: 0.25,
    bootHex: '#0A2239',
    logoInk: '#F0F9FF',
  },
  {
    id: 'pink',
    label: 'Rose Pink',
    hex: '#E495A6',
    roughness: 0.36,
    metalness: 0.3,
    clearcoat: 0.45,
    priceDelta: 6,
    bootHex: '#8E495A',
    logoInk: '#FFF5F7',
  },
  {
    id: 'transparent',
    label: 'Transparent',
    hex: '#E8F6FF',
    roughness: 0.08,
    metalness: 0.02,
    clearcoat: 1.0,
    isGlass: true,
    bootHex: '#7FA9C2',
    logoInk: '#0A2239',
  },
  {
    id: 'sage',
    label: 'Alpine Sage',
    hex: '#48634B',
    roughness: 0.48,
    metalness: 0.18,
    clearcoat: 0.18,
    bootHex: '#1F2E21',
    logoInk: '#EFF6F0',
  },
  {
    id: 'basalt',
    label: 'Basalt Black',
    hex: '#222624',
    roughness: 0.52,
    metalness: 0.28,
    clearcoat: 0.2,
    bootHex: '#101312',
    logoInk: '#D7E8F5',
  },
  {
    id: 'glacier',
    label: 'Glacier Silver',
    hex: '#B4BDB8',
    roughness: 0.24,
    metalness: 0.82,
    clearcoat: 0.35,
    bootHex: '#4A5550',
    logoInk: '#12222E',
  },
];

const SIZE_SPECS: Record<
  StudioSizeKey,
  { scaleY: number; scaleXZ: number; price: number; label: string }
> = {
  '750 ml': { scaleY: 0.9, scaleXZ: 0.95, price: 10, label: '750 ML' },
  '950 ml': { scaleY: 1.0, scaleXZ: 1.0, price: 12, label: '950 ML' },
  '1.2 L': { scaleY: 1.12, scaleXZ: 1.05, price: 14, label: '1.2 L' },
};

const CAMERA_PRESETS: Record<
  CameraPresetKey,
  { pos: [number, number, number]; target: [number, number, number]; label: string }
> = {
  hero: { pos: [0.45, 2.35, 5.1], target: [0, 1.55, 0], label: 'Hero 3/4' },
  cap: { pos: [1.35, 3.35, 2.2], target: [0, 2.65, 0], label: 'Chug Lid' },
  base: { pos: [-1.7, 0.95, 2.65], target: [0, 0.65, 0], label: 'Grip Boot' },
  cutaway: { pos: [0.0, 2.45, 5.8], target: [0, 1.85, 0], label: 'Exploded' },
};

type BottlePartId =
  | 'lid'
  | 'seal'
  | 'collar'
  | 'chamber'
  | 'body'
  | 'water'
  | 'boot';

interface BottlePartSpec {
  id: BottlePartId;
  code: string;
  title: string;
  summary: string;
  accent: string;
  specs: { label: string; value: string }[];
}

const BOTTLE_PART_SPECS: Record<BottlePartId, BottlePartSpec> = {
  lid: {
    id: 'lid',
    code: '01 · CAP SYSTEM',
    title: 'Fast-Flow Chug Lid & Loop',
    summary:
      'Dual-threaded leakproof polymer cap with 36-rib tactile knurling and steel-pinned hinged carry arch.',
    accent: '#38bdf8',
    specs: [
      { label: 'Flow Rate', value: '42 ml/s Laminar' },
      { label: 'Loop Load', value: '25 kg Tensile' },
    ],
  },
  seal: {
    id: 'seal',
    code: '02 · HYDROSTATIC SEAL',
    title: 'Silicone O-Ring Gasket',
    summary:
      'Compression-molded medical-grade elastomer locking pressure and temperature with zero BPA or PFAS.',
    accent: '#0284c7',
    specs: [
      { label: 'Leak Rating', value: 'IP68 · 3.5 bar' },
      { label: 'Material', value: 'FDA 21 CFR Sil.' },
    ],
  },
  collar: {
    id: 'collar',
    code: '03 · NECK ARCHITECTURE',
    title: 'Machined 18/8 Neck Collar',
    summary:
      'CNC-turned 304 brushed stainless thread and chamfered wide-mouth lip built for clear ice spheres.',
    accent: '#94a3b8',
    specs: [
      { label: 'Mouth Dia.', value: '54 mm Wide-Pour' },
      { label: 'Alloy Spec', value: '304 Surgical 18/8' },
    ],
  },
  chamber: {
    id: 'chamber',
    code: '04 · THERMAL CORE',
    title: 'Copper Vacuum Chamber',
    summary:
      'Evacuated double-wall core plated with a 0.18 mm pure copper radiation barrier to arrest heat transfer.',
    accent: '#d97706',
    specs: [
      { label: 'Vacuum Spec', value: '10⁻⁵ Torr Core' },
      { label: 'Retention', value: '24h Cold · 12h Hot' },
    ],
  },
  body: {
    id: 'body',
    code: '05 · OUTER CHASSIS',
    title: 'Double-Wall Powder Chassis',
    summary:
      'Micro-textured architectural matte powder coat (or 3.8 mm borosilicate shell in Transparent) with laser crest.',
    accent: '#0284c7',
    specs: [
      { label: 'Condensation', value: '0% Exterior Sweat' },
      { label: 'Finish', value: 'Scratch-Guard Coat' },
    ],
  },
  water: {
    id: 'water',
    code: '06 · PURE CORE',
    title: 'Electro-Polished Interior',
    summary:
      'Mirror-smooth inner wall prevents mineral buildup and flavor carry-over between coffee, electrolytes, and water.',
    accent: '#38bdf8',
    specs: [
      { label: 'Taste Transfer', value: 'Zero Metallic' },
      { label: 'Cold Target', value: '4°C Benchmark' },
    ],
  },
  boot: {
    id: 'boot',
    code: '07 · IMPACT BASE',
    title: 'Acoustic Silicone Base Boot',
    summary:
      'Removable high-durometer elastomer sleeve engineered for whisper-quiet studio desks and trail drop defense.',
    accent: '#0ea5e9',
    specs: [
      { label: 'Drop Spec', value: '1.5 m Impact Guard' },
      { label: 'Wall Gauge', value: '2.8 mm Soft-Grip' },
    ],
  },
};

interface BottleStudio3DProps {
  theme: 'light' | 'dark';
  daypart?: 'morning' | 'day' | 'evening';
  activeFinish: StudioFinishKey;
  activeSize?: StudioSizeKey;
  engravingEnabled?: boolean;
  engravingText?: string;
  engravingFont?: 'sans' | 'serif' | 'mono';
  engravingOrientation?: 'vertical' | 'horizontal';
  onSyncFinish: (finish: StudioFinishKey) => void;
  onSyncSize?: (size: StudioSizeKey, price: number) => void;
  onSyncEngraving?: (next: { enabled: boolean; text: string }) => void;
  onResetAllConfigs?: () => void;
  onAddConfiguredToBag: (config: {
    finish: StudioFinishKey;
    finishName: string;
    finishHex: string;
    isTransparent?: boolean;
    sizeLabel: StudioSizeKey;
    price: number;
    engravingText?: string;
    openDrawer?: boolean;
  }) => void;
  onSnapshotSaved?: (msg: string) => void;
  consumedMl?: number;
  dailyGoalMl?: number;
  autoOpenArMode?: ArPreviewMode | null;
  initialShowBoot?: boolean;
  onConsumeAutoOpenAr?: () => void;
}

function createBrandWrapTexture(
  baseHex: string,
  inkHex: string,
  sizeLabel: string,
  isGlass: boolean,
  resolution = 1024,
  engraving?: { text: string; font: 'sans' | 'serif' | 'mono' }
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = resolution;
  canvas.height = resolution;
  const ctx = canvas.getContext('2d')!;
  const scale = resolution / 1024;
  ctx.scale(scale, scale);

  if (isGlass) {
    ctx.clearRect(0, 0, 1024, 1024);
    ctx.fillStyle = 'rgba(232, 246, 255, 0.14)';
    ctx.fillRect(0, 0, 1024, 1024);
  } else {
    ctx.fillStyle = baseHex;
    ctx.fillRect(0, 0, 1024, 1024);

    // Subtle powder-coat micro-grain variation
    const grad = ctx.createLinearGradient(0, 0, 0, 1024);
    grad.addColorStop(0, 'rgba(255,255,255,0.06)');
    grad.addColorStop(0.5, 'rgba(255,255,255,0.0)');
    grad.addColorStop(1, 'rgba(0,0,0,0.09)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1024, 1024);

    for (let i = 0; i < 4200; i++) {
      const x = (i * 1973) % 1024;
      const y = (i * 3571) % 1024;
      ctx.fillStyle =
        i % 2 === 0 ? 'rgba(255,255,255,0.028)' : 'rgba(0,0,0,0.028)';
      ctx.fillRect(x, y, 2, 2);
    }
  }

  // Front emblem centered on UV u=0.5 (facing +Z camera)
  const cx = 512;
  const cy = 480;

  ctx.save();
  ctx.strokeStyle = inkHex;
  ctx.fillStyle = inkHex;
  ctx.globalAlpha = isGlass ? 0.78 : 0.88;

  // Waterholic droplet glyph
  ctx.lineWidth = 7;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(cx, cy - 115);
  ctx.bezierCurveTo(cx - 46, cy - 52, cx - 50, cy - 16, cx, cy - 16);
  ctx.bezierCurveTo(cx + 50, cy - 16, cx + 46, cy - 52, cx, cy - 115);
  ctx.closePath();
  ctx.stroke();

  // Inner water highlight arc
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(cx, cy - 50, 20, Math.PI * 0.62, Math.PI * 0.96);
  ctx.stroke();

  // Crisp engraved wordmark
  ctx.textAlign = 'center';
  ctx.font = '600 44px "Plus Jakarta Sans", "IBM Plex Sans", -apple-system, sans-serif';
  ctx.fillText('W A T E R H O L I C', cx, cy + 56);

  // Subtle architectural divider & capacity stamp
  ctx.globalAlpha = isGlass ? 0.55 : 0.62;
  ctx.fillRect(cx - 58, cy + 82, 116, 2.5);

  ctx.font = '500 22px "IBM Plex Mono", monospace';
  ctx.fillText(`18/8 VACUUM  ·  ${sizeLabel}`, cx, cy + 122);

  // Optional custom laser monogram etched cleanly beneath the capacity stamp
  const cleanedEngraving = engraving?.text.trim().slice(0, 12) ?? '';
  if (cleanedEngraving) {
    ctx.globalAlpha = isGlass ? 0.72 : 0.82;
    const fontFamily =
      engraving?.font === 'serif'
        ? '600 32px Georgia, "Times New Roman", serif'
        : engraving?.font === 'mono'
          ? '500 26px "IBM Plex Mono", monospace'
          : '600 28px "Plus Jakarta Sans", "IBM Plex Sans", -apple-system, sans-serif';
    ctx.font = fontFamily;
    ctx.fillText(
      cleanedEngraving.toUpperCase().split('').join(' '),
      cx,
      cy + 188
    );
  }
  ctx.restore();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  texture.needsUpdate = true;
  return texture;
}

function createContactShadowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(128, 128, 18, 128, 128, 122);
  grad.addColorStop(0, 'rgba(6, 22, 38, 0.42)');
  grad.addColorStop(0.55, 'rgba(6, 22, 38, 0.16)');
  grad.addColorStop(1, 'rgba(6, 22, 38, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 256);
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

export function BottleStudio3D({
  theme,
  daypart = 'day',
  activeFinish,
  activeSize = DEFAULT_STUDIO_SIZE,
  engravingEnabled = DEFAULT_ENGRAVING_ENABLED,
  engravingText = DEFAULT_ENGRAVING_TEXT,
  engravingFont = DEFAULT_ENGRAVING_FONT,
  engravingOrientation = DEFAULT_ENGRAVING_ORIENTATION,
  onSyncFinish,
  onSyncSize,
  onSyncEngraving,
  onResetAllConfigs,
  onAddConfiguredToBag,
  onSnapshotSaved,
  consumedMl = 750,
  dailyGoalMl = 2500,
  autoOpenArMode = null,
  initialShowBoot,
  onConsumeAutoOpenAr,
}: BottleStudio3DProps) {
  const { formatPrice } = useCurrency();
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [studioFinish, setStudioFinish] = useState<StudioFinishKey>(activeFinish);
  const [studioSize, setStudioSize] = useState<StudioSizeKey>(activeSize);
  const [studioEngraving, setStudioEngraving] = useState<string>(
    engravingEnabled ? engravingText : ''
  );
  const [exploded, setExploded] = useState<number>(0);
  const [showBoot, setShowBoot] = useState<boolean>(
    initialShowBoot !== undefined ? initialShowBoot : true
  );
  const [autoSpin, setAutoSpin] = useState<boolean>(true);
  const [chillMist, setChillMist] = useState<boolean>(true);
  const [cameraPreset, setCameraPreset] = useState<CameraPresetKey>('hero');
  const [dockCollapsed, setDockCollapsed] = useState<boolean>(false);
  const [hoveredPart, setHoveredPart] = useState<BottlePartId | null>(null);
  const [pinnedPart, setPinnedPart] = useState<BottlePartId | null>(null);
  const [exportingGlb, setExportingGlb] = useState<boolean>(false);
  const [resetSpinning, setResetSpinning] = useState<boolean>(false);
  const [arModalOpen, setArModalOpen] = useState<boolean>(false);
  const [arInitialMode, setArInitialMode] = useState<ArPreviewMode>('desk');

  // Native WebXR immersive-ar + Inline Live Camera AR Overlay replacement state
  const [xrSupported, setXrSupported] = useState<boolean>(false);
  const [arOverlayMode, setArOverlayMode] = useState<'none' | 'webxr' | 'camera'>('none');
  const [xrLaunching, setXrLaunching] = useState<boolean>(false);
  const [xrSurfaceFound, setXrSurfaceFound] = useState<boolean>(false);
  const [xrPlaced, setXrPlaced] = useState<boolean>(false);
  const [xrHasHitTest, setXrHasHitTest] = useState<boolean>(true);
  const [inlineCamStatus, setInlineCamStatus] = useState<
    'idle' | 'requesting' | 'active' | 'denied' | 'unavailable'
  >('idle');
  const [inlineFacingMode, setInlineFacingMode] = useState<'environment' | 'user'>('environment');
  const [inlinePhotoUrl, setInlinePhotoUrl] = useState<string | null>(null);
  const [inlineArScale, setInlineArScale] = useState<number>(0.88);
  const [inlineArPitchDeg, setInlineArPitchDeg] = useState<number>(20);
  const [inlineArDragging, setInlineArDragging] = useState<boolean>(false);

  const xrOverlayRef = useRef<HTMLDivElement | null>(null);
  const arVideoRef = useRef<HTMLVideoElement | null>(null);
  const arPhotoRef = useRef<HTMLImageElement | null>(null);
  const arPhotoInputRef = useRef<HTMLInputElement | null>(null);
  const arStreamRef = useRef<MediaStream | null>(null);

  const [interactSignal, setInteractSignal] = useState<number>(0);
  const [studioInteracting, setStudioInteracting] = useState<boolean>(false);
  const [quickAdded, setQuickAdded] = useState<boolean>(false);
  const interactTimerRef = useRef<number | null>(null);
  const resetTimerRef = useRef<number | null>(null);
  const quickAddTimerRef = useRef<number | null>(null);

  // Detect WebXR immersive-ar support safely on mount
  useEffect(() => {
    let cancelled = false;
    checkWebXrArSupport().then((supported) => {
      if (!cancelled) setXrSupported(supported);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (initialShowBoot !== undefined) {
      setShowBoot(initialShowBoot);
    }
  }, [initialShowBoot]);

  const stopInlineCamera = () => {
    if (arStreamRef.current) {
      arStreamRef.current.getTracks().forEach((track) => track.stop());
      arStreamRef.current = null;
    }
    if (arVideoRef.current) {
      arVideoRef.current.srcObject = null;
    }
  };

  const startInlineCamera = async (preferred: 'environment' | 'user') => {
    stopInlineCamera();
    if (
      typeof navigator === 'undefined' ||
      !navigator.mediaDevices ||
      !navigator.mediaDevices.getUserMedia
    ) {
      setInlineCamStatus('unavailable');
      return;
    }
    setInlineCamStatus('requesting');
    try {
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: preferred },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
      }
      arStreamRef.current = stream;
      if (arVideoRef.current) {
        arVideoRef.current.srcObject = stream;
        await arVideoRef.current.play().catch(() => undefined);
      }
      setInlinePhotoUrl(null);
      setInlineCamStatus('active');
    } catch {
      setInlineCamStatus('denied');
    }
  };

  useEffect(() => {
    if (arOverlayMode !== 'camera') {
      stopInlineCamera();
      setInlineCamStatus('idle');
      return;
    }
    if (!inlinePhotoUrl) {
      void startInlineCamera(inlineFacingMode);
    }
    return () => {
      stopInlineCamera();
    };
  }, [arOverlayMode, inlineFacingMode, inlinePhotoUrl]);

  useEffect(() => {
    return () => {
      stopInlineCamera();
      if (inlinePhotoUrl) URL.revokeObjectURL(inlinePhotoUrl);
    };
  }, [inlinePhotoUrl]);

  useEffect(() => {
    if (!autoOpenArMode) return;
    if (autoOpenArMode === 'camera') {
      // Mobile QR deep-link replaces the 3D studio stage directly with the live AR overlay
      setArOverlayMode('camera');
      setPinnedPart(null);
      setHoveredPart(null);
    } else {
      setArInitialMode(autoOpenArMode);
      setArModalOpen(true);
    }
    onConsumeAutoOpenAr?.();
  }, [autoOpenArMode, onConsumeAutoOpenAr]);

  const pulseStudioInteract = () => {
    setInteractSignal((n) => n + 1);
    setStudioInteracting(true);
    if (interactTimerRef.current !== null) {
      window.clearTimeout(interactTimerRef.current);
    }
    interactTimerRef.current = window.setTimeout(() => {
      setStudioInteracting(false);
    }, 3600);
  };

  useEffect(() => {
    return () => {
      if (interactTimerRef.current !== null) {
        window.clearTimeout(interactTimerRef.current);
      }
      if (resetTimerRef.current !== null) {
        window.clearTimeout(resetTimerRef.current);
      }
      if (quickAddTimerRef.current !== null) {
        window.clearTimeout(quickAddTimerRef.current);
      }
    };
  }, []);

  const tooltipAnchorRef = useRef<HTMLDivElement | null>(null);
  const tooltipCardRef = useRef<HTMLDivElement | null>(null);
  const tooltipPosRef = useRef<{ x: number; y: number }>({ x: 24, y: 76 });
  const quickXRef = useRef<((v: number) => gsap.core.Tween) | null>(null);
  const quickYRef = useRef<((v: number) => gsap.core.Tween) | null>(null);
  const hoveredPartRef = useRef<BottlePartId | null>(null);
  const pinnedPartRef = useRef<BottlePartId | null>(null);

  const activePartId = hoveredPart ?? pinnedPart;
  const activePartSpec = activePartId ? BOTTLE_PART_SPECS[activePartId] : null;

  useEffect(() => {
    pinnedPartRef.current = pinnedPart;
  }, [pinnedPart]);

  // Set up silky GSAP quickTo cursor tracking for tooltip container
  useEffect(() => {
    const anchor = tooltipAnchorRef.current;
    if (!anchor) return;
    quickXRef.current = gsap.quickTo(anchor, 'x', {
      duration: 0.18,
      ease: 'power3.out',
    });
    quickYRef.current = gsap.quickTo(anchor, 'y', {
      duration: 0.18,
      ease: 'power3.out',
    });
    gsap.set(anchor, {
      x: tooltipPosRef.current.x,
      y: tooltipPosRef.current.y,
    });
    return () => {
      quickXRef.current = null;
      quickYRef.current = null;
    };
  }, [activePartId !== null]);

  // GSAP pop-in animation whenever the inspected 3D component appears or changes
  useEffect(() => {
    if (!activePartId) return;
    const card = tooltipCardRef.current;
    const anchor = tooltipAnchorRef.current;
    if (!card || !anchor) return;

    gsap.set(anchor, {
      x: tooltipPosRef.current.x,
      y: tooltipPosRef.current.y,
    });

    const reducedMotion = window.matchMedia?.(
      '(prefers-reduced-motion: reduce)'
    ).matches;
    if (reducedMotion) {
      gsap.set(card, { opacity: 1, scale: 1, y: 0 });
      return;
    }

    const ctx = gsap.context(() => {
      gsap.fromTo(
        card,
        { opacity: 0, scale: 0.86, y: 12 },
        {
          opacity: 1,
          scale: 1,
          y: 0,
          duration: 0.34,
          ease: 'back.out(1.75)',
          overwrite: 'auto',
        }
      );
      gsap.fromTo(
        '.studio3d-tooltip-spec',
        { opacity: 0, y: 6 },
        {
          opacity: 1,
          y: 0,
          duration: 0.24,
          stagger: 0.05,
          delay: 0.08,
          ease: 'power2.out',
          overwrite: 'auto',
        }
      );
    }, card);

    return () => ctx.revert();
  }, [activePartId]);

  // Refs synced cleanly into the Three.js animation loop without rebuilding the WebGL context
  const stateRef = useRef({
    theme,
    daypart,
    studioFinish,
    studioSize,
    studioEngraving,
    engravingFont,
    exploded,
    showBoot,
    autoSpin,
    chillMist,
    cameraPreset,
    arOverlayMode,
    inlineArScale,
    inlineArPitchDeg,
  });

  const sceneApiRef = useRef<{
    updateFinish: (
      f: StudioFinishKey,
      s: StudioSizeKey,
      engText: string,
      engFont: 'sans' | 'serif' | 'mono'
    ) => void;
    updateTheme: (t: 'light' | 'dark', dp: 'morning' | 'day' | 'evening') => void;
    syncArMode: () => void;
    startWebXrSession: (overlayRoot: HTMLElement | null) => Promise<void>;
    endWebXrSession: () => Promise<void>;
    rotateArBottle: (deltaRad: number) => void;
    resetArPlacement: () => void;
    jumpCamera: (preset: CameraPresetKey) => void;
    capturePng: () => string | null;
    captureWebGlCanvas: () => HTMLCanvasElement | null;
    exportGlb: () => Promise<ArrayBuffer>;
  } | null>(null);

  useEffect(() => {
    setStudioFinish(activeFinish);
  }, [activeFinish]);

  useEffect(() => {
    setStudioSize(activeSize);
  }, [activeSize]);

  useEffect(() => {
    setStudioEngraving(engravingEnabled ? engravingText : '');
  }, [engravingEnabled, engravingText]);

  useEffect(() => {
    stateRef.current = {
      theme,
      daypart,
      studioFinish,
      studioSize,
      studioEngraving,
      engravingFont,
      exploded,
      showBoot,
      autoSpin,
      chillMist,
      cameraPreset,
      arOverlayMode,
      inlineArScale,
      inlineArPitchDeg,
    };
    sceneApiRef.current?.updateFinish(
      studioFinish,
      studioSize,
      studioEngraving,
      engravingFont
    );
    sceneApiRef.current?.syncArMode();
  }, [
    theme,
    daypart,
    studioFinish,
    studioSize,
    studioEngraving,
    engravingFont,
    exploded,
    showBoot,
    autoSpin,
    chillMist,
    cameraPreset,
    arOverlayMode,
    inlineArScale,
    inlineArPitchDeg,
  ]);

  useEffect(() => {
    sceneApiRef.current?.updateTheme(theme, daypart);
  }, [theme, daypart]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = Math.max(320, container.clientWidth);
    const height = Math.max(420, container.clientHeight);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: true,
    });

    // Detect software WebGL rasterizers and scale back expensive passes gracefully
    const gl = renderer.getContext();
    const debugExt = gl.getExtension('WEBGL_debug_renderer_info');
    const rendererName = debugExt
      ? String(gl.getParameter(debugExt.UNMASKED_RENDERER_WEBGL) || '')
      : '';
    const isSoftwareGl = /swiftshader|llvmpipe|software|mesa/i.test(rendererName);

    renderer.setPixelRatio(
      isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2)
    );
    renderer.setSize(width, height);
    renderer.setClearColor(0x000000, 0);
    renderer.xr.enabled = true;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const morningBg = new THREE.Color('#F6EEE2');
    const lightBg = new THREE.Color('#E8F3FA');
    const eveningBg = new THREE.Color('#0B0E24');
    const resolveStudioBg = (t: 'light' | 'dark', dp: 'morning' | 'day' | 'evening') => {
      if (dp === 'morning') return morningBg;
      if (dp === 'evening' || t === 'dark') return eveningBg;
      return lightBg;
    };
    const initialBg = resolveStudioBg(stateRef.current.theme, stateRef.current.daypart);
    scene.background = initialBg.clone();
    scene.fog = new THREE.FogExp2(initialBg.getHex(), 0.038);

    // Procedural Studio IBL via RoomEnvironment
    const pmrem = new THREE.PMREMGenerator(renderer);
    const roomEnv = new RoomEnvironment();
    const envTarget = pmrem.fromScene(roomEnv, 0.04);
    scene.environment = envTarget.texture;
    roomEnv.dispose();
    pmrem.dispose();

    const camera = new THREE.PerspectiveCamera(34, width / height, 0.1, 80);
    camera.position.set(0.45, 2.35, 5.1);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.enablePan = false;
    controls.minDistance = 2.4;
    controls.maxDistance = 8.2;
    controls.minPolarAngle = 0.2;
    controls.maxPolarAngle = Math.PI * 0.49;
    controls.target.set(0, 1.55, 0);

    // Three-point architectural studio lighting (warm key + cool hemisphere + aqua rim)
    const hemiLight = new THREE.HemisphereLight(0xd9f0ff, 0x2a3b4c, 0.95);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xfff5e8, 2.2);
    keyLight.position.set(4.2, 6.8, 4.6);
    if (!isSoftwareGl) {
      keyLight.castShadow = true;
      keyLight.shadow.mapSize.set(1024, 1024);
      keyLight.shadow.camera.near = 1;
      keyLight.shadow.camera.far = 20;
      keyLight.shadow.camera.left = -3.2;
      keyLight.shadow.camera.right = 3.2;
      keyLight.shadow.camera.top = 4.2;
      keyLight.shadow.camera.bottom = -1.5;
      keyLight.shadow.bias = -0.0004;
      keyLight.shadow.normalBias = 0.02;
    }
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x7dd3fc, 1.05);
    rimLight.position.set(-4.5, 4.0, -3.5);
    scene.add(rimLight);

    // Sculptural studio plinth & radial contact shadow (bottom pivot at y = 0)
    const plinthGeo = new THREE.CylinderGeometry(2.15, 2.35, 0.16, 64);
    const plinthMat = new THREE.MeshStandardMaterial({
      color: stateRef.current.theme === 'dark' ? 0x0f253a : 0xdcebf6,
      roughness: 0.72,
      metalness: 0.08,
    });
    const plinth = new THREE.Mesh(plinthGeo, plinthMat);
    plinth.position.y = -0.08;
    plinth.receiveShadow = true;
    scene.add(plinth);

    const floorGeo = new THREE.PlaneGeometry(40, 40);
    const floorMat = new THREE.MeshStandardMaterial({
      color: stateRef.current.theme === 'dark' ? 0x071726 : 0xe8f3fa,
      roughness: 0.92,
      metalness: 0.0,
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.161;
    floor.receiveShadow = true;
    scene.add(floor);

    const shadowTex = createContactShadowTexture();
    const contactShadow = new THREE.Mesh(
      new THREE.PlaneGeometry(2.15, 2.15),
      new THREE.MeshBasicMaterial({
        map: shadowTex,
        transparent: true,
        depthWrite: false,
      })
    );
    contactShadow.rotation.x = -Math.PI / 2;
    contactShadow.position.y = 0.003;
    scene.add(contactShadow);

    // =========================================================================
    // COMPOSITE 10-PART WATERHOLIC PROCEDURAL FLASK GROUP (Pivot bottom-center)
    // =========================================================================
    const bottleRoot = new THREE.Group();
    scene.add(bottleRoot);

    // 1. Protective Silicone Base Boot (LatheGeometry)
    const bootPts = [
      new THREE.Vector2(0.01, 0.0),
      new THREE.Vector2(0.56, 0.0),
      new THREE.Vector2(0.625, 0.06),
      new THREE.Vector2(0.635, 0.44),
      new THREE.Vector2(0.618, 0.48),
      new THREE.Vector2(0.585, 0.46),
      new THREE.Vector2(0.585, 0.05),
      new THREE.Vector2(0.01, 0.05),
    ];
    const bootGeo = new THREE.LatheGeometry(bootPts, 56);
    const bootMat = new THREE.MeshStandardMaterial({
      color: 0x0a2239,
      roughness: 0.86,
      metalness: 0.04,
    });
    const bootMesh = new THREE.Mesh(bootGeo, bootMat);
    bootMesh.castShadow = true;
    bootMesh.receiveShadow = true;
    bottleRoot.add(bootMesh);

    // 2. Outer Double-Wall Body (LatheGeometry with smooth bevels & tapered shoulder)
    const bodyPts = [
      new THREE.Vector2(0.01, 0.02),
      new THREE.Vector2(0.54, 0.02),
      new THREE.Vector2(0.6, 0.09),
      new THREE.Vector2(0.605, 1.98),
      new THREE.Vector2(0.585, 2.14),
      new THREE.Vector2(0.49, 2.34),
      new THREE.Vector2(0.39, 2.48),
      new THREE.Vector2(0.38, 2.54),
    ];
    const bodyGeo = new THREE.LatheGeometry(bodyPts, 64);
    const initialFinishSpec =
      STUDIO_FINISHES.find((f) => f.id === stateRef.current.studioFinish) ||
      STUDIO_FINISHES[0];
    let brandTexture = createBrandWrapTexture(
      initialFinishSpec.hex,
      initialFinishSpec.logoInk,
      SIZE_SPECS[stateRef.current.studioSize].label,
      Boolean(initialFinishSpec.isGlass),
      1024,
      {
        text: stateRef.current.studioEngraving,
        font: stateRef.current.engravingFont,
      }
    );
    const bodyMat = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      map: brandTexture,
      roughness: initialFinishSpec.roughness,
      metalness: initialFinishSpec.metalness,
      clearcoat: initialFinishSpec.clearcoat,
      clearcoatRoughness: 0.18,
    });
    const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
    bodyMesh.castShadow = true;
    bodyMesh.receiveShadow = true;
    // Align UV seam away from front camera (+Z)
    bodyMesh.rotation.y = -Math.PI / 2;
    bottleRoot.add(bodyMesh);

    // 3. Inner Vacuum Thermal Core Liner (copper-lined 18/8 steel revealed in Exploded view)
    const corePts = [
      new THREE.Vector2(0.01, 0.12),
      new THREE.Vector2(0.47, 0.12),
      new THREE.Vector2(0.51, 0.18),
      new THREE.Vector2(0.51, 1.92),
      new THREE.Vector2(0.34, 2.38),
      new THREE.Vector2(0.33, 2.48),
    ];
    const coreGeo = new THREE.LatheGeometry(corePts, 48);
    const coreMat = new THREE.MeshStandardMaterial({
      color: 0xd4966a, // Copper vacuum thermal shield
      roughness: 0.28,
      metalness: 0.88,
    });
    const coreMesh = new THREE.Mesh(coreGeo, coreMat);
    coreMesh.visible = false;
    bottleRoot.add(coreMesh);

    // 4. Internal Pure Water Volume (visible in Transparent Glass finish or Exploded mode)
    const waterGeo = new THREE.CylinderGeometry(0.525, 0.52, 1.72, 48);
    const waterMat = new THREE.MeshPhysicalMaterial({
      color: 0x7dd3fc,
      roughness: 0.06,
      metalness: 0.0,
      transmission: 0.82,
      thickness: 0.9,
      ior: 1.333,
      transparent: true,
      opacity: 0.88,
    });
    const waterMesh = new THREE.Mesh(waterGeo, waterMat);
    waterMesh.position.y = 1.02;
    waterMesh.visible = Boolean(initialFinishSpec.isGlass);
    bottleRoot.add(waterMesh);

    // 5. Machined 18/8 Brushed Stainless Neck Collar
    const collarPts = [
      new THREE.Vector2(0.37, 2.46),
      new THREE.Vector2(0.405, 2.48),
      new THREE.Vector2(0.41, 2.66),
      new THREE.Vector2(0.365, 2.69),
      new THREE.Vector2(0.34, 2.66),
    ];
    const collarGeo = new THREE.LatheGeometry(collarPts, 56);
    const steelMat = new THREE.MeshStandardMaterial({
      color: 0xdbe3e8,
      roughness: 0.22,
      metalness: 0.92,
    });
    const collarMesh = new THREE.Mesh(collarGeo, steelMat);
    collarMesh.castShadow = true;
    bottleRoot.add(collarMesh);

    // 6. Silicone Leakproof O-Ring Gasket
    const gasketGeo = new THREE.TorusGeometry(0.395, 0.022, 16, 48);
    const gasketMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      roughness: 0.72,
      metalness: 0.05,
    });
    const gasketMesh = new THREE.Mesh(gasketGeo, gasketMat);
    gasketMesh.rotation.x = Math.PI / 2;
    gasketMesh.position.y = 2.69;
    bottleRoot.add(gasketMesh);

    // 7–9. Cap Assembly Group (lid dome + knurled grip ribs + arched carry loop + side hinges)
    const capGroup = new THREE.Group();
    bottleRoot.add(capGroup);

    const lidPts = [
      new THREE.Vector2(0.36, 2.68),
      new THREE.Vector2(0.43, 2.7),
      new THREE.Vector2(0.435, 3.04),
      new THREE.Vector2(0.4, 3.12),
      new THREE.Vector2(0.32, 3.14),
      new THREE.Vector2(0.01, 3.145),
    ];
    const lidGeo = new THREE.LatheGeometry(lidPts, 56);
    const lidMat = new THREE.MeshStandardMaterial({
      color: 0x161c22,
      roughness: 0.56,
      metalness: 0.12,
    });
    const lidMesh = new THREE.Mesh(lidGeo, lidMat);
    lidMesh.castShadow = true;
    capGroup.add(lidMesh);

    // Knurled tactile grip ribs around cap perimeter (InstancedMesh)
    const ribCount = 36;
    const ribGeo = new THREE.BoxGeometry(0.016, 0.24, 0.024);
    const ribMat = new THREE.MeshStandardMaterial({
      color: 0x1f2830,
      roughness: 0.65,
      metalness: 0.14,
    });
    const ribInst = new THREE.InstancedMesh(ribGeo, ribMat, ribCount);
    const dummy = new THREE.Object3D();
    for (let i = 0; i < ribCount; i++) {
      const angle = (i / ribCount) * Math.PI * 2;
      dummy.position.set(Math.cos(angle) * 0.435, 2.87, Math.sin(angle) * 0.435);
      dummy.rotation.set(0, -angle, 0);
      dummy.updateMatrix();
      ribInst.setMatrixAt(i, dummy.matrix);
    }
    capGroup.add(ribInst);

    // Arched Ergonomic Carry Loop (TubeGeometry along smooth CatmullRomCurve3)
    const loopCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.39, 2.95, 0),
      new THREE.Vector3(-0.46, 3.36, 0),
      new THREE.Vector3(-0.22, 3.62, 0),
      new THREE.Vector3(0.0, 3.68, 0),
      new THREE.Vector3(0.22, 3.62, 0),
      new THREE.Vector3(0.46, 3.36, 0),
      new THREE.Vector3(0.39, 2.95, 0),
    ]);
    const loopGeo = new THREE.TubeGeometry(loopCurve, 44, 0.052, 16, false);
    const loopMat = new THREE.MeshStandardMaterial({
      color: 0x1a2229,
      roughness: 0.48,
      metalness: 0.18,
    });
    const loopMesh = new THREE.Mesh(loopGeo, loopMat);
    loopMesh.castShadow = true;
    capGroup.add(loopMesh);

    // Steel hinge pins on cap sides
    const pinGeo = new THREE.CylinderGeometry(0.055, 0.055, 0.9, 20);
    const pinMesh = new THREE.Mesh(pinGeo, steelMat);
    pinMesh.rotation.z = Math.PI / 2;
    pinMesh.position.y = 2.95;
    capGroup.add(pinMesh);

    // Tag meshes with component part IDs for interactive 3D raycast tooltips
    bootMesh.userData.partId = 'boot' as BottlePartId;
    bodyMesh.userData.partId = 'body' as BottlePartId;
    coreMesh.userData.partId = 'chamber' as BottlePartId;
    waterMesh.userData.partId = 'water' as BottlePartId;
    collarMesh.userData.partId = 'collar' as BottlePartId;
    gasketMesh.userData.partId = 'seal' as BottlePartId;
    lidMesh.userData.partId = 'lid' as BottlePartId;
    ribInst.userData.partId = 'lid' as BottlePartId;
    loopMesh.userData.partId = 'lid' as BottlePartId;
    pinMesh.userData.partId = 'lid' as BottlePartId;

    const inspectableMeshes: THREE.Object3D[] = [
      lidMesh,
      ribInst,
      loopMesh,
      pinMesh,
      gasketMesh,
      collarMesh,
      coreMesh,
      bodyMesh,
      waterMesh,
      bootMesh,
    ];

    const partMaterials: Record<
      BottlePartId,
      THREE.MeshStandardMaterial[]
    > = {
      lid: [lidMat, ribMat, loopMat],
      seal: [gasketMat],
      collar: [steelMat],
      chamber: [coreMat],
      body: [bodyMat],
      water: [waterMat],
      boot: [bootMat],
    };

    const highlightTint = new THREE.Color('#0ea5e9');
    const chamberTint = new THREE.Color('#f59e0b');
    (Object.keys(partMaterials) as BottlePartId[]).forEach((pid) => {
      const tint = pid === 'chamber' ? chamberTint : highlightTint;
      partMaterials[pid].forEach((mat) => {
        mat.emissive.copy(tint);
        mat.emissiveIntensity = 0;
      });
    });

    // Raycaster & pointer interaction handlers for hover/tap component inspection
    const raycaster = new THREE.Raycaster();
    const pointerNdc = new THREE.Vector2();
    let isOrbitDragging = false;
    let pointerDownPos: { x: number; y: number } | null = null;

    const clampTooltipCoords = (localX: number, localY: number, w: number, h: number) => {
      const cardW = Math.min(284, w - 24);
      const cardH = 166;
      const offsetX = localX > w * 0.56 ? -(cardW + 18) : 20;
      const offsetY = localY > h * 0.62 ? -(cardH + 14) : -24;
      const cx = Math.min(Math.max(12, localX + offsetX), Math.max(12, w - cardW - 12));
      const cy = Math.min(Math.max(58, localY + offsetY), Math.max(58, h - cardH - 16));
      return { x: cx, y: cy };
    };

    const pickPartAtClientPoint = (clientX: number, clientY: number) => {
      const rect = renderer.domElement.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return null;
      const localX = clientX - rect.left;
      const localY = clientY - rect.top;
      pointerNdc.x = (localX / rect.width) * 2 - 1;
      pointerNdc.y = -(localY / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointerNdc, camera);
      const hits = raycaster.intersectObjects(inspectableMeshes, false);
      const visibleHit = hits.find((h) => h.object.visible);
      if (!visibleHit) return null;
      const partId = visibleHit.object.userData.partId as
        | BottlePartId
        | undefined;
      if (!partId) return null;
      const coords = clampTooltipCoords(localX, localY, rect.width, rect.height);
      return { partId, coords };
    };

    // WebXR & Inline Camera AR Placement Reticle (real-world meter proportions)
    const arReticleGroup = new THREE.Group();
    arReticleGroup.matrixAutoUpdate = false;
    arReticleGroup.visible = false;

    const arRingGeo = new THREE.RingGeometry(0.056, 0.068, 48);
    arRingGeo.rotateX(-Math.PI / 2);
    const arRingMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const arRingMesh = new THREE.Mesh(arRingGeo, arRingMat);
    arReticleGroup.add(arRingMesh);

    const arDotGeo = new THREE.CircleGeometry(0.011, 24);
    arDotGeo.rotateX(-Math.PI / 2);
    const arDotMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.92,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const arDotMesh = new THREE.Mesh(arDotGeo, arDotMat);
    arDotMesh.position.y = 0.0005;
    arReticleGroup.add(arDotMesh);
    scene.add(arReticleGroup);

    // Inline Camera AR surface ring (studio scale, grounded at bottle base)
    const inlineReticleGeo = new THREE.RingGeometry(0.72, 0.82, 56);
    inlineReticleGeo.rotateX(-Math.PI / 2);
    const inlineReticleMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.65,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const inlineReticle = new THREE.Mesh(inlineReticleGeo, inlineReticleMat);
    inlineReticle.position.y = 0.008;
    inlineReticle.visible = false;
    scene.add(inlineReticle);

    // Pre-allocated math helpers for zero-GC AR drag & WebXR pose decomposition
    const arGroundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const arHitPoint = new THREE.Vector3();
    const inlineTargetPos = new THREE.Vector3(0, 0, 0);
    const xrDecompPos = new THREE.Vector3();
    const xrDecompQuat = new THREE.Quaternion();
    const xrDecompScale = new THREE.Vector3();
    let inlineDragging = false;
    let inlinePointerId: number | null = null;
    let xrBottlePlacedLocal = false;
    let xrSurfaceDetectedLocal = false;

    // Active WebXR session + hit-test state
    let activeXrSession: XRSession | null = null;
    let xrHitTestSource: XRHitTestSource | null = null;
    let xrHitTestRequested = false;

    const onCanvasPointerMove = (e: PointerEvent) => {
      if (stateRef.current.arOverlayMode === 'webxr') return;
      if (stateRef.current.arOverlayMode === 'camera') {
        if (!inlineDragging) {
          renderer.domElement.style.cursor = 'crosshair';
          return;
        }
        const rect = renderer.domElement.getBoundingClientRect();
        if (rect.width <= 0 || rect.height <= 0) return;
        pointerNdc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        pointerNdc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        raycaster.setFromCamera(pointerNdc, camera);
        if (raycaster.ray.intersectPlane(arGroundPlane, arHitPoint)) {
          inlineTargetPos.set(
            THREE.MathUtils.clamp(arHitPoint.x, -3.4, 3.4),
            0,
            THREE.MathUtils.clamp(arHitPoint.z, -2.6, 2.6)
          );
          renderer.domElement.style.cursor = 'grabbing';
        }
        return;
      }

      if (e.pointerType === 'touch' || isOrbitDragging) return;
      const hit = pickPartAtClientPoint(e.clientX, e.clientY);
      if (hit) {
        renderer.domElement.style.cursor = 'pointer';
        tooltipPosRef.current = hit.coords;
        quickXRef.current?.(hit.coords.x);
        quickYRef.current?.(hit.coords.y);
        if (hoveredPartRef.current !== hit.partId) {
          hoveredPartRef.current = hit.partId;
          setHoveredPart(hit.partId);
        }
      } else {
        renderer.domElement.style.cursor = 'grab';
        if (hoveredPartRef.current !== null) {
          hoveredPartRef.current = null;
          setHoveredPart(null);
        }
      }
    };

    const onCanvasPointerLeave = () => {
      if (stateRef.current.arOverlayMode !== 'none') return;
      renderer.domElement.style.cursor = 'grab';
      if (hoveredPartRef.current !== null) {
        hoveredPartRef.current = null;
        setHoveredPart(null);
      }
    };

    const onCanvasPointerDown = (e: PointerEvent) => {
      if (stateRef.current.arOverlayMode === 'webxr') return;
      if (stateRef.current.arOverlayMode === 'camera') {
        const rect = renderer.domElement.getBoundingClientRect();
        if (rect.width <= 0 || rect.height <= 0) return;
        pointerNdc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        pointerNdc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        raycaster.setFromCamera(pointerNdc, camera);
        if (raycaster.ray.intersectPlane(arGroundPlane, arHitPoint)) {
          inlineDragging = true;
          inlinePointerId = e.pointerId;
          setInlineArDragging(true);
          renderer.domElement.setPointerCapture?.(e.pointerId);
          inlineTargetPos.set(
            THREE.MathUtils.clamp(arHitPoint.x, -3.4, 3.4),
            0,
            THREE.MathUtils.clamp(arHitPoint.z, -2.6, 2.6)
          );
          triggerMicroHapticTick();
        }
        return;
      }
      pointerDownPos = { x: e.clientX, y: e.clientY };
    };

    const onCanvasPointerUp = (e: PointerEvent) => {
      if (inlineDragging) {
        inlineDragging = false;
        setInlineArDragging(false);
        if (inlinePointerId !== null) {
          try {
            renderer.domElement.releasePointerCapture?.(inlinePointerId);
          } catch {
            // Ignore already-released pointer
          }
          inlinePointerId = null;
        }
        renderer.domElement.style.cursor = 'crosshair';
        return;
      }
      if (stateRef.current.arOverlayMode !== 'none') return;
      if (!pointerDownPos) return;
      const moved = Math.hypot(
        e.clientX - pointerDownPos.x,
        e.clientY - pointerDownPos.y
      );
      pointerDownPos = null;
      // Treat crisp tap/click (< 7px drag) as component inspection pin toggle (great for touch!)
      if (moved > 7) return;
      const hit = pickPartAtClientPoint(e.clientX, e.clientY);
      if (hit) {
        tooltipPosRef.current = hit.coords;
        quickXRef.current?.(hit.coords.x);
        quickYRef.current?.(hit.coords.y);
        setPinnedPart((prev) => (prev === hit.partId ? null : hit.partId));
      } else if (pinnedPartRef.current !== null) {
        setPinnedPart(null);
      }
    };

    renderer.domElement.addEventListener('pointermove', onCanvasPointerMove);
    renderer.domElement.addEventListener('pointerleave', onCanvasPointerLeave);
    renderer.domElement.addEventListener('pointerdown', onCanvasPointerDown);
    renderer.domElement.addEventListener('pointerup', onCanvasPointerUp);
    renderer.domElement.addEventListener('pointercancel', onCanvasPointerUp);

    // 10. Chilled Condensation Micro-Droplets (InstancedMesh floating gently around flask)
    const dropCount = 48;
    const dropGeo = new THREE.SphereGeometry(0.022, 10, 10);
    const dropMat = new THREE.MeshPhysicalMaterial({
      color: 0xdff5ff,
      roughness: 0.08,
      metalness: 0.0,
      transparent: true,
      opacity: 0.72,
      clearcoat: 1.0,
    });
    const dropsInst = new THREE.InstancedMesh(dropGeo, dropMat, dropCount);
    const dropSeeds = Array.from({ length: dropCount }, (_, i) => ({
      angle: (i / dropCount) * Math.PI * 2 + (i % 5) * 0.35,
      radius: 0.74 + ((i * 29) % 100) / 210,
      baseY: 0.35 + ((i * 47) % 100) / 42,
      speed: 0.35 + ((i * 17) % 100) / 180,
      scale: 0.55 + ((i * 13) % 100) / 140,
    }));
    scene.add(dropsInst);

    // Smooth camera preset lerping
    let camLerpActive = false;
    const targetCamPos = new THREE.Vector3(0.45, 2.35, 5.1);
    const targetLookAt = new THREE.Vector3(0, 1.55, 0);

    const applyFinishAndSize = (
      fKey: StudioFinishKey,
      sKey: StudioSizeKey,
      engText: string,
      engFont: 'sans' | 'serif' | 'mono'
    ) => {
      const spec =
        STUDIO_FINISHES.find((f) => f.id === fKey) || STUDIO_FINISHES[0];
      const sz = SIZE_SPECS[sKey];

      const nextTex = createBrandWrapTexture(
        spec.hex,
        spec.logoInk,
        sz.label,
        Boolean(spec.isGlass),
        1024,
        { text: engText, font: engFont }
      );
      brandTexture.dispose();
      brandTexture = nextTex;
      bodyMat.map = brandTexture;
      bodyMat.roughness = spec.roughness;
      bodyMat.metalness = spec.metalness;
      bodyMat.clearcoat = spec.clearcoat;

      if (spec.isGlass) {
        bodyMat.transparent = true;
        bodyMat.opacity = 0.42;
        bodyMat.transmission = 0.76;
        bodyMat.ior = 1.48;
        bodyMat.thickness = 0.45;
      } else {
        bodyMat.transparent = false;
        bodyMat.opacity = 1.0;
        bodyMat.transmission = 0.0;
      }
      bodyMat.needsUpdate = true;

      bootMat.color.set(spec.bootHex);
      const modeNow = stateRef.current.arOverlayMode;
      if (modeNow === 'webxr') {
        bottleRoot.scale.set(
          sz.scaleXZ * AR_METER_SCALE,
          sz.scaleY * AR_METER_SCALE,
          sz.scaleXZ * AR_METER_SCALE
        );
      } else if (modeNow === 'camera') {
        const sc = stateRef.current.inlineArScale;
        bottleRoot.scale.set(sz.scaleXZ * sc, sz.scaleY * sc, sz.scaleXZ * sc);
      } else {
        bottleRoot.scale.set(sz.scaleXZ, sz.scaleY, sz.scaleXZ);
      }
    };

    const applyThemeColors = (
      t: 'light' | 'dark',
      dp: 'morning' | 'day' | 'evening'
    ) => {
      if (stateRef.current.arOverlayMode !== 'none') return;
      const bg = resolveStudioBg(t, dp);
      scene.background = bg.clone();
      scene.fog = new THREE.FogExp2(bg.getHex(), 0.038);
      if (dp === 'morning') {
        plinthMat.color.setHex(0xede0cc);
        floorMat.color.setHex(0xf6eee2);
      } else if (dp === 'evening' || t === 'dark') {
        plinthMat.color.setHex(0x161b3d);
        floorMat.color.setHex(0x0b0e24);
      } else {
        plinthMat.color.setHex(0xdcebf6);
        floorMat.color.setHex(0xe8f3fa);
      }
    };
    applyThemeColors(stateRef.current.theme, stateRef.current.daypart);

    const syncArVisualMode = () => {
      const s = stateRef.current;
      const sz = SIZE_SPECS[s.studioSize];

      if (s.arOverlayMode === 'webxr') {
        scene.background = null;
        scene.fog = null;
        plinth.visible = false;
        floor.visible = false;
        dropsInst.visible = false;
        inlineReticle.visible = false;
        controls.enabled = false;
        bottleRoot.scale.set(
          sz.scaleXZ * AR_METER_SCALE,
          sz.scaleY * AR_METER_SCALE,
          sz.scaleXZ * AR_METER_SCALE
        );
        contactShadow.scale.setScalar(AR_METER_SCALE * 1.15);
        contactShadow.visible = xrBottlePlacedLocal;
        return;
      }

      if (s.arOverlayMode === 'camera') {
        scene.background = null;
        scene.fog = null;
        plinth.visible = false;
        floor.visible = false;
        dropsInst.visible = false;
        arReticleGroup.visible = false;
        inlineReticle.visible = true;
        bottleRoot.visible = true;
        controls.enabled = false;
        camLerpActive = false;

        const pitchRad = THREE.MathUtils.degToRad(s.inlineArPitchDeg);
        const dist = 6.1;
        camera.position.set(
          0,
          1.2 + Math.sin(pitchRad) * dist,
          Math.cos(pitchRad) * dist
        );
        camera.lookAt(0, 1.35, 0);

        const sc = s.inlineArScale;
        bottleRoot.scale.set(sz.scaleXZ * sc, sz.scaleY * sc, sz.scaleXZ * sc);
        contactShadow.visible = true;
        contactShadow.scale.setScalar(sc * 1.08);
        inlineReticle.scale.setScalar(sc);
        return;
      }

      // Standard 3D Studio mode restoration
      plinth.visible = true;
      floor.visible = true;
      bottleRoot.visible = true;
      arReticleGroup.visible = false;
      inlineReticle.visible = false;
      bottleRoot.position.set(0, 0, 0);
      bottleRoot.scale.set(sz.scaleXZ, sz.scaleY, sz.scaleXZ);
      contactShadow.visible = true;
      contactShadow.position.set(0, 0.003, 0);
      contactShadow.scale.set(1, 1, 1);
      controls.enabled = true;
      applyThemeColors(s.theme, s.daypart);
    };

    const handleXrSelect = () => {
      if (!activeXrSession) return;
      if (arReticleGroup.visible) {
        arReticleGroup.matrix.decompose(xrDecompPos, xrDecompQuat, xrDecompScale);
        bottleRoot.position.copy(xrDecompPos);
        bottleRoot.rotation.set(0, bottleRoot.rotation.y, 0);
        bottleRoot.visible = true;
        contactShadow.position.set(xrDecompPos.x, xrDecompPos.y + 0.001, xrDecompPos.z);
        contactShadow.visible = true;
        xrBottlePlacedLocal = true;
        setXrPlaced(true);
        triggerMicroHapticTick();
      } else if (!xrBottlePlacedLocal) {
        // Fallback placement 0.65m directly ahead of viewer if surface hasn't locked yet
        const xrCam = renderer.xr.getCamera();
        xrDecompPos.set(0, -0.14, -0.65).applyMatrix4(xrCam.matrixWorld);
        bottleRoot.position.copy(xrDecompPos);
        bottleRoot.visible = true;
        contactShadow.position.set(xrDecompPos.x, xrDecompPos.y + 0.001, xrDecompPos.z);
        contactShadow.visible = true;
        xrBottlePlacedLocal = true;
        setXrPlaced(true);
        triggerMicroHapticTick();
      }
    };

    const cleanupXrSessionState = () => {
      if (xrHitTestSource) {
        try {
          xrHitTestSource.cancel();
        } catch {
          // Ignore already cancelled hit-test source
        }
        xrHitTestSource = null;
      }
      xrHitTestRequested = false;
      xrBottlePlacedLocal = false;
      xrSurfaceDetectedLocal = false;
      activeXrSession = null;
      arReticleGroup.visible = false;
      setXrPlaced(false);
      setXrSurfaceFound(false);
      setArOverlayMode('none');
      stateRef.current.arOverlayMode = 'none';
      const cfg = CAMERA_PRESETS[stateRef.current.cameraPreset];
      camera.position.set(...cfg.pos);
      controls.target.set(...cfg.target);
      syncArVisualMode();
    };

    sceneApiRef.current = {
      updateFinish: applyFinishAndSize,
      updateTheme: applyThemeColors,
      syncArMode: syncArVisualMode,
      startWebXrSession: async (overlayRoot) => {
        const { session, hasHitTest } = await requestWebXrArSession(overlayRoot);
        activeXrSession = session;
        xrHitTestRequested = false;
        xrHitTestSource = null;
        xrBottlePlacedLocal = !hasHitTest;
        xrSurfaceDetectedLocal = false;
        setXrHasHitTest(hasHitTest);
        setXrPlaced(!hasHitTest);
        setXrSurfaceFound(false);

        renderer.xr.setReferenceSpaceType('local');
        await renderer.xr.setSession(session);

        session.addEventListener('select', handleXrSelect);
        session.addEventListener('end', () => {
          session.removeEventListener('select', handleXrSelect);
          cleanupXrSessionState();
        });

        stateRef.current.arOverlayMode = 'webxr';
        setArOverlayMode('webxr');
        syncArVisualMode();

        if (!hasHitTest) {
          bottleRoot.position.set(0, -0.14, -0.65);
          bottleRoot.visible = true;
          contactShadow.position.set(0, -0.139, -0.65);
          contactShadow.visible = true;
        } else {
          bottleRoot.visible = false;
          contactShadow.visible = false;
        }
      },
      endWebXrSession: async () => {
        if (activeXrSession) {
          try {
            await activeXrSession.end();
          } catch {
            cleanupXrSessionState();
          }
        } else {
          cleanupXrSessionState();
        }
      },
      rotateArBottle: (deltaRad) => {
        bottleRoot.rotation.y += deltaRad;
      },
      resetArPlacement: () => {
        if (stateRef.current.arOverlayMode === 'webxr') {
          xrBottlePlacedLocal = false;
          setXrPlaced(false);
          bottleRoot.visible = false;
          contactShadow.visible = false;
        } else {
          inlineTargetPos.set(0, 0, 0);
          bottleRoot.position.set(0, 0, 0);
          bottleRoot.rotation.y = 0;
        }
      },
      jumpCamera: (preset) => {
        const cfg = CAMERA_PRESETS[preset];
        targetCamPos.set(...cfg.pos);
        targetLookAt.set(...cfg.target);
        camLerpActive = true;
      },
      capturePng: () => {
        renderer.render(scene, camera);
        return renderer.domElement.toDataURL('image/png');
      },
      captureWebGlCanvas: () => {
        renderer.render(scene, camera);
        return renderer.domElement;
      },
      exportGlb: async () => {
        const s = stateRef.current;
        const spec =
          STUDIO_FINISHES.find((f) => f.id === s.studioFinish) ||
          STUDIO_FINISHES[0];
        const sz = SIZE_SPECS[s.studioSize];

        // Real-world AR meter scale: 3.68 scene units * 0.075 ~= 0.276 m (27.6 cm)
        const AR_METER_SCALE = 0.075;
        const disposableMats: THREE.Material[] = [];

        const cloneCleanMat = <T extends THREE.MeshStandardMaterial>(
          src: T,
          overrideMap?: THREE.Texture
        ): T => {
          const cloned = src.clone() as T;
          cloned.emissive.setHex(0x000000);
          cloned.emissiveIntensity = 0;
          if (overrideMap) {
            cloned.map = overrideMap;
          }
          cloned.needsUpdate = true;
          disposableMats.push(cloned);
          return cloned;
        };

        // Render an ultra-crisp 2048x2048 engraved brand wrap specifically for GLB export
        const exportBrandTex = createBrandWrapTexture(
          spec.hex,
          spec.logoInk,
          sz.label,
          Boolean(spec.isGlass),
          2048,
          { text: s.studioEngraving, font: s.engravingFont }
        );

        const exportRoot = new THREE.Group();
        exportRoot.name = `Waterholic_Flask_${spec.label.replace(/\s+/g, '_')}_${sz.label.replace(/\s+/g, '')}`;
        exportRoot.userData = {
          brand: 'Waterholic',
          finish: spec.label,
          capacity: sz.label,
          engraving: s.studioEngraving.trim() || undefined,
          units: 'meters',
          siliconeBoot: s.showBoot,
          explodedView: s.exploded > 0.06,
        };
        exportRoot.scale.set(
          sz.scaleXZ * AR_METER_SCALE,
          sz.scaleY * AR_METER_SCALE,
          sz.scaleXZ * AR_METER_SCALE
        );
        // Lift slightly if exploded boot drops below y=0 so AR placement stays grounded
        if (s.showBoot && bootMesh.position.y < 0) {
          exportRoot.position.y =
            -bootMesh.position.y * sz.scaleY * AR_METER_SCALE;
        }

        if (bootMesh.visible) {
          const expBoot = new THREE.Mesh(bootGeo, cloneCleanMat(bootMat));
          expBoot.name = 'Silicone_Base_Boot';
          expBoot.position.copy(bootMesh.position);
          exportRoot.add(expBoot);
        }

        const expBody = new THREE.Mesh(
          bodyGeo,
          cloneCleanMat(bodyMat, exportBrandTex)
        );
        expBody.name = 'Outer_Double_Wall_Body';
        expBody.rotation.copy(bodyMesh.rotation);
        exportRoot.add(expBody);

        if (coreMesh.visible) {
          const expCore = new THREE.Mesh(coreGeo, cloneCleanMat(coreMat));
          expCore.name = 'Copper_Vacuum_Core';
          expCore.position.copy(coreMesh.position);
          exportRoot.add(expCore);
        }

        if (waterMesh.visible) {
          const expWater = new THREE.Mesh(waterGeo, cloneCleanMat(waterMat));
          expWater.name = 'Pure_Water_Volume';
          expWater.position.copy(waterMesh.position);
          exportRoot.add(expWater);
        }

        const expSteelMat = cloneCleanMat(steelMat);
        const expCollar = new THREE.Mesh(collarGeo, expSteelMat);
        expCollar.name = 'Stainless_Neck_Collar';
        expCollar.position.copy(collarMesh.position);
        exportRoot.add(expCollar);

        const expGasket = new THREE.Mesh(gasketGeo, cloneCleanMat(gasketMat));
        expGasket.name = 'Silicone_O_Ring_Gasket';
        expGasket.position.copy(gasketMesh.position);
        expGasket.rotation.copy(gasketMesh.rotation);
        exportRoot.add(expGasket);

        const expCapGroup = new THREE.Group();
        expCapGroup.name = 'Chug_Lid_Assembly';
        expCapGroup.position.copy(capGroup.position);

        const expLid = new THREE.Mesh(lidGeo, cloneCleanMat(lidMat));
        expLid.name = 'Chug_Lid_Cap';
        expCapGroup.add(expLid);

        // Expand InstancedMesh knurled ribs into standard meshes sharing geometry & material
        // for 100% compatibility across AR Quick Look, Android Scene Viewer, Blender & Spline
        const expRibsGroup = new THREE.Group();
        expRibsGroup.name = 'Knurled_Grip_Ribs';
        const expRibMat = cloneCleanMat(ribMat);
        const instMatrix = new THREE.Matrix4();
        for (let i = 0; i < ribCount; i++) {
          ribInst.getMatrixAt(i, instMatrix);
          const ribPiece = new THREE.Mesh(ribGeo, expRibMat);
          ribPiece.name = `Grip_Rib_${String(i + 1).padStart(2, '0')}`;
          ribPiece.applyMatrix4(instMatrix);
          expRibsGroup.add(ribPiece);
        }
        expCapGroup.add(expRibsGroup);

        const expLoop = new THREE.Mesh(loopGeo, cloneCleanMat(loopMat));
        expLoop.name = 'Carry_Loop_Arch';
        expCapGroup.add(expLoop);

        const expPin = new THREE.Mesh(pinGeo, expSteelMat);
        expPin.name = 'Steel_Hinge_Pins';
        expPin.position.copy(pinMesh.position);
        expPin.rotation.copy(pinMesh.rotation);
        expCapGroup.add(expPin);

        exportRoot.add(expCapGroup);
        exportRoot.updateMatrixWorld(true);

        const exporter = new GLTFExporter();
        try {
          const result = await new Promise<ArrayBuffer>((resolve, reject) => {
            exporter.parse(
              exportRoot,
              (output) => {
                if (output instanceof ArrayBuffer) {
                  resolve(output);
                } else {
                  reject(new Error('Expected binary GLB ArrayBuffer output'));
                }
              },
              (err) => reject(err),
              {
                binary: true,
                onlyVisible: true,
                maxTextureSize: 2048,
              }
            );
          });
          return result;
        } finally {
          exportBrandTex.dispose();
          disposableMats.forEach((m) => m.dispose());
        }
      },
    };

    // Stop preset lerp as soon as user grabs orbit controls
    const onControlStart = () => {
      camLerpActive = false;
      isOrbitDragging = true;
      if (hoveredPartRef.current !== null) {
        hoveredPartRef.current = null;
        setHoveredPart(null);
      }
    };
    const onControlEnd = () => {
      isOrbitDragging = false;
    };
    controls.addEventListener('start', onControlStart);
    controls.addEventListener('end', onControlEnd);

    // Responsive ResizeObserver
    const ro = new ResizeObserver(() => {
      if (!container) return;
      const w = Math.max(320, container.clientWidth);
      const h = Math.max(380, container.clientHeight);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    });
    ro.observe(container);

    const clock = new THREE.Clock();

    const animate = (_timestamp: number, xrFrame?: XRFrame) => {
      const dt = Math.min(clock.getDelta(), 0.05);
      const elapsed = clock.getElapsedTime();
      const s = stateRef.current;
      const inAr = s.arOverlayMode !== 'none';

      // WebXR Real-Time Surface Hit-Testing inside active immersive-ar session
      if (xrFrame && renderer.xr.isPresenting) {
        const session = renderer.xr.getSession();
        if (session && !xrHitTestRequested) {
          xrHitTestRequested = true;
          session
            .requestReferenceSpace('viewer')
            .then((viewerSpace) =>
              session.requestHitTestSource?.({ space: viewerSpace })
            )
            .then((source) => {
              if (source) xrHitTestSource = source;
            })
            .catch(() => {
              xrHitTestSource = null;
            });
        }

        const referenceSpace = renderer.xr.getReferenceSpace();
        if (xrHitTestSource && referenceSpace) {
          const hitResults = xrFrame.getHitTestResults(xrHitTestSource);
          if (hitResults.length > 0) {
            const pose = hitResults[0].getPose(referenceSpace);
            if (pose) {
              arReticleGroup.visible = true;
              arReticleGroup.matrix.fromArray(pose.transform.matrix);
              if (!xrSurfaceDetectedLocal) {
                xrSurfaceDetectedLocal = true;
                setXrSurfaceFound(true);
              }
            }
          } else {
            arReticleGroup.visible = false;
          }
        }
      }

      if (s.autoSpin && !inAr) {
        bottleRoot.rotation.y += dt * 0.42;
      }

      // Smooth Exploded Thermal Cutaway animation (closed automatically in AR placement)
      const exp = inAr ? 0 : s.exploded;
      bootMesh.visible = s.showBoot;
      bootMesh.position.y = THREE.MathUtils.lerp(
        bootMesh.position.y,
        -exp * 0.35,
        0.12
      );
      capGroup.position.y = THREE.MathUtils.lerp(
        capGroup.position.y,
        exp * 0.95,
        0.12
      );
      gasketMesh.position.y = THREE.MathUtils.lerp(
        gasketMesh.position.y,
        2.69 + exp * 0.55,
        0.12
      );
      collarMesh.position.y = THREE.MathUtils.lerp(
        collarMesh.position.y,
        exp * 0.25,
        0.12
      );
      coreMesh.visible = exp > 0.06;
      coreMesh.position.y = THREE.MathUtils.lerp(
        coreMesh.position.y,
        exp * 0.62,
        0.12
      );

      // Show water column inside transparent glass or partially exploded view
      const isGlassFinish = s.studioFinish === 'transparent';
      waterMesh.visible = isGlassFinish || exp > 0.25;
      waterMesh.position.y = 1.02 + Math.sin(elapsed * 1.8) * 0.015;

      // Inline Camera AR Overlay smooth placement damping
      if (s.arOverlayMode === 'camera') {
        const damp = 1 - Math.exp(-14 * dt);
        bottleRoot.position.x = THREE.MathUtils.lerp(
          bottleRoot.position.x,
          inlineTargetPos.x,
          damp
        );
        bottleRoot.position.z = THREE.MathUtils.lerp(
          bottleRoot.position.z,
          inlineTargetPos.z,
          damp
        );
        contactShadow.position.set(
          bottleRoot.position.x,
          0.003,
          bottleRoot.position.z
        );
        inlineReticle.position.set(
          bottleRoot.position.x,
          0.008,
          bottleRoot.position.z
        );
      }

      // Floating chill mist droplets (studio view only)
      dropsInst.visible = !inAr && s.chillMist;
      if (!inAr && s.chillMist) {
        for (let i = 0; i < dropCount; i++) {
          const d = dropSeeds[i];
          const a = d.angle + elapsed * 0.18 * d.speed;
          const y = ((d.baseY + elapsed * 0.16 * d.speed) % 2.95) + 0.15;
          dummy.position.set(
            Math.cos(a) * d.radius,
            y,
            Math.sin(a) * d.radius
          );
          const pulse = d.scale * (0.85 + Math.sin(elapsed * 2.2 + i) * 0.15);
          dummy.scale.setScalar(pulse);
          dummy.rotation.set(0, 0, 0);
          dummy.updateMatrix();
          dropsInst.setMatrixAt(i, dummy.matrix);
        }
        dropsInst.instanceMatrix.needsUpdate = true;
      }

      if (!inAr && camLerpActive) {
        camera.position.lerp(targetCamPos, 0.08);
        controls.target.lerp(targetLookAt, 0.08);
        if (camera.position.distanceTo(targetCamPos) < 0.02) {
          camLerpActive = false;
        }
      }

      // Subtle 3D emissive highlight on the currently inspected bottle component
      const inspectedId = inAr
        ? null
        : (hoveredPartRef.current ?? pinnedPartRef.current);
      (Object.keys(partMaterials) as BottlePartId[]).forEach((pid) => {
        const targetIntensity =
          inspectedId === pid ? (pid === 'chamber' ? 0.34 : 0.22) : 0;
        partMaterials[pid].forEach((mat) => {
          mat.emissiveIntensity = THREE.MathUtils.lerp(
            mat.emissiveIntensity,
            targetIntensity,
            0.14
          );
        });
      });

      if (!inAr) {
        controls.update();
      }
      renderer.render(scene, camera);
    };

    renderer.setAnimationLoop(animate);

    return () => {
      renderer.setAnimationLoop(null);
      if (activeXrSession) {
        activeXrSession.end().catch(() => undefined);
      }
      if (xrHitTestSource) {
        try {
          xrHitTestSource.cancel();
        } catch {
          // Ignore
        }
      }
      ro.disconnect();
      renderer.domElement.removeEventListener('pointermove', onCanvasPointerMove);
      renderer.domElement.removeEventListener('pointerleave', onCanvasPointerLeave);
      renderer.domElement.removeEventListener('pointerdown', onCanvasPointerDown);
      renderer.domElement.removeEventListener('pointerup', onCanvasPointerUp);
      renderer.domElement.removeEventListener('pointercancel', onCanvasPointerUp);
      controls.removeEventListener('start', onControlStart);
      controls.removeEventListener('end', onControlEnd);
      controls.dispose();
      sceneApiRef.current = null;
      envTarget.dispose();
      brandTexture.dispose();
      shadowTex.dispose();
      arRingGeo.dispose();
      arRingMat.dispose();
      arDotGeo.dispose();
      arDotMat.dispose();
      inlineReticleGeo.dispose();
      inlineReticleMat.dispose();
      bootGeo.dispose();
      bootMat.dispose();
      bodyGeo.dispose();
      bodyMat.dispose();
      coreGeo.dispose();
      coreMat.dispose();
      waterGeo.dispose();
      waterMat.dispose();
      collarGeo.dispose();
      steelMat.dispose();
      gasketGeo.dispose();
      gasketMat.dispose();
      lidGeo.dispose();
      lidMat.dispose();
      ribGeo.dispose();
      ribMat.dispose();
      loopGeo.dispose();
      loopMat.dispose();
      pinGeo.dispose();
      dropGeo.dispose();
      dropMat.dispose();
      plinthGeo.dispose();
      plinthMat.dispose();
      floorGeo.dispose();
      floorMat.dispose();
      renderer.dispose();
    };
  }, []);

  const currentSpec =
    STUDIO_FINISHES.find((f) => f.id === studioFinish) || STUDIO_FINISHES[0];
  const currentSizeSpec = SIZE_SPECS[studioSize];
  const computedPrice = currentSizeSpec.price + (currentSpec.priceDelta ?? 0);
  const studioCapacityMl =
    studioSize === '1.2 L' ? 1200 : studioSize === '750 ml' ? 750 : 950;

  const handleSelectFinish = (key: StudioFinishKey) => {
    setStudioFinish(key);
    onSyncFinish(key);
    pulseStudioInteract();
  };

  const handleCameraPreset = (preset: CameraPresetKey) => {
    setCameraPreset(preset);
    if (preset === 'cutaway') {
      setExploded(0.85);
    } else if (exploded > 0.6) {
      setExploded(0);
    }
    sceneApiRef.current?.jumpCamera(preset);
    pulseStudioInteract();
  };

  const handleSnapshot = () => {
    const dataUrl = sceneApiRef.current?.capturePng();
    if (!dataUrl) return;
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = `waterholic-3d-${studioFinish}-${studioSize.replace(/\s+/g, '')}.png`;
    link.click();
    onSnapshotSaved?.('Saved 3D Bottle Studio render as PNG');
  };

  const handleExportGlb = async () => {
    if (exportingGlb || !sceneApiRef.current) return;
    setExportingGlb(true);
    try {
      const buffer = await sceneApiRef.current.exportGlb();
      const blob = new Blob([buffer], { type: 'model/gltf-binary' });
      const objectUrl = URL.createObjectURL(blob);
      const sizeSlug = studioSize.replace(/\s+/g, '').toLowerCase();
      const cutawaySuffix = exploded > 0.06 ? '-cutaway' : '';
      const bootSuffix = showBoot ? '' : '-noboot';
      const fileName = `waterholic-3d-${studioFinish}-${sizeSlug}${bootSuffix}${cutawaySuffix}.glb`;

      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1500);

      const sizeKb = Math.max(1, Math.round(buffer.byteLength / 1024));
      onSnapshotSaved?.(
        `Exported ${fileName} (${sizeKb} KB), ready for AR & 3D`
      );
    } catch (err) {
      console.error('Failed to export 3D GLB:', err);
      onSnapshotSaved?.('Could not export GLB model. Please try again.');
    } finally {
      setExportingGlb(false);
    }
  };

  const isCustomized =
    studioFinish !== DEFAULT_STUDIO_FINISH ||
    studioSize !== DEFAULT_STUDIO_SIZE ||
    engravingEnabled !== DEFAULT_ENGRAVING_ENABLED ||
    studioEngraving.trim() !== DEFAULT_ENGRAVING_TEXT ||
    engravingFont !== DEFAULT_ENGRAVING_FONT ||
    engravingOrientation !== DEFAULT_ENGRAVING_ORIENTATION ||
    exploded > 0.01 ||
    !showBoot ||
    !chillMist ||
    !autoSpin ||
    cameraPreset !== 'hero';

  const handleResetAll = () => {
    setStudioFinish(DEFAULT_STUDIO_FINISH);
    setStudioSize(DEFAULT_STUDIO_SIZE);
    setStudioEngraving(DEFAULT_ENGRAVING_TEXT);
    setExploded(0);
    setShowBoot(true);
    setChillMist(true);
    setAutoSpin(true);
    setPinnedPart(null);
    setHoveredPart(null);
    setCameraPreset('hero');

    onSyncFinish(DEFAULT_STUDIO_FINISH);
    onSyncSize?.(DEFAULT_STUDIO_SIZE, SIZE_SPECS[DEFAULT_STUDIO_SIZE].price);
    onSyncEngraving?.({
      enabled: DEFAULT_ENGRAVING_ENABLED,
      text: DEFAULT_ENGRAVING_TEXT,
    });
    onResetAllConfigs?.();
    sceneApiRef.current?.jumpCamera('hero');
    pulseStudioInteract();

    setResetSpinning(true);
    if (resetTimerRef.current !== null) {
      window.clearTimeout(resetTimerRef.current);
    }
    resetTimerRef.current = window.setTimeout(() => {
      setResetSpinning(false);
    }, 480);

    onSnapshotSaved?.(
      'Reset finish, size, engraving, and 3D controls to defaults'
    );
  };

  const handleEnterSpaceAr = async () => {
    if (arOverlayMode !== 'none') {
      await handleExitSpaceAr();
      return;
    }

    setPinnedPart(null);
    setHoveredPart(null);
    pulseStudioInteract();

    if (xrSupported && sceneApiRef.current) {
      setXrLaunching(true);
      try {
        await sceneApiRef.current.startWebXrSession(xrOverlayRef.current);
        onSnapshotSaved?.(
          'WebXR AR session started. Point at a flat surface and tap to place.'
        );
        return;
      } catch {
        // Fallback seamlessly to inline live-camera AR overlay inside the 3D stage
      } finally {
        setXrLaunching(false);
      }
    }

    setArOverlayMode('camera');
    onSnapshotSaved?.(
      'AR Camera Overlay active. Tap or drag anywhere to place your bottle.'
    );
  };

  const handleExitSpaceAr = async () => {
    if (arOverlayMode === 'webxr') {
      await sceneApiRef.current?.endWebXrSession();
    } else {
      stopInlineCamera();
      setArOverlayMode('none');
    }
  };

  const handleCaptureInlineArPhoto = () => {
    const glCanvas = sceneApiRef.current?.captureWebGlCanvas();
    if (!glCanvas) return;
    const out = document.createElement('canvas');
    out.width = glCanvas.width;
    out.height = glCanvas.height;
    const ctx = out.getContext('2d');
    if (!ctx) return;

    const drawCover = (
      src: HTMLVideoElement | HTMLImageElement,
      sw0: number,
      sh0: number
    ) => {
      if (sw0 <= 0 || sh0 <= 0) return;
      const ca = out.width / out.height;
      const sa = sw0 / sh0;
      let sx = 0;
      let sy = 0;
      let sw = sw0;
      let sh = sh0;
      if (sa > ca) {
        sw = sh0 * ca;
        sx = (sw0 - sw) / 2;
      } else {
        sh = sw0 / ca;
        sy = (sh0 - sh) / 2;
      }
      ctx.drawImage(src, sx, sy, sw, sh, 0, 0, out.width, out.height);
    };

    if (inlinePhotoUrl && arPhotoRef.current && arPhotoRef.current.complete) {
      drawCover(
        arPhotoRef.current,
        arPhotoRef.current.naturalWidth,
        arPhotoRef.current.naturalHeight
      );
    } else if (
      arVideoRef.current &&
      inlineCamStatus === 'active' &&
      arVideoRef.current.videoWidth > 0
    ) {
      drawCover(
        arVideoRef.current,
        arVideoRef.current.videoWidth,
        arVideoRef.current.videoHeight
      );
    } else {
      ctx.fillStyle = '#0B1420';
      ctx.fillRect(0, 0, out.width, out.height);
    }
    ctx.drawImage(glCanvas, 0, 0);

    const link = document.createElement('a');
    link.href = out.toDataURL('image/png');
    link.download = `waterholic-webxr-ar-${studioFinish}-${studioSize.replace(/\s+/g, '')}.png`;
    link.click();
    triggerMicroHapticTick();
    onSnapshotSaved?.('Saved live AR bottle photo as PNG');
  };

  const physicalHeightCm =
    studioSize === '1.2 L' ? 30.9 : studioSize === '750 ml' ? 24.8 : 27.6;

  return (
    <section id="studio-3d" className="studio3d-section">
      <div className="container">
        <div className="studio3d-header">
          <div>
            <span className="section-kicker">Interactive WebGL &amp; WebXR 3D Lab</span>
            <h2 className="section-title">Inspect Every Millimeter in 3D &amp; AR</h2>
            <p className="studio3d-lead">
              Orbit 360°, peel back the copper-lined vacuum chamber, launch
              WebXR AR to place your configured bottle in your physical space
              through your camera, or export a meter-scale .GLB.
            </p>
          </div>
          <div className="studio3d-header-actions">
            <button
              type="button"
              className={`btn btn-ghost studio3d-reset-btn${
                isCustomized ? ' is-customized' : ''
              }`}
              onClick={handleResetAll}
              aria-label="Reset finish, size, engraving, and 3D studio controls to defaults"
              title="Revert finish, size, engraving, and 3D view to application defaults"
            >
              <RotateCcw
                size={15}
                className={resetSpinning ? 'studio3d-reset-spin' : undefined}
                aria-hidden="true"
              />
              Reset
            </button>
            <button
              type="button"
              className={`btn btn-ghost studio3d-webxr-btn${
                arOverlayMode !== 'none' ? ' is-active' : ''
              }`}
              onClick={() => void handleEnterSpaceAr()}
              disabled={xrLaunching}
              title={
                xrSupported
                  ? 'Launch native WebXR immersive-ar to place your configured bottle in your physical space'
                  : 'Replace the 3D studio preview with a live camera AR overlay of your bottle'
              }
            >
              {xrLaunching ? (
                <Loader2 size={16} className="studio3d-spin" aria-hidden="true" />
              ) : arOverlayMode !== 'none' ? (
                <X size={16} aria-hidden="true" />
              ) : (
                <Scan size={16} aria-hidden="true" />
              )}
              {arOverlayMode !== 'none'
                ? 'Exit AR Overlay'
                : xrSupported
                  ? 'Start WebXR AR'
                  : 'View in Space (AR)'}
            </button>
            <button
              type="button"
              className="btn btn-ghost studio3d-ar-btn"
              onClick={() => {
                setArInitialMode('desk');
                setArModalOpen(true);
                pulseStudioInteract();
              }}
              title="Compare 1:1 true scale beside desk & gym props or scan QR to open on your phone"
            >
              <Smartphone size={16} aria-hidden="true" />
              Desk Scale &amp; QR
            </button>
            <button
              type="button"
              className="btn btn-ghost studio3d-glb-btn"
              onClick={handleExportGlb}
              disabled={exportingGlb}
              title="Download high-resolution binary .GLB (real-world meter scale) for AR, Blender, Spline & 3D projects"
            >
              {exportingGlb ? (
                <Loader2
                  size={16}
                  className="studio3d-spin"
                  aria-hidden="true"
                />
              ) : (
                <Box size={16} aria-hidden="true" />
              )}
              {exportingGlb ? 'Exporting GLB...' : 'Export 3D (.GLB)'}
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={handleSnapshot}
            >
              <Camera size={16} aria-hidden="true" />
              Save 3D Render
            </button>
            <button
              type="button"
              className={`btn btn-primary studio3d-add-btn${
                studioInteracting ? ' is-hydration-active' : ''
              }`}
              onClick={(e) => {
                triggerAddToBagHaptic(e.currentTarget);
                pulseStudioInteract();
                onAddConfiguredToBag({
                  finish: studioFinish,
                  finishName: currentSpec.label,
                  finishHex: currentSpec.hex,
                  isTransparent: currentSpec.isGlass,
                  sizeLabel: studioSize,
                  price: computedPrice,
                  engravingText: studioEngraving.trim() || undefined,
                });
              }}
            >
              <ShoppingBag size={16} aria-hidden="true" />
              <span>Add 3D Build · {formatPrice(computedPrice)}</span>
              <HydrationProgressRing
                consumedMl={consumedMl}
                dailyGoalMl={dailyGoalMl}
                selectedCapacityMl={studioCapacityMl}
                interactionSignal={interactSignal}
                size={30}
                variant="on-primary"
              />
            </button>
          </div>
        </div>

        <input
          ref={arPhotoInputRef}
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            stopInlineCamera();
            if (inlinePhotoUrl) URL.revokeObjectURL(inlinePhotoUrl);
            setInlinePhotoUrl(URL.createObjectURL(file));
            setInlineCamStatus('idle');
            onSnapshotSaved?.('Room photo loaded. Drag bottle to position it.');
            e.target.value = '';
          }}
        />

        <div
          className={`studio3d-stage-shell${
            arOverlayMode !== 'none' ? ' is-ar-active' : ''
          }`}
        >
          {/* Live Camera / Custom Room Photo background layer when AR Overlay replaces the 3D Studio */}
          {arOverlayMode === 'camera' && !inlinePhotoUrl && (
            <video
              ref={arVideoRef}
              className="studio3d-ar-video"
              playsInline
              muted
              autoPlay
            />
          )}
          {arOverlayMode === 'camera' && inlinePhotoUrl && (
            <img
              ref={arPhotoRef}
              src={inlinePhotoUrl}
              alt="Uploaded space for AR bottle placement"
              className="studio3d-ar-video"
            />
          )}

          {/* Isolated WebGL mount container */}
          <div
            ref={mountRef}
            className="studio3d-canvas-host"
            aria-label={
              arOverlayMode !== 'none'
                ? 'Active AR camera overlay. Tap or drag to place your configured Waterholic bottle.'
                : 'Interactive 3D Waterholic bottle viewer. Hover or tap bottle components to inspect engineering specs, drag to orbit.'
            }
          />

          {/* WebXR DOM Overlay & Inline AR Overlay HUD */}
          <div
            ref={xrOverlayRef}
            className={`studio3d-xr-overlay${
              arOverlayMode !== 'none' ? ' is-open' : ''
            }`}
          >
            {arOverlayMode !== 'none' && (
              <>
                <div className="studio3d-xr-topbar">
                  <div className="studio3d-xr-status">
                    <span className="studio3d-xr-tag">
                      {arOverlayMode === 'webxr' ? 'WebXR Live AR' : 'AR Camera Overlay'}
                    </span>
                    <span className="studio3d-xr-instruction">
                      {arOverlayMode === 'webxr'
                        ? xrPlaced
                          ? `Placed at 1:1 scale (${physicalHeightCm} cm) · Tap any surface to move`
                          : xrSurfaceFound
                            ? 'Surface locked. Tap anywhere to place your bottle.'
                            : xrHasHitTest
                              ? 'Point your camera slowly at a flat desk or floor…'
                              : 'Viewing bottle at 1:1 physical scale'
                        : inlineArDragging
                          ? 'Placing bottle in space…'
                          : `Tap or drag anywhere to position · ${physicalHeightCm} cm true scale`}
                    </span>
                  </div>

                  <div className="studio3d-xr-top-actions">
                    <button
                      type="button"
                      className="studio3d-xr-btn"
                      onClick={() => {
                        sceneApiRef.current?.rotateArBottle(Math.PI / 2);
                        triggerMicroHapticTick();
                      }}
                      title="Rotate bottle 90 degrees"
                    >
                      <RotateCw size={14} aria-hidden="true" />
                      <span>Rotate</span>
                    </button>
                    <button
                      type="button"
                      className="studio3d-xr-btn"
                      onClick={() => {
                        sceneApiRef.current?.resetArPlacement();
                        setInlineArScale(0.88);
                        setInlineArPitchDeg(20);
                      }}
                      title={
                        arOverlayMode === 'webxr'
                          ? 'Pick up bottle and scan a new surface'
                          : 'Center bottle in frame'
                      }
                    >
                      <Move size={14} aria-hidden="true" />
                      <span>{arOverlayMode === 'webxr' ? 'Relocate' : 'Center'}</span>
                    </button>
                    {arOverlayMode === 'camera' && (
                      <>
                        {!inlinePhotoUrl && inlineCamStatus === 'active' && (
                          <button
                            type="button"
                            className="studio3d-xr-btn"
                            onClick={() =>
                              setInlineFacingMode((m) =>
                                m === 'environment' ? 'user' : 'environment'
                              )
                            }
                            title="Switch front or rear camera"
                          >
                            <RefreshCw size={14} aria-hidden="true" />
                            <span>Flip</span>
                          </button>
                        )}
                        <button
                          type="button"
                          className="studio3d-xr-btn"
                          onClick={() => arPhotoInputRef.current?.click()}
                          title="Use a photo of your desk or room"
                        >
                          <ImagePlus size={14} aria-hidden="true" />
                          <span>{inlinePhotoUrl ? 'Photo' : 'Use Photo'}</span>
                        </button>
                        {inlinePhotoUrl && (
                          <button
                            type="button"
                            className="studio3d-xr-btn"
                            onClick={() => {
                              setInlinePhotoUrl(null);
                              void startInlineCamera(inlineFacingMode);
                            }}
                          >
                            <Video size={14} aria-hidden="true" />
                            <span>Camera</span>
                          </button>
                        )}
                        <button
                          type="button"
                          className="studio3d-xr-btn"
                          onClick={handleCaptureInlineArPhoto}
                          title="Save composited AR snapshot"
                        >
                          <Camera size={14} aria-hidden="true" />
                          <span>Snap</span>
                        </button>
                      </>
                    )}
                    <button
                      type="button"
                      className="studio3d-xr-btn studio3d-xr-exit"
                      onClick={() => void handleExitSpaceAr()}
                    >
                      <X size={14} aria-hidden="true" />
                      <span>Exit AR</span>
                    </button>
                  </div>
                </div>

                {/* Camera fallback helper when camera permission is denied or unavailable on desktop */}
                {arOverlayMode === 'camera' &&
                  !inlinePhotoUrl &&
                  (inlineCamStatus === 'denied' ||
                    inlineCamStatus === 'unavailable') && (
                    <div className="studio3d-xr-fallback">
                      <VideoOff size={20} aria-hidden="true" />
                      <div>
                        <strong>
                          {inlineCamStatus === 'unavailable'
                            ? 'Camera unavailable on this device'
                            : 'Camera permission was declined'}
                        </strong>
                        <p>
                          Scan the QR code on your mobile phone for WebXR
                          camera AR, or drop a photo of your desk below.
                        </p>
                      </div>
                      <div className="studio3d-xr-fallback-btns">
                        <button
                          type="button"
                          className="btn btn-primary"
                          onClick={() => arPhotoInputRef.current?.click()}
                        >
                          <ImagePlus size={14} aria-hidden="true" />
                          Upload Room Photo
                        </button>
                        <button
                          type="button"
                          className="btn btn-ghost"
                          onClick={() => {
                            void handleExitSpaceAr();
                            setArInitialMode('qr');
                            setArModalOpen(true);
                          }}
                        >
                          <QrCode size={14} aria-hidden="true" />
                          Open on Phone (QR)
                        </button>
                      </div>
                    </div>
                  )}

                {arOverlayMode === 'camera' &&
                  !inlinePhotoUrl &&
                  inlineCamStatus === 'requesting' && (
                    <div className="studio3d-xr-loading">
                      <Loader2 size={16} className="studio3d-spin" aria-hidden="true" />
                      <span>Connecting to device camera…</span>
                    </div>
                  )}

                {/* Compact Bottom AR Controls (Switch finish, size, or tune camera perspective live in AR) */}
                <div className="studio3d-xr-dock">
                  <div className="studio3d-xr-dock-group">
                    <span className="studio3d-xr-dock-label">Finish</span>
                    <div className="studio3d-swatches">
                      {STUDIO_FINISHES.map((fin) => (
                        <button
                          key={fin.id}
                          type="button"
                          className={`studio3d-swatch${
                            studioFinish === fin.id ? ' is-active' : ''
                          }`}
                          onClick={() => handleSelectFinish(fin.id)}
                          title={fin.label}
                          aria-label={`Select ${fin.label} finish in AR`}
                        >
                          <span
                            className={`studio3d-swatch-dot${
                              fin.isGlass ? ' swatch-transparent' : ''
                            }`}
                            style={
                              fin.isGlass ? undefined : { background: fin.hex }
                            }
                          />
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="studio3d-xr-dock-group">
                    <span className="studio3d-xr-dock-label">Size</span>
                    <div className="studio3d-size-row">
                      {(['750 ml', '950 ml', '1.2 L'] as StudioSizeKey[]).map(
                        (sz) => (
                          <button
                            key={sz}
                            type="button"
                            className={`studio3d-size-btn${
                              studioSize === sz ? ' is-active' : ''
                            }`}
                            onClick={() => {
                              setStudioSize(sz);
                              onSyncSize?.(sz, SIZE_SPECS[sz].price);
                              pulseStudioInteract();
                            }}
                          >
                            {sz}
                          </button>
                        )
                      )}
                    </div>
                  </div>

                  {arOverlayMode === 'camera' && (
                    <>
                      <div className="studio3d-xr-dock-group studio3d-xr-slider">
                        <label
                          htmlFor="studio3d-inline-ar-scale"
                          className="studio3d-xr-dock-label"
                        >
                          Scale ({Math.round(inlineArScale * 100)}%)
                        </label>
                        <input
                          id="studio3d-inline-ar-scale"
                          type="range"
                          min={0.45}
                          max={1.45}
                          step={0.02}
                          value={inlineArScale}
                          onChange={(e) =>
                            setInlineArScale(Number(e.target.value))
                          }
                          className="studio3d-range"
                        />
                      </div>
                      <div className="studio3d-xr-dock-group studio3d-xr-slider">
                        <label
                          htmlFor="studio3d-inline-ar-pitch"
                          className="studio3d-xr-dock-label"
                        >
                          Surface Angle ({inlineArPitchDeg}°)
                        </label>
                        <input
                          id="studio3d-inline-ar-pitch"
                          type="range"
                          min={6}
                          max={46}
                          step={1}
                          value={inlineArPitchDeg}
                          onChange={(e) =>
                            setInlineArPitchDeg(Number(e.target.value))
                          }
                          className="studio3d-range"
                        />
                      </div>
                    </>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Interactive 3D Component Engineering Spec Tooltip (GSAP Pop-In) */}
          {arOverlayMode === 'none' && activePartSpec && (
            <div
              ref={tooltipAnchorRef}
              className={`studio3d-tooltip-anchor${
                pinnedPart && !hoveredPart ? ' is-pinned' : ''
              }`}
              role="status"
              aria-live="polite"
            >
              <div
                ref={tooltipCardRef}
                className="studio3d-tooltip-card"
                style={{
                  borderTopColor: activePartSpec.accent,
                }}
              >
                <div className="studio3d-tooltip-head">
                  <span
                    className="studio3d-tooltip-code tabular-nums"
                    style={{ color: activePartSpec.accent }}
                  >
                    <span
                      className="studio3d-tooltip-dot"
                      style={{ background: activePartSpec.accent }}
                      aria-hidden="true"
                    />
                    {activePartSpec.code}
                  </span>
                  {pinnedPart && (
                    <button
                      type="button"
                      className="studio3d-tooltip-close"
                      aria-label="Dismiss component tooltip"
                      onClick={() => setPinnedPart(null)}
                    >
                      <X size={13} aria-hidden="true" />
                    </button>
                  )}
                </div>

                <h3 className="studio3d-tooltip-title">
                  {activePartSpec.title}
                </h3>
                <p className="studio3d-tooltip-summary">
                  {activePartSpec.summary}
                </p>

                <div className="studio3d-tooltip-specs">
                  {activePartSpec.specs.map((sp) => (
                    <div key={sp.label} className="studio3d-tooltip-spec">
                      <span className="studio3d-tooltip-spec-label">
                        {sp.label}
                      </span>
                      <span className="studio3d-tooltip-spec-val tabular-nums">
                        {sp.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Top-left crisp model readout (no backdrop-filter over WebGL) */}
          {arOverlayMode === 'none' && (
            <div className="studio3d-badge-bar">
              <span className="studio3d-chip">
                {currentSpec.label} · {studioSize}
              </span>
              <span className="studio3d-inspect-hint">
                <Info size={12} aria-hidden="true" />
                <span>Hover or tap parts for specs</span>
              </span>
              <button
                type="button"
                className="studio3d-mini-btn studio3d-mini-ar-btn"
                onClick={() => void handleEnterSpaceAr()}
                title={
                  xrSupported
                    ? 'Launch native WebXR AR in your physical space'
                    : 'Switch 3D stage to live camera AR overlay'
                }
              >
                <Scan size={13} aria-hidden="true" />
                {xrSupported ? 'WebXR AR' : 'AR Camera'}
              </button>
              <button
                type="button"
                className="studio3d-mini-btn"
                onClick={() => {
                  setExploded(0);
                  setAutoSpin(true);
                  setPinnedPart(null);
                  handleCameraPreset('hero');
                }}
                title="Reset 3D view"
              >
                <RotateCcw size={14} aria-hidden="true" />
                Reset View
              </button>
            </div>
          )}

          {/* Camera preset strip top-right */}
          {arOverlayMode === 'none' && (
            <div
              className="studio3d-camera-bar"
              role="group"
              aria-label="3D camera angles"
            >
              {(Object.keys(CAMERA_PRESETS) as CameraPresetKey[]).map((key) => (
                <button
                  key={key}
                  type="button"
                  className={`studio3d-cam-btn${cameraPreset === key ? ' is-active' : ''}`}
                  onClick={() => handleCameraPreset(key)}
                >
                  {CAMERA_PRESETS[key].label}
                </button>
              ))}
            </div>
          )}

          {/* Floating Quick Add to Bag FAB + Collapsible Bottom Customizer Dock */}
          {arOverlayMode === 'none' && (
            <div className="studio3d-bottom-stack">
              <button
                type="button"
                className={`studio3d-quick-fab${quickAdded ? ' is-added' : ''}`}
                data-testid="studio3d-quick-add-fab"
                aria-label={`Quick add ${currentSpec.label} ${studioSize}${
                  studioEngraving.trim()
                    ? ` engraved ${studioEngraving.trim()}`
                    : ''
                } to bag for ${formatPrice(computedPrice)}`}
                title={`Quick add ${currentSpec.label} (${studioSize})${
                  studioEngraving.trim()
                    ? ` · "${studioEngraving.trim()}"`
                    : ''
                } directly to bag`}
                onClick={(e) => {
                  triggerAddToBagHaptic(e.currentTarget);
                  triggerFlyToBagAnimation(e.currentTarget);
                  pulseStudioInteract();
                  onAddConfiguredToBag({
                    finish: studioFinish,
                    finishName: currentSpec.label,
                    finishHex: currentSpec.hex,
                    isTransparent: currentSpec.isGlass,
                    sizeLabel: studioSize,
                    price: computedPrice,
                    engravingText: studioEngraving.trim() || undefined,
                    openDrawer: false,
                  });
                  setQuickAdded(true);
                  if (quickAddTimerRef.current !== null) {
                    window.clearTimeout(quickAddTimerRef.current);
                  }
                  quickAddTimerRef.current = window.setTimeout(() => {
                    setQuickAdded(false);
                  }, 1800);
                }}
              >
                <span
                  className={`studio3d-quick-fab-swatch${
                    currentSpec.isGlass ? ' swatch-transparent' : ''
                  }`}
                  style={
                    currentSpec.isGlass
                      ? undefined
                      : { background: currentSpec.hex }
                  }
                  aria-hidden="true"
                />
                <span className="studio3d-quick-fab-icon" aria-hidden="true">
                  {quickAdded ? <Check size={16} /> : <ShoppingBag size={16} />}
                </span>
                <span className="studio3d-quick-fab-copy">
                  <span className="studio3d-quick-fab-label">
                    {quickAdded ? 'Added to Bag' : 'Quick Add to Bag'}
                  </span>
                  <span className="studio3d-quick-fab-meta tabular-nums">
                    {currentSpec.label} · {studioSize} ·{' '}
                    {formatPrice(computedPrice)}
                  </span>
                </span>
              </button>

              <div
                className={`studio3d-dock${dockCollapsed ? ' is-collapsed' : ''}`}
              >
            <button
              type="button"
              className="studio3d-dock-toggle"
              onClick={() => setDockCollapsed((c) => !c)}
              aria-expanded={!dockCollapsed}
            >
              <Layers size={14} aria-hidden="true" />
              <span>3D Customizer Controls</span>
              {dockCollapsed ? (
                <ChevronUp size={15} aria-hidden="true" />
              ) : (
                <ChevronDown size={15} aria-hidden="true" />
              )}
            </button>

            {!dockCollapsed && (
              <div className="studio3d-dock-grid">
                {/* Finishes */}
                <div className="studio3d-dock-group">
                  <span className="studio3d-dock-label">Finish</span>
                  <div className="studio3d-swatches">
                    {STUDIO_FINISHES.map((fin) => (
                      <button
                        key={fin.id}
                        type="button"
                        className={`studio3d-swatch${
                          studioFinish === fin.id ? ' is-active' : ''
                        }`}
                        onClick={() => handleSelectFinish(fin.id)}
                        title={fin.label}
                        aria-label={`Select ${fin.label} finish`}
                      >
                        <span
                          className={`studio3d-swatch-dot${
                            fin.isGlass ? ' swatch-transparent' : ''
                          }`}
                          style={
                            fin.isGlass ? undefined : { background: fin.hex }
                          }
                        />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Capacity */}
                <div className="studio3d-dock-group">
                  <span className="studio3d-dock-label">Size</span>
                  <div className="studio3d-size-row">
                    {(['750 ml', '950 ml', '1.2 L'] as StudioSizeKey[]).map(
                      (sz) => (
                        <button
                          key={sz}
                          type="button"
                          className={`studio3d-size-btn${
                            studioSize === sz ? ' is-active' : ''
                          }`}
                          onClick={() => {
                            setStudioSize(sz);
                            onSyncSize?.(sz, SIZE_SPECS[sz].price);
                            pulseStudioInteract();
                          }}
                        >
                          {sz}
                        </button>
                      )
                    )}
                  </div>
                </div>

                {/* Live Monogram Engraving */}
                <div className="studio3d-dock-group">
                  <label
                    htmlFor="studio3d-engraving-input"
                    className="studio3d-dock-label"
                  >
                    Engraving
                  </label>
                  <input
                    id="studio3d-engraving-input"
                    type="text"
                    maxLength={12}
                    value={studioEngraving}
                    placeholder="None"
                    aria-label="Custom laser engraving text on 3D bottle"
                    className="studio3d-engraving-input"
                    onChange={(e) => {
                      const nextVal = e.target.value;
                      setStudioEngraving(nextVal);
                      onSyncEngraving?.({
                        enabled: nextVal.trim().length > 0,
                        text: nextVal,
                      });
                      pulseStudioInteract();
                    }}
                  />
                </div>

                {/* Exploded Thermal Cutaway Slider */}
                <div className="studio3d-dock-group studio3d-slider-group">
                  <label
                    htmlFor="studio3d-exploded-range"
                    className="studio3d-dock-label"
                  >
                    Thermal Cutaway ({Math.round(exploded * 100)}%)
                  </label>
                  <input
                    id="studio3d-exploded-range"
                    type="range"
                    min={0}
                    max={1}
                    step={0.01}
                    value={exploded}
                    onChange={(e) => {
                      setExploded(Number(e.target.value));
                      pulseStudioInteract();
                    }}
                    className="studio3d-range"
                  />
                </div>

                {/* Toggles */}
                <div className="studio3d-dock-group studio3d-toggles">
                  <button
                    type="button"
                    className={`studio3d-toggle-btn${showBoot ? ' is-active' : ''}`}
                    onClick={() => {
                      setShowBoot((v) => !v);
                      pulseStudioInteract();
                    }}
                  >
                    Silicone Boot
                  </button>
                  <button
                    type="button"
                    className={`studio3d-toggle-btn${chillMist ? ' is-active' : ''}`}
                    onClick={() => {
                      setChillMist((v) => !v);
                      pulseStudioInteract();
                    }}
                  >
                    <Sparkles size={13} aria-hidden="true" />
                    Ice Mist
                  </button>
                  <button
                    type="button"
                    className={`studio3d-toggle-btn${autoSpin ? ' is-active' : ''}`}
                    onClick={() => {
                      setAutoSpin((v) => !v);
                      pulseStudioInteract();
                    }}
                  >
                    Turntable
                  </button>
                </div>
              </div>
            )}
              </div>
            </div>
          )}
        </div>
      </div>

      <ARDeskPreviewModal
        open={arModalOpen}
        initialMode={arInitialMode}
        theme={theme}
        finish={studioFinish}
        size={studioSize}
        engravingText={studioEngraving}
        engravingFont={engravingFont}
        showBoot={showBoot}
        exportingGlb={exportingGlb}
        onClose={() => setArModalOpen(false)}
        onSelectFinish={(nextFinish) => handleSelectFinish(nextFinish)}
        onSelectSize={(nextSize) => {
          setStudioSize(nextSize);
          onSyncSize?.(nextSize, SIZE_SPECS[nextSize].price);
          pulseStudioInteract();
        }}
        onExportGlb={handleExportGlb}
        onAddConfiguredToBag={(cfg) => {
          pulseStudioInteract();
          onAddConfiguredToBag(cfg);
        }}
        onNotify={onSnapshotSaved}
      />
    </section>
  );
}
