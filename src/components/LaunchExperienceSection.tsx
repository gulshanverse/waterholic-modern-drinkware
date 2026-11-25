import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowUpRight,
  Award,
  Check,
  Compass,
  Droplets,
  Leaf,
  Package,
  ShieldCheck,
  Sparkles,
  Truck,
} from 'lucide-react';
import { PRODUCTS, type Product } from '../data/products';
import type { AddToBagPayload } from './CatalogSection';
import deskRitualImg from '../assets/images/waterholic_tumbler_logo_1795462018716.jpg';
import alpineKitImg from '../assets/images/waterholic_outdoor_logo_bottle_1795462017951.jpg';
import campusReserveImg from '../assets/images/waterholic_campus_study_logo_1795462052216.jpg';
import craftLabMacroImg from '../assets/images/launch_craft_lab_macro.jpg';
import { useCurrency } from '../contexts/CurrencyContext';

interface PressMention {
  id: string;
  publication: string;
  issue: string;
  quote: string;
  verdict: string;
}

const PRESS_MENTIONS: PressMention[] = [
  {
    id: 'wallpaper',
    publication: 'Wallpaper*',
    issue: 'Design Awards Shortlist · 2026',
    quote:
      '“Waterholic strips away the loud outdoorsy clichés of insulated flasks in favour of architectural calm, museum-grade powder coat, and a silhouette worthy of a Dieter Rams desk.”',
    verdict: 'Best Everyday Object',
  },
  {
    id: 'gear-patrol',
    publication: 'GEAR PATROL',
    issue: 'Field Lab Thermal Test',
    quote:
      '“After 24 hours in a 32°C test chamber, Waterholic’s copper-lined flagship still held ice at 4.1°C with zero exterior condensation. Easily our benchmark daily vessel.”',
    verdict: 'Editor’s Choice · 9.6/10',
  },
  {
    id: 'design-milk',
    publication: 'DESIGN MILK',
    issue: 'Minimalist Essentials',
    quote:
      '“From the rose-quartz luxury edition to the weighted borosilicate carafes, every gasket, cap thread, and laser-etched mark feels obsessively considered.”',
    verdict: 'Studio Favorite',
  },
  {
    id: 'outside',
    publication: 'Outside',
    issue: 'Gear of the Year Guide',
    quote:
      '“Featherweight Grade 1 titanium for alpine ridgelines and leakproof chug collars that survive tossed gym bags without a single drop lost.”',
    verdict: 'Tested on 400+ Trail Miles',
  },
  {
    id: 'fast-company',
    publication: 'FAST COMPANY',
    issue: 'Innovation by Design',
    quote:
      '“Pairing lifetime-warranted stainless vessels with campus refill challenges turns personal hydration into measurable, verifiable plastic reduction.”',
    verdict: 'Circular Design Honoree',
  },
];

const BRAND_GUARANTEES = [
  {
    icon: ShieldCheck,
    title: 'Lifetime Thermal Guarantee',
    detail: 'Vacuum seal replacement for life, no receipt hoops.',
  },
  {
    icon: Truck,
    title: 'Carbon-Neutral Express',
    detail: 'Complimentary dispatch on orders $60+ worldwide.',
  },
  {
    icon: Award,
    title: '18/8 Pro-Grade & PFAS-Free',
    detail: 'NSF/ANSI 51 tested food-contact stainless & glass.',
  },
  {
    icon: Sparkles,
    title: '30-Day Field Trial',
    detail: 'Carry it to desk, studio, or trail with effortless returns.',
  },
];

interface PressAndGuaranteeStripProps {
  onOpenFinder: () => void;
}

