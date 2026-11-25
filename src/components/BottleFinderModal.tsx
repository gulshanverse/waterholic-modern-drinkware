import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowLeft,
  Check,
  Compass,
  Droplets,
  Flame,
  Home,
  Mountain,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Sun,
  X,
} from 'lucide-react';
import { PRODUCTS, type Product } from '../data/products';
import { BottleColorImage } from './BottleColorImage';
import { triggerAddToBagHaptic } from '../utils/hapticFeedback';
import type { AddToBagPayload } from './CatalogSection';
import { useCurrency } from '../contexts/CurrencyContext';

type RhythmChoice = 'desk' | 'campus' | 'trail' | 'home';
type PriorityChoice = 'ice' | 'hotcold' | 'purify' | 'ultralight';
type PaletteChoice = 'ocean' | 'basalt' | 'rose' | 'sage';

interface BottleFinderModalProps {
  open: boolean;
  onClose: () => void;
  onQuickView: (product: Product, finishId?: string) => void;
  onAddToBag: (payload: AddToBagPayload) => void;
}

const RHYTHM_OPTIONS: {
  id: RhythmChoice;
  title: string;
  desc: string;
  icon: typeof Sun;
}[] = [
  {
    id: 'desk',
    title: 'Desk & Studio',
    desc: 'Cup-holder friendly tumblers, architectural silhouettes, quiet sips.',
    icon: Sun,
  },
  {
    id: 'campus',
    title: 'Campus & Commute',
    desc: 'Leakproof backpack carry from morning lectures to evening workouts.',
    icon: Compass,
  },
  {
    id: 'trail',
    title: 'Alpine & Athletics',
    desc: 'High-capacity rugged steel, ultralight titanium, and trail packs.',
    icon: Mountain,
  },
  {
    id: 'home',
    title: 'Home & Hosting',
    desc: 'Borosilicate carafes, ceramic pitchers, and crystal-clear iceware.',
    icon: Home,
  },
];

const PRIORITY_OPTIONS: {
  id: PriorityChoice;
  title: string;
  desc: string;
  icon: typeof Droplets;
}[] = [
  {
    id: 'ice',
    title: '36h+ Extreme Ice Cold',
    desc: 'Copper-lined triple insulation that keeps ice intact overnight.',
    icon: Droplets,
  },
  {
    id: 'hotcold',
    title: 'All-Day Hot & Cold',
    desc: 'Morning pour-over coffee and chilled afternoon mineral water.',
    icon: Flame,
  },
  {
    id: 'purify',
    title: 'UV-C & Active Filtration',
    desc: 'Self-cleaning purification and crisp carbon filtration anywhere.',
    icon: ShieldCheck,
  },
  {
    id: 'ultralight',
    title: 'Featherlight & Pure Taste',
    desc: 'Grade 1 titanium, ceramic lining, or laboratory borosilicate glass.',
    icon: Sparkles,
  },
];

const PALETTE_OPTIONS: {
  id: PaletteChoice;
  title: string;
  desc: string;
  swatches: string[];
  finishHint: string;
}[] = [
  {
    id: 'ocean',
    title: 'Ocean & Glacier',
    desc: 'Signature coastal blue and brushed glacial silver tones.',
    swatches: ['#0284C7', '#B4BDB8', '#E8F2F5'],
    finishHint: 'blue',
  },
  {
    id: 'basalt',
    title: 'Basalt & Obsidian',
    desc: 'Matte architectural charcoal and monochrome stealth finishes.',
    swatches: ['#222624', '#59686B', '#111827'],
    finishHint: 'basalt',
  },
  {
    id: 'rose',
    title: 'Rose Quartz & Stone',
    desc: 'Warm satin rose pink, champagne steel, and soft limestone.',
    swatches: ['#D69A94', '#E495A6', '#C7C2B8'],
    finishHint: 'pink',
  },
  {
    id: 'sage',
    title: 'Alpine Sage & Botanical',
    desc: 'Earthy forest moss, botanical sage, and natural slate.',
    swatches: ['#48634B', '#526B56', '#8FA996'],
    finishHint: 'sage',
  },
];

