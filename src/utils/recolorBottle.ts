export interface BottleFinishSpec {
  id: string;
  hex: string;
  isTransparent?: boolean;
  /** Present on alternate finishes that differ from the base photograph */
  filter?: string;
}

const MAX_CACHE_ENTRIES = 160;
const recolorCache = new Map<string, string>();
const inflightMap = new Map<string, Promise<string>>();

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

function hexToRgb(hex: string): [number, number, number] {
  const cleaned = hex.replace('#', '').trim();
  const full =
    cleaned.length === 3
      ? cleaned
          .split('')
          .map((c) => c + c)
          .join('')
      : cleaned.padEnd(6, '0').slice(0, 6);
  const num = parseInt(full, 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  const d = max - min;

  if (d === 0) return [0, 0, l];
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === rn) {
    h = (gn - bn) / d + (gn < bn ? 6 : 0);
  } else if (max === gn) {
    h = (bn - rn) / d + 2;
  } else {
    h = (rn - gn) / d + 4;
  }
  return [h / 6, s, l];
}

function hue2rgb(p: number, q: number, tInput: number): number {
  let t = tInput;
  if (t < 0) t += 1;
  if (t > 1) t -= 1;
  if (t < 1 / 6) return p + (q - p) * 6 * t;
  if (t < 1 / 2) return q;
  if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
  return p;
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  if (s <= 0.0001) {
    const v = Math.round(clamp01(l) * 255);
    return [v, v, v];
  }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return [
    Math.round(clamp01(hue2rgb(p, q, h + 1 / 3)) * 255),
    Math.round(clamp01(hue2rgb(p, q, h)) * 255),
    Math.round(clamp01(hue2rgb(p, q, h - 1 / 3)) * 255),
  ];
}

