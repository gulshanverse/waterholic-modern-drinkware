interface CatalogGridSkeletonProps {
  count?: number;
}

export function CatalogGridSkeleton({ count = 12 }: CatalogGridSkeletonProps) {
  const safeCount = Math.max(3, Math.min(24, count));

  return (
    <div
      className="catalog-grid catalog-grid--skeleton"
      role="status"
      aria-busy="true"
      aria-live="polite"
      aria-label="Loading Waterholic product catalog"
    >
      <span className="sr-only">Loading Waterholic products…</span>
      {Array.from({ length: safeCount }).map((_, idx) => (
        <article
          key={idx}
          className="product-card product-card--skeleton"
          aria-hidden="true"
          style={{ animationDelay: `${(idx % 6) * 65}ms` }}
        >
          <div className="product-card-media skel-block skel-card-media">
            <span className="skel-pill skel-card-compare" />
            <span className="skel-circle skel-card-heart" />
          </div>

          <div className="product-card-body">
            <div className="skel-block skel-line skel-w-45 skel-h-11" />
            <div className="skel-block skel-line skel-w-78 skel-h-18" />
            <div className="skel-stack-tight">
              <div className="skel-block skel-line skel-w-100 skel-h-12" />
              <div className="skel-block skel-line skel-w-72 skel-h-12" />
            </div>
            <div className="skel-block skel-line skel-w-56 skel-h-11" />

            <div className="product-card-row skel-swatch-row">
              <div className="skel-swatches">
                {Array.from({ length: 6 }).map((__, sIdx) => (
                  <span key={sIdx} className="skel-block skel-swatch-dot" />
                ))}
              </div>
              <div className="skel-block skel-line skel-w-60px skel-h-13" />
            </div>

            <div className="product-card-footer">
              <div className="skel-block skel-line skel-w-52px skel-h-22" />
              <div className="product-card-actions">
                <div className="skel-block skel-btn skel-w-68px" />
                <div className="skel-block skel-btn skel-w-96px" />
              </div>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}

export function ProductModalSkeleton() {
  return (
    <div
      className="modal-grid modal-grid--skeleton"
      role="status"
      aria-busy="true"
      aria-live="polite"
      aria-label="Loading product details"
    >
      <span className="sr-only">Loading product details…</span>

      {/* Left Media Column */}
      <div className="modal-img-frame skel-block skel-modal-img" aria-hidden="true" />

      {/* Left Spec Table Column */}
      <div className="modal-specs-table skel-specs-table" aria-hidden="true">
        <div className="skel-block skel-line skel-w-52 skel-h-12" />
        {Array.from({ length: 5 }).map((_, idx) => (
          <div key={idx} className="modal-spec-row">
            <div className="skel-block skel-line skel-w-72px skel-h-12" />
            <div className="skel-block skel-line skel-w-108px skel-h-12" />
          </div>
        ))}
      </div>

      {/* Right Info Column */}
      <div className="modal-info-col skel-modal-info" aria-hidden="true">
        <div className="skel-block skel-line skel-w-76 skel-h-28" />

        <div className="modal-price-rating">
          <div className="skel-block skel-line skel-w-64px skel-h-26" />
          <div className="skel-block skel-line skel-w-160px skel-h-14" />
        </div>

        <div className="skel-stack-tight">
          <div className="skel-block skel-line skel-w-100 skel-h-13" />
          <div className="skel-block skel-line skel-w-88 skel-h-13" />
        </div>

        {/* Finish swatches placeholder */}
        <div className="modal-config-group">
          <div className="skel-block skel-line skel-w-140px skel-h-12" />
          <div className="skel-option-row">
            {Array.from({ length: 6 }).map((_, idx) => (
              <div key={idx} className="skel-block skel-pill-opt" />
            ))}
          </div>
        </div>

        {/* Size options placeholder */}
        <div className="modal-config-group">
          <div className="skel-block skel-line skel-w-108px skel-h-12" />
          <div className="skel-option-row">
            {Array.from({ length: 3 }).map((_, idx) => (
              <div key={idx} className="skel-block skel-pill-size" />
            ))}
          </div>
        </div>

        {/* Purchase action row placeholder */}
        <div className="skel-actions-row">
          <div className="skel-block skel-qty-pill" />
          <div className="skel-block skel-cta-pill" />
          <div className="skel-block skel-save-pill" />
        </div>

        {/* Reviews section placeholder */}
        <div className="skel-reviews-block">
          <div className="skel-reviews-head">
            <div className="skel-block skel-line skel-w-148px skel-h-15" />
            <div className="skel-block skel-line skel-w-88px skel-h-13" />
          </div>
          {Array.from({ length: 2 }).map((_, idx) => (
            <div key={idx} className="skel-review-card">
              <div className="skel-reviews-head">
                <div className="skel-block skel-line skel-w-96px skel-h-13" />
                <div className="skel-block skel-line skel-w-76px skel-h-12" />
              </div>
              <div className="skel-block skel-line skel-w-100 skel-h-12" />
              <div className="skel-block skel-line skel-w-78 skel-h-12" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
