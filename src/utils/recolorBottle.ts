export interface BottleFinishSpec {
  id: string;
  name?: string;
  hex: string;
  filter?: string;
  isTransparent?: boolean;
}

const recolorCache = new Map<string, string>();
const inflightMap = new Map<string, Promise<string>>();
const MAX_CACHE_ENTRIES = 80;

function clamp(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v;
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
      : cleaned;
  const num = parseInt(full, 16);
  if (Number.isNaN(num)) return [120, 140, 160];
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) * 0.5;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === rn) h = (gn - bn) / d + (gn < bn ? 6 : 0);
  else if (max === gn) h = (bn - rn) / d + 2;
  else h = (rn - gn) / d + 4;
  return [h / 6, s, l];
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  if (s === 0) {
    const v = Math.round(l * 255);
    return [v, v, v];
  }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const hue2rgb = (t: number): number => {
    let tt = t;
    if (tt < 0) tt += 1;
    if (tt > 1) tt -= 1;
    if (tt < 1 / 6) return p + (q - p) * 6 * tt;
    if (tt < 0.5) return q;
    if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
    return p;
  };
  return [
    Math.round(hue2rgb(h + 1 / 3) * 255),
    Math.round(hue2rgb(h) * 255),
    Math.round(hue2rgb(h - 1 / 3) * 255),
  ];
}

function rgbToLab(r: number, g: number, b: number): [number, number, number] {
  let rn = r / 255;
  let gn = g / 255;
  let bn = b / 255;

  rn = rn > 0.04045 ? Math.pow((rn + 0.055) / 1.055, 2.4) : rn / 12.92;
  gn = gn > 0.04045 ? Math.pow((gn + 0.055) / 1.055, 2.4) : gn / 12.92;
  bn = bn > 0.04045 ? Math.pow((bn + 0.055) / 1.055, 2.4) : bn / 12.92;

  const x = (rn * 0.4124564 + gn * 0.3575761 + bn * 0.1804375) / 0.95047;
  const y = (rn * 0.2126729 + gn * 0.7151522 + bn * 0.072175) / 1.0;
  const z = (rn * 0.0193339 + gn * 0.119192 + bn * 0.9503041) / 1.08883;

  const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  const fx = f(x);
  const fy = f(y);
  const fz = f(z);

  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}

function hueDistance(h1: number, h2: number): number {
  const d = Math.abs(h1 - h2);
  return d > 0.5 ? 1 - d : d;
}

function medianOf(arr: number[]): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

/**
 * Separable 3-tap box blur for smooth inner-edge feathering without outward halos.
 */
function blurMask1(src: Float32Array, w: number, h: number): Float32Array {
  const tmp = new Float32Array(w * h);
  const dst = new Float32Array(w * h);

  for (let y = 0; y < h; y += 1) {
    const row = y * w;
    for (let x = 0; x < w; x += 1) {
      const xm = x > 0 ? x - 1 : 0;
      const xp = x < w - 1 ? x + 1 : w - 1;
      tmp[row + x] = (src[row + xm] + src[row + x] * 2 + src[row + xp]) * 0.25;
    }
  }

  for (let y = 0; y < h; y += 1) {
    const ym = (y > 0 ? y - 1 : 0) * w;
    const y0 = y * w;
    const yp = (y < h - 1 ? y + 1 : h - 1) * w;
    for (let x = 0; x < w; x += 1) {
      dst[y0 + x] = (tmp[ym + x] + tmp[y0 + x] * 2 + tmp[yp + x]) * 0.25;
    }
  }

  return dst;
}

/**
 * Universal Parallel-Wall Vessel Segmentation & Recoloring Engine (v5):
 * 1. Detects the exact twin vertical silhouette walls `[leftX, rightX]` across
 *    upper & lower torso bands using vertical Sobel edge projection + exterior
 *    boundary contrast — works identically on pastel pink, studio blue, matte
 *    black, brushed titanium, hammered copper, tapered tumblers, and off-center shots.
 * 2. Builds a 14-column full-cylinder lighting profile covering both sunlit and
 *    shaded sides so finishes apply 100% uniformly edge-to-edge with zero vertical splits.
 * 3. Tracks upper & lower contours row-by-row, skips metallic neck collars and black
 *    chug lids, traces matching carry-handle loops and side D-handles, and never bleeds
 *    into tables, shadows, walls, or foliage.
 * 4. Protects both crisp white logos and dark engraved logos without mistaking
 *    colored shoulder specular highlights for text.
 */
