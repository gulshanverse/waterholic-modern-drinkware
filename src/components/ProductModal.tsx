import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowUpRight,
  ChevronDown,
  ChevronUp,
  Heart,
  Share2,
  Star,
  ThumbsUp,
} from 'lucide-react';
import { CATEGORY_MAP, PRODUCTS, type Product } from '../data/products';
import type { ProductReview } from '../types/profile';
import type { AddToBagPayload } from './CatalogSection';
import { BottleColorImage } from './BottleColorImage';
import { ProductModalSkeleton } from './ShimmerSkeletons';
import { triggerAddToBagHaptic } from '../utils/hapticFeedback';
import { getRecommendedProducts } from '../utils/productRecommendations';
import { useCurrency } from '../contexts/CurrencyContext';

interface ProductModalProps {
  product: Product | null;
  initialFinishId?: string;
  isSaved: boolean;
  isLoading?: boolean;
  customReviews: ProductReview[];
  defaultAuthor: string;
  onClose: () => void;
  onToggleSave: (productId: string) => void;
  onAddToBag: (payload: AddToBagPayload) => void;
  onSelectProduct: (product: Product, finishId?: string) => void;
  onShareProduct?: (product: Product, finishId: string) => void;
  onSubmitReview: (
    productId: string,
    review: Omit<ProductReview, 'id' | 'date'>
  ) => void;
}

interface RichProductReview extends ProductReview {
  finishUsed?: string;
  helpfulBase: number;
}

type RatingFilter = 'all' | 5 | 4 | 'low';

const STAR_LABELS: Record<number, string> = {
  0: 'Tap a star to rate',
  1: '1 / 5 · Poor',
  2: '2 / 5 · Fair',
  3: '3 / 5 · Good',
  4: '4 / 5 · Very Good',
  5: '5 / 5 · Excellent',
};

