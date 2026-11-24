import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Check, Copy, Link2 } from 'lucide-react';
import { CATEGORY_MAP, PRODUCTS, type Product } from '../data/products';
import type { HydrationLog, UserProfile } from '../types/profile';
import { getRecoloredBottleUrl } from '../utils/recolorBottle';

export type ShareMode = 'progress' | 'product';
type ShareAspect = 'square' | 'portrait';
type SharePaletteId = 'glacial' | 'ocean' | 'rose';

interface PaletteTokens {
  id: SharePaletteId;
  name: string;
  swatch: string;
  bgStart: string;
  bgEnd: string;
  radialGlow: string;
  cardBg: string;
  cardBorder: string;
  textPrimary: string;
  textSecondary: string;
  accent: string;
  accentSoft: string;
  ringTrack: string;
  waveStroke: string;
}

const PALETTES: Record<SharePaletteId, PaletteTokens> = {
  glacial: {
    id: 'glacial',
    name: 'Glacial Ice',
    swatch: '#0284c7',
    bgStart: '#f5fafd',
    bgEnd: '#d9eefb',
    radialGlow: 'rgba(2, 132, 199, 0.14)',
    cardBg: 'rgba(255, 255, 255, 0.86)',
    cardBorder: 'rgba(10, 34, 57, 0.12)',
    textPrimary: '#0a2239',
    textSecondary: '#44627d',
    accent: '#0284c7',
    accentSoft: 'rgba(2, 132, 199, 0.12)',
    ringTrack: 'rgba(10, 34, 57, 0.1)',
    waveStroke: 'rgba(2, 132, 199, 0.16)',
  },
  ocean: {
    id: 'ocean',
    name: 'Deep Ocean',
    swatch: '#0c2338',
    bgStart: '#06131f',
    bgEnd: '#0f2d47',
    radialGlow: 'rgba(56, 189, 248, 0.18)',
    cardBg: 'rgba(12, 31, 49, 0.82)',
    cardBorder: 'rgba(186, 224, 255, 0.16)',
    textPrimary: '#eff8ff',
    textSecondary: '#94b8d4',
    accent: '#38bdf8',
    accentSoft: 'rgba(56, 189, 248, 0.16)',
    ringTrack: 'rgba(186, 224, 255, 0.14)',
    waveStroke: 'rgba(56, 189, 248, 0.18)',
  },
  rose: {
    id: 'rose',
    name: 'Rose Quartz',
    swatch: '#db6b97',
    bgStart: '#fff5f8',
    bgEnd: '#f9dce8',
    radialGlow: 'rgba(219, 107, 151, 0.16)',
    cardBg: 'rgba(255, 255, 255, 0.88)',
    cardBorder: 'rgba(112, 36, 67, 0.12)',
    textPrimary: '#361322',
    textSecondary: '#73445a',
    accent: '#c94b7d',
    accentSoft: 'rgba(201, 75, 125, 0.12)',
    ringTrack: 'rgba(112, 36, 67, 0.1)',
    waveStroke: 'rgba(201, 75, 125, 0.16)',
  },
};

interface ShareHydrationModalProps {
  open: boolean;
  initialMode?: ShareMode;
  initialProductId?: string | null;
  initialFinishId?: string | null;
  profile: UserProfile;
  hydration: HydrationLog;
  savedProducts: Product[];
  bottlesSaved: number;
  memberTier: string;
  onClose: () => void;
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function drawWaterholicDroplet(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  color: string
) {
  const s = size / 28;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.4;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  // Outer droplet silhouette
  ctx.beginPath();
  ctx.moveTo(12, 1.8);
  ctx.bezierCurveTo(12, 1.8, 3.2, 12.1, 3.2, 18.2);
  ctx.bezierCurveTo(3.2, 23.06, 7.14, 27, 12, 27);
  ctx.bezierCurveTo(16.86, 27, 20.8, 23.06, 20.8, 18.2);
  ctx.bezierCurveTo(20.8, 12.1, 12, 1.8, 12, 1.8);
  ctx.closePath();
  ctx.stroke();

  // Inner specular highlight arc
  ctx.beginPath();
  ctx.moveTo(8.5, 18.8);
  ctx.quadraticCurveTo(9.4, 22.2, 12.8, 23.1);
  ctx.stroke();

  ctx.restore();
}

function drawWrappedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines = 3
): number {
  const words = text.trim().split(/\s+/);
  if (words.length === 0 || !text.trim()) return y;

  const lines: string[] = [];
  let current = words[0];

  for (let i = 1; i < words.length; i += 1) {
    const candidate = `${current} ${words[i]}`;
    if (ctx.measureText(candidate).width <= maxWidth) {
      current = candidate;
    } else {
      lines.push(current);
      current = words[i];
      if (lines.length === maxLines - 1) {
        const rest = words.slice(i).join(' ');
        let clipped = rest;
        while (
          clipped.length > 3 &&
          ctx.measureText(`${clipped}…`).width > maxWidth
        ) {
          clipped = clipped.slice(0, -1);
        }
        lines.push(clipped === rest ? rest : `${clipped.trim()}…`);
        current = '';
        break;
      }
    }
  }
  if (current) lines.push(current);

  lines.forEach((line, idx) => {
    ctx.fillText(line, x, y + idx * lineHeight);
  });

  return y + lines.length * lineHeight;
}