function colorDist(
  r1: number,
  g1: number,
  b1: number,
  r2: number,
  g2: number,
  b2: number
): number {
  const dr = r1 - r2;
  const dg = g1 - g2;
  const db = b1 - b2;
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

function pixelSaturation(r: number, g: number, b: number): number {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  if (max === 0) return 0;
  return (max - min) / max;
}

/**
 * Separable box blur on a Float32Array mask in [0..1] for smooth anti-aliased bottle edges.
 */
function blurMask(
  src: Float32Array,
  w: number,
  h: number,
  radius: number
): Float32Array {
  const temp = new Float32Array(w * h);
  const dst = new Float32Array(w * h);
  const diam = radius * 2 + 1;

  // Horizontal pass
  for (let y = 0; y < h; y += 1) {
    const rowOff = y * w;
    let acc = 0;
    for (let k = -radius; k <= radius; k += 1) {
      const cx = k < 0 ? 0 : k >= w ? w - 1 : k;
      acc += src[rowOff + cx];
    }
    for (let x = 0; x < w; x += 1) {
      temp[rowOff + x] = acc / diam;
      const outX = x - radius < 0 ? 0 : x - radius;
      const inX = x + radius + 1 >= w ? w - 1 : x + radius + 1;
      acc += src[rowOff + inX] - src[rowOff + outX];
    }
  }

  // Vertical pass
  for (let x = 0; x < w; x += 1) {
    let acc = 0;
    for (let k = -radius; k <= radius; k += 1) {
      const cy = k < 0 ? 0 : k >= h ? h - 1 : k;
      acc += temp[cy * w + x];
    }
    for (let y = 0; y < h; y += 1) {
      dst[y * w + x] = acc / diam;
      const outY = y - radius < 0 ? 0 : y - radius;
      const inY = y + radius + 1 >= h ? h - 1 : y + radius + 1;
      acc += temp[inY * w + x] - temp[outY * w + x];
    }
  }

  return dst;
}

/**
 * Computes a foreground bottle mask & row-interpolated studio background model,
 * then recolors ONLY the foreground product body in-place on `imageData` while
 * leaving every background pixel (wall, marble, wood, lighting, shadows) 100% untouched.
 */
export function recolorBottleImageData(
  imageData: ImageData,
  finish: BottleFinishSpec
): void {
  const { width: w, height: h, data } = imageData;
  const total = w * h;

  // 1. Build per-row studio background model from left & right border strips
  const stripW = Math.max(5, Math.round(w * 0.055));
  const leftR = new Float32Array(h);
  const leftG = new Float32Array(h);
  const leftB = new Float32Array(h);
  const rightR = new Float32Array(h);
  const rightG = new Float32Array(h);
  const rightB = new Float32Array(h);

  for (let y = 0; y < h; y += 1) {
    let lr = 0;
    let lg = 0;
    let lb = 0;
    let rr = 0;
    let rg = 0;
    let rb = 0;
    for (let dx = 0; dx < stripW; dx += 1) {
      const li = (y * w + dx) * 4;
      lr += data[li];
      lg += data[li + 1];
      lb += data[li + 2];

      const ri = (y * w + (w - 1 - dx)) * 4;
      rr += data[ri];
      rg += data[ri + 1];
      rb += data[ri + 2];
    }
    leftR[y] = lr / stripW;
    leftG[y] = lg / stripW;
    leftB[y] = lb / stripW;
    rightR[y] = rr / stripW;
    rightG[y] = rg / stripW;
    rightB[y] = rb / stripW;
  }

  // Smooth row background vertically so slight stone grain doesn't jitter
  const smoothRow = (arr: Float32Array): Float32Array => {
    const out = new Float32Array(h);
    const rad = 4;
    for (let y = 0; y < h; y += 1) {
      let sum = 0;
      let cnt = 0;
      for (let ky = -rad; ky <= rad; ky += 1) {
        const yy = y + ky;
        if (yy >= 0 && yy < h) {
          sum += arr[yy];
          cnt += 1;
        }
      }
      out[y] = sum / cnt;
    }
    return out;
  };

  const bgLR = smoothRow(leftR);
  const bgLG = smoothRow(leftG);
  const bgLB = smoothRow(leftB);
  const bgRR = smoothRow(rightR);
  const bgRG = smoothRow(rightG);
  const bgRB = smoothRow(rightB);

  const getRowBg = (x: number, y: number): [number, number, number] => {
    const t = w > 1 ? x / (w - 1) : 0;
    return [
      bgLR[y] + (bgRR[y] - bgLR[y]) * t,
      bgLG[y] + (bgRG[y] - bgLG[y]) * t,
      bgLB[y] + (bgRB[y] - bgLB[y]) * t,
    ];
  };

  // 2. Perimeter-seeded BFS flood fill to detect background pixels connected to image edges
  const isBg = new Uint8Array(total);
  const queue = new Int32Array(total);
  let qHead = 0;
  let qTail = 0;

  const trySeed = (x: number, y: number) => {
    const idx = y * w + x;
    if (isBg[idx]) return;
    isBg[idx] = 1;
    queue[qTail] = idx;
    qTail += 1;
  };

  // Seed outer left, right, and top edges + bottom corners (keep bottom center unseeded if bottle touches bottom)
  for (let y = 0; y < h; y += 1) {
    trySeed(0, y);
    trySeed(w - 1, y);
  }
  for (let x = 0; x < w; x += 1) {
    trySeed(x, 0);
    if (x < w * 0.24 || x > w * 0.76) {
      trySeed(x, h - 1);
    }
  }

  const dirs = [-1, 1, -w, w];

  while (qHead < qTail) {
    const cur = queue[qHead];
    qHead += 1;
    const cx = cur % w;
    const cy = (cur - cx) / w;
    const ci = cur * 4;
    const cr = data[ci];
    const cg = data[ci + 1];
    const cb = data[ci + 2];

    for (let d = 0; d < 4; d += 1) {
      const nxt = cur + dirs[d];
      if (nxt < 0 || nxt >= total || isBg[nxt]) continue;
      const nx = nxt % w;
      const ny = (nxt - nx) / w;
      // Prevent horizontal wrap-around across rows
      if (Math.abs(nx - cx) + Math.abs(ny - cy) !== 1) continue;

      const ni = nxt * 4;
      const nr = data[ni];
      const ng = data[ni + 1];
      const nb = data[ni + 2];

      const [br, bg, bb] = getRowBg(nx, ny);
      const distToRowBg = colorDist(nr, ng, nb, br, bg, bb);
      const stepDist = colorDist(nr, ng, nb, cr, cg, cb);
      const satDiff = pixelSaturation(nr, ng, nb) - pixelSaturation(br, bg, bb);

      // Classify as background if it closely matches the local studio backdrop OR smoothly continues it
      const matchesBackdrop =
        (distToRowBg < 36 && stepDist < 24 && satDiff < 0.17) ||
        (distToRowBg < 58 && stepDist < 12 && satDiff < 0.13);

      if (matchesBackdrop) {
        isBg[nxt] = 1;
        queue[qTail] = nxt;
        qTail += 1;
      }
    }
  }

  // Count how much of the image was classified as foreground
  let fgCount = 0;
  for (let i = 0; i < total; i += 1) {
    if (!isBg[i]) fgCount += 1;
  }
  const fgRatio = fgCount / total;

  // 3. Fallback center-subject refinement for busy/outdoor scenes where BFS couldn't sweep the whole backdrop
  const rawMask = new Float32Array(total);
  if (fgRatio <= 0.62) {
    // Clean studio scene: BFS isolated the product silhouette accurately
    for (let i = 0; i < total; i += 1) {
      rawMask[i] = isBg[i] ? 0 : 1;
    }
  } else {
    // Complex lifestyle/outdoor scene: sample the center bottle core color & isolate matching bottle pixels
    let coreR = 0;
    let coreG = 0;
    let coreB = 0;
    let coreCnt = 0;
    const x0 = Math.round(w * 0.42);
    const x1 = Math.round(w * 0.58);
    const y0 = Math.round(h * 0.34);
    const y1 = Math.round(h * 0.72);
    for (let y = y0; y < y1; y += 1) {
      for (let x = x0; x < x1; x += 1) {
        const pi = (y * w + x) * 4;
        const pr = data[pi];
        const pg = data[pi + 1];
        const pb = data[pi + 2];
        const lum = (pr + pg + pb) / 765;
        if (lum > 0.16 && lum < 0.88) {
          coreR += pr;
          coreG += pg;
          coreB += pb;
          coreCnt += 1;
        }
      }
    }
    if (coreCnt > 0) {
      coreR /= coreCnt;
      coreG /= coreCnt;
      coreB /= coreCnt;
    }
    const [coreH, coreS] = rgbToHsl(coreR, coreG, coreB);

    for (let y = 0; y < h; y += 1) {
      for (let x = 0; x < w; x += 1) {
        const idx = y * w + x;
        if (isBg[idx]) {
          rawMask[idx] = 0;
          continue;
        }
        // Soft vertical cylinder zone around centered bottle
        const dx = (x - w * 0.5) / (w * 0.24);
        const dy = (y - h * 0.52) / (h * 0.46);
        const ellipseDist = dx * dx + dy * dy;
        if (ellipseDist > 1.35) {
          rawMask[idx] = 0;
          continue;
        }
        const pi = idx * 4;
        const pr = data[pi];
        const pg = data[pi + 1];
        const pb = data[pi + 2];
        const [ph, ps] = rgbToHsl(pr, pg, pb);
        const hueDelta = Math.min(
          Math.abs(ph - coreH),
          1 - Math.abs(ph - coreH)
        );
        const rgbDelta = colorDist(pr, pg, pb, coreR, coreG, coreB);
        const spatialFade = clamp01(1 - (ellipseDist - 0.85) / 0.5);
        const colorMatch =
          coreS > 0.14
            ? clamp01(1 - (hueDelta - 0.08) / 0.12) *
              clamp01(1 - (rgbDelta - 85) / 80)
            : clamp01(1 - (rgbDelta - 55) / 70);
        rawMask[idx] = spatialFade * colorMatch;
      }
    }
  }

  // Smooth the foreground mask slightly for clean anti-aliased bottle contours
  const softFg = blurMask(rawMask, w, h, 2);

  // 4. Target finish color in HSL
  const [tr, tg, tb] = hexToRgb(finish.hex);
  const [targetH, targetS, targetL] = rgbToHsl(tr, tg, tb);
  const isDarkTarget = targetL < 0.22 && targetS < 0.22;
  const isMetallicLight = targetS < 0.14 && targetL > 0.62;
  const isTransparent = Boolean(finish.isTransparent);

  // 5. Recolor ONLY the bottle foreground pixels while protecting white WATERHOLIC logo,
  // specular highlights, and black caps/collars
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const idx = y * w + x;
      const fg = softFg[idx];
      if (fg <= 0.015) continue;

      const pi = idx * 4;
      const r = data[pi];
      const g = data[pi + 1];
      const b = data[pi + 2];

      const [, origS, origL] = rgbToHsl(r, g, b);

      // Protect crisp white WATERHOLIC logo lettering & bright specular reflections
      let paintWeight = fg;
      if (origL > 0.84 && origS < 0.16) {
        paintWeight *= clamp01(1 - (origL - 0.84) / 0.11);
      }

      // Protect matte black chug caps/collars in the upper cap zone & pitch-black crevices
      if (!isDarkTarget && origS < 0.18) {
        if (y < h * 0.28 && origL < 0.24) {
          paintWeight *= clamp01((origL - 0.1) / 0.14);
        } else if (origL < 0.07) {
          paintWeight *= clamp01(origL / 0.07);
        }
      }

      // Also softly protect table contact shadows right at the bottom 6% edge
      if (y > h * 0.91 && origL < 0.36 && origS < 0.14) {
        paintWeight *= clamp01((h - y) / (h * 0.09));
      }

      if (paintWeight <= 0.01) continue;

      let outR: number;
      let outG: number;
      let outB: number;

      if (isTransparent) {
        // Optical borosilicate clear-glass effect: cool desaturated glass + subtle see-through refraction
        const glassL = clamp01(origL * 0.58 + 0.34);
        const glassS = clamp01(origS * 0.1 + 0.08);
        const [gr, gg, gb] = hslToRgb(202 / 360, glassS, glassL);
        const [br, bg, bb] = getRowBg(x, y);
        // Stronger see-through in the bottle center, crisper refractive rim near edges
        const edgeBoost = clamp01((1 - fg) * 2.5);
        const seeThrough = 0.34 * (1 - edgeBoost * 0.7);
        outR = gr * (1 - seeThrough) + br * seeThrough;
        outG = gg * (1 - seeThrough) + bg * seeThrough;
        outB = gb * (1 - seeThrough) + bb * seeThrough;
      } else if (isDarkTarget) {
        // Matte Basalt Black: rich deep charcoal while preserving 3D cylindrical highlights
        const darkL = clamp01(origL * 0.38 + 0.05 + Math.pow(origL, 4) * 0.28);
        const darkS = clamp01(targetS * 0.45);
        [outR, outG, outB] = hslToRgb(targetH, darkS, darkL);
      } else if (isMetallicLight) {
        // Glacier Silver / Brushed Steel: clean luminous low-chroma metallic finish
        const silverL = clamp01(origL * 0.72 + 0.21);
        const silverS = clamp01(targetS * 0.65);
        [outR, outG, outB] = hslToRgb(targetH, silverS, silverL);
      } else {
        // Chromatic powder-coat finish (Rose Pink, Ocean Blue, Alpine Sage, Moss, etc.)
        // Preserve 3D cylindrical lighting while mapping midtones toward the target swatch lightness
        const midFactor = 1 - Math.pow(Math.min(1, Math.abs(origL - 0.5) * 1.9), 2);
        const targetShift = (targetL - 0.48) * 0.72;
        const newL = clamp01(origL + targetShift * midFactor);
        const newS = clamp01(targetS * (0.72 + 0.34 * midFactor));
        [outR, outG, outB] = hslToRgb(targetH, newS, newL);
      }

      data[pi] = Math.round(r + (outR - r) * paintWeight);
      data[pi + 1] = Math.round(g + (outG - g) * paintWeight);
      data[pi + 2] = Math.round(b + (outB - b) * paintWeight);
    }
  }
}