export function recolorBottleImageData(
  imageData: ImageData,
  finish: BottleFinishSpec
): void {
  const { width: w, height: h, data } = imageData;
  const total = w * h;
  if (w < 16 || h < 16) return;

  // 1. Precompute CIE Lab channels + chroma
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

      const gxAll = Math.hypot(gxL, gxa * 1.45, gxb * 1.45) * 0.25;
      const gyAll = Math.hypot(gyL, gya * 1.45, gyb * 1.45) * 0.25;

      const idx = r1 + x;
      gradX[idx] = gxAll;
      gradY[idx] = gyAll;
      gradMag[idx] = Math.hypot(gxAll, gyAll);
    }
  }

  // 3. Outer border background palette (left, right, top strips) + row RGB bg for clear glass
  const bgSamplesL: number[] = [];
  const bgSamplesA: number[] = [];
  const bgSamplesB: number[] = [];
  const leftBgA: number[] = [];
  const leftBgB: number[] = [];
  const rightBgA: number[] = [];
  const rightBgB: number[] = [];
  const sampleStepY = Math.max(4, Math.floor(h / 18));
  const sampleStepX = Math.max(4, Math.floor(w / 18));

  for (let y = 4; y < h - 4; y += sampleStepY) {
    const li = y * w + Math.min(w - 1, Math.round(w * 0.03));
    bgSamplesL.push(labL[li]);
    bgSamplesA.push(labA[li]);
    bgSamplesB.push(labB[li]);
    leftBgA.push(labA[li]);
    leftBgB.push(labB[li]);
    const ri = y * w + Math.max(0, Math.round(w * 0.97));
    bgSamplesL.push(labL[ri]);
    bgSamplesA.push(labA[ri]);
    bgSamplesB.push(labB[ri]);
    rightBgA.push(labA[ri]);
    rightBgB.push(labB[ri]);
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

  const minSideBgAbDist = (side: 'left' | 'right', a: number, b: number): number => {
    const arrA = side === 'left' ? leftBgA : rightBgA;
    const arrB = side === 'left' ? leftBgB : rightBgB;
    let best = 999;
    for (let k = 0; k < arrA.length; k += 1) {
      const d = Math.hypot(a - arrA[k], b - arrB[k]);
      if (d < best) best = d;
    }
    return best;
  };

  const minBgLabDist = (L: number, a: number, b: number): number => {
    let best = 999;
    for (let k = 0; k < bgSamplesA.length; k += 1) {
      const d = Math.hypot((L - bgSamplesL[k]) * 0.6, a - bgSamplesA[k], b - bgSamplesB[k]);
      if (d < best) best = d;
    }
    return best;
  };

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

  // 4. Universal Twin Vertical Silhouette Wall Pair Detector
  // Finds the exact [leftWall, rightWall] cylinder pair directly from vertical Sobel
  // projections — works equally well on matte black, brushed silver, hammered copper,
  // pastel pink, studio blue, tapered tumblers, and off-center scenes!
  interface WallPair {
    lx: number;
    rx: number;
    score: number;
  }

  const findBestWallPairInBand = (
    y0: number,
    y1: number,
    xSearchMin: number,
    xSearchMax: number,
    checkInternalSplit: boolean
  ): WallPair | null => {
    const rows = Math.max(1, y1 - y0 + 1);
    const colAvgG = new Float32Array(w);
    const colHitFrac = new Float32Array(w);

    for (let x = Math.max(4, xSearchMin); x <= Math.min(w - 5, xSearchMax); x += 1) {
      let sumG = 0;
      let hits = 0;
      for (let y = y0; y <= y1; y += 1) {
        const r = y * w;
        const g = Math.max(gradX[r + x - 1], gradX[r + x], gradX[r + x + 1]);
        sumG += Math.min(48, g);
        if (g >= 5.0) hits += 1;
      }
      colAvgG[x] = sumG / rows;
      colHitFrac[x] = hits / rows;
    }

    // Collect strong vertical edge peak candidates
    const peaks: number[] = [];
    for (let x = Math.max(6, xSearchMin); x <= Math.min(w - 7, xSearchMax); x += 1) {
      const avgG = colAvgG[x];
      const hf = colHitFrac[x];
      if (hf < 0.62 || avgG < 6.0) continue;
      if (
        avgG >= colAvgG[x - 1] &&
        avgG >= colAvgG[x + 1] &&
        avgG >= colAvgG[x - 2] * 0.96 &&
        avgG >= colAvgG[x + 2] * 0.96
      ) {
        // Deduplicate adjacent peaks within 3px (keep stronger one)
        if (peaks.length > 0 && x - peaks[peaks.length - 1] <= 3) {
          if (avgG > colAvgG[peaks[peaks.length - 1]]) {
            peaks[peaks.length - 1] = x;
          }
        } else {
          peaks.push(x);
        }
      }
    }

    const minSpan = Math.round(w * 0.095);
    const maxSpan = Math.round(w * 0.34);
    let bestPair: WallPair | null = null;

    for (let i = 0; i < peaks.length; i += 1) {
      const lx = peaks[i];
      for (let j = i + 1; j < peaks.length; j += 1) {
        const rx = peaks[j];
        const span = rx - lx;
        if (span < minSpan) continue;
        if (span > maxSpan) break;

        const midX = (lx + rx) * 0.5;
        if (midX < w * 0.2 || midX > w * 0.8) continue;

        // If checking the logo-free lower band, penalize pairs that have a giant
        // continuous vertical wall bisecting the middle (e.g. a wall corner between edges)
        let splitPenalty = 1.0;
        if (checkInternalSplit) {
          const innerStart = lx + Math.max(6, Math.round(span * 0.16));
          const innerEnd = rx - Math.max(6, Math.round(span * 0.16));
          let maxInternalWall = 0;
          for (let ix = innerStart; ix <= innerEnd; ix += 1) {
            if (colHitFrac[ix] > 0.82 && colAvgG[ix] > maxInternalWall) {
              maxInternalWall = colAvgG[ix];
            }
          }
          if (maxInternalWall > 14) {
            splitPenalty = 0.45;
          }
        }

        // Measure exterior-vs-interior Lab contrast on BOTH walls
        let leftJump = 0;
        let rightJump = 0;
        let bgDistSum = 0;
        let chromaMax = 0;
        let vertCohesionSum = 0;
        let samples = 0;

        const inOff = Math.max(4, Math.min(8, Math.round(span * 0.08)));
        const outOff = Math.max(6, Math.min(12, Math.round(span * 0.12)));

        for (let y = y0; y <= y1; y += 3) {
          const r = y * w;
          const lIn = Math.min(w - 2, lx + inOff);
          const lOut = Math.max(1, lx - outOff);
          const rIn = Math.max(1, rx - inOff);
          const rOut = Math.min(w - 2, rx + outOff);

          leftJump += Math.hypot(
            (labL[r + lIn] - labL[r + lOut]) * 0.72,
            (labA[r + lIn] - labA[r + lOut]) * 1.35,
            (labB[r + lIn] - labB[r + lOut]) * 1.35
          );
          rightJump += Math.hypot(
            (labL[r + rIn] - labL[r + rOut]) * 0.72,
            (labA[r + rIn] - labA[r + rOut]) * 1.35,
            (labB[r + rIn] - labB[r + rOut]) * 1.35
          );

          // Sample 3 interior points across the cylinder width
          const x1 = Math.round(lx + span * 0.25);
          const x2 = Math.round(lx + span * 0.5);
          const x3 = Math.round(lx + span * 0.75);
          for (const xs of [x1, x2, x3]) {
            const idx = r + xs;
            const dBg = minBgLabDist(labL[idx], labA[idx], labB[idx]);
            bgDistSum += Math.min(45, dBg);
            if (chroma[idx] > chromaMax) chromaMax = chroma[idx];
          }
          samples += 1;
        }

        if (samples === 0) continue;
        leftJump /= samples;
        rightJump /= samples;
        const avgBgDist = bgDistSum / (samples * 3);

        // Require BOTH silhouette walls to have genuine contrast against their outside!
        if (leftJump < 6.0 || rightJump < 6.0) continue;

        // Vertical color consistency between top third and bottom third of the band (smoothly averaged across 5px to tolerate hammered texture!)
        const yTop = Math.round(y0 + rows * 0.2);
        const yBot = Math.round(y0 + rows * 0.8);
        for (const frac of [0.22, 0.5, 0.78]) {
          const sx = Math.round(lx + span * frac);
          let tL = 0;
          let tA = 0;
          let tB = 0;
          let bL = 0;
          let bA = 0;
          let bB = 0;
          let cnt = 0;
          for (let dx = -2; dx <= 2; dx += 1) {
            const xx = clamp(sx + dx, 1, w - 2);
            tL += labL[yTop * w + xx];
            tA += labA[yTop * w + xx];
            tB += labB[yTop * w + xx];
            bL += labL[yBot * w + xx];
            bA += labA[yBot * w + xx];
            bB += labB[yBot * w + xx];
            cnt += 1;
          }
          const dv = Math.hypot((tL - bL) / cnt * 0.65, (tA - bA) / cnt, (tB - bB) / cnt);
          vertCohesionSum += clamp01(1 - dv / 28);
        }
        const vertCohesion = vertCohesionSum / 3;
        if (vertCohesion < 0.25) continue;

        const minWallG = Math.min(colAvgG[lx], colAvgG[rx]);
        const avgWallG = (colAvgG[lx] + colAvgG[rx]) * 0.5;
        const minHit = Math.min(colHitFrac[lx], colHitFrac[rx]);
        const minJump = Math.min(leftJump, rightJump);
        const avgJump = (leftJump + rightJump) * 0.5;

        // Center proximity prior (gentle enough for off-center campus bottle at x=31% to win easily!)
        const centerPrior = 1 - 0.32 * Math.abs(midX / w - 0.5);
        // Prefer realistic bottle aspect ratio (~14%..24% of frame width)
        const spanFrac = span / w;
        const widthPrior = spanFrac >= 0.12 && spanFrac <= 0.26 ? 1.12 : 0.92;
        // Gentle chroma multiplier (helps colored bottles without breaking matte black or titanium!)
        const chromaBoost = 1 + Math.min(0.32, chromaMax / 65);

        const wallQuality = minWallG * 1.1 + avgWallG * 0.55 + minJump * 0.9 + avgJump * 0.45;
        const score =
          (wallQuality + avgBgDist * 0.75) *
          (0.35 + minHit * 0.65) *
          (0.45 + vertCohesion * 0.55) *
          centerPrior *
          widthPrior *
          chromaBoost *
          splitPenalty;

        if (!bestPair || score > bestPair.score) {
          bestPair = { lx: lx + 1, rx: rx - 1, score };
        }
      }
    }

    return bestPair;
  };

  const upperPair = findBestWallPairInBand(
    Math.round(h * 0.37),
    Math.round(h * 0.55),
    Math.round(w * 0.14),
    Math.round(w * 0.86),
    false
  );
  const lowerPair = findBestWallPairInBand(
    Math.round(h * 0.63),
    Math.round(h * 0.79),
    Math.round(w * 0.14),
    Math.round(w * 0.86),
    true
  );

  let anchorL = Math.round(w * 0.41);
  let anchorR = Math.round(w * 0.59);
  let anchorY = Math.round(h * 0.46);

  if (upperPair && lowerPair) {
    const uMid = (upperPair.lx + upperPair.rx) * 0.5;
    const lMid = (lowerPair.lx + lowerPair.rx) * 0.5;
    const aligned = Math.abs(uMid - lMid) < w * 0.08;
    if (aligned) {
      // Same vessel! Prefer upper torso walls so tapered tumblers get their FULL upper width.
      anchorL = upperPair.lx;
      anchorR = upperPair.rx;
      anchorY = Math.round(h * 0.45);
    } else if (lowerPair.score > upperPair.score * 1.05) {
      // Re-find upper walls tightly around lowerPair's horizontal axis
      const lHalf = Math.round((lowerPair.rx - lowerPair.lx) * 0.5);
      const refinedUpper = findBestWallPairInBand(
        Math.round(h * 0.37),
        Math.round(h * 0.55),
        Math.max(6, Math.round(lMid - lHalf * 1.8)),
        Math.min(w - 7, Math.round(lMid + lHalf * 1.8)),
        false
      );
      if (refinedUpper && Math.abs((refinedUpper.lx + refinedUpper.rx) * 0.5 - lMid) < w * 0.06) {
        anchorL = refinedUpper.lx;
        anchorR = refinedUpper.rx;
        anchorY = Math.round(h * 0.45);
      } else {
        anchorL = lowerPair.lx;
        anchorR = lowerPair.rx;
        anchorY = Math.round(h * 0.70);
      }
    } else {
      anchorL = upperPair.lx;
      anchorR = upperPair.rx;
      anchorY = Math.round(h * 0.45);
    }
  } else if (upperPair) {
    anchorL = upperPair.lx;
    anchorR = upperPair.rx;
    anchorY = Math.round(h * 0.45);
  } else if (lowerPair) {
    anchorL = lowerPair.lx;
    anchorR = lowerPair.rx;
    anchorY = Math.round(h * 0.70);
  }

  const torsoW = Math.max(20, anchorR - anchorL);

  // 5. Build FULL-CYLINDER 14-column lighting profile across the logo-free lower torso
  const lowerMatchesAxis =
    lowerPair && Math.abs((lowerPair.lx + lowerPair.rx) * 0.5 - (anchorL + anchorR) * 0.5) < w * 0.08;
  const profLBound = lowerMatchesAxis ? Math.max(anchorL, lowerPair.lx) : anchorL;
  const profRBound = lowerMatchesAxis ? Math.min(anchorR, lowerPair.rx) : anchorR;
  const profSpan = Math.max(12, profRBound - profLBound);
  const profX0 = Math.min(w - 3, profLBound + Math.max(3, Math.round(profSpan * 0.08)));
  const profX1 = Math.max(2, profRBound - Math.max(3, Math.round(profSpan * 0.08)));
  const profY0 = Math.round(h * 0.65);
  const profY1 = Math.round(h * 0.79);

  const profileL: number[] = [];
  const profileA: number[] = [];
  const profileB: number[] = [];
  const profileH: number[] = [];
  const profileS: number[] = [];
  const profileC: number[] = [];

  let internalGradSum = 0;
  let internalGradCnt = 0;

  const numCols = 14;
  for (let cIdx = 0; cIdx < numCols; cIdx += 1) {
    const x = Math.round(profX0 + ((profX1 - profX0) * cIdx) / Math.max(1, numCols - 1));
    const colLs: number[] = [];
    const colAs: number[] = [];
    const colBs: number[] = [];
    const colRs: number[] = [];
    const colGs: number[] = [];
    const colBls: number[] = [];

    const allLs: number[] = [];
    const allAs: number[] = [];
    const allBs: number[] = [];
    const allRs: number[] = [];
    const allGs: number[] = [];
    const allBls: number[] = [];

    for (let y = profY0; y <= profY1; y += 2) {
      const idx = y * w + x;
      const g = gradMag[idx];
      internalGradSum += g;
      internalGradCnt += 1;

      const pi = idx * 4;
      allLs.push(labL[idx]);
      allAs.push(labA[idx]);
      allBs.push(labB[idx]);
      allRs.push(data[pi]);
      allGs.push(data[pi + 1]);
      allBls.push(data[pi + 2]);

      if (g <= 20) {
        colLs.push(labL[idx]);
        colAs.push(labA[idx]);
        colBs.push(labB[idx]);
        colRs.push(data[pi]);
        colGs.push(data[pi + 1]);
        colBls.push(data[pi + 2]);
      }
    }

    const useL = colLs.length >= 4 ? colLs : allLs;
    const useA = colLs.length >= 4 ? colAs : allAs;
    const useB = colLs.length >= 4 ? colBs : allBs;
    const useR = colLs.length >= 4 ? colRs : allRs;
    const useG = colLs.length >= 4 ? colGs : allGs;
    const useBl = colLs.length >= 4 ? colBls : allBls;

    if (useL.length > 0) {
      const mL = medianOf(useL);
      const mA = medianOf(useA);
      const mB = medianOf(useB);
      const [mH, mS] = rgbToHsl(medianOf(useR), medianOf(useG), medianOf(useBl));
      profileL.push(mL);
      profileA.push(mA);
      profileB.push(mB);
      profileH.push(mH);
      profileS.push(mS);
      profileC.push(Math.hypot(mA, mB));
    }
  }

  const meanInternalGrad = internalGradCnt > 0 ? internalGradSum / internalGradCnt : 0;
  const isTexturedBottle = meanInternalGrad > 11.5; // Hammered copper, ribbed, knurled vessels
  const maxProfileChroma = profileC.length > 0 ? Math.max(...profileC) : 0;
  const medProfileL = profileL.length > 0 ? medianOf(profileL) : 50;
  const isChromaticBottle = maxProfileChroma >= 10;

  const distToCylinderProfile = (L: number, a: number, b: number): number => {
    let best = 999;
    const lWeight = isTexturedBottle ? 0.3 : 0.42;
    for (let k = 0; k < profileL.length; k += 1) {
      const d = Math.hypot((L - profileL[k]) * lWeight, a - profileA[k], b - profileB[k]);
      if (d < best) best = d;
    }
    return best;
  };

  const getColumnRef = (x: number, lx: number, rx: number): { refL: number; refS: number; refC: number } => {
    if (profileL.length === 0) return { refL: 50, refS: 0.2, refC: 15 };
    const t = clamp01((x - lx) / Math.max(1, rx - lx));
    const idx = Math.min(profileL.length - 1, Math.round(t * (profileL.length - 1)));
    return {
      refL: profileL[idx],
      refS: profileS[idx],
      refC: profileC[idx],
    };
  };

  // 6. Row-by-row Silhouette Tracking (Torso -> Bottom Rim & Torso -> Shoulder/Cap)
  const rowLeft = new Int32Array(h).fill(-1);
  const rowRight = new Int32Array(h).fill(-1);
  const rowHollowCap = new Uint8Array(h);

  const maxStepShift = Math.max(3, Math.round(torsoW * 0.055));

  const analyzeRow = (y: number, lx: number, rx: number): {
    isBody: boolean;
    isCollarOrCap: boolean;
    isHollowLoop: boolean;
    bodyFrac: number;
    avgGy: number;
  } => {
    const span = rx - lx;
    if (span < Math.max(10, torsoW * 0.24)) {
      return { isBody: false, isCollarOrCap: false, isHollowLoop: false, bodyFrac: 0, avgGy: 0 };
    }
    const row = y * w;
    let totalSamples = 0;
    let matchCount = 0;
    let strongDistinctCount = 0;
    let darkCount = 0;
    let lowSatCount = 0;
    let minRowL = 100;
    let maxRowL = 0;
    let seamGradSum = 0;

    const inset = Math.max(2, Math.round(span * 0.08));
    const xStart = lx + inset;
    const xEnd = rx - inset;
    const step = Math.max(1, Math.floor((xEnd - xStart) / 24));
    const cylThresh = isTexturedBottle ? 21.0 : isChromaticBottle ? 13.0 : 10.5;

    for (let x = xStart; x <= xEnd; x += step) {
      const idx = row + x;
      const L = labL[idx];
      const a = labA[idx];
      const b = labB[idx];
      const c = chroma[idx];
      totalSamples += 1;
      seamGradSum += gradY[idx];
      if (L < minRowL) minRowL = L;
      if (L > maxRowL) maxRowL = L;
      if (L < 22 && c < 11) darkCount += 1;
      if (c < 7.5) lowSatCount += 1;

      const dCyl = distToCylinderProfile(L, a, b);
      const dBg = minBgLabDist(L, a, b);
      const inLogoBand = y > h * 0.39 && y < h * 0.67 && c < 10 && (L > 64 || (medProfileL > 42 && L < 34));
      const matchesCyl = dCyl < cylThresh;

      if (matchesCyl || inLogoBand) {
        matchCount += 1;
        if (inLogoBand || dCyl < dBg * 0.94 + 2.0) {
          strongDistinctCount += 1;
        }
      }
    }

    if (totalSamples === 0) {
      return { isBody: false, isCollarOrCap: false, isHollowLoop: false, bodyFrac: 0, avgGy: 0 };
    }
    const bodyFrac = matchCount / totalSamples;
    const distinctFrac = strongDistinctCount / totalSamples;
    const darkFrac = darkCount / totalSamples;
    const lowSatFrac = lowSatCount / totalSamples;
    const avgGy = seamGradSum / totalSamples;

    // Detect black chug lid or brushed metallic collar (silver OR rose-gold) in upper neck zone
    const inUpperNeckZone = y < h * 0.35;
    const isNarrowNeck = span < torsoW * 0.82;
    const isBlackCap =
      inUpperNeckZone && darkFrac > 0.45 && (isChromaticBottle || medProfileL > 34);
    const lSwing = maxRowL - minRowL;
    // Metallic collars ONLY occur on narrowed necks (never on full-width tumbler walls or shoulders!)
    const isMetallicCollar =
      inUpperNeckZone &&
      isNarrowNeck &&
      isChromaticBottle &&
      !isTexturedBottle &&
      ((lSwing > 36 && maxRowL > 84 && minRowL < 50) ||
        (lSwing > 42 && (lowSatFrac > 0.22 || bodyFrac < 0.62)));
    // Stainless steel tumbler rim at top of wide tumbler (neutral silver band across full width)
    const isWideSteelRim =
      y < h * 0.31 && !isNarrowNeck && isChromaticBottle && lowSatFrac > 0.52 && bodyFrac < 0.35;

    if (isBlackCap || isMetallicCollar || isWideSteelRim) {
      return { isBody: false, isCollarOrCap: true, isHollowLoop: false, bodyFrac, avgGy };
    }

    // Detect hollow carry-handle loop at very top of a color-matched cap
    const leftRimIdx = row + Math.min(w - 2, lx + 3);
    const rightRimIdx = row + Math.max(1, rx - 3);
    const midIdx = row + Math.round((lx + rx) / 2);
    const leftMatches = distToCylinderProfile(labL[leftRimIdx], labA[leftRimIdx], labB[leftRimIdx]) < 16;
    const rightMatches = distToCylinderProfile(labL[rightRimIdx], labA[rightRimIdx], labB[rightRimIdx]) < 16;
    const midIsBg = distToCylinderProfile(labL[midIdx], labA[midIdx], labB[midIdx]) > 14;
    const isHollowLoop = y < h * 0.26 && leftMatches && rightMatches && midIsBg;

    const minNeeded = isTexturedBottle
      ? 0.36
      : y < h * 0.335 && isNarrowNeck
        ? 0.36
        : y < h * 0.32
          ? 0.48
          : avgGy > 15
            ? 0.48
            : 0.42;
    const minDistinct = isTexturedBottle ? 0.3 : 0.38;
    const isBody = bodyFrac >= minNeeded && distinctFrac >= minDistinct;
    return { isBody, isCollarOrCap: false, isHollowLoop, bodyFrac, avgGy };
  };

  // Detect whether lower torso has straight parallel walls (true for standard bottles/canteens
  // & hammered metal bottles, false for sharply tapered tumblers) so internal reflections NEVER
  // drag straight walls inward!
  const lowerW = lowerMatchesAxis && lowerPair ? lowerPair.rx - lowerPair.lx : torsoW;
  const isStraightTorso =
    isTexturedBottle || (lowerMatchesAxis && Math.abs(lowerW - torsoW) < torsoW * 0.14);

  const trackRowWalls = (
    y: number,
    prevL: number,
    prevR: number,
    allowExpand: boolean,
    preventOutwardFlare: boolean
  ): [number, number] => {
    const row = y * w;
    const mid = Math.round((prevL + prevR) / 2);
    const inShoulderOrNeck = y <= h * 0.36;
    const inBottomBevel = y >= h * 0.84;

    const findEdgeNear = (prevEdge: number, dir: -1 | 1): number => {
      // Keep horizontal search tight on torso walls so internal reflections/highlights
      // (matte black speculars, brushed titanium streaks, hammered dimples) NEVER hijack the wall!
      const searchIn = inShoulderOrNeck
        ? maxStepShift + 3
        : inBottomBevel
          ? 5
          : isStraightTorso
            ? 2
            : 4;
      const searchOut = preventOutwardFlare
        ? 0
        : allowExpand
          ? inShoulderOrNeck
            ? maxStepShift
            : 3
          : isStraightTorso
            ? 2
            : 2;
      const xMin = Math.max(2, prevEdge - (dir === -1 ? searchOut : searchIn));
      const xMax = Math.min(w - 3, prevEdge + (dir === 1 ? searchOut : searchIn));

      let bestX = prevEdge;
      let bestScore = -1e9;
      for (let x = xMin; x <= xMax; x += 1) {
        const g = gradX[row + x];
        const inX = Math.max(2, Math.min(w - 3, x - dir * 3));
        const outX = Math.max(2, Math.min(w - 3, x + dir * 4));
        const dIn = distToCylinderProfile(labL[row + inX], labA[row + inX], labB[row + inX]);
        const dOut = distToCylinderProfile(labL[row + outX], labA[row + outX], labB[row + outX]);
        const edgeContrast = dOut - dIn;

        // Moving inward is ONLY valid when the outside pixel genuinely exits the bottle!
        const movingInward = dir === -1 ? x > prevEdge : x < prevEdge;
        let inwardGuardPenalty = 0;
        if (movingInward && !inShoulderOrNeck && dOut < 12) {
          inwardGuardPenalty = 24;
        }

        const distPenalty = Math.abs(x - prevEdge) * (inShoulderOrNeck ? 1.45 : 2.1);
        const sc = g * 1.15 + Math.max(-14, Math.min(26, edgeContrast)) - distPenalty - inwardGuardPenalty;
        if (sc > bestScore) {
          bestScore = sc;
          bestX = x;
        }
      }

      if (gradX[row + bestX] > 9) {
        const insideCandidate = bestX - dir;
        if ((dir === -1 && insideCandidate < mid) || (dir === 1 && insideCandidate > mid)) {
          return insideCandidate;
        }
      }
      return bestX;
    };

    const nextL = findEdgeNear(prevL, -1);
    const nextR = findEdgeNear(prevR, 1);

    // On straight torsos, anchor walls tightly around [anchorL..anchorR] from mid-torso to near-bottom
    const minLBound = anchorL - 3;
    const maxRBound = anchorR + 3;
    let clampedL = Math.max(minLBound, Math.min(mid - 6, nextL));
    let clampedR = Math.min(maxRBound, Math.max(mid + 6, nextR));

    if (isStraightTorso && y > h * 0.38 && y < h * 0.84) {
      const maxDrift = Math.max(3, Math.round(torsoW * 0.045));
      clampedL = clamp(clampedL, anchorL - 3, anchorL + maxDrift);
      clampedR = clamp(clampedR, anchorR - maxDrift, anchorR + 3);
    }

    // Near the bottom table contact shadow, vessels stay vertical or taper INWARD — never flare out!
    if (preventOutwardFlare) {
      clampedL = Math.max(prevL, clampedL);
      clampedR = Math.min(prevR, clampedR);
    }

    return [clampedL, clampedR];
  };

  rowLeft[anchorY] = anchorL;
  rowRight[anchorY] = anchorR;

  // Track DOWNWARD from anchorY to bottom table contact seam
  let curL = anchorL;
  let curR = anchorR;
  let missStreak = 0;
  const maxDownMiss = isTexturedBottle ? 7 : 3;
  for (let y = anchorY + 1; y < h - 2; y += 1) {
    const nearBottom = y > h * 0.78;
    const [nl, nr] = trackRowWalls(y, curL, curR, false, nearBottom);
    const check = analyzeRow(y, nl, nr);

    if (!check.isBody || (y > h * 0.82 && check.avgGy > 17 && check.bodyFrac < 0.62)) {
      missStreak += 1;
      if (missStreak >= maxDownMiss) break;
      // On textured/banded bottles (e.g. smooth logo band -> hammered copper), keep walls steady across seam
      if (isTexturedBottle && y < h * 0.8) {
        rowLeft[y] = curL;
        rowRight[y] = curR;
      }
    } else {
      missStreak = 0;
      rowLeft[y] = nl;
      rowRight[y] = nr;
      curL = nl;
      curR = nr;
    }
  }

  // Track UPWARD from anchorY through shoulder, optional metallic collar, and color-matched cap/loop
  curL = anchorL;
  curR = anchorR;
  missStreak = 0;
  let skippedCollarRows = 0;
  let enteredCapAboveCollar = false;
  let neckLeft = anchorL;
  let neckRight = anchorR;
  let topPaintedY = anchorY;

  for (let y = anchorY - 1; y >= 2; y -= 1) {
    const [nl, nr] = trackRowWalls(y, curL, curR, y > h * 0.34, false);
    const check = analyzeRow(y, nl, nr);

    if (check.isCollarOrCap) {
      if (skippedCollarRows === 0) {
        neckLeft = curL;
        neckRight = curR;
      }
      skippedCollarRows += 1;
      if (skippedCollarRows > Math.round(h * 0.12)) {
        break;
      }
      continue;
    }

    if (check.isHollowLoop) {
      const capL = Math.max(neckLeft - 3, nl);
      const capR = Math.min(neckRight + 3, nr);
      rowLeft[y] = capL;
      rowRight[y] = capR;
      rowHollowCap[y] = 1;
      curL = capL;
      curR = capR;
      topPaintedY = y;
      enteredCapAboveCollar = true;
      missStreak = 0;
      continue;
    }

    if (check.isBody) {
      if (skippedCollarRows > 0) {
        enteredCapAboveCollar = true;
        const capL = Math.max(neckLeft - 3, nl);
        const capR = Math.min(neckRight + 3, nr);
        if (capR - capL >= torsoW * 0.35 && check.bodyFrac >= 0.56) {
          rowLeft[y] = capL;
          rowRight[y] = capR;
          curL = capL;
          curR = capR;
          topPaintedY = y;
          missStreak = 0;
        } else {
          missStreak += 1;
          if (missStreak >= 2) break;
        }
      } else {
        rowLeft[y] = nl;
        rowRight[y] = nr;
        curL = nl;
        curR = nr;
        topPaintedY = y;
        missStreak = 0;
      }
    } else {
      missStreak += 1;
      if (enteredCapAboveCollar && missStreak >= 2) break;
      if (!enteredCapAboveCollar && missStreak >= 3) break;
    }
  }

  // 7. Build binary mask from tracked full-cylinder rows
  const maskBin = new Uint8Array(total);
  for (let y = 0; y < h; y += 1) {
    const lx = rowLeft[y];
    const rx = rowRight[y];
    if (lx >= 0 && rx > lx) {
      const row = y * w;
      if (rowHollowCap[y]) {
        for (let x = lx; x <= rx; x += 1) {
          const idx = row + x;
          const dCyl = distToCylinderProfile(labL[idx], labA[idx], labB[idx]);
          const dBg = minBgLabDist(labL[idx], labA[idx], labB[idx]);
          if (dCyl < 16 && dCyl < dBg * 0.92) {
            maskBin[idx] = 1;
          }
        }
      } else {
        for (let x = lx; x <= rx; x += 1) {
          maskBin[row + x] = 1;
        }
      }
    }
  }

  const medProfileH = profileH.length > 0 ? medianOf(profileH) : 0;

  // 8. Top Carry-Handle Loop Attachment (strictly bounded horizontally to the cap width!)
  // Recolors matching arched carry-handle loops on color-matched caps while leaving the
  // hollow background cutout completely untouched.
  if (isChromaticBottle && !isTexturedBottle && topPaintedY < h * 0.31) {
    const capMinX = Math.max(2, (rowLeft[topPaintedY] >= 0 ? rowLeft[topPaintedY] : neckLeft) - 3);
    const capMaxX = Math.min(w - 3, (rowRight[topPaintedY] >= 0 ? rowRight[topPaintedY] : neckRight) + 3);
    const loopMinY = Math.max(1, topPaintedY - Math.round(torsoW * 0.78));
    const loopMaxY = Math.min(h - 2, topPaintedY + 4);

    const loopVisited = new Uint8Array(total);
    const lQueue = new Int32Array(total);
    let lHead = 0;
    let lTail = 0;

    for (let y = Math.max(1, topPaintedY); y <= loopMaxY; y += 1) {
      for (let x = capMinX; x <= capMaxX; x += 1) {
        const idx = y * w + x;
        if (maskBin[idx] && !loopVisited[idx]) {
          loopVisited[idx] = 1;
          lQueue[lTail++] = idx;
        }
      }
    }

    const dirs = [-1, 1, -w, w];
    while (lHead < lTail) {
      const cur = lQueue[lHead++];
      const cx = cur % w;
      const cy = (cur - cx) / w;

      for (let d = 0; d < 4; d += 1) {
        const nxt = cur + dirs[d];
        if (nxt < 0 || nxt >= total || loopVisited[nxt] || maskBin[nxt]) continue;
        const nx = nxt % w;
        const ny = (nxt - nx) / w;
        if (Math.abs(nx - cx) + Math.abs(ny - cy) !== 1) continue;
        if (ny < loopMinY || ny > loopMaxY || nx < capMinX || nx > capMaxX) continue;

        const dCyl = distToCylinderProfile(labL[nxt], labA[nxt], labB[nxt]);
        if (dCyl > 21) continue;

        const dBg = minBgLabDist(labL[nxt], labA[nxt], labB[nxt]);
        const dBgAb = minBgAbDist(labA[nxt], labB[nxt]);
        if (dCyl > dBg * 0.9 || (dBgAb < 5.5 && dCyl > 11)) continue;

        const npi = nxt * 4;
        const [nh, ns] = rgbToHsl(data[npi], data[npi + 1], data[npi + 2]);
        const hueOk = ns < 0.14 ? dCyl < 14 : hueDistance(nh, medProfileH) < 0.095;
        if (!hueOk) continue;

        loopVisited[nxt] = 1;
        maskBin[nxt] = 1;
        lQueue[lTail++] = nxt;
      }
    }
  }

  // 9. Strict Painted Side-Handle Attachment (for tumblers/mugs with color-matched D-handles)
  // Probes across the 2–8px shadow crease beside the tumbler wall, while strictly rejecting
  // room walls & foliage via background-distance + hue-match guards!
  if (isChromaticBottle && !isTexturedBottle) {
    const handleVisited = new Uint8Array(total);
    const hQueue = new Int32Array(total);
    let hHead = 0;
    let hTail = 0;

    const hY0 = Math.round(h * 0.29);
    const hY1 = Math.round(h * 0.69);
    const maxHandleReach = Math.round(torsoW * 0.62);
    const minHandleChroma = Math.max(10.5, maxProfileChroma * 0.42);

    const isHandlePixel = (idx: number, side: 'left' | 'right'): boolean => {
      if (chroma[idx] < minHandleChroma) return false;
      const dCyl = distToCylinderProfile(labL[idx], labA[idx], labB[idx]);
      if (dCyl > 16) return false;
      // Compare against THAT side's outer background (so a blue window on the far left
      // never blocks a blue tumbler handle on the right!)
      const dSideBgAb = minSideBgAbDist(side, labA[idx], labB[idx]);
      if (dSideBgAb < 10.5 || dCyl > dSideBgAb * 0.85) return false;
      const pi = idx * 4;
      const [nh, ns] = rgbToHsl(data[pi], data[pi + 1], data[pi + 2]);
      if (ns < 0.14 || hueDistance(nh, medProfileH) > 0.072) return false;
      return true;
    };

    // Seed directly on the walls AND probe 1..9px across the attachment crease
    for (let y = hY0; y <= hY1; y += 1) {
      if (rowLeft[y] >= 0 && rowRight[y] > rowLeft[y]) {
        for (let off = 0; off <= 9; off += 1) {
          const lx = rowLeft[y] - off;
          if (lx > 2) {
            const lIdx = y * w + lx;
            if (!handleVisited[lIdx] && (off === 0 || (!maskBin[lIdx] && isHandlePixel(lIdx, 'left')))) {
              handleVisited[lIdx] = 1;
              if (off > 0) maskBin[lIdx] = 1;
              hQueue[hTail++] = lIdx;
            }
          }
          const rx = rowRight[y] + off;
          if (rx < w - 3) {
            const rIdx = y * w + rx;
            if (!handleVisited[rIdx] && (off === 0 || (!maskBin[rIdx] && isHandlePixel(rIdx, 'right')))) {
              handleVisited[rIdx] = 1;
              if (off > 0) maskBin[rIdx] = 1;
              hQueue[hTail++] = rIdx;
            }
          }
        }
      }
    }

    const dirs = [-1, 1, -w, w];
    const midAnchorX = Math.round((anchorL + anchorR) * 0.5);
    while (hHead < hTail) {
      const cur = hQueue[hHead++];
      const cx = cur % w;
      const cy = (cur - cx) / w;
      const cL = labL[cur];
      const cA = labA[cur];
      const cB = labB[cur];

      for (let d = 0; d < 4; d += 1) {
        const nxt = cur + dirs[d];
        if (nxt < 0 || nxt >= total || handleVisited[nxt] || maskBin[nxt]) continue;
        const nx = nxt % w;
        const ny = (nxt - nx) / w;
        if (Math.abs(nx - cx) + Math.abs(ny - cy) !== 1) continue;
        if (ny < hY0 || ny > hY1) continue;
        if (nx < anchorL - maxHandleReach || nx > anchorR + maxHandleReach) continue;

        if (gradMag[nxt] > 58) continue;
        const side: 'left' | 'right' = nx < midAnchorX ? 'left' : 'right';
        if (!isHandlePixel(nxt, side)) continue;

        const stepLab = Math.hypot((labL[nxt] - cL) * 0.7, labA[nxt] - cA, labB[nxt] - cB);
        if (stepLab > 24) continue;

        handleVisited[nxt] = 1;
        maskBin[nxt] = 1;
        hQueue[hTail++] = nxt;
      }
    }

    // Bridge 1px shaded edge pixels strictly on the inner/outer rim of the painted handle
    const handleRim = new Uint8Array(total);
    for (let y = hY0 + 1; y < hY1 - 1; y += 1) {
      const row = y * w;
      for (let x = Math.max(2, anchorL - maxHandleReach); x < Math.min(w - 2, anchorR + maxHandleReach); x += 1) {
        const idx = row + x;
        if (maskBin[idx]) continue;
        if (x >= anchorL && x <= anchorR) continue;
        const nCount =
          maskBin[idx - 1] + maskBin[idx + 1] + maskBin[idx - w] + maskBin[idx + w];
        if (nCount >= 2) {
          const side: 'left' | 'right' = x < midAnchorX ? 'left' : 'right';
          const dSideBgAb = minSideBgAbDist(side, labA[idx], labB[idx]);
          const pi = idx * 4;
          const [nh, ns] = rgbToHsl(data[pi], data[pi + 1], data[pi + 2]);
          if (dSideBgAb >= 8.5 && ns >= 0.12 && hueDistance(nh, medProfileH) < 0.085) {
            handleRim[idx] = 1;
          }
        }
      }
    }
    for (let i = 0; i < total; i += 1) {
      if (handleRim[i]) maskBin[i] = 1;
    }
  }

  // 10. Zero-outward-halo edge anti-aliasing
  const rawFloat = new Float32Array(total);
  for (let i = 0; i < total; i += 1) {
    rawFloat[i] = maskBin[i];
  }
  const blurred = blurMask1(rawFloat, w, h);
  const softFg = new Float32Array(total);
  for (let i = 0; i < total; i += 1) {
    softFg[i] = maskBin[i] ? blurred[i] : 0;
  }

  // 11. Target finish color in HSL
  const [tr, tg, tb] = hexToRgb(finish.hex);
  const [targetH, targetS, targetL] = rgbToHsl(tr, tg, tb);
  const isDarkTarget = targetL < 0.22 && targetS < 0.22;
  const isMetallicLight = targetS < 0.14 && targetL > 0.62;
  const isTransparent = Boolean(finish.isTransparent);
  const sourceMidL = clamp01(medProfileL / 100);

  // 12. Uniform full-cylinder recoloring with crisp white & dark engraved logo protection
  for (let y = 0; y < h; y += 1) {
    const lx = rowLeft[y];
    const rx = rowRight[y];
    const span = rx - lx;
    const inLogoY = y > h * 0.39 && y < h * 0.67;

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

      // Protect crisp white WATERHOLIC logo (on chromatic or dark bottles)
      // OR dark engraved logo (on bright silver/copper metallic bottles)
      // strictly inside the centered logo box!
      if (inLogoY && span > 18 && x > lx + span * 0.11 && x < rx - span * 0.11) {
        const { refL } = getColumnRef(x, lx, rx);
        const lDelta = labL[idx] - refL;
        const isNeutral = origS < 0.15 && chroma[idx] < 9.5;
        if ((isChromaticBottle || medProfileL < 38) && lDelta > 8.5 && isNeutral) {
          const logoStrength = clamp01((lDelta - 8.5) / 8.5);
          paintWeight *= 1 - logoStrength;
        } else if (refL > 42 && labL[idx] < refL - 14 && labL[idx] < 38 && isNeutral) {
          const darkLogoStrength = clamp01((refL - 14 - labL[idx]) / 12);
          paintWeight *= 1 - darkLogoStrength;
        }
      }

      // Protect pure white specular pinpoints only
      if (origL > 0.96 && origS < 0.06) {
        paintWeight *= clamp01(1 - (origL - 0.96) / 0.035);
      }

      // Protect ultra-dark hardware crevices when target is light/mid (skip on matte-black source bottles!)
      if (!isDarkTarget && sourceMidL > 0.32 && origS < 0.16 && origL < 0.08) {
        paintWeight *= clamp01(origL / 0.08);
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
      } else if (sourceMidL < 0.32) {
        // Matte black / charcoal source bottle -> lift luminance cleanly to target finish
        // while preserving original cylindrical shading and highlights
        const relL = origL - sourceMidL;
        const newL = clamp01(targetL * 0.88 + relL * 0.98);
        const midFactor = 1 - Math.pow(Math.min(1, Math.abs(newL - 0.5) * 1.85), 2);
        const newS = clamp01(targetS * (0.72 + 0.34 * midFactor));
        [outR, outG, outB] = hslToRgb(targetH, newS, newL);
      } else {
        const midFactor = 1 - Math.pow(Math.min(1, Math.abs(origL - 0.5) * 1.9), 2);
        const targetShift = clamp((targetL - sourceMidL) * 0.45, -0.17, 0.14);
        const newL = clamp01(origL + targetShift * midFactor);
        const newS = clamp01(targetS * (0.74 + 0.32 * midFactor));
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

  const cacheKey = `v7::${src}::${finish.id}::${finish.hex}::${finish.isTransparent ? '1' : '0'}::${maxDimension}`;
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