function hashString(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

function buildProductReviews(product: Product): RichProductReview[] {
  const seed = hashString(product.id);
  const finishNames = product.finishes.map((f) => f.name);
  const pickFinish = (offset: number) =>
    finishNames[(seed + offset) % finishNames.length] ?? 'Signature Finish';

  const mat = product.material.toLowerCase();
  const spec = product.highlightSpec.toLowerCase();
  const cap = product.capacity;
  const catShort = CATEGORY_MAP[product.category]?.shortName ?? 'Hydration';

  const templates: Array<{
    author: string;
    date: string;
    rating: number;
    helpfulBase: number;
    comment: string;
  }> = [
    {
      author: 'Maya K.',
      date: 'Nov 2026',
      rating: 5,
      helpfulBase: 42,
      comment: `Picked up the ${product.name} for daily campus classes and evening workouts. Zero leaks tossed sideways into my backpack, the ${pickFinish(0)} coat still looks brand new after months of use, and ${spec} genuinely holds up all day.`,
    },
    {
      author: 'Daniel R.',
      date: 'Oct 2026',
      rating: 5,
      helpfulBase: 31,
      comment: `Really impressed with the ${mat} craftsmanship and how balanced the ${cap} size feels in hand. I switched from disposable bottles completely and this has become my constant desk companion.`,
    },
    {
      author: 'Priya S.',
      date: 'Oct 2026',
      rating: 4,
      helpfulBase: 19,
      comment: `Love the clean aesthetic in ${pickFinish(1)} and the performance (${product.highlightSpec}). Only minor note is it is slightly snug in older car cupholders, otherwise an easy daily favourite.`,
    },
    {
      author: 'Jordan T.',
      date: 'Sep 2026',
      rating: 5,
      helpfulBase: 27,
      comment: `Took the ${product.name} on a 3-day mountain trail trip and several long flights. Dropped it twice on gravel and barely got a scuff. The seal threads smoothly without ever feeling stiff or squeaky.`,
    },
    {
      author: 'Elena M.',
      date: 'Sep 2026',
      rating: 5,
      helpfulBase: 24,
      comment: `Best ${catShort.toLowerCase()} purchase I have made this year. Zero metallic aftertaste, super easy to rinse out between refills, and the ${pickFinish(2)} finish gets compliments in every lecture hall.`,
    },
    {
      author: 'Marcus W.',
      date: 'Aug 2026',
      rating: 4,
      helpfulBase: 14,
      comment: `Solid ${mat} build and accurate ${cap} capacity. Keeps water crisp through back-to-back lab sessions. I grabbed a second one in ${pickFinish(3)} for my gym bag so I never forget it at home.`,
    },
    {
      author: 'Sofia L.',
      date: 'Aug 2026',
      rating: 5,
      helpfulBase: 36,
      comment: `Gifted the ${product.name} to my roommate and ended up ordering one for myself the same week. Every detail, from the wide grip to ${spec}, feels thoughtfully engineered instead of flimsy.`,
    },
    {
      author: 'Noah B.',
      date: 'Jul 2026',
      rating: 5,
      helpfulBase: 18,
      comment: `I track 2.5L of water a day and the ${cap} form factor makes hitting my hydration goal effortless. No condensation rings on my laptop desk even on humid summer afternoons.`,
    },
    {
      author: 'Hannah C.',
      date: 'Jul 2026',
      rating: 3,
      helpfulBase: 9,
      comment: `Great visual finish in ${pickFinish(4)} and reliable ${spec}. I personally wish it came with an extra spare silicone gasket in the box, though customer support confirmed replacements are easy to order.`,
    },
    {
      author: 'Aarav P.',
      date: 'Jun 2026',
      rating: 5,
      helpfulBase: 22,
      comment: `Waterholic nailed the ergonomics on this ${product.variety.toLowerCase()} design. Fits cleanly into side backpack pockets, opens smoothly with one hand during commutes, and cleans up effortlessly.`,
    },
    {
      author: 'Chloe D.',
      date: 'Jun 2026',
      rating: 4,
      helpfulBase: 11,
      comment: `Really durable everyday piece. After a full semester of dorm life and library study marathons, the ${pickFinish(5)} coating has held up far better than pricier bottles I owned before.`,
    },
    {
      author: 'Liam G.',
      date: 'May 2026',
      rating: 5,
      helpfulBase: 16,
      comment: `Exact weight and proportions I wanted for travel. Zero rattling parts, pure water taste, and ${product.highlightSpec} performs exactly as advertised.`,
    },
  ];

  // Rotate starting offset deterministically per product so every product feels distinct
  const offset = seed % templates.length;
  const ordered = [
    ...templates.slice(offset),
    ...templates.slice(0, offset),
  ];

  return ordered.map((tpl, idx) => ({
    id: `${product.id}-rev-${idx + 1}`,
    author: tpl.author,
    rating: tpl.rating,
    date: tpl.date,
    comment: tpl.comment,
    verified: true,
    finishUsed: pickFinish(idx),
    helpfulBase: tpl.helpfulBase + ((seed + idx * 7) % 15),
  }));
}

function ReviewStarDisplay({ rating, size = 14 }: { rating: number; size?: number }) {
  const clamped = Math.max(0, Math.min(5, Math.round(rating)));
  return (
    <span
      className="review-stars-visual"
      aria-label={`${clamped} out of 5 stars`}
    >
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = star <= clamped;
        return (
          <Star
            key={star}
            size={size}
            className={`review-star-icon${filled ? ' is-filled' : ''}`}
            aria-hidden="true"
          />
        );
      })}
    </span>
  );
}

const INITIAL_REVIEWS_VISIBLE = 3;
const REVIEWS_PAGE_STEP = 4;
const COMMENT_TRUNCATE_LEN = 145;