function drawCoverImage(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number,
  radius: number
) {
  ctx.save();
  drawRoundedRect(ctx, x, y, w, h, radius);
  ctx.clip();

  const imgRatio = img.naturalWidth / Math.max(1, img.naturalHeight);
  const boxRatio = w / h;
  let drawW = w;
  let drawH = h;
  let offsetX = x;
  let offsetY = y;

  if (imgRatio > boxRatio) {
    drawH = h;
    drawW = h * imgRatio;
    offsetX = x - (drawW - w) / 2;
  } else {
    drawW = w;
    drawH = w / imgRatio;
    offsetY = y - (drawH - h) / 2;
  }

  ctx.drawImage(img, offsetX, offsetY, drawW, drawH);
  ctx.restore();
}

export function ShareHydrationModal({
  open,
  initialMode = 'progress',
  initialProductId = null,
  initialFinishId = null,
  profile,
  hydration,
  savedProducts,
  bottlesSaved,
  memberTier,
  onClose,
}: ShareHydrationModalProps) {
  const [mode, setMode] = useState<ShareMode>(initialMode);
  const [aspect, setAspect] = useState<ShareAspect>('square');
  const [paletteId, setPaletteId] = useState<SharePaletteId>('glacial');
  const [selectedProductId, setSelectedProductId] = useState<string>(
    initialProductId ?? savedProducts[0]?.id ?? PRODUCTS[0].id
  );
  const [selectedFinishIdx, setSelectedFinishIdx] = useState<number>(0);
  const [caption, setCaption] = useState<string>('');
  const [loadedImg, setLoadedImg] = useState<HTMLImageElement | null>(null);
  const [imgLoading, setImgLoading] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const feedbackTimerRef = useRef<number | null>(null);
  const linkCopiedTimerRef = useRef<number | null>(null);

  const selectedProduct: Product = useMemo(() => {
    return (
      PRODUCTS.find((p) => p.id === selectedProductId) ??
      savedProducts[0] ??
      PRODUCTS[0]
    );
  }, [selectedProductId, savedProducts]);

  // Build product picker choices: currently viewed product (if outside saved/featured), saved wishlist, then featured
  const selectableProducts = useMemo(() => {
    const savedSet = new Set(savedProducts.map((p) => p.id));
    const featuredExtras = PRODUCTS.filter(
      (p) => p.featured && !savedSet.has(p.id)
    ).slice(0, 12);
    const listedIds = new Set([
      ...savedProducts.map((p) => p.id),
      ...featuredExtras.map((p) => p.id),
    ]);
    const currentExtra = listedIds.has(selectedProduct.id)
      ? null
      : selectedProduct;
    return {
      currentExtra,
      saved: savedProducts,
      featured: featuredExtras,
      all: [
        ...(currentExtra ? [currentExtra] : []),
        ...savedProducts,
        ...featuredExtras,
      ],
    };
  }, [savedProducts, selectedProduct]);

  const activeFinish =
    selectedProduct.finishes[selectedFinishIdx] ?? selectedProduct.finishes[0];

  const directProductUrl = useMemo(() => {
    if (typeof window === 'undefined') {
      const finishParam = activeFinish?.id
        ? `&finish=${encodeURIComponent(activeFinish.id)}`
        : '';
      return `https://waterholic.app/?product=${encodeURIComponent(selectedProduct.id)}${finishParam}`;
    }
    const url = new URL(window.location.href);
    url.search = '';
    url.hash = '';
    url.searchParams.set('product', selectedProduct.id);
    if (activeFinish?.id) {
      url.searchParams.set('finish', activeFinish.id);
    }
    return url.toString();
  }, [selectedProduct.id, activeFinish?.id]);

  const shortProductLinkLabel = useMemo(() => {
    const finishQuery = activeFinish?.id ? `&finish=${activeFinish.id}` : '';
    try {
      const parsed = new URL(directProductUrl);
      const host = parsed.host.length > 26 ? 'waterholic.app' : parsed.host;
      return `${host}/?product=${selectedProduct.id}${finishQuery}`;
    } catch {
      return `waterholic.app/?product=${selectedProduct.id}${finishQuery}`;
    }
  }, [directProductUrl, selectedProduct.id, activeFinish?.id]);

  useEffect(() => {
    if (!open) return;
    setMode(initialMode);
    setLinkCopied(false);
    const targetProdId = initialProductId ?? savedProducts[0]?.id ?? PRODUCTS[0].id;
    setSelectedProductId(targetProdId);
    const targetProduct = PRODUCTS.find((p) => p.id === targetProdId);
    if (targetProduct && initialFinishId) {
      const idx = targetProduct.finishes.findIndex(
        (f) => f.id === initialFinishId
      );
      setSelectedFinishIdx(idx >= 0 ? idx : 0);
    } else {
      setSelectedFinishIdx(0);
    }
    setFeedback(null);
  }, [open, initialMode, initialProductId, initialFinishId, savedProducts]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    return () => {
      if (feedbackTimerRef.current !== null) {
        window.clearTimeout(feedbackTimerRef.current);
      }
      if (linkCopiedTimerRef.current !== null) {
        window.clearTimeout(linkCopiedTimerRef.current);
      }
    };
  }, []);

  // Load selected product image with bottle-only recoloring for Canvas drawing
  useEffect(() => {
    if (!open || mode !== 'product') {
      setImgLoading(false);
      return;
    }
    let cancelled = false;
    setImgLoading(true);

    const loadSrc = async () => {
      const resolvedUrl = activeFinish
        ? await getRecoloredBottleUrl(selectedProduct.image, activeFinish, 880)
        : selectedProduct.image;
      if (cancelled) return;

      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        if (!cancelled) {
          setLoadedImg(img);
          setImgLoading(false);
        }
      };
      img.onerror = () => {
        if (!cancelled) {
          setLoadedImg(null);
          setImgLoading(false);
        }
      };
      img.src = resolvedUrl;
    };

    loadSrc();
    return () => {
      cancelled = true;
    };
  }, [
    open,
    mode,
    selectedProduct.image,
    activeFinish?.id,
    activeFinish?.hex,
    activeFinish?.isTransparent,
    activeFinish?.filter,
  ]);

  const showFeedback = useCallback((msg: string) => {
    setFeedback(msg);
    if (feedbackTimerRef.current !== null) {
      window.clearTimeout(feedbackTimerRef.current);
    }
    feedbackTimerRef.current = window.setTimeout(() => {
      setFeedback(null);
      feedbackTimerRef.current = null;
    }, 3000);
  }, []);

  const hydrationPct = Math.min(
    100,
    Math.round(
      (hydration.consumedMl / Math.max(500, profile.dailyGoalMl)) * 100
    )
  );
  const remainingMl = Math.max(0, profile.dailyGoalMl - hydration.consumedMl);

  // Render crisp full-resolution graphic onto HTML5 Canvas
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = 1080;
    const height = aspect === 'portrait' ? 1350 : 1080;
    if (canvas.width !== width) canvas.width = width;
    if (canvas.height !== height) canvas.height = height;

    const pal = PALETTES[paletteId];
    const pad = 76;

    // 1. Background gradient
    const bgGrad = ctx.createLinearGradient(0, 0, width * 0.85, height);
    bgGrad.addColorStop(0, pal.bgStart);
    bgGrad.addColorStop(1, pal.bgEnd);
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // 2. Ambient top-right water glow
    const glow = ctx.createRadialGradient(
      width * 0.82,
      height * 0.16,
      40,
      width * 0.82,
      height * 0.16,
      width * 0.62
    );
    glow.addColorStop(0, pal.radialGlow);
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, width, height);

    // 3. Subtle alpine wave contours in background
    ctx.save();
    ctx.strokeStyle = pal.waveStroke;
    ctx.lineWidth = 2;
    for (let wIdx = 0; wIdx < 4; wIdx += 1) {
      const baseY = height - 190 + wIdx * 42;
      ctx.beginPath();
      ctx.moveTo(0, baseY);
      ctx.bezierCurveTo(
        width * 0.28,
        baseY - 48 + wIdx * 8,
        width * 0.62,
        baseY + 52 - wIdx * 6,
        width,
        baseY - 18
      );
      ctx.stroke();
    }
    ctx.restore();

    // 4. Outer editorial hairline frame
    ctx.save();
    drawRoundedRect(ctx, 32, 32, width - 64, height - 64, 30);
    ctx.strokeStyle = pal.cardBorder;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();

    // 5. Header row: Waterholic droplet logo + wordmark + date stamp
    drawWaterholicDroplet(ctx, pad, pad - 4, 42, pal.accent);

    ctx.fillStyle = pal.textPrimary;
    ctx.font = '700 32px "DM Sans", -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    ctx.fillText('WATERHOLIC', pad + 52, pad + 18);

    const todayStr = new Date().toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    ctx.fillStyle = pal.textSecondary;
    ctx.font = '500 24px "DM Mono", monospace';
    ctx.textAlign = 'right';
    ctx.fillText(todayStr, width - pad, pad + 18);

    // Subtle divider under header
    ctx.beginPath();
    ctx.moveTo(pad, pad + 64);
    ctx.lineTo(width - pad, pad + 64);
    ctx.strokeStyle = pal.cardBorder;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    const safeCaption = caption.trim();

    if (mode === 'progress') {
      // ===================================================================
      // MODE A: DAILY HYDRATION PROGRESS CARD
      // ===================================================================
      const isTall = aspect === 'portrait';

      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';
      ctx.fillStyle = pal.accent;
      ctx.font = '600 24px "DM Sans", -apple-system, sans-serif';
      ctx.fillText('DAILY HYDRATION LOG', pad, pad + 128);

      ctx.fillStyle = pal.textPrimary;
      ctx.font = '700 54px "DM Sans", -apple-system, sans-serif';
      ctx.fillText(profile.name, pad, pad + 194);

      ctx.fillStyle = pal.textSecondary;
      ctx.font = '500 26px "DM Sans", -apple-system, sans-serif';
      const subLine = profile.university
        ? `${memberTier}  ·  ${profile.university}`
        : `${memberTier}  ·  ${profile.preferredColor} Finish`;
      ctx.fillText(subLine, pad, pad + 238);

      // Center progress ring card
      const cardTop = pad + 278;
      const cardH = isTall ? 520 : 378;
      ctx.save();
      drawRoundedRect(ctx, pad, cardTop, width - pad * 2, cardH, 28);
      ctx.fillStyle = pal.cardBg;
      ctx.fill();
      ctx.strokeStyle = pal.cardBorder;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();

      // Circular progress ring
      const ringRadius = isTall ? 156 : 128;
      const ringCx = isTall ? width / 2 : pad + 205;
      const ringCy = isTall ? cardTop + 215 : cardTop + cardH / 2;
      const ringLine = isTall ? 26 : 22;

      // Track circle
      ctx.beginPath();
      ctx.arc(ringCx, ringCy, ringRadius, 0, Math.PI * 2);
      ctx.strokeStyle = pal.ringTrack;
      ctx.lineWidth = ringLine;
      ctx.stroke();

      // Filled progress arc
      const progressAngle =
        (Math.max(2, hydrationPct) / 100) * Math.PI * 2 - Math.PI / 2;
      ctx.beginPath();
      ctx.arc(ringCx, ringCy, ringRadius, -Math.PI / 2, progressAngle);
      ctx.strokeStyle = pal.accent;
      ctx.lineWidth = ringLine;
      ctx.lineCap = 'round';
      ctx.stroke();

      // Center percentage text
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = pal.textPrimary;
      ctx.font = `700 ${isTall ? 78 : 66}px "DM Mono", monospace`;
      ctx.fillText(`${hydrationPct}%`, ringCx, ringCy - 12);

      ctx.fillStyle = pal.textSecondary;
      ctx.font = '600 23px "DM Sans", -apple-system, sans-serif';
      ctx.fillText(
        hydrationPct >= 100 ? 'GOAL REACHED' : 'OF DAILY GOAL',
        ringCx,
        ringCy + 42
      );

      // Metric details alongside (square) or below ring (portrait)
      if (isTall) {
        ctx.textAlign = 'center';
        ctx.textBaseline = 'alphabetic';
        ctx.fillStyle = pal.textPrimary;
        ctx.font = '700 44px "DM Mono", monospace';
        ctx.fillText(
          `${hydration.consumedMl.toLocaleString()} / ${profile.dailyGoalMl.toLocaleString()} ml`,
          width / 2,
          cardTop + 448
        );
        ctx.fillStyle = pal.textSecondary;
        ctx.font = '500 25px "DM Sans", -apple-system, sans-serif';
        ctx.fillText(
          remainingMl === 0
            ? 'Daily hydration milestone completed'
            : `${remainingMl.toLocaleString()} ml remaining to hit today’s target`,
          width / 2,
          cardTop + 488
        );
      } else {
        const textX = pad + 392;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'alphabetic';

        ctx.fillStyle = pal.textSecondary;
        ctx.font = '600 22px "DM Sans", -apple-system, sans-serif';
        ctx.fillText('CONSUMED TODAY', textX, cardTop + 104);

        ctx.fillStyle = pal.textPrimary;
        ctx.font = '700 62px "DM Mono", monospace';
        ctx.fillText(
          `${hydration.consumedMl.toLocaleString()} ml`,
          textX,
          cardTop + 174
        );

        ctx.fillStyle = pal.textSecondary;
        ctx.font = '500 25px "DM Sans", -apple-system, sans-serif';
        ctx.fillText(
          `Target: ${profile.dailyGoalMl.toLocaleString()} ml`,
          textX,
          cardTop + 216
        );

        // Status line
        ctx.fillStyle = pal.accent;
        ctx.font = '600 25px "DM Sans", -apple-system, sans-serif';
        ctx.fillText(
          remainingMl === 0
            ? 'Goal completed for today'
            : `${remainingMl.toLocaleString()} ml left to target`,
          textX,
          cardTop + 278
        );

        ctx.fillStyle = pal.textSecondary;
        ctx.font = '500 22px "DM Sans", -apple-system, sans-serif';
        ctx.fillText(
          `${hydration.entries.length} refill${hydration.entries.length === 1 ? '' : 's'} logged today`,
          textX,
          cardTop + 318
        );
      }

      // 3-column summary metrics row
      const statsTop = cardTop + cardH + 34;
      const statsH = 148;
      const gap = 22;
      const statW = (width - pad * 2 - gap * 2) / 3;
      const statItems = [
        {
          value: `${hydration.entries.length}`,
          label: 'REFILLS TODAY',
        },
        {
          value: `${bottlesSaved}`,
          label: 'PLASTIC SAVED',
        },
        {
          value: `${(hydration.consumedMl / 1000).toFixed(2)} L`,
          label: 'TOTAL LITERS',
        },
      ];

      statItems.forEach((st, idx) => {
        const sx = pad + idx * (statW + gap);
        ctx.save();
        drawRoundedRect(ctx, sx, statsTop, statW, statsH, 20);
        ctx.fillStyle = pal.cardBg;
        ctx.fill();
        ctx.strokeStyle = pal.cardBorder;
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.restore();

        ctx.textAlign = 'center';
        ctx.textBaseline = 'alphabetic';
        ctx.fillStyle = pal.textPrimary;
        ctx.font = '700 42px "DM Mono", monospace';
        ctx.fillText(st.value, sx + statW / 2, statsTop + 76);

        ctx.fillStyle = pal.textSecondary;
        ctx.font = '600 18px "DM Sans", -apple-system, sans-serif';
        ctx.fillText(st.label, sx + statW / 2, statsTop + 114);
      });

      // Optional custom caption (in portrait or square)
      if (safeCaption) {
        const capY = statsTop + statsH + (isTall ? 72 : 52);
        ctx.textAlign = 'left';
        ctx.textBaseline = 'alphabetic';
        ctx.fillStyle = pal.textPrimary;
        ctx.font = '500 28px "DM Sans", -apple-system, sans-serif';
        drawWrappedText(ctx, `“${safeCaption}”`, pad, capY, width - pad * 2, 38, 2);
      }
    } else {
      // ===================================================================
      // MODE B: FAVORITE WATERHOLIC PRODUCT SPOTLIGHT CARD
      // ===================================================================
      const isTall = aspect === 'portrait';
      const catMeta = CATEGORY_MAP[selectedProduct.category];

      const imgBoxX = pad;
      const imgBoxY = pad + 100;
      const imgBoxW = width - pad * 2;
      const imgBoxH = isTall ? 650 : 480;

      // Photo frame backdrop + subtle border
      ctx.save();
      drawRoundedRect(ctx, imgBoxX, imgBoxY, imgBoxW, imgBoxH, 28);
      ctx.fillStyle = pal.cardBg;
      ctx.fill();
      ctx.strokeStyle = pal.cardBorder;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();

      if (loadedImg) {
        drawCoverImage(
          ctx,
          loadedImg,
          imgBoxX + 12,
          imgBoxY + 12,
          imgBoxW - 24,
          imgBoxH - 24,
          20
        );
      } else {
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = pal.textSecondary;
        ctx.font = '500 26px "DM Sans", -apple-system, sans-serif';
        ctx.fillText(
          'Waterholic Studio Preview',
          imgBoxX + imgBoxW / 2,
          imgBoxY + imgBoxH / 2
        );
      }

      // Product Details Panel below image
      const infoTop = imgBoxY + imgBoxH + 44;

      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';
      ctx.fillStyle = pal.accent;
      ctx.font = '600 22px "DM Sans", -apple-system, sans-serif';
      ctx.fillText(
        `${catMeta.shortName.toUpperCase()}  ·  ${selectedProduct.variety.toUpperCase()}`,
        pad,
        infoTop
      );

      // Price aligned right
      ctx.textAlign = 'right';
      ctx.fillStyle = pal.textPrimary;
      ctx.font = '700 42px "DM Mono", monospace';
      ctx.fillText(`$${selectedProduct.price}`, width - pad, infoTop + 10);

      // Product Title
      ctx.textAlign = 'left';
      ctx.fillStyle = pal.textPrimary;
      ctx.font = '700 46px "DM Sans", -apple-system, sans-serif';
      const afterTitleY = drawWrappedText(
        ctx,
        selectedProduct.name,
        pad,
        infoTop + 62,
        width - pad * 2 - 110,
        54,
        2
      );

      // Key Specs + Active Finish Swatch
      const metaY = afterTitleY + 18;
      if (activeFinish) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(pad + 12, metaY - 8, 11, 0, Math.PI * 2);
        ctx.fillStyle = activeFinish.isTransparent ? '#e2f1fb' : activeFinish.hex;
        ctx.fill();
        ctx.strokeStyle = pal.cardBorder;
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();
      }

      ctx.fillStyle = pal.textSecondary;
      ctx.font = '500 25px "DM Sans", -apple-system, sans-serif';
      ctx.fillText(
        `${activeFinish?.name ?? 'Signature'}  ·  ${selectedProduct.capacity}  ·  ${selectedProduct.highlightSpec}`,
        pad + 34,
        metaY
      );

      // Rating & User Attribution
      const attrY = metaY + 48;
      ctx.fillStyle = pal.textPrimary;
      ctx.font = '600 24px "DM Sans", -apple-system, sans-serif';
      ctx.fillText(
        `★ ${selectedProduct.rating.toFixed(1)} (${selectedProduct.reviews})  ·  Picked by ${profile.name}`,
        pad,
        attrY
      );

      if (safeCaption) {
        ctx.fillStyle = pal.textSecondary;
        ctx.font = '500 26px "DM Sans", -apple-system, sans-serif';
        drawWrappedText(
          ctx,
          `“${safeCaption}”`,
          pad,
          attrY + 48,
          width - pad * 2,
          36,
          2
        );
      }
    }

    // 6. Quiet Bottom Brand Sign-Off (with direct product link in Product mode)
    const footerY = height - 66;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = pal.textSecondary;
    ctx.font =
      mode === 'product'
        ? '500 20px "DM Mono", monospace'
        : '500 22px "DM Sans", -apple-system, sans-serif';
    ctx.fillText(
      mode === 'product' ? shortProductLinkLabel : 'Pure hydration, carried daily.',
      pad,
      footerY
    );

    ctx.textAlign = 'right';
    ctx.fillStyle = pal.accent;
    ctx.font = '600 22px "DM Mono", monospace';
    ctx.fillText('#WATERHOLIC', width - pad, footerY);
  }, [
    aspect,
    paletteId,
    mode,
    profile,
    hydration,
    hydrationPct,
    remainingMl,
    bottlesSaved,
    memberTier,
    selectedProduct,
    activeFinish,
    loadedImg,
    caption,
    shortProductLinkLabel,
  ]);

  useEffect(() => {
    if (!open) return;
    renderCanvas();
  }, [open, renderCanvas]);

  const getCanvasBlob = (): Promise<Blob | null> => {
    return new Promise((resolve) => {
      const canvas = canvasRef.current;
      if (!canvas) {
        resolve(null);
        return;
      }
      if (canvas.toBlob) {
        canvas.toBlob((blob) => resolve(blob), 'image/png', 1.0);
      } else {
        resolve(null);
      }
    });
  };

  const handleDownload = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const fileName =
      mode === 'progress'
        ? `waterholic-hydration-${hydrationPct}pct.png`
        : `waterholic-${selectedProduct.sku.toLowerCase()}.png`;

    const blob = await getCanvasBlob();
    if (blob) {
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      showFeedback(`Downloaded ${fileName}`);
      return;
    }

    const dataUrl = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showFeedback(`Downloaded ${fileName}`);
  };

  const handleCopyImage = async () => {
    const blob = await getCanvasBlob();
    if (!blob) {
      showFeedback('Could not generate image — try Download PNG');
      return;
    }

    try {
      if (
        navigator.clipboard &&
        'write' in navigator.clipboard &&
        typeof ClipboardItem !== 'undefined'
      ) {
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blob }),
        ]);
        showFeedback('Image copied to clipboard');
        return;
      }
    } catch {
      // Fallback below when iframe blocks clipboard image write
    }

    showFeedback('Clipboard blocked by browser — use Download PNG');
  };

  const handleCopyProductLink = async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(directProductUrl);
      } else {
        const temp = document.createElement('textarea');
        temp.value = directProductUrl;
        temp.style.position = 'fixed';
        temp.style.opacity = '0';
        document.body.appendChild(temp);
        temp.select();
        document.execCommand('copy');
        document.body.removeChild(temp);
      }
      setLinkCopied(true);
      if (linkCopiedTimerRef.current !== null) {
        window.clearTimeout(linkCopiedTimerRef.current);
      }
      linkCopiedTimerRef.current = window.setTimeout(() => {
        setLinkCopied(false);
        linkCopiedTimerRef.current = null;
      }, 2400);
      showFeedback('Direct product link copied to clipboard');
    } catch {
      showFeedback('Could not copy automatically — select the product link above');
    }
  };

  const handleNativeShare = async () => {
    const blob = await getCanvasBlob();
    const fileName =
      mode === 'progress'
        ? `waterholic-hydration-${hydrationPct}pct.png`
        : `waterholic-${selectedProduct.sku.toLowerCase()}.png`;
    const shareTitle =
      mode === 'progress'
        ? 'Waterholic Hydration Card'
        : `${selectedProduct.name} — Waterholic`;
    const shareText =
      mode === 'progress'
        ? `I'm at ${hydrationPct}% (${hydration.consumedMl} ml / ${profile.dailyGoalMl} ml) of my daily hydration goal with Waterholic!`
        : `Check out the ${selectedProduct.name} (${activeFinish?.name ?? 'Signature'}) on Waterholic: ${directProductUrl}`;

    try {
      if (blob && navigator.share && navigator.canShare) {
        const file = new File([blob], fileName, { type: 'image/png' });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: shareTitle,
            text: shareText,
            ...(mode === 'product' ? { url: directProductUrl } : {}),
            files: [file],
          });
          showFeedback('Shared bottle preview & product link');
          return;
        }
      }
      if (navigator.share) {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          ...(mode === 'product' ? { url: directProductUrl } : {}),
        });
        showFeedback('Shared direct product link');
        return;
      }
    } catch (err) {
      if ((err as Error)?.name === 'AbortError') return;
    }

    if (mode === 'product') {
      await handleCopyProductLink();
      if (blob) {
        await handleDownload();
        showFeedback('Direct product link copied & bottle preview PNG downloaded');
      }
      return;
    }

    await handleDownload();
  };

  if (!open) return null;

  return (
    <div
      className="share-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="share-hydration-title"
      data-lenis-prevent
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="share-modal">
        <div className="share-modal-header">
          <div>
            <span className="footer-doc-kicker">Canvas Card Studio</span>
            <h2 id="share-hydration-title" className="share-modal-title">
              {mode === 'product' ? 'Share Product & Preview' : 'Share your Hydration'}
            </h2>
          </div>
          <button
            type="button"
            className="modal-close-btn"
            aria-label="Close Share your Hydration studio"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        <div className="share-modal-grid">
          {/* Left: Live HTML5 Canvas Preview */}
          <div className="share-canvas-stage">
            <div
              className={`share-canvas-frame${aspect === 'portrait' ? ' is-portrait' : ''}`}
            >
              <canvas
                ref={canvasRef}
                className="share-canvas-el"
                aria-label={
                  mode === 'progress'
                    ? `Shareable daily hydration progress card showing ${hydrationPct}% of daily goal`
                    : `Shareable Waterholic favorite product card for ${selectedProduct.name}`
                }
              />
              {imgLoading && mode === 'product' && (
                <div className="share-canvas-loading" aria-live="polite">
                  Rendering studio photo...
                </div>
              )}
            </div>
            <p className="share-canvas-meta tabular-nums">
              Live HTML5 Canvas · {aspect === 'portrait' ? '1080 × 1350 px' : '1080 × 1080 px'} PNG
            </p>
          </div>

          {/* Right: Card Customization & Export Controls */}
          <div className="share-controls-col">
            {/* Mode Segmented Toggle */}
            <div className="share-control-group">
              <span className="share-control-label">Card Type</span>
              <div className="share-segmented" role="tablist" aria-label="Share card mode">
                <button
                  type="button"
                  role="tab"
                  aria-selected={mode === 'progress'}
                  className={`share-seg-btn${mode === 'progress' ? ' is-active' : ''}`}
                  onClick={() => setMode('progress')}
                >
                  Daily Progress
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={mode === 'product'}
                  className={`share-seg-btn${mode === 'product' ? ' is-active' : ''}`}
                  onClick={() => setMode('product')}
                >
                  Favorite Product
                </button>
              </div>
            </div>

            {/* Product & Finish Picker (Favorite Product Mode) */}
            {mode === 'product' && (
              <>
                <div className="share-control-group">
                  <label htmlFor="share-product-select" className="share-control-label">
                    Waterholic Product
                  </label>
                  <select
                    id="share-product-select"
                    className="filter-select share-select"
                    value={selectedProduct.id}
                    onChange={(e) => {
                      setSelectedProductId(e.target.value);
                      setSelectedFinishIdx(0);
                    }}
                  >
                    {selectableProducts.currentExtra && (
                      <optgroup label="Currently Viewing">
                        <option value={selectableProducts.currentExtra.id}>
                          {selectableProducts.currentExtra.name} ($
                          {selectableProducts.currentExtra.price})
                        </option>
                      </optgroup>
                    )}
                    {selectableProducts.saved.length > 0 && (
                      <optgroup label="Your Saved Wishlist">
                        {selectableProducts.saved.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} (${p.price})
                          </option>
                        ))}
                      </optgroup>
                    )}
                    <optgroup label="Featured Waterholic">
                      {selectableProducts.featured.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} (${p.price})
                        </option>
                      ))}
                    </optgroup>
                  </select>
                </div>

                <div className="share-control-group">
                  <span className="share-control-label">
                    Finish — {activeFinish?.name}
                  </span>
                  <div className="share-finish-row" role="radiogroup" aria-label="Select product finish">
                    {selectedProduct.finishes.map((fin, idx) => (
                      <button
                        key={fin.id}
                        type="button"
                        role="radio"
                        aria-checked={idx === selectedFinishIdx}
                        aria-label={fin.name}
                        title={fin.name}
                        className={`card-swatch-dot${idx === selectedFinishIdx ? ' is-active' : ''}`}
                        onClick={() => setSelectedFinishIdx(idx)}
                      >
                        <span
                          className={fin.isTransparent ? 'swatch-transparent' : undefined}
                          style={
                            fin.isTransparent
                              ? undefined
                              : { backgroundColor: fin.hex }
                          }
                        />
                      </button>
                    ))}
                  </div>
                </div>

                <div className="share-control-group">
                  <label htmlFor="share-direct-link-input" className="share-control-label">
                    Direct Product Link
                  </label>
                  <div className="share-direct-link-row">
                    <span className="share-link-icon" aria-hidden="true">
                      <Link2 size={14} />
                    </span>
                    <input
                      id="share-direct-link-input"
                      type="text"
                      readOnly
                      className="share-direct-link-input tabular-nums"
                      value={directProductUrl}
                      onFocus={(e) => e.currentTarget.select()}
                      aria-label="Direct link to this product"
                    />
                    <button
                      type="button"
                      className={`share-copy-link-btn${linkCopied ? ' is-copied' : ''}`}
                      onClick={handleCopyProductLink}
                    >
                      {linkCopied ? (
                        <>
                          <Check size={13} aria-hidden="true" />
                          <span>Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy size={13} aria-hidden="true" />
                          <span>Copy Link</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* Format / Aspect Ratio */}
            <div className="share-control-group">
              <span className="share-control-label">Format</span>
              <div className="share-segmented" role="group" aria-label="Card dimensions">
                <button
                  type="button"
                  aria-pressed={aspect === 'square'}
                  className={`share-seg-btn${aspect === 'square' ? ' is-active' : ''}`}
                  onClick={() => setAspect('square')}
                >
                  Square (1:1)
                </button>
                <button
                  type="button"
                  aria-pressed={aspect === 'portrait'}
                  className={`share-seg-btn${aspect === 'portrait' ? ' is-active' : ''}`}
                  onClick={() => setAspect('portrait')}
                >
                  Portrait (4:5)
                </button>
              </div>
            </div>

            {/* Canvas Theme Palette */}
            <div className="share-control-group">
              <span className="share-control-label">Card Theme</span>
              <div className="share-palette-row" role="radiogroup" aria-label="Card color theme">
                {(Object.values(PALETTES) as PaletteTokens[]).map((pal) => (
                  <button
                    key={pal.id}
                    type="button"
                    role="radio"
                    aria-checked={paletteId === pal.id}
                    className={`share-palette-btn${paletteId === pal.id ? ' is-active' : ''}`}
                    onClick={() => setPaletteId(pal.id)}
                  >
                    <span
                      className="share-palette-dot"
                      style={{ backgroundColor: pal.swatch }}
                    />
                    <span>{pal.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Optional Custom Caption */}
            <div className="share-control-group">
              <label htmlFor="share-caption-input" className="share-control-label">
                Personal Note (Optional)
              </label>
              <input
                id="share-caption-input"
                type="text"
                maxLength={84}
                className="share-caption-input"
                placeholder={
                  mode === 'progress'
                    ? 'e.g. Staying hydrated through finals week'
                    : 'e.g. My everyday carry bottle'
                }
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
              />
            </div>

            {/* Export & Share Actions */}
            <div className="share-export-actions">
              <button
                type="button"
                className="btn btn-primary share-primary-cta"
                onClick={mode === 'product' ? handleNativeShare : handleDownload}
              >
                {mode === 'product' ? 'Share Preview & Link' : 'Download PNG'}
              </button>
              <div className="share-secondary-row">
                <button
                  type="button"
                  className="btn-card-secondary share-sec-btn"
                  onClick={handleDownload}
                >
                  Download PNG
                </button>
                <button
                  type="button"
                  className="btn-card-secondary share-sec-btn"
                  onClick={handleCopyImage}
                >
                  Copy Image
                </button>
              </div>
            </div>

            {feedback && (
              <p className="share-feedback" role="status" aria-live="polite">
                {feedback}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
