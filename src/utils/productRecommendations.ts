import type { CategoryId, Product } from '../data/products';

export interface ProductRecommendation {
  product: Product;
  score: number;
  kind: 'similar' | 'pairing';
  reason: string;
  matchedFinishId?: string;
}

const COMPLEMENTARY_CATEGORIES: Record<CategoryId, CategoryId[]> = {
  bottles: ['accessories', 'filters', 'mineral', 'tumblers'],
  tumblers: ['accessories', 'ice', 'bottles', 'mineral'],
  filters: ['bottles', 'carafes', 'accessories', 'packs'],
  carafes: ['filters', 'ice', 'mineral', 'tumblers'],
  packs: ['bottles', 'filters', 'mineral', 'accessories'],
  mineral: ['bottles', 'carafes', 'ice', 'tumblers'],
  ice: ['tumblers', 'carafes', 'bottles', 'mineral'],
  accessories: ['bottles', 'tumblers', 'filters', 'packs'],
};

const FEATURE_GROUPS: Array<{ key: string; label: string; patterns: RegExp }> = [
  {
    key: 'thermal',
    label: 'Similar thermal spec',
    patterns: /vacuum|insulat|thermal|double[- ]wall|triple[- ]wall|cold|hot|\b\d+h\b/i,
  },
  {
    key: 'trail',
    label: 'Built for outdoor & trail',
    patterns: /trail|outdoor|expedition|hike|camp|alpine|summit|ultralight|backcountry|trek/i,
  },
  {
    key: 'daily',
    label: 'Same everyday carry',
    patterns: /commut|desk|campus|cup[- ]?holder|daily|slim|compact|pocket|studio|office/i,
  },
  {
    key: 'straw',
    label: 'Similar drink spout',
    patterns: /straw|sip|flip|chug|wide[- ]mouth|sport|squeeze/i,
  },
  {
    key: 'purity',
    label: 'Pure taste & filtration',
    patterns: /ceramic|borosilicate|glass|uv[- ]?c|filter|purif|infus|copper|pure|taste/i,
  },
  {
    key: 'smart',
    label: 'Smart hydration tech',
    patterns: /\bled\b|smart|sensor|digital|uv[- ]?c|temp/i,
  },
  {
    key: 'sparkling',
    label: 'Sparkling & mineral match',
    patterns: /sparkling|carbonat|mineral|electrolyte|spring|fizz|botanical/i,
  },
  {
    key: 'tableware',
    label: 'Table & hosting style',
    patterns: /carafe|pitcher|dispenser|jug|bedside|barware|ice|chiller|pint|mug/i,
  },
];

const MATERIAL_TOKENS = [
  'titanium',
  'stainless',
  'steel',
  'ceramic',
  'stoneware',
  'borosilicate',
  'glass',
  'copper',
  'silicone',
  'tritan',
  'tpu',
  'carbon',
  'uv',
  'mineral',
  'spring',
  'electrolyte',
];

/**
 * Parses human-readable capacity strings ("950 ml", "1.5 L", "32 oz", "1 gal")
 * into milliliters for smooth continuous proximity scoring.
 */
function parseCapacityMl(capacity: string): number | null {
  const lower = capacity.toLowerCase();
  const mlMatch = lower.match(/(\d+(?:\.\d+)?)\s*ml/);
  if (mlMatch) return parseFloat(mlMatch[1]);

  const lMatch = lower.match(/(\d+(?:\.\d+)?)\s*l\b/);
  if (lMatch) return parseFloat(lMatch[1]) * 1000;

  const ozMatch = lower.match(/(\d+(?:\.\d+)?)\s*(?:fl\.?\s*)?oz/);
  if (ozMatch) return parseFloat(ozMatch[1]) * 29.5735;

  const galMatch = lower.match(/(\d+(?:\.\d+)?)\s*gal/);
  if (galMatch) return parseFloat(galMatch[1]) * 3785.41;

  return null;
}

function extractMaterialSet(material: string): Set<string> {
  const lower = material.toLowerCase();
  const out = new Set<string>();
  for (const tok of MATERIAL_TOKENS) {
    if (lower.includes(tok)) out.add(tok);
  }
  return out;
}

function extractFeatureSet(product: Product): Set<string> {
  const corpus = `${product.name} ${product.variety} ${product.highlightSpec} ${product.description} ${product.tag ?? ''}`;
  const out = new Set<string>();
  for (const grp of FEATURE_GROUPS) {
    if (grp.patterns.test(corpus)) {
      out.add(grp.key);
    }
  }
  return out;
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  for (const item of a) {
    if (b.has(item)) inter += 1;
  }
  const union = a.size + b.size - inter;
  return union > 0 ? inter / union : 0;
}