export function ProductModal({
  product,
  initialFinishId,
  isSaved,
  isLoading = false,
  customReviews,
  defaultAuthor,
  onClose,
  onToggleSave,
  onAddToBag,
  onSelectProduct,
  onShareProduct,
  onSubmitReview,
}: ProductModalProps) {
  const { formatPrice } = useCurrency();
  const [finishIdx, setFinishIdx] = useState(0);
  const [sizeIdx, setSizeIdx] = useState(0);
  const [qty, setQty] = useState(1);
  const [imgError, setImgError] = useState(false);
  const [detailHydrating, setDetailHydrating] = useState(false);
  const [modalJustAdded, setModalJustAdded] = useState(false);

  // Review composer state: starts empty (0 stars) so clicking 1..5 fills empty -> golden
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewAuthor, setReviewAuthor] = useState(defaultAuthor);
  const [reviewRating, setReviewRating] = useState<number>(0);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [ratingError, setRatingError] = useState(false);
  const [reviewText, setReviewText] = useState('');

  // Reviews browsing state (filter, read more reviews pagination, expandable long comments, helpful votes)
  const [ratingFilter, setRatingFilter] = useState<RatingFilter>('all');
  const [visibleReviewCount, setVisibleReviewCount] = useState(
    INITIAL_REVIEWS_VISIBLE
  );
  const [expandedReviewIds, setExpandedReviewIds] = useState<Set<string>>(
    () => new Set()
  );
  const [helpfulVotedIds, setHelpfulVotedIds] = useState<Set<string>>(
    () => new Set()
  );
  const modalRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!product) return;
    const matchedFinish = initialFinishId
      ? product.finishes.findIndex((f) => f.id === initialFinishId)
      : 0;
    setFinishIdx(matchedFinish >= 0 ? matchedFinish : 0);
    const defaultSizeIdx = product.sizes.findIndex((s) => s.priceDelta === 0);
    setSizeIdx(defaultSizeIdx >= 0 ? defaultSizeIdx : 0);
    setQty(1);
    setImgError(false);
    setModalJustAdded(false);
    setShowReviewForm(false);
    setReviewAuthor(defaultAuthor);
    setReviewRating(0);
    setHoverRating(0);
    setRatingError(false);
    setReviewText('');
    setRatingFilter('all');
    setVisibleReviewCount(INITIAL_REVIEWS_VISIBLE);
    setExpandedReviewIds(new Set());

    // Pre-warm primary product image while displaying crisp shimmer skeleton
    setDetailHydrating(true);
    let cancelled = false;
    let minDelayDone = false;
    let imgReady = false;

    const finishLoadingIfReady = () => {
      if (!cancelled && minDelayDone && imgReady) {
        setDetailHydrating(false);
      }
    };

    const preload = new Image();
    preload.referrerPolicy = 'no-referrer';
    preload.onload = () => {
      imgReady = true;
      finishLoadingIfReady();
    };
    preload.onerror = () => {
      imgReady = true;
      finishLoadingIfReady();
    };
    preload.src = product.image;
    if (preload.complete) {
      imgReady = true;
    }

    const minTimer = window.setTimeout(() => {
      minDelayDone = true;
      finishLoadingIfReady();
    }, 300);

    // Hard safety cap so slow networks never stall the modal skeleton
    const maxTimer = window.setTimeout(() => {
      if (!cancelled) setDetailHydrating(false);
    }, 900);

    return () => {
      cancelled = true;
      window.clearTimeout(minTimer);
      window.clearTimeout(maxTimer);
    };
  }, [product, initialFinishId, defaultAuthor]);

  useEffect(() => {
    if (!product) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !document.querySelector('.share-modal-backdrop')) {
        onClose();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [product, onClose]);

  const selectedFinishId = product
    ? (product.finishes[finishIdx] ?? product.finishes[0])?.id
    : undefined;

  const relatedRecommendations = useMemo(() => {
    if (!product) return [];
    return getRecommendedProducts(product, PRODUCTS, selectedFinishId, 4);
  }, [product, selectedFinishId]);

  const allReviews = useMemo<RichProductReview[]>(() => {
    if (!product) return [];
    const customMapped: RichProductReview[] = customReviews.map((rev) => ({
      ...rev,
      helpfulBase: 0,
    }));
    return [...customMapped, ...buildProductReviews(product)];
  }, [product, customReviews]);

  const filteredReviews = useMemo(() => {
    if (ratingFilter === 'all') return allReviews;
    if (ratingFilter === 'low') {
      return allReviews.filter((r) => r.rating <= 3);
    }
    return allReviews.filter((r) => r.rating === ratingFilter);
  }, [allReviews, ratingFilter]);

  if (!product) return null;

  const activeFinish = product.finishes[finishIdx] ?? product.finishes[0];
  const activeSize = product.sizes[sizeIdx] ?? product.sizes[0];
  const unitPrice = product.price + (activeSize?.priceDelta ?? 0);
  const lineTotal = unitPrice * qty;
  const catMeta = CATEGORY_MAP[product.category];
  const totalReviewCount = product.reviews + customReviews.length;
  const activeStarPreview = hoverRating || reviewRating;

  const visibleReviews = filteredReviews.slice(0, visibleReviewCount);
  const remainingCount = Math.max(
    0,
    filteredReviews.length - visibleReviews.length
  );

  const handleAdd = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (modalJustAdded) return;
    triggerAddToBagHaptic(e.currentTarget);
    setModalJustAdded(true);
    onAddToBag({
      product,
      finish: activeFinish,
      sizeLabel: activeSize?.label ?? product.capacity,
      unitPrice,
      qty,
    });
    window.setTimeout(() => {
      onClose();
    }, 320);
  };

  const handlePostReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (reviewRating < 1) {
      setRatingError(true);
      return;
    }
    if (!reviewText.trim()) return;
    onSubmitReview(product.id, {
      author: reviewAuthor.trim() || 'Waterholic Member',
      rating: reviewRating,
      comment: reviewText.trim(),
      verified: true,
    });
    setReviewText('');
    setReviewRating(0);
    setHoverRating(0);
    setRatingError(false);
    setRatingFilter('all');
    setShowReviewForm(false);
  };

  const toggleExpandReview = (id: string) => {
    setExpandedReviewIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleHelpful = (id: string) => {
    setHelpfulVotedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onClick={onClose}
      data-lenis-prevent
    >
      <div
        ref={modalRef}
        className="product-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="pdp-modal-title"
        onClick={(e) => e.stopPropagation()}
        data-lenis-prevent
      >
        <div className="modal-topbar">
          <div className="product-meta-line modal-topbar-meta">
            <span>{catMeta.name}</span>
            <span aria-hidden="true">·</span>
            <span>{product.variety}</span>
          </div>
          <div className="modal-topbar-actions">
            {onShareProduct && (
              <button
                type="button"
                className="modal-share-btn"
                aria-label={`Share ${product.name} with bottle preview and direct link`}
                onClick={() => onShareProduct(product, activeFinish.id)}
              >
                <Share2 size={15} aria-hidden="true" />
                <span>Share</span>
              </button>
            )}
            <button
              type="button"
              className="icon-btn modal-close-btn"
              aria-label="Close product details"
              onClick={onClose}
            >
              <svg
                width="19"
                height="19"
                viewBox="0 0 256 256"
                fill="none"
                aria-hidden="true"
              >
                <line
                  x1="200"
                  y1="56"
                  x2="56"
                  y2="200"
                  stroke="currentColor"
                  strokeWidth="20"
                  strokeLinecap="round"
                />
                <line
                  x1="200"
                  y1="200"
                  x2="56"
                  y2="56"
                  stroke="currentColor"
                  strokeWidth="20"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>
        </div>

        {isLoading || detailHydrating ? (
          <ProductModalSkeleton />
        ) : (
        <div className="modal-grid modal-grid--hydrated">
          <div className="modal-img-frame">
            {!imgError ? (
              <BottleColorImage
                src={product.image}
                alt={`${product.name} in ${activeFinish.name}`}
                finish={activeFinish}
                maxDimension={780}
                className="modal-product-img"
                onError={() => setImgError(true)}
              />
            ) : (
              <div className="product-img-fallback" aria-hidden="true">
                <span>{catMeta.shortName}</span>
              </div>
            )}
          </div>

          <div className="modal-specs-table">
            <span className="config-label modal-specs-heading">
              Technical Specifications
            </span>
            <div className="modal-spec-row">
              <span>Capacity</span>
              <span className="tabular-nums">{product.capacity}</span>
            </div>
            <div className="modal-spec-row">
              <span>Material</span>
              <span>{product.material}</span>
            </div>
            <div className="modal-spec-row">
              <span>Performance</span>
              <span>{product.highlightSpec}</span>
            </div>
            <div className="modal-spec-row">
              <span>Weight</span>
              <span className="tabular-nums">{product.weight}</span>
            </div>
            <div className="modal-spec-row">
              <span>SKU</span>
              <span className="tabular-nums">{product.sku}</span>
            </div>
          </div>

          <div className="modal-info-col">
            <h2 id="pdp-modal-title" className="modal-product-title">
              {product.name}
            </h2>

            <div className="modal-price-rating">
              <span className="modal-price tabular-nums">{formatPrice(unitPrice)}</span>
              <span className="modal-rating tabular-nums">
                <Star
                  size={14}
                  className="review-star-icon is-filled"
                  aria-hidden="true"
                />{' '}
                {product.rating.toFixed(1)} · {totalReviewCount.toLocaleString()}{' '}
                reviews · In Stock
              </span>
            </div>

            <p className="modal-description">{product.description}</p>

            {/* Colour / Finish Selector (6 Colours) */}
            <div className="modal-config-group">
              <span className="config-label">
                Colour ({product.finishes.length}): {activeFinish.name}
              </span>
              <div className="option-row">
                {product.finishes.map((fin, idx) => (
                  <button
                    key={fin.id}
                    type="button"
                    className={`pill-option${idx === finishIdx ? ' is-active' : ''}`}
                    onClick={() => setFinishIdx(idx)}
                  >
                    <span
                      className={`dot${fin.isTransparent ? ' swatch-transparent' : ''}`}
                      style={
                        fin.isTransparent ? undefined : { background: fin.hex }
                      }
                    />
                    {fin.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Size / Pack Selector */}
            <div className="modal-config-group">
              <span className="config-label">Size / Option</span>
              <div className="option-row">
                {product.sizes.map((sz, idx) => (
                  <button
                    key={sz.label}
                    type="button"
                    className={`pill-option${idx === sizeIdx ? ' is-active' : ''}`}
                    onClick={() => setSizeIdx(idx)}
                  >
                    {sz.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Quantity + Save + Full-Clarity Primary Add to Bag CTA */}
            <div className="modal-purchase-row">
              <div className="modal-qty-stepper" aria-label="Quantity">
                <button
                  type="button"
                  className="qty-btn"
                  aria-label="Decrease quantity"
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                >
                  −
                </button>
                <span className="bag-qty tabular-nums">{qty}</span>
                <button
                  type="button"
                  className="qty-btn"
                  aria-label="Increase quantity"
                  onClick={() => setQty((q) => q + 1)}
                >
                  +
                </button>
              </div>

              <button
                type="button"
                className={`btn btn-primary modal-add-btn${modalJustAdded ? ' is-added' : ''}`}
                onClick={handleAdd}
              >
                {modalJustAdded ? 'Added to Bag ✓' : `Add to Bag · ${formatPrice(lineTotal)}`}
              </button>

              <button
                type="button"
                className={`btn btn-ghost modal-save-btn${isSaved ? ' is-saved' : ''}`}
                onClick={() => onToggleSave(product.id)}
                aria-pressed={isSaved}
              >
                <Heart
                  size={16}
                  fill={isSaved ? 'currentColor' : 'none'}
                  aria-hidden="true"
                />
                <span>{isSaved ? 'Saved' : 'Save'}</span>
              </button>
            </div>

            {/* Customer Reviews + Interactive 5-Star Rating + Read More Reviews */}
            <div className="modal-reviews">
              <div className="modal-reviews-head">
                <div className="modal-reviews-title-group">
                  <span className="config-label">
                    Customer Reviews ({totalReviewCount.toLocaleString()})
                  </span>
                  <div className="modal-reviews-avg tabular-nums">
                    <ReviewStarDisplay rating={product.rating} size={13} />
                    <span>{product.rating.toFixed(1)} out of 5</span>
                  </div>
                </div>
                <button
                  type="button"
                  className="reset-filters-link"
                  onClick={() => {
                    setShowReviewForm((v) => !v);
                    setRatingError(false);
                  }}
                >
                  {showReviewForm ? 'Cancel' : 'Write a Review'}
                </button>
              </div>

              {showReviewForm && (
                <form className="review-form" onSubmit={handlePostReview}>
                  <div className="star-picker-block">
                    <span className="star-picker-label">Your Rating</span>
                    <div
                      className="star-picker-row"
                      role="radiogroup"
                      aria-label="Rate this product from 1 to 5 stars"
                      onMouseLeave={() => setHoverRating(0)}
                    >
                      {[1, 2, 3, 4, 5].map((starValue) => {
                        const isGolden = starValue <= activeStarPreview;
                        const isSelected = starValue === reviewRating;
                        return (
                          <button
                            key={starValue}
                            type="button"
                            role="radio"
                            aria-checked={isSelected}
                            aria-label={`${starValue} ${starValue === 1 ? 'star' : 'stars'}`}
                            className={`star-picker-btn${isGolden ? ' is-golden' : ''}${isSelected ? ' is-selected' : ''}`}
                            onMouseEnter={() => setHoverRating(starValue)}
                            onFocus={() => setHoverRating(starValue)}
                            onBlur={() => setHoverRating(0)}
                            onClick={() => {
                              setReviewRating(starValue);
                              setRatingError(false);
                            }}
                          >
                            <Star
                              size={24}
                              className="star-picker-svg"
                              aria-hidden="true"
                            />
                          </button>
                        );
                      })}
                      <span
                        className={`star-picker-status tabular-nums${reviewRating > 0 ? ' is-rated' : ''}`}
                      >
                        {STAR_LABELS[activeStarPreview] ?? STAR_LABELS[0]}
                      </span>
                    </div>
                    {ratingError && (
                      <p className="star-picker-error" role="alert">
                        Please click a star (1 to 5) before posting your review.
                      </p>
                    )}
                  </div>

                  <input
                    type="text"
                    required
                    placeholder="Your name"
                    aria-label="Reviewer name"
                    value={reviewAuthor}
                    onChange={(e) => setReviewAuthor(e.target.value)}
                  />
                  <textarea
                    rows={3}
                    required
                    placeholder="Share how you use this Waterholic product..."
                    aria-label="Review comment"
                    value={reviewText}
                    onChange={(e) => setReviewText(e.target.value)}
                  />
                  <button type="submit" className="btn btn-primary review-submit-btn">
                    Post Review
                  </button>
                </form>
              )}

              {/* Star Filter Bar */}
              <div
                className="review-filter-bar"
                role="tablist"
                aria-label="Filter reviews by star rating"
              >
                {(
                  [
                    { key: 'all', label: `All (${allReviews.length})` },
                    { key: 5, label: '5 ★' },
                    { key: 4, label: '4 ★' },
                    { key: 'low', label: '3 ★ & below' },
                  ] as const
                ).map((tab) => {
                  const isActive = ratingFilter === tab.key;
                  return (
                    <button
                      key={String(tab.key)}
                      type="button"
                      role="tab"
                      aria-selected={isActive}
                      className={`review-filter-btn tabular-nums${isActive ? ' is-active' : ''}`}
                      onClick={() => {
                        setRatingFilter(tab.key);
                        setVisibleReviewCount(INITIAL_REVIEWS_VISIBLE);
                      }}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>

              <div className="review-list">
                {visibleReviews.length === 0 ? (
                  <div className="review-empty-state">
                    No reviews in this star tier yet. Be the first to share your
                    experience.
                  </div>
                ) : (
                  visibleReviews.map((rev) => {
                    const isLong = rev.comment.length > COMMENT_TRUNCATE_LEN;
                    const isExpanded = expandedReviewIds.has(rev.id);
                    const displayedComment =
                      isLong && !isExpanded
                        ? `${rev.comment.slice(0, COMMENT_TRUNCATE_LEN).trimEnd()}…`
                        : rev.comment;
                    const hasVoted = helpfulVotedIds.has(rev.id);
                    const helpfulTotal = rev.helpfulBase + (hasVoted ? 1 : 0);

                    return (
                      <article key={rev.id} className="review-card">
                        <div className="review-card-top">
                          <div className="review-author-meta">
                            <strong>{rev.author}</strong>
                            {rev.verified && (
                              <span className="review-verified-text">
                                · Verified Buyer
                              </span>
                            )}
                          </div>
                          <div className="review-stars-meta tabular-nums">
                            <ReviewStarDisplay rating={rev.rating} size={13} />
                            <span className="review-date">{rev.date}</span>
                          </div>
                        </div>

                        {rev.finishUsed && (
                          <div className="review-finish-meta">
                            Finish: {rev.finishUsed}
                          </div>
                        )}

                        <p className="review-comment-text">
                          {displayedComment}
                          {isLong && (
                            <button
                              type="button"
                              className="review-readmore-inline"
                              onClick={() => toggleExpandReview(rev.id)}
                            >
                              {isExpanded ? 'Show less' : 'Read more'}
                            </button>
                          )}
                        </p>

                        <div className="review-card-footer">
                          <button
                            type="button"
                            className={`review-helpful-btn tabular-nums${hasVoted ? ' is-active' : ''}`}
                            aria-pressed={hasVoted}
                            onClick={() => toggleHelpful(rev.id)}
                          >
                            <ThumbsUp size={13} aria-hidden="true" />
                            <span>
                              Helpful{helpfulTotal > 0 ? ` (${helpfulTotal})` : ''}
                            </span>
                          </button>
                        </div>
                      </article>
                    );
                  })
                )}
              </div>

              {/* Read More / Show Fewer Reviews Controls */}
              {filteredReviews.length > INITIAL_REVIEWS_VISIBLE && (
                <div className="reviews-pagination-bar">
                  <span className="reviews-showing-meta tabular-nums">
                    Showing {visibleReviews.length} of {filteredReviews.length}{' '}
                    featured reviews ({totalReviewCount.toLocaleString()} total)
                  </span>
                  <div className="reviews-pagination-actions">
                    {remainingCount > 0 ? (
                      <button
                        type="button"
                        className="btn btn-ghost reviews-more-btn"
                        onClick={() =>
                          setVisibleReviewCount((c) =>
                            Math.min(filteredReviews.length, c + REVIEWS_PAGE_STEP)
                          )
                        }
                      >
                        <span>
                          Read More Reviews (+
                          {Math.min(REVIEWS_PAGE_STEP, remainingCount)})
                        </span>
                        <ChevronDown size={16} aria-hidden="true" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="btn btn-ghost reviews-more-btn"
                        onClick={() =>
                          setVisibleReviewCount(INITIAL_REVIEWS_VISIBLE)
                        }
                      >
                        <span>Show Fewer Reviews</span>
                        <ChevronUp size={16} aria-hidden="true" />
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        )}

        {/* Visual Multi-Signal Product Recommendations Shelf */}
        {!isLoading && !detailHydrating && relatedRecommendations.length > 0 && (
          <section className="modal-related" aria-label="Recommended products">
            <div className="modal-related-header">
              <div className="modal-related-heading">
                <h3 className="modal-related-title">
                  Recommended for you
                </h3>
                <p className="modal-related-subtitle">
                  Matched by size, material, thermal spec &amp; price, plus smart pairings
                </p>
              </div>
              <span className="modal-related-cat-label">
                {catMeta.shortName} &amp; Pairings
              </span>
            </div>

            <div className="modal-related-grid">
              {relatedRecommendations.map((rec) => {
                const rel = rec.product;
                const imgPos =
                  rel.imageFocus === 'left'
                    ? '25% center'
                    : rel.imageFocus === 'right'
                      ? '75% center'
                      : 'center center';
                return (
                  <button
                    key={rel.id}
                    type="button"
                    className="related-mini-card"
                    onClick={() => {
                      modalRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
                      onSelectProduct(rel, rec.matchedFinishId);
                    }}
                  >
                    <div className="related-mini-media">
                      <img
                        src={rel.image}
                        alt={`${rel.name}, ${rel.variety}`}
                        loading="lazy"
                        draggable={false}
                        className="related-mini-img"
                        style={{ objectPosition: imgPos }}
                      />
                      <span
                        className={`related-mini-reason${rec.kind === 'pairing' ? ' is-pairing' : ''}`}
                      >
                        {rec.reason}
                      </span>
                    </div>

                    <div className="related-mini-body">
                      <span className="related-mini-name">{rel.name}</span>
                      <span className="related-mini-meta">
                        {rel.variety} · {rel.capacity}
                      </span>

                      <div className="related-mini-footer">
                        <div className="related-mini-proof">
                          <span className="related-mini-rating tabular-nums">
                            <Star size={12} fill="currentColor" aria-hidden="true" />
                            {rel.rating.toFixed(1)}
                          </span>
                          {rel.finishes.length > 1 && (
                            <span
                              className="related-mini-swatches"
                              aria-label={`${rel.finishes.length} finishes available`}
                            >
                              {rel.finishes.slice(0, 4).map((fin) => (
                                <span
                                  key={fin.id}
                                  className={`related-mini-dot${rec.matchedFinishId === fin.id ? ' is-matched' : ''}`}
                                  style={{ backgroundColor: fin.hex }}
                                  aria-hidden="true"
                                />
                              ))}
                            </span>
                          )}
                        </div>

                        <span className="related-mini-price tabular-nums">
                          {formatPrice(rel.price)}
                          <ArrowUpRight
                            size={14}
                            className="related-mini-arrow"
                            aria-hidden="true"
                          />
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