export function PressAndGuaranteeStrip({
  onOpenFinder,
}: PressAndGuaranteeStripProps) {
  const { formatPrice } = useCurrency();
  const [activePressId, setActivePressId] = useState<string>(
    PRESS_MENTIONS[0].id
  );

  const activePress =
    PRESS_MENTIONS.find((p) => p.id === activePressId) ?? PRESS_MENTIONS[0];

  return (
    <section
      id="recognition"
      className="launch-recognition-section"
      aria-label="Editorial recognition and brand guarantees"
    >
      <div className="container">
        <div className="press-editorial-card">
          <div className="press-header-row">
            <span className="launch-eyebrow">Global Press &amp; Lab Testing</span>
            <button
              type="button"
              className="press-finder-link"
              onClick={onOpenFinder}
            >
              <Compass size={15} aria-hidden="true" />
              <span>Take the 30-Second Vessel Finder</span>
              <ArrowUpRight size={14} aria-hidden="true" />
            </button>
          </div>

          <div
            className="press-quote-stage"
            aria-live="polite"
            aria-atomic="true"
          >
            <AnimatePresence mode="wait">
              <motion.blockquote
                key={activePress.id}
                className="press-quote-text"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
              >
                {activePress.quote}
                <footer className="press-quote-meta">
                  <span className="press-quote-pub">
                    {activePress.publication}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>{activePress.issue}</span>
                  <span aria-hidden="true">·</span>
                  <span className="press-quote-verdict">
                    {activePress.verdict}
                  </span>
                </footer>
              </motion.blockquote>
            </AnimatePresence>
          </div>

          <div
            className="press-logos-row"
            role="tablist"
            aria-label="Featured press publications"
          >
            {PRESS_MENTIONS.map((item) => {
              const isSelected = item.id === activePress.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  aria-selected={isSelected}
                  className={`press-logo-tab${isSelected ? ' is-active' : ''}`}
                  onClick={() => setActivePressId(item.id)}
                >
                  <span className={`press-wordmark press-wordmark--${item.id}`}>
                    {item.publication}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="guarantee-grid" aria-label="Waterholic brand guarantees">
          {BRAND_GUARANTEES.map((g) => {
            const Icon = g.icon;
            const detailText =
              g.title === 'Carbon-Neutral Express'
                ? `Complimentary dispatch on orders ${formatPrice(60)}+ worldwide.`
                : g.detail;
            return (
              <div key={g.title} className="guarantee-item">
                <div className="guarantee-icon-box" aria-hidden="true">
                  <Icon size={18} strokeWidth={1.9} />
                </div>
                <div className="guarantee-copy">
                  <h3 className="guarantee-title">{g.title}</h3>
                  <p className="guarantee-detail">{detailText}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ============================================================================
 * CURATED LAUNCH RITUAL SETS (#bundles)
 * ============================================================================ */

interface RitualBundleDefinition {
  id: string;
  edition: string;
  name: string;
  tagline: string;
  savings: number;
  image: string;
  imageAlt: string;
  productNames: string[];
  palettes: { id: string; label: string; hex: string; finishHint: string }[];
}

const RITUAL_BUNDLE_DEFS: RitualBundleDefinition[] = [
  {
    id: 'desk-ritual',
    edition: 'Ritual Set 01 · Studio & Desk',
    name: 'The Executive Desk Ritual',
    tagline:
      'All-day thermal precision from morning espresso to late-night desk refills, anchored by a borosilicate bedside carafe.',
    savings: 18,
    image: deskRitualImg,
    imageAlt: 'Waterholic Executive Desk Ritual insulated vessels in studio light',
    productNames: [
      'Waterholic Flagship Flask',
      'Ceramic-Coat Desk Hydration Tumbler',
      'Nordic Borosilicate Bedside Carafe Set',
    ],
    palettes: [
      { id: 'ocean', label: 'Ocean Blue', hex: '#0284C7', finishHint: 'blue' },
      { id: 'basalt', label: 'Basalt Black', hex: '#222624', finishHint: 'basalt' },
      { id: 'sage', label: 'Alpine Sage', hex: '#48634B', finishHint: 'sage' },
    ],
  },
  {
    id: 'alpine-weekend',
    edition: 'Ritual Set 02 · Trail & Expedition',
    name: 'The Alpine Weekend Kit',
    tagline:
      'Grade 1 titanium ultralight carry paired with basecamp 1.5L reserve capacity and backcountry gravity filtration.',
    savings: 24,
    image: alpineKitImg,
    imageAlt: 'Waterholic Alpine Weekend hydration kit in mountain lighting',
    productNames: [
      'Summit Titanium Ultralight Canteen',
      'Basecamp 1.5L Wide-Mouth Thermal Canteen',
      'Backcountry 4L Gravity Water Filter',
    ],
    palettes: [
      { id: 'ocean', label: 'Glacier Blue', hex: '#0284C7', finishHint: 'blue' },
      { id: 'basalt', label: 'Obsidian', hex: '#222624', finishHint: 'basalt' },
      { id: 'stone', label: 'Limestone', hex: '#C7C2B8', finishHint: 'stone' },
    ],
  },
  {
    id: 'atelier-reserve',
    edition: 'Ritual Set 03 · Launch Collector',
    name: 'The Atelier Collector Reserve',
    tagline:
      'Our flagship Rose Quartz copper-core vessel, UV-C self-cleaning purifier, and 40 oz studio quencher in one curated presentation.',
    savings: 26,
    image: campusReserveImg,
    imageAlt: 'Waterholic Atelier Collector Reserve three-vessel luxury set',
    productNames: [
      'Waterholic Rose Quartz Premium Bottle',
      'Lumina UV-C Self-Cleaning Bottle',
      'Ridge 40 oz Handle Quencher Tumbler',
    ],
    palettes: [
      { id: 'pink', label: 'Rose Quartz', hex: '#D69A94', finishHint: 'pink' },
      { id: 'ocean', label: 'Ocean Blue', hex: '#0284C7', finishHint: 'blue' },
      { id: 'basalt', label: 'Basalt Black', hex: '#222624', finishHint: 'basalt' },
    ],
  },
];

function resolveProductByName(name: string, fallbackIndex: number): Product {
  const exact = PRODUCTS.find(
    (p) => p.name.toLowerCase() === name.toLowerCase()
  );
  if (exact) return exact;
  return PRODUCTS[fallbackIndex % PRODUCTS.length];
}

interface CuratedRitualBundlesProps {
  onQuickViewProduct: (product: Product, finishId?: string) => void;
  onAddProductToBag: (payload: AddToBagPayload) => void;
  onOpenFinder: () => void;
  onShowToast: (msg: string) => void;
}

export function CuratedRitualBundles({
  onQuickViewProduct,
  onAddProductToBag,
  onOpenFinder,
  onShowToast,
}: CuratedRitualBundlesProps) {
  const { formatPrice } = useCurrency();
  const [selectedPalettes, setSelectedPalettes] = useState<
    Record<string, string>
  >(() =>
    RITUAL_BUNDLE_DEFS.reduce(
      (acc, def) => {
        acc[def.id] = def.palettes[0].id;
        return acc;
      },
      {} as Record<string, string>
    )
  );
  const [justAddedId, setJustAddedId] = useState<string | null>(null);

  const resolvedBundles = useMemo(() => {
    return RITUAL_BUNDLE_DEFS.map((def, defIdx) => {
      const items = def.productNames.map((name, i) =>
        resolveProductByName(name, defIdx * 3 + i)
      );
      const retailTotal = items.reduce((sum, p) => sum + p.price, 0);
      const bundlePrice = Math.max(1, retailTotal - def.savings);
      return {
        ...def,
        items,
        retailTotal,
        bundlePrice,
      };
    });
  }, []);

  const handleAddCompleteSet = (
    bundle: (typeof resolvedBundles)[number]
  ) => {
    const activePaletteId =
      selectedPalettes[bundle.id] ?? bundle.palettes[0].id;
    const activePalette =
      bundle.palettes.find((p) => p.id === activePaletteId) ??
      bundle.palettes[0];

    const perItemDiscount = Math.floor(bundle.savings / bundle.items.length);
    let remainingDiscount = bundle.savings;

    bundle.items.forEach((product, idx) => {
      const matchedFinish =
        product.finishes.find(
          (f) =>
            f.id === activePalette.finishHint ||
            f.name.toLowerCase().includes(activePalette.finishHint)
        ) ?? product.finishes[0];

      const defaultSize = product.sizes[0]?.label ?? product.capacity;
      const discountSlice =
        idx === bundle.items.length - 1
          ? remainingDiscount
          : perItemDiscount;
      remainingDiscount -= discountSlice;

      onAddProductToBag({
        product,
        finish: matchedFinish,
        sizeLabel: `${defaultSize} · ${bundle.name.replace(/^The\s+/i, '')}`,
        unitPrice: Math.max(12, product.price - discountSlice),
        qty: 1,
      });
    });

    setJustAddedId(bundle.id);
    onShowToast(
      `Added ${bundle.name} (${activePalette.label}), saved ${formatPrice(bundle.savings)}`
    );
    window.setTimeout(() => {
      setJustAddedId((curr) => (curr === bundle.id ? null : curr));
    }, 2200);
  };

  return (
    <section
      id="bundles"
      className="launch-bundles-section"
      aria-labelledby="bundles-heading"
    >
      <div className="container">
        <div className="launch-section-head">
          <div>
            <span className="launch-eyebrow">
              Curated Launch Editions · Save up to {formatPrice(26)}
            </span>
            <h2 id="bundles-heading" className="section-title">
              Ritual sets, calibrated together.
            </h2>
            <p className="section-sub">
              Three architect-curated hydration kits pairing our flagship
              vessels, tumblers, and filtration gear, delivered in embossed
              presentation boxes with complimentary carbon-neutral express
              shipping.
            </p>
          </div>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={onOpenFinder}
          >
            <Compass size={16} aria-hidden="true" />
            <span>Not sure? Take 30s Finder</span>
          </button>
        </div>

        <div className="ritual-bundles-grid">
          {resolvedBundles.map((bundle) => {
            const activePaletteId =
              selectedPalettes[bundle.id] ?? bundle.palettes[0].id;
            const activePalette =
              bundle.palettes.find((p) => p.id === activePaletteId) ??
              bundle.palettes[0];
            const isAdded = justAddedId === bundle.id;

            return (
              <article key={bundle.id} className="ritual-bundle-card">
                <div className="ritual-bundle-media">
                  <img
                    src={bundle.image}
                    alt={bundle.imageAlt}
                    loading="lazy"
                    className="ritual-bundle-img"
                  />
                  <div className="ritual-bundle-media-overlay">
                    <span className="ritual-bundle-edition">
                      {bundle.edition}
                    </span>
                    <span className="ritual-bundle-savings tabular-nums">
                      Save {formatPrice(bundle.savings)}
                    </span>
                  </div>
                </div>

                <div className="ritual-bundle-body">
                  <div className="ritual-bundle-top">
                    <h3 className="ritual-bundle-title">{bundle.name}</h3>
                    <p className="ritual-bundle-tagline">{bundle.tagline}</p>
                  </div>

                  <div className="ritual-bundle-palette-row">
                    <span className="ritual-meta-label">
                      Finish Pairing · <strong>{activePalette.label}</strong>
                    </span>
                    <div
                      className="ritual-palette-swatches"
                      role="radiogroup"
                      aria-label={`Choose finish pairing for ${bundle.name}`}
                    >
                      {bundle.palettes.map((pal) => {
                        const selected = pal.id === activePalette.id;
                        return (
                          <button
                            key={pal.id}
                            type="button"
                            role="radio"
                            aria-checked={selected}
                            aria-label={`${pal.label} pairing`}
                            className={`ritual-swatch-btn${
                              selected ? ' is-active' : ''
                            }`}
                            onClick={() =>
                              setSelectedPalettes((prev) => ({
                                ...prev,
                                [bundle.id]: pal.id,
                              }))
                            }
                          >
                            <span
                              className="ritual-swatch-dot"
                              style={{ background: pal.hex }}
                            />
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="ritual-manifest">
                    <span className="ritual-meta-label">
                      Includes 3 Full-Size Pieces
                    </span>
                    <ul className="ritual-manifest-list">
                      {bundle.items.map((item) => (
                        <li key={item.id} className="ritual-manifest-item">
                          <button
                            type="button"
                            className="ritual-manifest-link"
                            onClick={() =>
                              onQuickViewProduct(
                                item,
                                activePalette.finishHint
                              )
                            }
                          >
                            <span className="ritual-manifest-name">
                              <Package size={13} aria-hidden="true" />
                              <span>{item.name}</span>
                            </span>
                            <span className="ritual-manifest-price tabular-nums">
                              {formatPrice(item.price)}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="ritual-bundle-footer">
                    <div className="ritual-price-block tabular-nums">
                      <span className="ritual-price-current">
                        {formatPrice(bundle.bundlePrice)}
                      </span>
                      <span className="ritual-price-compare">
                        {formatPrice(bundle.retailTotal)}
                      </span>
                      <span className="ritual-price-save">
                        Free Express Shipping
                      </span>
                    </div>

                    <button
                      type="button"
                      className={`btn btn-full ${
                        isAdded ? 'btn-added-state' : 'btn-primary'
                      }`}
                      onClick={() => handleAddCompleteSet(bundle)}
                    >
                      {isAdded ? (
                        <>
                          <Check size={16} aria-hidden="true" />
                          <span>Set Added to Bag</span>
                        </>
                      ) : (
                        <span>
                          Add Complete Set · {formatPrice(bundle.bundlePrice)}
                        </span>
                      )}
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ============================================================================
 * MATERIALS, LAB PROOF & INTERACTIVE PLASTIC IMPACT LEDGER (#impact)
 * ============================================================================ */

const LAB_BENCHMARKS = [
  { label: 'Vacuum Chamber', value: '10⁻⁵ Torr Dual-Wall' },
  { label: 'Thermal Shield', value: '0.18 mm Electro-Copper' },
  { label: 'Food Contact Lab', value: 'NSF/ANSI 51 · PFAS-Free' },
  { label: 'Acoustic & Drop', value: '1.5 m Powder-Coat Spec' },
];

export function CraftsmanshipAndImpactLedger() {
  const { formatPrice } = useCurrency();
  const [dailyRefills, setDailyRefills] = useState<number>(3);

  const metrics = useMemo(() => {
    const bottlesPerYear = dailyRefills * 365;
    // Standard 500ml PET bottle lifecycle footprint ~82.8g CO2e; avg retail bottled water $1.45
    const co2KgPerYear = Number((bottlesPerYear * 0.0828).toFixed(1));
    const dollarsSavedPerYear = Math.round(bottlesPerYear * 1.45);
    const fiveYearBottles = bottlesPerYear * 5;
    const fiveYearSaved = dollarsSavedPerYear * 5;
    return {
      bottlesPerYear,
      co2KgPerYear,
      dollarsSavedPerYear,
      fiveYearBottles,
      fiveYearSaved,
    };
  }, [dailyRefills]);

  return (
    <section
      id="impact"
      className="launch-impact-section"
      aria-labelledby="impact-heading"
    >
      <div className="container">
        <div className="impact-split-grid">
          {/* Left: Precision Metallurgy & Lab Spec Proof */}
          <div className="craft-lab-card">
            <div className="craft-lab-media">
              <img
                src={craftLabMacroImg}
                alt="Macro cross-section of brushed 18/8 stainless steel and interior copper thermal lining with condensation droplets"
                loading="lazy"
                className="craft-lab-img"
              />
              <div className="craft-lab-caption">
                <span className="craft-lab-tag">
                  Materials Lab · Batch Spec 2026.4
                </span>
                <p>
                  Electro-polished 18/8 surgical steel bonded to an internal
                  pure-copper radiation barrier, eliminating metallic flavor
                  transfer and condensation permanently.
                </p>
              </div>
            </div>

            <div className="craft-lab-specs">
              {LAB_BENCHMARKS.map((spec) => (
                <div key={spec.label} className="craft-spec-cell">
                  <span className="craft-spec-label">{spec.label}</span>
                  <span className="craft-spec-value tabular-nums">
                    {spec.value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Interactive Plastic & Cost Impact Ledger */}
          <div className="impact-ledger-card">
            <span className="launch-eyebrow">
              Verified Circular Impact Ledger
            </span>
            <h2 id="impact-heading" className="impact-title">
              One vessel replaces thousands of single-use bottles.
            </h2>
            <p className="impact-sub">
              Dial in your daily refill cadence to calculate the exact
              environmental and financial dividend of switching to a
              lifetime-warranted Waterholic vessel.
            </p>

            <div className="impact-slider-panel">
              <div className="impact-slider-head">
                <label htmlFor="refill-slider" className="impact-slider-label">
                  Daily Refills (500 ml equiv.)
                </label>
                <span className="impact-slider-readout tabular-nums">
                  {dailyRefills} refills / day
                </span>
              </div>

              <input
                id="refill-slider"
                type="range"
                min={1}
                max={8}
                step={1}
                value={dailyRefills}
                onChange={(e) => setDailyRefills(Number(e.target.value))}
                className="impact-range-input"
                aria-valuemin={1}
                aria-valuemax={8}
                aria-valuenow={dailyRefills}
              />

              <div className="impact-presets">
                {[
                  { label: 'Desk · 2/day', value: 2 },
                  { label: 'Everyday · 3/day', value: 3 },
                  { label: 'Active · 5/day', value: 5 },
                  { label: 'Athlete · 7/day', value: 7 },
                ].map((preset) => (
                  <button
                    key={preset.value}
                    type="button"
                    className={`impact-preset-btn${
                      dailyRefills === preset.value ? ' is-active' : ''
                    }`}
                    onClick={() => setDailyRefills(preset.value)}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="impact-metrics-grid tabular-nums">
              <div className="impact-metric-box">
                <Droplets
                  size={18}
                  className="impact-metric-icon"
                  aria-hidden="true"
                />
                <span className="impact-metric-num">
                  {metrics.bottlesPerYear.toLocaleString()}
                </span>
                <span className="impact-metric-desc">
                  Plastic bottles avoided / yr
                </span>
              </div>

              <div className="impact-metric-box">
                <Leaf
                  size={18}
                  className="impact-metric-icon"
                  aria-hidden="true"
                />
                <span className="impact-metric-num">
                  {metrics.co2KgPerYear} kg
                </span>
                <span className="impact-metric-desc">CO₂e prevented / yr</span>
              </div>

              <div className="impact-metric-box">
                <Sparkles
                  size={18}
                  className="impact-metric-icon"
                  aria-hidden="true"
                />
                <span className="impact-metric-num">
                  {formatPrice(metrics.dollarsSavedPerYear)}
                </span>
                <span className="impact-metric-desc">
                  Saved vs. bottled water / yr
                </span>
              </div>
            </div>

            <div className="impact-horizon-bar tabular-nums">
              <div>
                <span className="impact-horizon-kicker">
                  5-Year Waterholic Ownership Horizon
                </span>
                <p className="impact-horizon-val">
                  <strong>{metrics.fiveYearBottles.toLocaleString()}</strong>{' '}
                  plastic bottles eliminated ·{' '}
                  <strong>{formatPrice(metrics.fiveYearSaved)}</strong>{' '}
                  kept in your pocket
                </p>
              </div>
              <a href="#order" className="btn btn-primary btn-sm">
                Personalize Yours
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
