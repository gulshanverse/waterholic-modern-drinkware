import { useEffect, useMemo, useState } from 'react';
import { CATEGORY_MAP, PRODUCTS, type Product } from '../data/products';
import type { ProductReview } from '../types/profile';
import type { AddToBagPayload } from './CatalogSection';
import { BottleColorImage } from './BottleColorImage';

interface ProductModalProps {
  product: Product | null;
  initialFinishId?: string;
  isSaved: boolean;
  customReviews: ProductReview[];
  defaultAuthor: string;
  onClose: () => void;
  onToggleSave: (productId: string) => void;
  onAddToBag: (payload: AddToBagPayload) => void;
  onSelectProduct: (product: Product) => void;
  onSubmitReview: (
    productId: string,
    review: Omit<ProductReview, 'id' | 'date'>
  ) => void;
}

export function ProductModal({
  product,
  initialFinishId,
  isSaved,
  customReviews,
  defaultAuthor,
  onClose,
  onToggleSave,
  onAddToBag,
  onSelectProduct,
  onSubmitReview,
}: ProductModalProps) {
  const [finishIdx, setFinishIdx] = useState(0);
  const [sizeIdx, setSizeIdx] = useState(0);
  const [qty, setQty] = useState(1);
  const [imgError, setImgError] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewAuthor, setReviewAuthor] = useState(defaultAuthor);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewText, setReviewText] = useState('');

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
    setShowReviewForm(false);
    setReviewAuthor(defaultAuthor);
    setReviewRating(5);
    setReviewText('');
  }, [product, initialFinishId, defaultAuthor]);

  useEffect(() => {
    if (!product) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [product, onClose]);

  const relatedProducts = useMemo(() => {
    if (!product) return [];
    return PRODUCTS.filter(
      (p) => p.category === product.category && p.id !== product.id
    ).slice(0, 3);
  }, [product]);

  const displayedReviews = useMemo<ProductReview[]>(() => {
    if (!product) return [];
    const base: ProductReview[] = [
      {
        id: `${product.id}-rev-1`,
        author: 'Maya K.',
        rating: 5,
        date: 'Oct 2026',
        comment: `Picked up the ${product.name} for daily campus classes and workouts — zero leaks in my backpack and the finish looks crisp.`,
        verified: true,
      },
      {
        id: `${product.id}-rev-2`,
        author: 'Daniel R.',
        rating: Math.round(product.rating),
        date: 'Sep 2026',
        comment: `Really impressed with the ${product.material.toLowerCase()} build quality and ${product.highlightSpec.toLowerCase()}. Easily worth it.`,
        verified: true,
      },
    ];
    return [...customReviews, ...base];
  }, [product, customReviews]);

  if (!product) return null;

  const activeFinish = product.finishes[finishIdx] ?? product.finishes[0];
  const activeSize = product.sizes[sizeIdx] ?? product.sizes[0];
  const unitPrice = product.price + (activeSize?.priceDelta ?? 0);
  const lineTotal = unitPrice * qty;
  const catMeta = CATEGORY_MAP[product.category];
  const totalReviewCount = product.reviews + customReviews.length;

  const handleAdd = () => {
    onAddToBag({
      product,
      finish: activeFinish,
      sizeLabel: activeSize?.label ?? product.capacity,
      unitPrice,
      qty,
    });
    onClose();
  };

  const handlePostReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewText.trim()) return;
    onSubmitReview(product.id, {
      author: reviewAuthor.trim() || 'Waterholic Member',
      rating: reviewRating,
      comment: reviewText.trim(),
      verified: true,
    });
    setReviewText('');
    setShowReviewForm(false);
  };

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onClick={onClose}
      data-lenis-prevent
    >
      <div
        className="product-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="pdp-modal-title"
        onClick={(e) => e.stopPropagation()}
        data-lenis-prevent
      >
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

        <div className="modal-grid">
          <div className="modal-media-col">
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
          </div>

          <div className="modal-info-col">
            <div className="product-meta-line">
              <span>{catMeta.name}</span>
              <span aria-hidden="true">·</span>
              <span>{product.variety}</span>
            </div>

            <h2 id="pdp-modal-title" className="modal-product-title">
              {product.name}
            </h2>

            <div className="modal-price-rating">
              <span className="modal-price tabular-nums">${unitPrice}</span>
              <span className="modal-rating tabular-nums">
                <span className="rating-star" aria-hidden="true">
                  ★
                </span>{' '}
                {product.rating.toFixed(1)} · {totalReviewCount} reviews · In Stock
              </span>
            </div>

            <p className="modal-description">{product.description}</p>

            {/* Colour / Finish Selector (6 Colours) */}
            <div className="modal-config-group">
              <span className="config-label">
                Colour ({product.finishes.length}) — {activeFinish.name}
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
                      style={fin.isTransparent ? undefined : { background: fin.hex }}
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

            {/* Quantity + Primary Purchase CTA */}
            <div className="modal-purchase-row">
              <div className="modal-qty-stepper" aria-label="Quantity">
                <button
                  type="button"
                  className="qty-btn"
                  aria-label="Decrease quantity"
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                >
                  -
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
                className="btn btn-primary modal-add-btn"
                onClick={handleAdd}
              >
                Add to Bag — ${lineTotal}
              </button>

              <button
                type="button"
                className={`btn btn-ghost modal-save-btn${isSaved ? ' is-saved' : ''}`}
                onClick={() => onToggleSave(product.id)}
                aria-pressed={isSaved}
              >
                {isSaved ? 'Saved' : 'Save'}
              </button>
            </div>

            {/* Customer Reviews + Write a Review */}
            <div className="modal-reviews">
              <div className="modal-reviews-head">
                <span className="config-label">
                  Customer Reviews ({totalReviewCount})
                </span>
                <button
                  type="button"
                  className="reset-filters-link"
                  onClick={() => setShowReviewForm((v) => !v)}
                >
                  {showReviewForm ? 'Cancel' : 'Write a Review'}
                </button>
              </div>

              {showReviewForm && (
                <form className="review-form" onSubmit={handlePostReview}>
                  <div className="review-form-row">
                    <input
                      type="text"
                      required
                      placeholder="Your name"
                      aria-label="Reviewer name"
                      value={reviewAuthor}
                      onChange={(e) => setReviewAuthor(e.target.value)}
                    />
                    <select
                      className="filter-select"
                      aria-label="Star rating"
                      value={reviewRating}
                      onChange={(e) => setReviewRating(Number(e.target.value))}
                    >
                      <option value={5}>5 Stars</option>
                      <option value={4}>4 Stars</option>
                      <option value={3}>3 Stars</option>
                      <option value={2}>2 Stars</option>
                      <option value={1}>1 Star</option>
                    </select>
                  </div>
                  <textarea
                    rows={2}
                    required
                    placeholder="Share how you use this Waterholic product..."
                    aria-label="Review comment"
                    value={reviewText}
                    onChange={(e) => setReviewText(e.target.value)}
                  />
                  <button type="submit" className="btn-card-primary">
                    Post Review
                  </button>
                </form>
              )}

              <div className="review-list">
                {displayedReviews.slice(0, 3).map((rev) => (
                  <div key={rev.id} className="review-card">
                    <div className="review-card-top">
                      <strong>{rev.author}</strong>
                      <span className="review-stars tabular-nums">
                        {'★'.repeat(rev.rating)} · {rev.date}
                      </span>
                    </div>
                    <p>{rev.comment}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Related Products in Same Category */}
            {relatedProducts.length > 0 && (
              <div className="modal-related">
                <span className="config-label">
                  More in {catMeta.shortName}
                </span>
                <div className="modal-related-grid">
                  {relatedProducts.map((rel) => (
                    <button
                      key={rel.id}
                      type="button"
                      className="related-mini-card"
                      onClick={() => onSelectProduct(rel)}
                    >
                      <span className="related-mini-name">{rel.name}</span>
                      <span className="related-mini-meta tabular-nums">
                        {rel.variety} · ${rel.price}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