/**
 * Generates and caches a bottle-only recolored DataURL for a studio product photo.
 * Background stays 100% untouched.
 */
export function getRecoloredBottleUrl(
  src: string,
  finish: BottleFinishSpec,
  maxDimension = 560
): Promise<string> {
  // Default photographed finish needs zero processing
  if (!finish.filter) {
    return Promise.resolve(src);
  }

  const cacheKey = `${src}::${finish.id}::${finish.hex}::${finish.isTransparent ? '1' : '0'}::${maxDimension}`;
  const cached = recolorCache.get(cacheKey);
  if (cached) return Promise.resolve(cached);

  const pending = inflightMap.get(cacheKey);
  if (pending) return pending;

  const task = new Promise<string>((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const natW = img.naturalWidth || 560;
        const natH = img.naturalHeight || 420;
        const scale = Math.min(1, maxDimension / Math.max(natW, natH));
        const cw = Math.max(1, Math.round(natW * scale));
        const ch = Math.max(1, Math.round(natH * scale));

        const canvas = document.createElement('canvas');
        canvas.width = cw;
        canvas.height = ch;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) {
          resolve(src);
          return;
        }

        ctx.drawImage(img, 0, 0, cw, ch);
        const imgData = ctx.getImageData(0, 0, cw, ch);
        recolorBottleImageData(imgData, finish);
        ctx.putImageData(imgData, 0, 0);

        const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
        if (recolorCache.size >= MAX_CACHE_ENTRIES) {
          const oldestKey = recolorCache.keys().next().value;
          if (oldestKey) recolorCache.delete(oldestKey);
        }
        recolorCache.set(cacheKey, dataUrl);
        resolve(dataUrl);
      } catch {
        // Fallback safely if cross-origin canvas read is restricted
        resolve(src);
      } finally {
        inflightMap.delete(cacheKey);
      }
    };
    img.onerror = () => {
      inflightMap.delete(cacheKey);
      resolve(src);
    };
    img.src = src;
  });

  inflightMap.set(cacheKey, task);
  return task;
}