interface ScoredRecommendation {
  product: Product;
  matchPct: number;
  rationale: string;
  recommendedFinish: Product['finishes'][number];
}

export function BottleFinderModal({
  open,
  onClose,
  onQuickView,
  onAddToBag,
}: BottleFinderModalProps) {
  const { formatPrice } = useCurrency();
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [rhythm, setRhythm] = useState<RhythmChoice | null>(null);
  const [priority, setPriority] = useState<PriorityChoice | null>(null);
  const [palette, setPalette] = useState<PaletteChoice | null>(null);
  const [addedIds, setAddedIds] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  const recommendations = useMemo<ScoredRecommendation[]>(() => {
    if (!rhythm || !priority || !palette) return [];

    const paletteObj =
      PALETTE_OPTIONS.find((p) => p.id === palette) ?? PALETTE_OPTIONS[0];

    const scored = PRODUCTS.map((product) => {
      let score = 62;
      const reasons: string[] = [];
      const text = `${product.name} ${product.variety} ${product.material} ${product.highlightSpec} ${product.description}`.toLowerCase();

      // Rhythm match
      if (rhythm === 'desk') {
        if (product.category === 'tumblers') {
          score += 18;
          reasons.push('designed for studio & desk rhythm');
        } else if (product.category === 'bottles' && product.featured) {
          score += 14;
          reasons.push('clean architectural desk silhouette');
        } else if (product.category === 'carafes') {
          score += 12;
        }
      } else if (rhythm === 'campus') {
        if (product.category === 'bottles') {
          score += 18;
          reasons.push('leakproof backpack-ready carry');
        } else if (product.category === 'tumblers' || product.category === 'filters') {
          score += 12;
        }
      } else if (rhythm === 'trail') {
        if (
          product.category === 'packs' ||
          text.includes('titanium') ||
          text.includes('trail') ||
          text.includes('basecamp') ||
          text.includes('alpine')
        ) {
          score += 20;
          reasons.push('built for high-output trail endurance');
        } else if (product.category === 'bottles') {
          score += 10;
        }
      } else if (rhythm === 'home') {
        if (product.category === 'carafes' || product.category === 'ice') {
          score += 22;
          reasons.push('elevates home table & bedside rituals');
        } else if (product.category === 'filters' && text.includes('pitcher')) {
          score += 18;
          reasons.push('crisp countertop filtration for home');
        }
      }

      // Priority match
      if (priority === 'ice') {
        if (text.includes('36h') || text.includes('copper') || text.includes('24h') || text.includes('frost')) {
          score += 16;
          reasons.push('copper-core long cold retention');
        }
      } else if (priority === 'hotcold') {
        if (text.includes('hot') || text.includes('18h') || text.includes('12h') || text.includes('mug')) {
          score += 16;
          reasons.push('dual hot & cold thermal lock');
        }
      } else if (priority === 'purify') {
        if (product.category === 'filters' || text.includes('uv-c') || text.includes('filter') || text.includes('purif')) {
          score += 22;
          reasons.push('active purification built right in');
        }
      } else if (priority === 'ultralight') {
        if (text.includes('titanium') || text.includes('ceramic') || text.includes('borosilicate') || text.includes('ultralight')) {
          score += 20;
          reasons.push('zero-taste-transfer pure material');
        }
      }

      // Palette affinity & bonus for flagship / high ratings
      const matchedFinish =
        product.finishes.find(
          (f) =>
            f.id === paletteObj.finishHint ||
            f.name.toLowerCase().includes(paletteObj.finishHint)
        ) ?? product.finishes[0];

      if (matchedFinish.id === paletteObj.finishHint) {
        score += 6;
      }
      if (product.featured) {
        score += 5;
      }
      score += Math.round((product.rating - 4.5) * 6);

      const finalPct = Math.min(99, Math.max(84, score));
      const rationale =
        reasons.length > 0
          ? `${reasons[0][0].toUpperCase()}${reasons[0].slice(1)}${
              reasons[1] ? ` with ${reasons[1]}` : ''
            }.`
          : `${product.highlightSpec} in ${matchedFinish.name}.`;

      return {
        product,
        matchPct: finalPct,
        rationale,
        recommendedFinish: matchedFinish,
      };
    });

    // Diversify top 3 so we don't repeat near-identical varieties
    scored.sort((a, b) => b.matchPct - a.matchPct || b.product.reviews - a.product.reviews);
    const picked: ScoredRecommendation[] = [];
    const seenVarieties = new Set<string>();
    for (const entry of scored) {
      if (picked.length >= 3) break;
      if (!seenVarieties.has(entry.product.variety) || picked.length === 2) {
        picked.push(entry);
        seenVarieties.add(entry.product.variety);
      }
    }
    return picked;
  }, [rhythm, priority, palette]);

  const handleRestart = () => {
    setRhythm(null);
    setPriority(null);
    setPalette(null);
    setAddedIds({});
    setStep(1);
  };

  if (!open) return null;

  const progressPct = step === 4 ? 100 : (step / 3) * 100;

  return (
    <div
      className="finder-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="finder-modal-title"
      onClick={onClose}
      data-lenis-prevent
    >
      <div
        className="finder-modal"
        onClick={(e) => e.stopPropagation()}
        data-lenis-prevent
      >
        <div className="finder-topbar">
          <div className="finder-topbar-left">
            {step > 1 && (
              <button
                type="button"
                className="finder-back-btn"
                aria-label="Previous step"
                onClick={() => setStep((s) => (s > 1 ? ((s - 1) as 1 | 2 | 3) : 1))}
              >
                <ArrowLeft size={16} aria-hidden="true" />
                <span>Back</span>
              </button>
            )}
            <span className="finder-step-indicator tabular-nums">
              {step < 4 ? `Step 0${step} / 03 · Bespoke Vessel Finder` : 'Your Tailored Edit'}
            </span>
          </div>

          <button
            type="button"
            className="icon-btn"
            aria-label="Close vessel finder"
            onClick={onClose}
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <div className="finder-progress-track" aria-hidden="true">
          <div
            className="finder-progress-fill"
            style={{ width: `${progressPct}%` }}
          />
        </div>

        <div className="finder-body">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div
                key="step-1"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.22 }}
              >
                <h2 id="finder-modal-title" className="finder-heading">
                  Where does your hydration live most?
                </h2>
                <p className="finder-sub">
                  Select your primary daily environment so we can calibrate
                  capacity, cap ergonomics, and silhouette.
                </p>

                <div className="finder-options-grid">
                  {RHYTHM_OPTIONS.map((opt) => {
                    const Icon = opt.icon;
                    const selected = rhythm === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        className={`finder-option-card${
                          selected ? ' is-selected' : ''
                        }`}
                        onClick={() => {
                          setRhythm(opt.id);
                          setStep(2);
                        }}
                      >
                        <span className="finder-option-icon" aria-hidden="true">
                          <Icon size={20} strokeWidth={1.8} />
                        </span>
                        <span className="finder-option-title">{opt.title}</span>
                        <span className="finder-option-desc">{opt.desc}</span>
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step-2"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.22 }}
              >
                <h2 id="finder-modal-title" className="finder-heading">
                  What matters most in every sip?
                </h2>
                <p className="finder-sub">
                  Choose the engineering priority that matters most to your
                  routine.
                </p>

                <div className="finder-options-grid">
                  {PRIORITY_OPTIONS.map((opt) => {
                    const Icon = opt.icon;
                    const selected = priority === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        className={`finder-option-card${
                          selected ? ' is-selected' : ''
                        }`}
                        onClick={() => {
                          setPriority(opt.id);
                          setStep(3);
                        }}
                      >
                        <span className="finder-option-icon" aria-hidden="true">
                          <Icon size={20} strokeWidth={1.8} />
                        </span>
                        <span className="finder-option-title">{opt.title}</span>
                        <span className="finder-option-desc">{opt.desc}</span>
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div
                key="step-3"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.22 }}
              >
                <h2 id="finder-modal-title" className="finder-heading">
                  Pick your signature finish family.
                </h2>
                <p className="finder-sub">
                  We’ll preview your matched vessels directly in your preferred
                  colourway.
                </p>

                <div className="finder-options-grid">
                  {PALETTE_OPTIONS.map((opt) => {
                    const selected = palette === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        className={`finder-option-card${
                          selected ? ' is-selected' : ''
                        }`}
                        onClick={() => {
                          setPalette(opt.id);
                          setStep(4);
                        }}
                      >
                        <span
                          className="finder-swatch-trio"
                          aria-hidden="true"
                        >
                          {opt.swatches.map((hex) => (
                            <span
                              key={hex}
                              className="finder-swatch-chip"
                              style={{ background: hex }}
                            />
                          ))}
                        </span>
                        <span className="finder-option-title">{opt.title}</span>
                        <span className="finder-option-desc">{opt.desc}</span>
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {step === 4 && (
              <motion.div
                key="step-4"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.24 }}
              >
                <div className="finder-results-head">
                  <div>
                    <h2 id="finder-modal-title" className="finder-heading">
                      Your 3 matched vessels.
                    </h2>
                    <p className="finder-sub">
                      Curated from {PRODUCTS.length} engineered Waterholic
                      essentials to fit your exact daily ritual.
                    </p>
                  </div>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={handleRestart}
                  >
                    <RotateCcw size={14} aria-hidden="true" />
                    <span>Retake</span>
                  </button>
                </div>

                <div className="finder-results-grid">
                  {recommendations.map((rec, idx) => {
                    const isAdded = Boolean(addedIds[rec.product.id]);
                    const defaultSize =
                      rec.product.sizes[0]?.label ?? rec.product.capacity;
                    return (
                      <article key={rec.product.id} className="finder-result-card">
                        <div className="finder-result-media">
                          <span className="finder-match-score tabular-nums">
                            {idx === 0 ? 'Top Match · ' : ''}
                            {rec.matchPct}%
                          </span>
                          <BottleColorImage
                            src={rec.product.image}
                            alt={`${rec.product.name} in ${rec.recommendedFinish.name}`}
                            finish={rec.recommendedFinish}
                            className="finder-result-img"
                            maxDimension={420}
                          />
                        </div>

                        <div className="finder-result-body">
                          <span className="finder-result-meta">
                            {rec.recommendedFinish.name} · {rec.product.capacity}
                          </span>
                          <h3 className="finder-result-title">
                            {rec.product.name}
                          </h3>
                          <p className="finder-result-rationale">
                            {rec.rationale}
                          </p>
                          <div className="finder-result-price-row tabular-nums">
                            <span className="finder-result-price">
                              {formatPrice(rec.product.price)}
                            </span>
                            <span className="finder-result-rating">
                              ★ {rec.product.rating.toFixed(1)}
                            </span>
                          </div>

                          <div className="finder-result-actions">
                            <button
                              type="button"
                              className={`btn btn-sm ${
                                isAdded ? 'btn-added-state' : 'btn-primary'
                              }`}
                              onClick={(e) => {
                                triggerAddToBagHaptic(e.currentTarget);
                                onAddToBag({
                                  product: rec.product,
                                  finish: rec.recommendedFinish,
                                  sizeLabel: defaultSize,
                                  unitPrice: rec.product.price,
                                  qty: 1,
                                });
                                setAddedIds((prev) => ({
                                  ...prev,
                                  [rec.product.id]: true,
                                }));
                              }}
                            >
                              {isAdded ? (
                                <>
                                  <Check size={14} aria-hidden="true" />
                                  <span>Added</span>
                                </>
                              ) : (
                                <span>Add to Bag</span>
                              )}
                            </button>
                            <button
                              type="button"
                              className="btn btn-ghost btn-sm"
                              onClick={() => {
                                onClose();
                                onQuickView(
                                  rec.product,
                                  rec.recommendedFinish.id
                                );
                              }}
                            >
                              Details
                            </button>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
