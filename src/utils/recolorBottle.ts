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

// Precomputed sRGB -> Linear LUT for fast CIE Lab conversion
const SRGB_TO_LINEAR = new Float32Array(256);
for (let i = 0; i < 256; i += 1) {
  const c = i / 255;
  SRGB_TO_LINEAR[i] = c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

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

function labF(t: number): number {
  return t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116;
}

function rgbToLab(r: number, g: number, b: number): [number, number, number] {
  const rl = SRGB_TO_LINEAR[r];
  const gl = SRGB_TO_LINEAR[g];
  const bl = SRGB_TO_LINEAR[b];

  // D65 reference white
  const x = (rl * 0.4124564 + gl * 0.3575761 + bl * 0.1804375) / 0.95047;
  const y = rl * 0.2126729 + gl * 0.7151522 + bl * 0.072175;
  const z = (rl * 0.0193339 + gl * 0.119192 + bl * 0.9503041) / 1.08883;

  const fx = labF(x);
  const fy = labF(y);
  const fz = labF(z);

  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}

function hueDistance(h1: number, h2: number): number {
  const d = Math.abs(h1 - h2);
  return d > 0.5 ? 1 - d : d;
}

function medianOf(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = values.slice().sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

/**
 * Separable 3x3 box blur on a Float32Array mask in [0..1].
 */
function blurMask1(src: Float32Array, w: number, h: number): Float32Array {
  const temp = new Float32Array(w * h);
  const dst = new Float32Array(w * h);

  for (let y = 0; y < h; y += 1) {
    const row = y * w;
    for (let x = 0; x < w; x += 1) {
      const xm = x > 0 ? x - 1 : 0;
      const xp = x + 1 < w ? x + 1 : w - 1;
      temp[row + x] = (src[row + xm] + src[row + x] + src[row + xp]) / 3;
    }
  }

  for (let y = 0; y < h; y += 1) {
    const ym = y > 0 ? y - 1 : 0;
    const yp = y + 1 < h ? y + 1 : h - 1;
    const rowM = ym * w;
    const row = y * w;
    const rowP = yp * w;
    for (let x = 0; x < w; x += 1) {
      dst[row + x] = (temp[rowM + x] + temp[row + x] + temp[rowP + x]) / 3;
    }
  }

  return dst;
}

/**
 * Computes an edge-locked, chromaticity-locked bottle-only foreground mask via
 * CIE Lab color space + Sobel edge barriers + inside-out region growing, then
 * recolors ONLY the vessel body in-place on `imageData` while leaving every
 * nearby surface, shadow, table reflection, prop, and backdrop 100% untouched.
 */
export function recolorBottleImageData(
  imageData: ImageData,
  finish: BottleFinishSpec
): void {
  const { width: w, height: h, data } = imageData;
  const total = w * h;
  if (w < 16 || h < 16) return;

  // 1. Precompute CIE Lab channels for every pixel
  const labL = new Float32Array(total);
  const labA = new Float32Array(total);
  const labB = new Float32Array(total);
  const chroma = new Float32Array(total);

  for (let i = 0; i < total; i += 1) {
    const pi = i * 4;
    const [L, a, b] = rgbToLab(data[pi], data[pi + 1], data[pi + 2]);
    labL[i] = L;
    labA[i] = a;
    labB[i] = b;
    chroma[i] = Math.hypot(a, b);
  }

  // 2. Compute perceptual Sobel edge map (combined luminance + chrominance)
  const gradMag = new Float32Array(total);
  const gradX = new Float32Array(total);
  const gradY = new Float32Array(total);

  for (let y = 1; y < h - 1; y += 1) {
    const r0 = (y - 1) * w;
    const r1 = y * w;
    const r2 = (y + 1) * w;
    for (let x = 1; x < w - 1; x += 1) {
      const i00 = r0 + x - 1;
      const i01 = r0 + x;
      const i02 = r0 + x + 1;
      const i10 = r1 + x - 1;
      const i12 = r1 + x + 1;
      const i20 = r2 + x - 1;
      const i21 = r2 + x;
      const i22 = r2 + x + 1;

      const gxL = -labL[i00] + labL[i02] - 2 * labL[i10] + 2 * labL[i12] - labL[i20] + labL[i22];
      const gyL = -labL[i00] - 2 * labL[i01] - labL[i02] + labL[i20] + 2 * labL[i21] + labL[i22];

      const gxa = -labA[i00] + labA[i02] - 2 * labA[i10] + 2 * labA[i12] - labA[i20] + labA[i22];
      const gya = -labA[i00] - 2 * labA[i01] - labA[i02] + labA[i20] + 2 * labA[i21] + labA[i22];

      const gxb = -labB[i00] + labB[i02] - 2 * labB[i10] + 2 * labB[i12] - labB[i20] + labB[i22];
      const gyb = -labB[i00] - 2 * labB[i01] - labB[i02] + labB[i20] + 2 * labB[i21] + labB[i22];

      const gxAll = Math.hypot(gxL, gxa * 1.4, gxb * 1.4) * 0.25;
      const gyAll = Math.hypot(gyL, gya * 1.4, gyb * 1.4) * 0.25;

      const idx = r1 + x;
      gradX[idx] = gxAll;
      gradY[idx] = gyAll;
      gradMag[idx] = Math.hypot(gxAll, gyAll);
    }
  }

  // 3. Build compact border background samples (left, right, top outer margins) + row RGB bg for glass refraction
  const bgSamplesL: number[] = [];
  const bgSamplesA: number[] = [];
  const bgSamplesB: number[] = [];
  const sampleStepY = Math.max(4, Math.floor(h / 16));
  const sampleStepX = Math.max(4, Math.floor(w / 16));

  for (let y = 4; y < h - 4; y += sampleStepY) {
    const li = y * w + Math.min(w - 1, Math.round(w * 0.03));
    bgSamplesL.push(labL[li]);
    bgSamplesA.push(labA[li]);
    bgSamplesB.push(labB[li]);

    const ri = y * w + Math.max(0, Math.round(w * 0.97));
    bgSamplesL.push(labL[ri]);
    bgSamplesA.push(labA[ri]);
    bgSamplesB.push(labB[ri]);
  }
  for (let x = 4; x < w - 4; x += sampleStepX) {
    const ti = Math.min(h - 1, Math.round(h * 0.03)) * w + x;
    bgSamplesL.push(labL[ti]);
    bgSamplesA.push(labA[ti]);
    bgSamplesB.push(labB[ti]);
  }

  const minBgAbDist = (a: number, b: number): number => {
    let best = 999;
    for (let k = 0; k < bgSamplesA.length; k += 1) {
      const d = Math.hypot(a - bgSamplesA[k], b - bgSamplesB[k]);
      if (d < best) best = d;
    }
    return best;
  };

  // Row-interpolated RGB background (used strictly for clear-glass refraction)
  const stripW = Math.max(4, Math.round(w * 0.04));
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
  const getRowBg = (x: number, y: number): [number, number, number] => {
    const t = w > 1 ? x / (w - 1) : 0;
    return [
      leftR[y] + (rightR[y] - leftR[y]) * t,
      leftG[y] + (rightG[y] - leftG[y]) * t,
      leftB[y] + (rightB[y] - leftB[y]) * t,
    ];
  };

  // 4. Locate the true bottle body interior anchor (supports both centered & off-center bottles)
  const scanStep = Math.max(3, Math.round(Math.min(w, h) / 72));
  const xMinScan = Math.round(w * 0.22);
  const xMaxScan = Math.round(w * 0.78);
  const yMinScan = Math.round(h * 0.36);
  const yMaxScan = Math.round(h * 0.78);
  const vOff = Math.round(h * 0.11);

  let bestScore = -1;
  let seedX = Math.round(w * 0.5);
  let seedY = Math.round(h * 0.58);

  for (let y = yMinScan; y <= yMaxScan; y += scanStep) {
    for (let x = xMinScan; x <= xMaxScan; x += scanStep) {
      const idx = y * w + x;
      const g = gradMag[idx];
      const L = labL[idx];
      if (g > 18 || L < 12 || L > 89) continue;

      const a = labA[idx];
      const b = labB[idx];
      const c = chroma[idx];

      // Vertical cylinder continuity: check pixels above and below at same x
      const yUp = Math.max(2, y - vOff);
      const yDn = Math.min(h - 3, y + vOff);
      const idxUp = yUp * w + x;
      const idxDn = yDn * w + x;
      const abUp = Math.hypot(a - labA[idxUp], b - labB[idxUp]);
      const abDn = Math.hypot(a - labA[idxDn], b - labB[idxDn]);
      const lUp = Math.abs(L - labL[idxUp]);
      const lDn = Math.abs(L - labL[idxDn]);

      // Reject regions that aren't vertically cohesive (like table edges, horizons, laptops)
      const vertCohesion =
        clamp01(1 - Math.max(abUp, abDn) / 14) * clamp01(1 - Math.max(lUp, lDn) / 28);
      if (vertCohesion < 0.22) continue;

      const bgDistinct = Math.min(40, minBgAbDist(a, b));
      const smoothBonus = clamp01(1 - g / 18);
      const centerBias = 1 - 0.38 * Math.abs(x / w - 0.5);
      const chromaBonus = Math.min(34, c) * 1.45;

      const score =
        (bgDistinct * 1.65 + chromaBonus + 6) * vertCohesion * (0.65 + 0.35 * smoothBonus) * centerBias;

      if (score > bestScore) {
        bestScore = score;
        seedX = x;
        seedY = y;
      }
    }
  }

  // Refine bottle body core chromaticity around (seedX, seedY)
  const patchRx = Math.max(4, Math.round(w * 0.04));
  const patchRy = Math.max(6, Math.round(h * 0.09));
  const seedIdx = seedY * w + seedX;
  const sA0 = labA[seedIdx];
  const sB0 = labB[seedIdx];

  const coreAs: number[] = [];
  const coreBs: number[] = [];
  const coreLs: number[] = [];
  const coreRs: number[] = [];
  const coreGs: number[] = [];
  const coreBlues: number[] = [];

  for (let y = Math.max(2, seedY - patchRy); y <= Math.min(h - 3, seedY + patchRy); y += 1) {
    for (let x = Math.max(2, seedX - patchRx); x <= Math.min(w - 3, seedX + patchRx); x += 1) {
      const idx = y * w + x;
      if (gradMag[idx] > 20 || labL[idx] > 88 || labL[idx] < 10) continue;
      if (Math.hypot(labA[idx] - sA0, labB[idx] - sB0) <= 10) {
        coreLs.push(labL[idx]);
        coreAs.push(labA[idx]);
        coreBs.push(labB[idx]);
        const pi = idx * 4;
        coreRs.push(data[pi]);
        coreGs.push(data[pi + 1]);
        coreBlues.push(data[pi + 2]);
      }
    }
  }

  const coreA = coreAs.length > 0 ? medianOf(coreAs) : sA0;
  const coreB = coreBs.length > 0 ? medianOf(coreBs) : sB0;
  const coreL = coreLs.length > 0 ? medianOf(coreLs) : labL[seedIdx];
  const coreChroma = Math.hypot(coreA, coreB);
  const coreR = coreRs.length > 0 ? medianOf(coreRs) : data[seedIdx * 4];
  const coreG = coreGs.length > 0 ? medianOf(coreGs) : data[seedIdx * 4 + 1];
  const coreBlue = coreBlues.length > 0 ? medianOf(coreBlues) : data[seedIdx * 4 + 2];
  const [coreH, coreS] = rgbToHsl(coreR, coreG, coreBlue);

  // 5. Inside-out Edge-Locked Region Growing (strictly stops at bottle walls, contact line & cap seam)
  const visited = new Uint8Array(total);
  const maskBin = new Uint8Array(total);
  const queue = new Int32Array(total);
  let qHead = 0;
  let qTail = 0;

  const enqueue = (idx: number) => {
    if (visited[idx]) return;
    visited[idx] = 1;
    maskBin[idx] = 1;
    queue[qTail] = idx;
    qTail += 1;
  };

  const isChromaticBottle = coreChroma >= 11 && coreS >= 0.14;

  // For neutral/metallic bottles (titanium, steel, matte black/white), detect crisp cylindrical silhouette bounds first
  let boundLeft = Math.max(2, Math.round(seedX - w * 0.24));
  let boundRight = Math.min(w - 3, Math.round(seedX + w * 0.24));
  let boundTop = Math.round(h * 0.12);
  let boundBottom = Math.round(h * 0.93);

  if (!isChromaticBottle) {
    const leftEdges: number[] = [];
    const rightEdges: number[] = [];
    const yStart = Math.round(h * 0.36);
    const yEnd = Math.round(h * 0.78);
    const maxScanW = Math.round(w * 0.26);

    for (let y = yStart; y <= yEnd; y += 2) {
      let bestLx = -1;
      let bestLg = 0;
      for (let dx = 10; dx <= maxScanW; dx += 1) {
        const lx = seedX - dx;
        if (lx < 2) break;
        const g = gradX[y * w + lx];
        if (g > 16 && g > bestLg) {
          bestLg = g;
          bestLx = lx;
          if (g > 32) break;
        }
      }
      if (bestLx >= 0) leftEdges.push(bestLx);

      let bestRx = -1;
      let bestRg = 0;
      for (let dx = 10; dx <= maxScanW; dx += 1) {
        const rx = seedX + dx;
        if (rx >= w - 2) break;
        const g = gradX[y * w + rx];
        if (g > 16 && g > bestRg) {
          bestRg = g;
          bestRx = rx;
          if (g > 32) break;
        }
      }
      if (bestRx >= 0) rightEdges.push(bestRx);
    }

    if (leftEdges.length >= 6 && rightEdges.length >= 6) {
      boundLeft = Math.max(2, Math.round(medianOf(leftEdges)) - 2);
      boundRight = Math.min(w - 3, Math.round(medianOf(rightEdges)) + 2);
    }

    // Detect bottom table contact line along the bottle center column
    const botEdges: number[] = [];
    const colStart = Math.max(boundLeft + 4, seedX - Math.round((boundRight - boundLeft) * 0.25));
    const colEnd = Math.min(boundRight - 4, seedX + Math.round((boundRight - boundLeft) * 0.25));
    for (let x = colStart; x <= colEnd; x += 3) {
      let bestBy = -1;
      let bestBg = 0;
      for (let y = Math.round(h * 0.68); y <= Math.round(h * 0.96); y += 1) {
        const g = gradY[y * w + x];
        if (g > 15 && g > bestBg) {
          bestBg = g;
          bestBy = y;
        }
      }
      if (bestBy >= 0) botEdges.push(bestBy);
    }
    if (botEdges.length >= 4) {
      boundBottom = Math.min(h - 3, Math.round(medianOf(botEdges)) + 2);
    }

    // Detect top shoulder/lid boundary
    const topEdges: number[] = [];
    for (let x = colStart; x <= colEnd; x += 3) {
      for (let y = Math.round(h * 0.44); y >= Math.round(h * 0.08); y -= 1) {
        const g = gradY[y * w + x];
        if (g > 24) {
          topEdges.push(y);
          break;
        }
      }
    }
    if (topEdges.length >= 4) {
      boundTop = Math.max(2, Math.round(medianOf(topEdges)) - 4);
    }
  }

  // Seed vertical core band inside the bottle (above and below the white WATERHOLIC logo)
  const seedBandHalfW = Math.max(3, Math.round(w * 0.03));
  const seedYTop = isChromaticBottle ? Math.round(h * 0.16) : Math.max(boundTop + 4, Math.round(h * 0.28));
  const seedYBot = isChromaticBottle ? Math.round(h * 0.89) : Math.min(boundBottom - 4, Math.round(h * 0.86));

  for (let y = seedYTop; y <= seedYBot; y += 1) {
    for (let x = Math.max(2, seedX - seedBandHalfW); x <= Math.min(w - 3, seedX + seedBandHalfW); x += 1) {
      const idx = y * w + x;
      if (gradMag[idx] > 22) continue;
      const dAb = Math.hypot(labA[idx] - coreA, labB[idx] - coreB);
      if (isChromaticBottle) {
        if (dAb <= 10.5 && chroma[idx] >= coreChroma * 0.45 && labL[idx] > 10 && labL[idx] < 89) {
          enqueue(idx);
        }
      } else {
        if (dAb <= 7.5 && chroma[idx] < 13 && Math.abs(labL[idx] - coreL) < 28) {
          enqueue(idx);
        }
      }
    }
  }

  // Guarantee at least the primary seed pixel is enqueued
  if (qTail === 0) {
    enqueue(seedIdx);
  }

  const dirs = [-1, 1, -w, w];
  const maxAbAllowed = isChromaticBottle
    ? Math.max(12.5, Math.min(20, coreChroma * 0.48))
    : 9.5;
  const minChromaAllowed = isChromaticBottle ? Math.max(7.5, coreChroma * 0.34) : 0;
  const minSatAllowed = isChromaticBottle ? Math.max(0.09, coreS * 0.34) : 0;

  while (qHead < qTail) {
    const cur = queue[qHead];
    qHead += 1;
    const cx = cur % w;
    const cy = (cur - cx) / w;
    const cL = labL[cur];
    const cA = labA[cur];
    const cB = labB[cur];

    for (let d = 0; d < 4; d += 1) {
      const nxt = cur + dirs[d];
      if (nxt < 0 || nxt >= total || visited[nxt]) continue;
      const nx = nxt % w;
      const ny = (nxt - nx) / w;
      if (Math.abs(nx - cx) + Math.abs(ny - cy) !== 1) continue;
      if (nx <= 1 || nx >= w - 2 || ny <= 1 || ny >= h - 2) continue;

      if (!isChromaticBottle) {
        if (nx < boundLeft || nx > boundRight || ny < boundTop || ny > boundBottom) continue;
      } else {
        // Hard horizontal safety envelope around discovered bottle center (allows tumbler handles too)
        if (Math.abs(nx - seedX) > w * 0.34) continue;
      }

      const g = gradMag[nxt];
      const nL = labL[nxt];
      const nA = labA[nxt];
      const nB = labB[nxt];

      const stepL = Math.abs(nL - cL);
      const stepAb = Math.hypot(nA - cA, nB - cB);
      const stepLab = Math.hypot(stepL * 0.85, stepAb * 1.25);

      if (isChromaticBottle) {
        // Hard silhouette & contact-shadow barrier
        if (g > 46 || stepLab > 20 || stepAb > 11) continue;
        const dAbCore = Math.hypot(nA - coreA, nB - coreB);
        if (dAbCore > maxAbAllowed) continue;
        if (chroma[nxt] < minChromaAllowed) continue;

        const npi = nxt * 4;
        const [nh, ns] = rgbToHsl(data[npi], data[npi + 1], data[npi + 2]);
        if (ns < minSatAllowed) continue;
        if (hueDistance(nh, coreH) > 0.068) continue;

        // Prevent leaking into a similar-tinted background near margins
        if (Math.abs(nx - seedX) > w * 0.14 && dAbCore > minBgAbDist(nA, nB) + 4) {
          continue;
        }

        enqueue(nxt);
      } else {
        // Neutral/metallic bottle: locked inside detected vertical walls & bottom rim
        if (g > 38 || stepLab > 17) continue;
        if (chroma[nxt] > 14) continue;
        const dAbCore = Math.hypot(nA - coreA, nB - coreB);
        if (dAbCore > maxAbAllowed) continue;
        enqueue(nxt);
      }
    }
  }

  // 6. Measure clean torso bounds & slice off any accidental horizontal leaks (e.g. shadow/edge bleed)
  const rowWidths: number[] = [];
  const rowLefts: number[] = [];
  const rowRights: number[] = [];

  const torsoY0 = Math.round(h * 0.42);
  const torsoY1 = Math.round(h * 0.78);
  for (let y = torsoY0; y <= torsoY1; y += 1) {
    let minX = w;
    let maxX = -1;
    const row = y * w;
    for (let x = 0; x < w; x += 1) {
      if (maskBin[row + x]) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
      }
    }
    if (maxX > minX + 12) {
      rowLefts.push(minX);
      rowRights.push(maxX);
      rowWidths.push(maxX - minX);
    }
  }

  if (rowWidths.length >= 8) {
    const medLeft = medianOf(rowLefts);
    const medRight = medianOf(rowRights);
    const medW = Math.max(24, medianOf(rowWidths));

    // Near the bottom base (table contact) and top shoulder/cap, enforce strict torso horizontal envelope
    // so shadows, marble reflections, or warm stone ledges right next to the bottle can never bleed in
    const strictPad = Math.max(5, Math.round(medW * 0.08));
    const handlePad = Math.round(medW * 0.56);

    for (let y = 0; y < h; y += 1) {
      const row = y * w;
      const inMidHandleBand = isChromaticBottle && y > h * 0.30 && y < h * 0.72;
      const minAllowedX = Math.max(0, Math.round(medLeft - (inMidHandleBand ? handlePad : strictPad)));
      const maxAllowedX = Math.min(w - 1, Math.round(medRight + (inMidHandleBand ? handlePad : strictPad)));

      for (let x = 0; x < w; x += 1) {
        if (maskBin[row + x] && (x < minAllowedX || x > maxAllowedX)) {
          maskBin[row + x] = 0;
        }
      }
    }

    // Fill tiny 1-2px enclosed interior holes (specularity noise inside the vessel) without expanding outward
    for (let y = 2; y < h - 2; y += 1) {
      const row = y * w;
      let rowMinX = w;
      let rowMaxX = -1;
      for (let x = Math.max(0, Math.round(medLeft)); x <= Math.min(w - 1, Math.round(medRight)); x += 1) {
        if (maskBin[row + x]) {
          if (x < rowMinX) rowMinX = x;
          if (x > rowMaxX) rowMaxX = x;
        }
      }
      if (rowMaxX > rowMinX + 10) {
        // Fill small dark/highlight interior gaps (not the white WATERHOLIC logo, which stays protected below)
        for (let x = rowMinX + 1; x < rowMaxX; x += 1) {
          const idx = row + x;
          if (!maskBin[idx]) {
            const dAb = Math.hypot(labA[idx] - coreA, labB[idx] - coreB);
            if (dAb <= maxAbAllowed * 1.15 && (!isChromaticBottle || chroma[idx] >= minChromaAllowed * 0.7)) {
              maskBin[idx] = 1;
            }
          }
        }
      }
    }
  }

  // 7. Zero-outward-halo edge anti-aliasing:
  // Pixels strictly outside `maskBin` stay EXACTLY 0.0 (ZERO color bleed onto adjacent surfaces!),
  // while the 1-pixel inner contour smoothly feathers for crisp, natural photographic edges.
  const rawFloat = new Float32Array(total);
  for (let i = 0; i < total; i += 1) {
    rawFloat[i] = maskBin[i];
  }
  const blurred = blurMask1(rawFloat, w, h);
  const softFg = new Float32Array(total);
  for (let i = 0; i < total; i += 1) {
    softFg[i] = maskBin[i] ? blurred[i] : 0;
  }

  // 8. Target finish color in HSL
  const [tr, tg, tb] = hexToRgb(finish.hex);
  const [targetH, targetS, targetL] = rgbToHsl(tr, tg, tb);
  const isDarkTarget = targetL < 0.22 && targetS < 0.22;
  const isMetallicLight = targetS < 0.14 && targetL > 0.62;
  const isTransparent = Boolean(finish.isTransparent);

  // 9. Recolor ONLY the verified bottle pixels while protecting crisp white WATERHOLIC logo,
  // specular highlights, and black caps/collars
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const idx = y * w + x;
      const fg = softFg[idx];
      if (fg <= 0.02) continue;

      const pi = idx * 4;
      const r = data[pi];
      const g = data[pi + 1];
      const b = data[pi + 2];

      const [, origS, origL] = rgbToHsl(r, g, b);

      let paintWeight = fg;

      // Protect crisp white WATERHOLIC logo lettering & pure specular highlights
      if (origL > 0.80 && origS < 0.16) {
        paintWeight *= clamp01(1 - (origL - 0.80) / 0.12);
      }

      // Protect matte black chug caps/collars in the upper cap zone & deep crevices
      if (!isDarkTarget && origS < 0.18) {
        if (y < h * 0.29 && origL < 0.25) {
          paintWeight *= clamp01((origL - 0.1) / 0.15);
        } else if (origL < 0.07) {
          paintWeight *= clamp01(origL / 0.07);
        }
      }

      if (paintWeight <= 0.015) continue;

      let outR: number;
      let outG: number;
      let outB: number;

      if (isTransparent) {
        const glassL = clamp01(origL * 0.58 + 0.34);
        const glassS = clamp01(origS * 0.1 + 0.08);
        const [gr, gg, gb] = hslToRgb(202 / 360, glassS, glassL);
        const [br, bg, bb] = getRowBg(x, y);
        const edgeBoost = clamp01((1 - fg) * 2.5);
        const seeThrough = 0.34 * (1 - edgeBoost * 0.7);
        outR = gr * (1 - seeThrough) + br * seeThrough;
        outG = gg * (1 - seeThrough) + bg * seeThrough;
        outB = gb * (1 - seeThrough) + bb * seeThrough;
      } else if (isDarkTarget) {
        const darkL = clamp01(origL * 0.38 + 0.05 + Math.pow(origL, 4) * 0.28);
        const darkS = clamp01(targetS * 0.45);
        [outR, outG, outB] = hslToRgb(targetH, darkS, darkL);
      } else if (isMetallicLight) {
        const silverL = clamp01(origL * 0.72 + 0.21);
        const silverS = clamp01(targetS * 0.65);
        [outR, outG, outB] = hslToRgb(targetH, silverS, silverL);
      } else {
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
 * Background, table, shadows, and surrounding props stay 100% untouched.
 */
export function getRecoloredBottleUrl(
  src: string,
  finish: BottleFinishSpec,
  maxDimension = 560
): Promise<string> {
  if (!finish.filter) {
    return Promise.resolve(src);
  }

  const cacheKey = `v2::${src}::${finish.id}::${finish.hex}::${finish.isTransparent ? '1' : '0'}::${maxDimension}`;
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