function formatMaterialShort(material: string): string {
  const lower = material.toLowerCase();
  if (lower.includes('titanium')) return 'titanium';
  if (lower.includes('ceramic')) return 'ceramic-lined';
  if (lower.includes('borosilicate') || lower.includes('glass')) return 'glass';
  if (lower.includes('copper')) return 'copper';
  if (lower.includes('stainless') || lower.includes('steel')) return '18/8 steel';
  if (lower.includes('silicone')) return 'silicone';
  return material.split('/')[0].trim().toLowerCase();
}

/**
 * Multi-Signal Product Recommendation Engine:
 * Combines 7 weighted relevance factors — category/pairing affinity, material craft,
 * use-case feature overlap, capacity proximity, price tier proximity, finish palette
 * continuity, and Bayesian rating quality — plus diversity enforcement so every
 * visual card is distinct, genuinely relevant, and includes a clear match reason.
 */
export function getRecommendedProducts(
  source: Product,
  catalog: Product[],
  activeFinishId?: string,
  count = 4
): ProductRecommendation[] {
  const candidates = catalog.filter((p) => p.id !== source.id);
  if (candidates.length === 0) return [];

  const srcMl = parseCapacityMl(source.capacity);
  const srcMat = extractMaterialSet(source.material);
  const srcFeatures = extractFeatureSet(source);
  const srcFinishIds = new Set(source.finishes.map((f) => f.id));
  const complements = COMPLEMENTARY_CATEGORIES[source.category] ?? [];

  const meanRating =
    catalog.reduce((sum, p) => sum + p.rating, 0) / Math.max(1, catalog.length);
  const activeFinishObj = activeFinishId
    ? source.finishes.find((f) => f.id === activeFinishId)
    : undefined;

  interface ScoredCandidate {
    product: Product;
    totalScore: number;
    kind: 'similar' | 'pairing';
    reason: string;
    matchedFinishId?: string;
  }

  const scored: ScoredCandidate[] = candidates.map((cand) => {
    const sameCat = cand.category === source.category;
    const compRank = complements.indexOf(cand.category);

    // 1. Category / Complementary Pairing Affinity (max 30)
    const catScore = sameCat
      ? 30
      : compRank === 0
        ? 19
        : compRank === 1
          ? 14
          : compRank >= 2
            ? 9
            : 2;

    // 2. Material Craftsmanship Affinity (max 16)
    const candMat = extractMaterialSet(cand.material);
    const matOverlap =
      cand.material.toLowerCase() === source.material.toLowerCase()
        ? 1
        : jaccard(srcMat, candMat);
    const matScore = matOverlap * 16;

    // 3. Use-Case & Functional Feature Overlap (max 18)
    const candFeatures = extractFeatureSet(cand);
    const sharedFeatures: string[] = [];
    for (const f of srcFeatures) {
      if (candFeatures.has(f)) sharedFeatures.push(f);
    }
    const featOverlap = jaccard(srcFeatures, candFeatures);
    const varietyMatch =
      cand.variety.toLowerCase() === source.variety.toLowerCase() ? 0.25 : 0;
    const featScore = Math.min(18, (featOverlap + varietyMatch) * 18);

    // 4. Capacity Proximity via Gaussian Kernel (max 12)
    const candMl = parseCapacityMl(cand.capacity);
    let capScore = 4;
    let capSimilarity = 0;
    if (srcMl !== null && candMl !== null) {
      const sigma = Math.max(240, srcMl * 0.52);
      capSimilarity = Math.exp(-Math.pow((candMl - srcMl) / sigma, 2));
      capScore = capSimilarity * 12;
    }

    // 5. Price Tier Proximity via Gaussian Kernel (max 12)
    const priceSigma = Math.max(18, source.price * 0.45);
    const priceSimilarity = Math.exp(
      -Math.pow((cand.price - source.price) / priceSigma, 2)
    );
    const priceScore = priceSimilarity * 12;

    // 6. Finish & Aesthetic Continuity (max 8)
    const candFinishIds = new Set(cand.finishes.map((f) => f.id));
    const hasActiveFinish = Boolean(activeFinishId && candFinishIds.has(activeFinishId));
    const finishScore =
      (hasActiveFinish ? 5.5 : 0) + jaccard(srcFinishIds, candFinishIds) * 2.5;

    // 7. Bayesian Quality & Social Proof Signal (max 6)
    const bayesianRating =
      (cand.reviews * cand.rating + 60 * meanRating) / (cand.reviews + 60);
    const qualityScore = Math.max(0, Math.min(6, ((bayesianRating - 4.2) / 0.8) * 6));

    const totalScore =
      catScore +
      matScore +
      featScore +
      capScore +
      priceScore +
      finishScore +
      qualityScore;

    // Derive crisp, transparent human-readable match reason from the strongest signal
    let reason = 'Popular alternative';
    if (!sameCat) {
      if (cand.category === 'accessories') {
        reason = 'Pairs with this vessel';
      } else if (cand.category === 'filters') {
        reason = 'Purify your refills';
      } else if (cand.category === 'mineral') {
        reason = 'Fill & electrolyte pairing';
      } else if (cand.category === 'ice') {
        reason = 'Chilled serve pairing';
      } else {
        reason = 'Pairs well with this';
      }
    } else if (matOverlap >= 0.85 && !source.material.toLowerCase().includes('18/8')) {
      reason = `Same ${formatMaterialShort(cand.material)} craft`;
    } else if (sharedFeatures.length > 0 && featScore >= 9) {
      const topFeat = FEATURE_GROUPS.find((g) => g.key === sharedFeatures[0]);
      reason = topFeat?.label ?? 'Similar performance';
    } else if (capSimilarity >= 0.86 && candMl !== null) {
      reason = `Similar ${cand.capacity} size`;
    } else if (hasActiveFinish && activeFinishObj) {
      reason = `Also in ${activeFinishObj.name}`;
    } else if (priceSimilarity >= 0.82) {
      reason = 'Similar price tier';
    } else if (matOverlap >= 0.6) {
      reason = `Same ${formatMaterialShort(cand.material)} build`;
    }

    return {
      product: cand,
      totalScore,
      kind: sameCat ? 'similar' : 'pairing',
      reason,
      matchedFinishId: hasActiveFinish ? activeFinishId : undefined,
    };
  });

  // Partition into closely matched same-category peers and cross-category pairings
  const sameCategoryPool = scored
    .filter((s) => s.kind === 'similar')
    .sort((a, b) => b.totalScore - a.totalScore);
  const pairingPool = scored
    .filter((s) => s.kind === 'pairing')
    .sort((a, b) => b.totalScore - a.totalScore);

  const selected: ScoredCandidate[] = [];
  const usedImages = new Set<string>([source.image]);
  const usedVarieties = new Set<string>();

  const pickWithDiversity = (pool: ScoredCandidate[], targetAdd: number) => {
    // Pass 1: strongly prefer distinct product imagery AND distinct varieties
    for (const item of pool) {
      if (selected.length >= count || targetAdd <= 0) break;
      if (selected.some((s) => s.product.id === item.product.id)) continue;
      if (usedImages.has(item.product.image)) continue;
      if (usedVarieties.has(item.product.variety) && pool.length > count + 1) continue;
      selected.push(item);
      usedImages.add(item.product.image);
      usedVarieties.add(item.product.variety);
      targetAdd -= 1;
    }
    // Pass 2: allow shared variety if needed, still preferring unique image
    for (const item of pool) {
      if (selected.length >= count || targetAdd <= 0) break;
      if (selected.some((s) => s.product.id === item.product.id)) continue;
      if (usedImages.has(item.product.image)) continue;
      selected.push(item);
      usedImages.add(item.product.image);
      targetAdd -= 1;
    }
    // Pass 3: fill any remaining slots by pure score
    for (const item of pool) {
      if (selected.length >= count || targetAdd <= 0) break;
      if (selected.some((s) => s.product.id === item.product.id)) continue;
      selected.push(item);
      targetAdd -= 1;
    }
  };

  // Pick 3 closest same-category products + 1 complementary pairing (when available)
  const wantSimilar = Math.max(1, count - 1);
  pickWithDiversity(sameCategoryPool, wantSimilar);
  if (selected.length < count && pairingPool.length > 0) {
    pickWithDiversity(pairingPool, 1);
  }
  if (selected.length < count) {
    pickWithDiversity(sameCategoryPool, count - selected.length);
  }

  return selected.map((item) => ({
    product: item.product,
    score: Math.round(Math.min(99, Math.max(68, item.totalScore))),
    kind: item.kind,
    reason: item.reason,
    matchedFinishId: item.matchedFinishId,
  }));
}
