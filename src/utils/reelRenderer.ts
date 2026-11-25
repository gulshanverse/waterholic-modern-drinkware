export interface ReelChoreography {
  headline: string;
  subline: string;
  cameraMove: 'zoom-in' | 'pan-right' | 'pan-up' | 'orbit-drift';
  effect: 'water-caustics' | 'mist-particles' | 'sun-flare' | 'alpine-shimmer';
  accentHex: string;
}

export interface RenderMotionReelOptions {
  frameDataUrl: string;
  aspectRatio: '16:9' | '9:16';
  choreography: ReelChoreography;
  durationMs?: number;
  onProgress?: (pct: number) => void;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load keyframe image.'));
    img.src = src;
  });
}

function easeInOutSine(t: number): number {
  return -(Math.cos(Math.PI * t) - 1) / 2;
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

/**
 * Renders a smooth, 30fps downloadable WebM motion reel from a keyframe + AI choreography
 * completely client-side (zero paid video API costs).
 */
export async function renderMotionReelVideo(
  options: RenderMotionReelOptions
): Promise<{ videoUrl: string; blob: Blob; mimeType: string }> {
  const {
    frameDataUrl,
    aspectRatio,
    choreography,
    durationMs = 5600,
    onProgress,
  } = options;

  const img = await loadImage(frameDataUrl);

  const width = aspectRatio === '16:9' ? 1280 : 720;
  const height = aspectRatio === '16:9' ? 720 : 1280;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas 2D context unavailable for motion rendering.');
  }

  const preferredMimes = [
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8',
    'video/webm',
  ];
  const supportedMime =
    typeof MediaRecorder !== 'undefined'
      ? preferredMimes.find((m) => MediaRecorder.isTypeSupported(m)) || 'video/webm'
      : 'video/webm';

  if (typeof canvas.captureStream !== 'function' || typeof MediaRecorder === 'undefined') {
    throw new Error('Your browser does not support in-browser video recording.');
  }

  const stream = canvas.captureStream(30);
  const recorder = new MediaRecorder(stream, {
    mimeType: supportedMime,
    videoBitsPerSecond: 4_200_000,
  });

  const chunks: BlobPart[] = [];
  recorder.ondataavailable = (ev) => {
    if (ev.data && ev.data.size > 0) {
      chunks.push(ev.data);
    }
  };

  // Pre-seed deterministic water mist particles
  const particles = Array.from({ length: 42 }, (_, idx) => {
    const seed = (idx + 1) * 9301 + 49297;
    return {
      x: ((seed * 13) % 1000) / 1000,
      y: ((seed * 29) % 1000) / 1000,
      r: 1.8 + ((seed * 7) % 100) / 24,
      speedY: 0.04 + ((seed * 11) % 100) / 900,
      drift: (((seed * 17) % 100) / 100 - 0.5) * 0.06,
      alpha: 0.14 + ((seed * 19) % 100) / 260,
    };
  });

  const drawFrame = (progress: number) => {
    const p = Math.max(0, Math.min(1, progress));
    const eased = easeInOutSine(p);

    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#06131f';
    ctx.fillRect(0, 0, width, height);

    // Compute cover-fit dimensions + camera motion
    const imgAspect = img.width / Math.max(1, img.height);
    const canvasAspect = width / height;
    let baseW = width;
    let baseH = height;
    if (imgAspect > canvasAspect) {
      baseH = height;
      baseW = height * imgAspect;
    } else {
      baseW = width;
      baseH = width / imgAspect;
    }

    let scale = 1.08;
    let offsetX = 0;
    let offsetY = 0;

    switch (choreography.cameraMove) {
      case 'zoom-in':
        scale = 1.03 + eased * 0.14;
        offsetY = (0.5 - eased) * height * 0.02;
        break;
      case 'pan-right':
        scale = 1.15;
        offsetX = (0.5 - eased) * width * 0.1;
        break;
      case 'pan-up':
        scale = 1.15;
        offsetY = (eased - 0.5) * height * 0.1;
        break;
      case 'orbit-drift':
        scale = 1.08 + Math.sin(p * Math.PI) * 0.08;
        offsetX = Math.sin(p * Math.PI * 2) * width * 0.035;
        offsetY = Math.cos(p * Math.PI * 2) * height * 0.025;
        break;
    }

    const drawW = baseW * scale;
    const drawH = baseH * scale;
    const dx = (width - drawW) / 2 + offsetX;
    const dy = (height - drawH) / 2 + offsetY;

    ctx.save();
    ctx.drawImage(img, dx, dy, drawW, drawH);

    // Atmospheric effect overlays
    if (choreography.effect === 'water-caustics' || choreography.effect === 'alpine-shimmer') {
      ctx.globalCompositeOperation = 'screen';
      const sweepX = width * (-0.2 + p * 1.4);
      const grad = ctx.createLinearGradient(
        sweepX - width * 0.25,
        0,
        sweepX + width * 0.25,
        height
      );
      grad.addColorStop(0, 'rgba(56, 189, 248, 0)');
      grad.addColorStop(0.5, 'rgba(125, 211, 252, 0.16)');
      grad.addColorStop(1, 'rgba(56, 189, 248, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);
      ctx.globalCompositeOperation = 'source-over';
    } else if (choreography.effect === 'sun-flare') {
      ctx.globalCompositeOperation = 'screen';
      const fx = width * (0.2 + eased * 0.55);
      const fy = height * 0.24;
      const rad = ctx.createRadialGradient(fx, fy, 10, fx, fy, width * 0.45);
      rad.addColorStop(0, 'rgba(255, 244, 214, 0.34)');
      rad.addColorStop(0.45, 'rgba(56, 189, 248, 0.12)');
      rad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = rad;
      ctx.fillRect(0, 0, width, height);
      ctx.globalCompositeOperation = 'source-over';
    }

    // Floating condensation / mist particles
    for (const pt of particles) {
      const py = (pt.y - p * pt.speedY * 2.6 + 2) % 1;
      const px = (pt.x + Math.sin(p * Math.PI * 2 + pt.y * 8) * pt.drift + 1) % 1;
      ctx.beginPath();
      ctx.arc(px * width, py * height, pt.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(224, 244, 255, ${pt.alpha})`;
      ctx.fill();
    }

    // Editorial cinematic vignette gradient at bottom & top
    const bottomGrad = ctx.createLinearGradient(0, height * 0.55, 0, height);
    bottomGrad.addColorStop(0, 'rgba(6, 19, 31, 0)');
    bottomGrad.addColorStop(1, 'rgba(6, 19, 31, 0.78)');
    ctx.fillStyle = bottomGrad;
    ctx.fillRect(0, height * 0.55, width, height * 0.45);

    const topGrad = ctx.createLinearGradient(0, 0, 0, height * 0.22);
    topGrad.addColorStop(0, 'rgba(6, 19, 31, 0.42)');
    topGrad.addColorStop(1, 'rgba(6, 19, 31, 0)');
    ctx.fillStyle = topGrad;
    ctx.fillRect(0, 0, width, height * 0.22);

    // Top-left crisp WATERHOLIC droplet watermark
    const pad = Math.round(width * 0.045);
    ctx.fillStyle = 'rgba(245, 250, 253, 0.92)';
    ctx.font = `600 ${Math.round(width * 0.022)}px "Plus Jakarta Sans", "IBM Plex Sans", sans-serif`;
    ctx.letterSpacing = '0.18em';
    ctx.fillText('WATERHOLIC', pad, pad + Math.round(width * 0.02));

    // Kinetic title reveal (enters smoothly from 10% -> 28%, stays crisp, softens near end)
    const textIn = easeOutCubic(Math.max(0, Math.min(1, (p - 0.08) / 0.22)));
    const textOut = p > 0.88 ? Math.max(0, 1 - (p - 0.88) / 0.12) : 1;
    const textAlpha = textIn * textOut;
    const slideY = (1 - textIn) * 28;

    ctx.globalAlpha = textAlpha;
    // Accent hairline rule
    ctx.fillStyle = choreography.accentHex || '#38BDF8';
    ctx.fillRect(pad, height - pad * 2.55 + slideY, 44 * textIn, 3);

    // Headline
    ctx.fillStyle = '#F8FCFF';
    const titleSize = aspectRatio === '16:9' ? 46 : 38;
    ctx.font = `600 ${titleSize}px "Plus Jakarta Sans", "IBM Plex Sans", sans-serif`;
    ctx.fillText(
      choreography.headline.toUpperCase(),
      pad,
      height - pad * 1.55 + slideY,
      width - pad * 2
    );

    // Subline
    ctx.fillStyle = 'rgba(226, 240, 252, 0.88)';
    const subSize = aspectRatio === '16:9' ? 21 : 19;
    ctx.font = `400 ${subSize}px "IBM Plex Sans", sans-serif`;
    ctx.fillText(
      choreography.subline,
      pad,
      height - pad * 0.92 + slideY,
      width - pad * 2
    );

    // Progress hairline along very bottom
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.fillRect(0, height - 4, width, 4);
    ctx.fillStyle = choreography.accentHex || '#38BDF8';
    ctx.fillRect(0, height - 4, width * p, 4);

    ctx.restore();
  };

  return new Promise((resolve, reject) => {
    recorder.onerror = () => {
      reject(new Error('Motion video encoding failed.'));
    };
    recorder.onstop = () => {
      stream.getTracks().forEach((t) => t.stop());
      const blob = new Blob(chunks, { type: supportedMime });
      const videoUrl = URL.createObjectURL(blob);
      resolve({ videoUrl, blob, mimeType: supportedMime });
    };

    recorder.start(100);
    const startTime = performance.now();

    const step = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / durationMs);
      drawFrame(progress);
      onProgress?.(Math.round(progress * 100));

      if (elapsed < durationMs) {
        requestAnimationFrame(step);
      } else {
        drawFrame(1);
        onProgress?.(100);
        setTimeout(() => {
          if (recorder.state !== 'inactive') {
            recorder.stop();
          }
        }, 120);
      }
    };

    requestAnimationFrame(step);
  });
}
