import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AnimatePresence,
  motion,
  MotionConfig,
  useAnimationControls,
  type Transition,
  type Variants,
} from 'framer-motion';
import {
  CATEGORIES,
  CATEGORY_MAP,
  MATERIALS_LIST,
  PRODUCTS,
  type CategoryId,
  type Product,
  type ProductFinish,
} from '../data/products';
import { BottleColorImage } from './BottleColorImage';
import { CatalogGridSkeleton } from './ShimmerSkeletons';
import { triggerAddToBagHaptic } from '../utils/hapticFeedback';

const CARD_HOVER_SPRING: Transition = {
  type: 'spring',
  stiffness: 380,
  damping: 26,
  mass: 0.78,
};

const MEDIA_SPRING: Transition = {
  type: 'spring',
  stiffness: 310,
  damping: 25,
  mass: 0.85,
};

const CONTROL_SPRING: Transition = {
  type: 'spring',
  stiffness: 520,
  damping: 27,
  mass: 0.65,
};

const SWATCH_RING_SPRING: Transition = {
  type: 'spring',
  stiffness: 480,
  damping: 30,
  mass: 0.7,
};

const CARD_VARIANTS: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.95,
    y: 24,
  },
  visible: (index: number) => ({
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      type: 'spring',
      stiffness: 260,
      damping: 24,
      mass: 0.9,
      delay: (index % 3) * 0.05,
    },
  }),
  hover: {
    y: -6,
    scale: 1.012,
    transition: CARD_HOVER_SPRING,
  },
};

const MEDIA_VARIANTS: Variants = {
  hidden: { scale: 1, y: 0 },
  visible: {
    scale: 1,
    y: 0,
    transition: MEDIA_SPRING,
  },
  hover: {
    scale: 1.055,
    y: -3,
    transition: MEDIA_SPRING,
  },
};

const SHEEN_VARIANTS: Variants = {
  hidden: { x: '-135%', opacity: 0 },
  visible: {
    x: '-135%',
    opacity: 0,
    transition: { duration: 0.25, ease: 'easeOut' },
  },
  hover: {
    x: '135%',
    opacity: 0.6,
    transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] },
  },
};

export interface AddToBagPayload {
  product: Product;
  finish: ProductFinish;
  sizeLabel: string;
  unitPrice: number;
  qty: number;
}

interface CatalogSectionProps {
  selectedCategory: CategoryId | 'all';
  onSelectCategory: (cat: CategoryId | 'all') => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  searchInputRef: React.RefObject<HTMLInputElement | null>;
  savedIds: Set<string>;
  onToggleSave: (productId: string) => void;
  showSavedOnly: boolean;
  onToggleSavedOnly: (val: boolean) => void;
  compareIds: string[];
  onToggleCompare: (productId: string) => void;
  recentlyViewed: Product[];
  onQuickView: (product: Product, finishId?: string) => void;
  onAddToBag: (payload: AddToBagPayload) => void;
  isLoading?: boolean;
}

type PriceRange = 'all' | 'under25' | '25to60' | '60to120' | 'over120';
type SortKey =
  | 'featured'
  | 'popularity'
  | 'price-asc'
  | 'price-desc'
  | 'rating'
  | 'name';

const SORT_LABELS: Record<SortKey, string> = {
  featured: 'Featured',
  popularity: 'Popularity',
  'price-asc': 'Price: Low to High',
  'price-desc': 'Price: High to Low',
  rating: 'Highest Rated',
  name: 'Name: A–Z',
};

function ProductCard({
  product,
  index,
  isSaved,
  isCompared,
  onToggleSave,
  onToggleCompare,
  onQuickView,
  onAddToBag,
}: {
  product: Product;
  index: number;
  isSaved: boolean;
  isCompared: boolean;
  onToggleSave: (id: string) => void;
  onToggleCompare: (id: string) => void;
  onQuickView: (product: Product, finishId: string) => void;
  onAddToBag: (payload: AddToBagPayload) => void;
}) {
  const [selectedFinishIdx, setSelectedFinishIdx] = useState(0);
  const [imgError, setImgError] = useState(false);
  const [justAdded, setJustAdded] = useState(false);
  const addedTimerRef = useRef<number | null>(null);
  const bottlePulseControls = useAnimationControls();

  useEffect(() => {
    return () => {
      if (addedTimerRef.current !== null) {
        window.clearTimeout(addedTimerRef.current);
      }
    };
  }, []);

  const activeFinish = product.finishes[selectedFinishIdx] ?? product.finishes[0];
  const defaultSize =
    product.sizes.find((s) => s.priceDelta === 0) ?? product.sizes[0];
  const unitPrice = product.price + (defaultSize?.priceDelta ?? 0);
  const catMeta = CATEGORY_MAP[product.category];

  const handleSelectFinish = (idx: number) => {
    if (idx === selectedFinishIdx) return;
    setSelectedFinishIdx(idx);
    void bottlePulseControls.start({
      scale: [0.955, 1],
      transition: {
        type: 'spring',
        stiffness: 420,
        damping: 20,
        mass: 0.7,
      },
    });
  };

  const handleQuickAdd = (e: React.MouseEvent<HTMLButtonElement>) => {
    triggerAddToBagHaptic(e.currentTarget);
    onAddToBag({
      product,
      finish: activeFinish,
      sizeLabel: defaultSize?.label ?? product.capacity,
      unitPrice,
      qty: 1,
    });
    setJustAdded(true);
    if (addedTimerRef.current !== null) {
      window.clearTimeout(addedTimerRef.current);
    }
    addedTimerRef.current = window.setTimeout(() => {
      setJustAdded(false);
      addedTimerRef.current = null;
    }, 1150);
  };

  return (
    <motion.article
      className="product-card"
      custom={index}
      variants={CARD_VARIANTS}
      initial="hidden"
      whileInView="visible"
      whileHover="hover"
      viewport={{ once: true, amount: 0.08 }}
    >
      <div className="product-card-media">
        <motion.button
          type="button"
          className="product-card-img-btn"
          onClick={() => onQuickView(product, activeFinish.id)}
          aria-label={`View details for ${product.name}`}
          whileTap={{ scale: 0.972 }}
          transition={CONTROL_SPRING}
        >
          <motion.div
            className="product-card-media-inner"
            variants={MEDIA_VARIANTS}
          >
            <motion.div
              className="product-card-bottle-wrap"
              animate={bottlePulseControls}
            >
              {!imgError ? (
                <BottleColorImage
                  src={product.image}
                  alt={`${product.name} — ${product.variety} in ${activeFinish.name}`}
                  finish={activeFinish}
                  loading="lazy"
                  maxDimension={520}
                  className="product-card-img"
                  style={{
                    objectPosition:
                      product.imageFocus === 'left'
                        ? '25% center'
                        : product.imageFocus === 'right'
                          ? '75% center'
                          : 'center center',
                  }}
                  onError={() => setImgError(true)}
                />
              ) : (
                <div className="product-img-fallback" aria-hidden="true">
                  <svg
                    width="36"
                    height="36"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                  >
                    <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
                  </svg>
                  <span>{catMeta.shortName}</span>
                </div>
              )}
            </motion.div>
          </motion.div>
          <motion.div
            className="product-card-sheen"
            aria-hidden="true"
            variants={SHEEN_VARIANTS}
          />
        </motion.button>

        <motion.button
          type="button"
          className={`compare-toggle-btn${isCompared ? ' is-active' : ''}`}
          aria-pressed={isCompared}
          aria-label={
            isCompared
              ? `Remove ${product.name} from comparison`
              : `Compare ${product.name}`
          }
          onClick={() => onToggleCompare(product.id)}
          whileHover={{ scale: 1.04, y: -1 }}
          whileTap={{ scale: 0.92 }}
          transition={CONTROL_SPRING}
        >
          {isCompared ? 'Comparing ✓' : 'Compare'}
        </motion.button>

        <motion.button
          type="button"
          className={`wishlist-btn${isSaved ? ' is-saved' : ''}`}
          aria-label={isSaved ? `Remove ${product.name} from saved` : `Save ${product.name}`}
          aria-pressed={isSaved}
          onClick={() => onToggleSave(product.id)}
          whileHover={{ scale: 1.1, y: -1 }}
          whileTap={{ scale: 0.84 }}
          transition={CONTROL_SPRING}
        >
          <motion.svg
            width="17"
            height="17"
            viewBox="0 0 24 24"
            fill={isSaved ? 'currentColor' : 'none'}
            stroke="currentColor"
            strokeWidth="1.9"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            animate={isSaved ? { scale: [1, 1.32, 0.94, 1] } : { scale: 1 }}
            transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
          >
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </motion.svg>
        </motion.button>
      </div>

      <div className="product-card-body">
        <div className="product-meta-line">
          <span>{catMeta.shortName}</span>
          <span aria-hidden="true">·</span>
          <span>{product.variety}</span>
          {product.tag && (
            <>
              <span aria-hidden="true">·</span>
              <span className="product-meta-accent">{product.tag}</span>
            </>
          )}
        </div>

        <h3 className="product-card-title">
          <button
            type="button"
            className="product-title-link"
            onClick={() => onQuickView(product, activeFinish.id)}
          >
            {product.name}
          </button>
        </h3>

        <p className="product-card-desc">{product.description}</p>

        <div className="product-spec-line">
          <span>{product.capacity}</span>
          <span aria-hidden="true">·</span>
          <span>{product.highlightSpec}</span>
        </div>

        <div className="product-card-row">
          <div className="card-swatch-group">
            <div
              className="card-swatches"
              role="radiogroup"
              aria-label={`6 colour options for ${product.name}`}
            >
              {product.finishes.map((fin, idx) => {
                const isSelected = idx === selectedFinishIdx;
                return (
                  <motion.button
                    key={fin.id}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    aria-label={fin.name}
                    title={fin.name}
                    className={`card-swatch-dot${isSelected ? ' is-active' : ''}`}
                    onClick={() => handleSelectFinish(idx)}
                    whileHover={{ scale: 1.15 }}
                    whileTap={{ scale: 0.86 }}
                    transition={CONTROL_SPRING}
                  >
                    {isSelected && (
                      <motion.span
                        layoutId={`card-swatch-ring-${product.id}`}
                        className="card-swatch-ring"
                        transition={SWATCH_RING_SPRING}
                        aria-hidden="true"
                      />
                    )}
                    <span
                      className={`card-swatch-fill${fin.isTransparent ? ' swatch-transparent' : ''}`}
                      style={
                        fin.isTransparent
                          ? undefined
                          : { backgroundColor: fin.hex }
                      }
                    />
                  </motion.button>
                );
              })}
            </div>
            <div className="card-active-color-wrap">
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={activeFinish.id}
                  className="card-active-color"
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
                >
                  {activeFinish.name}
                </motion.span>
              </AnimatePresence>
            </div>
          </div>

          <div className="product-rating" aria-label={`Rated ${product.rating} out of 5`}>
            <span className="rating-star" aria-hidden="true">
              ★
            </span>
            <span className="tabular-nums">{product.rating.toFixed(1)}</span>
            <span className="rating-count tabular-nums">({product.reviews})</span>
          </div>
        </div>

        <div className="product-card-footer">
          <span className="product-price tabular-nums">${unitPrice}</span>
          <div className="product-card-actions">
            <motion.button
              type="button"
              className="btn-card-secondary"
              onClick={() => onQuickView(product, activeFinish.id)}
              whileHover={{ y: -1.5, scale: 1.02 }}
              whileTap={{ scale: 0.94 }}
              transition={CONTROL_SPRING}
            >
              Details
            </motion.button>
            <button
              type="button"
              className={`btn-card-primary${justAdded ? ' is-added' : ''}`}
              onClick={handleQuickAdd}
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={justAdded ? 'added' : 'add'}
                  className="btn-card-label"
                  initial={{ opacity: 0, y: 7 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -7 }}
                  transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
                >
                  {justAdded ? 'Added ✓' : 'Add to Bag'}
                </motion.span>
              </AnimatePresence>
            </button>
          </div>
        </div>
      </div>
    </motion.article>
  );
}

export function CatalogSection({
  selectedCategory,
  onSelectCategory,
  searchQuery,
  onSearchChange,
  searchInputRef,
  savedIds,
  onToggleSave,
  showSavedOnly,
  onToggleSavedOnly,
  compareIds,
  onToggleCompare,
  recentlyViewed,
  onQuickView,
  onAddToBag,
  isLoading = false,
}: CatalogSectionProps) {
  const [selectedVariety, setSelectedVariety] = useState<string>('all');
  const [selectedMaterial, setSelectedMaterial] = useState<string>('all');
  const [priceRange, setPriceRange] = useState<PriceRange>('all');
  const [sortBy, setSortBy] = useState<SortKey>('featured');
  const [pageSize, setPageSize] = useState<number>(12);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [initialHydrating, setInitialHydrating] = useState<boolean>(true);
  const [transitionLoading, setTransitionLoading] = useState<boolean>(false);
  const didMountFiltersRef = useRef<boolean>(false);
  const gridTopRef = useRef<HTMLDivElement | null>(null);

  // Initial catalog fetch shimmer on first load for smooth perceived performance
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setInitialHydrating(false);
    }, 520);
    return () => window.clearTimeout(timer);
  }, []);

  // Crisp micro-shimmer on category, filter, sort, or page transitions (never blocks live search typing)
  useEffect(() => {
    if (!didMountFiltersRef.current) {
      didMountFiltersRef.current = true;
      return;
    }
    setTransitionLoading(true);
    const timer = window.setTimeout(() => {
      setTransitionLoading(false);
    }, 230);
    return () => window.clearTimeout(timer);
  }, [
    selectedCategory,
    selectedVariety,
    selectedMaterial,
    priceRange,
    sortBy,
    currentPage,
    pageSize,
    showSavedOnly,
  ]);

  // Category counts across all 105 products
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: PRODUCTS.length };
    for (const p of PRODUCTS) {
      counts[p.category] = (counts[p.category] ?? 0) + 1;
    }
    return counts;
  }, []);

  // Available varieties dynamically adapt to active category
  const availableVarieties = useMemo(() => {
    const pool =
      selectedCategory === 'all'
        ? PRODUCTS
        : PRODUCTS.filter((p) => p.category === selectedCategory);
    return Array.from(new Set(pool.map((p) => p.variety))).sort();
  }, [selectedCategory]);

  // Reset variety if it does not exist in newly selected category
  useEffect(() => {
    if (
      selectedVariety !== 'all' &&
      !availableVarieties.includes(selectedVariety)
    ) {
      setSelectedVariety('all');
    }
  }, [availableVarieties, selectedVariety]);

  // Filtered and sorted catalog
  const filteredProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    const list = PRODUCTS.filter((p) => {
      if (showSavedOnly && !savedIds.has(p.id)) return false;
      if (selectedCategory !== 'all' && p.category !== selectedCategory) {
        return false;
      }
      if (selectedVariety !== 'all' && p.variety !== selectedVariety) {
        return false;
      }
      if (selectedMaterial !== 'all' && p.material !== selectedMaterial) {
        return false;
      }
      if (priceRange === 'under25' && p.price >= 25) return false;
      if (priceRange === '25to60' && (p.price < 25 || p.price > 60)) return false;
      if (priceRange === '60to120' && (p.price < 60 || p.price > 120)) return false;
      if (priceRange === 'over120' && p.price <= 120) return false;

      if (q) {
        const catName = CATEGORY_MAP[p.category].name.toLowerCase();
        const finishNames = p.finishes.map((f) => f.name).join(' ');
        const haystack =
          `${p.name} ${p.variety} ${p.material} ${p.capacity} ${p.highlightSpec} ${p.description} ${catName} ${p.sku} ${finishNames}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });

    const sorted = [...list];
    switch (sortBy) {
      case 'popularity':
        sorted.sort(
          (a, b) =>
            b.reviews - a.reviews ||
            b.rating - a.rating ||
            a.price - b.price
        );
        break;
      case 'price-asc':
        sorted.sort((a, b) => a.price - b.price || b.reviews - a.reviews);
        break;
      case 'price-desc':
        sorted.sort((a, b) => b.price - a.price || b.reviews - a.reviews);
        break;
      case 'rating':
        sorted.sort((a, b) => b.rating - a.rating || b.reviews - a.reviews);
        break;
      case 'name':
        sorted.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'featured':
      default:
        sorted.sort((a, b) => {
          const fa = a.featured ? 1 : 0;
          const fb = b.featured ? 1 : 0;
          if (fb !== fa) return fb - fa;
          return b.reviews - a.reviews;
        });
        break;
    }
    return sorted;
  }, [
    searchQuery,
    selectedCategory,
    selectedVariety,
    selectedMaterial,
    priceRange,
    sortBy,
    showSavedOnly,
    savedIds,
  ]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [
    searchQuery,
    selectedCategory,
    selectedVariety,
    selectedMaterial,
    priceRange,
    sortBy,
    pageSize,
    showSavedOnly,
  ]);

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const startIdx = (safePage - 1) * pageSize;
  const visibleProducts = filteredProducts.slice(startIdx, startIdx + pageSize);

  const hasActiveFilters =
    selectedCategory !== 'all' ||
    selectedVariety !== 'all' ||
    selectedMaterial !== 'all' ||
    priceRange !== 'all' ||
    sortBy !== 'featured' ||
    searchQuery.trim().length > 0 ||
    showSavedOnly;

  const resetAllFilters = () => {
    onSelectCategory('all');
    setSelectedVariety('all');
    setSelectedMaterial('all');
    setPriceRange('all');
    onSearchChange('');
    onToggleSavedOnly(false);
    setSortBy('featured');
  };

  const goToPage = (page: number) => {
    setCurrentPage(page);
    gridTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const activeCategoryMeta =
    selectedCategory === 'all' ? null : CATEGORY_MAP[selectedCategory];

  return (
    <section id="catalog" className="catalog-section" aria-label="Waterholic Product Catalog">
      <div className="container">
        <div className="catalog-header">
          <div className="catalog-heading-group">
            <h2 className="section-title">
              {activeCategoryMeta
                ? activeCategoryMeta.name
                : 'The Waterholic Collection'}
            </h2>
            <p className="catalog-sub">
              {activeCategoryMeta
                ? activeCategoryMeta.tagline
                : `Explore ${PRODUCTS.length} water-focused essentials across ${CATEGORIES.length} specialized categories — from vacuum alpine flasks to UV-C purifiers, mineral springs, and precision iceware.`}
            </p>
          </div>
          <div className="catalog-summary-stat tabular-nums">
            <span>{PRODUCTS.length} Products</span>
            <span aria-hidden="true">·</span>
            <span>{CATEGORIES.length} Categories</span>
            <span aria-hidden="true">·</span>
            <span>Free Shipping $60+</span>
          </div>
        </div>

        {/* Category Quick-Select Strip */}
        <div
          id="categories"
          className="category-strip"
          role="tablist"
          aria-label="Filter by product category"
        >
          <button
            type="button"
            role="tab"
            aria-selected={selectedCategory === 'all' && !showSavedOnly}
            className={`category-tab${selectedCategory === 'all' && !showSavedOnly ? ' is-active' : ''}`}
            onClick={() => {
              onToggleSavedOnly(false);
              onSelectCategory('all');
            }}
          >
            <span>All Products</span>
            <span className="category-tab-count tabular-nums">
              {categoryCounts.all}
            </span>
          </button>

          {CATEGORIES.map((cat) => {
            const active = selectedCategory === cat.id && !showSavedOnly;
            return (
              <button
                key={cat.id}
                type="button"
                role="tab"
                aria-selected={active}
                className={`category-tab${active ? ' is-active' : ''}`}
                onClick={() => {
                  onToggleSavedOnly(false);
                  onSelectCategory(cat.id);
                }}
              >
                <span>{cat.shortName}</span>
                <span className="category-tab-count tabular-nums">
                  {categoryCounts[cat.id] ?? 0}
                </span>
              </button>
            );
          })}
        </div>

        {/* Discovery & Filter Toolbar */}
        <div className="catalog-toolbar" ref={gridTopRef}>
          <div className="catalog-search-wrap">
            <svg
              className="catalog-search-icon"
              width="17"
              height="17"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              ref={searchInputRef}
              type="search"
              className="catalog-search-input"
              placeholder="Search pink premium bottle, UV-C filters, sparkling water, tumblers, ice molds..."
              aria-label="Search Waterholic catalog"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
            />
            {searchQuery && (
              <button
                type="button"
                className="search-clear-btn"
                aria-label="Clear search"
                onClick={() => onSearchChange('')}
              >
                ×
              </button>
            )}
          </div>

          <div className="catalog-controls-row">
            <label className="filter-select-wrap">
              <span className="filter-label">Variety</span>
              <select
                className="filter-select"
                aria-label="Filter by variety"
                value={selectedVariety}
                onChange={(e) => setSelectedVariety(e.target.value)}
              >
                <option value="all">All Varieties</option>
                {availableVarieties.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            </label>

            <label className="filter-select-wrap">
              <span className="filter-label">Material</span>
              <select
                className="filter-select"
                aria-label="Filter by material"
                value={selectedMaterial}
                onChange={(e) => setSelectedMaterial(e.target.value)}
              >
                <option value="all">All Materials</option>
                {MATERIALS_LIST.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </label>

            <label className="filter-select-wrap">
              <span className="filter-label">Price</span>
              <select
                className="filter-select"
                aria-label="Filter by price range"
                value={priceRange}
                onChange={(e) => setPriceRange(e.target.value as PriceRange)}
              >
                <option value="all">Any Price</option>
                <option value="under25">Under $25</option>
                <option value="25to60">$25 – $60</option>
                <option value="60to120">$60 – $120</option>
                <option value="over120">$120+</option>
              </select>
            </label>

            <label className="filter-select-wrap">
              <span className="filter-label">Sort by</span>
              <select
                className="filter-select"
                aria-label="Sort products by popularity or price"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortKey)}
              >
                <option value="featured">Featured</option>
                <option value="popularity">Popularity (Most Popular)</option>
                <option value="price-asc">Price: Low to High</option>
                <option value="price-desc">Price: High to Low</option>
                <option value="rating">Highest Rated</option>
                <option value="name">Name: A–Z</option>
              </select>
            </label>

            <button
              type="button"
              className={`saved-filter-btn${showSavedOnly ? ' is-active' : ''}`}
              aria-pressed={showSavedOnly}
              onClick={() => onToggleSavedOnly(!showSavedOnly)}
            >
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill={showSavedOnly ? 'currentColor' : 'none'}
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden="true"
              >
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
              <span>Saved</span>
              <span className="tabular-nums">({savedIds.size})</span>
            </button>
          </div>
        </div>

        {/* Status Bar: Results Count + Page Size + Reset */}
        <div className="catalog-status-bar">
          <div className="catalog-result-count tabular-nums">
            {filteredProducts.length === 0 ? (
              <span>No matching products found</span>
            ) : (
              <span>
                Showing {startIdx + 1}–
                {Math.min(startIdx + pageSize, filteredProducts.length)} of{' '}
                {filteredProducts.length} products
                {sortBy !== 'featured' ? ` · Sorted by ${SORT_LABELS[sortBy]}` : ''}
              </span>
            )}
            {hasActiveFilters && (
              <button
                type="button"
                className="reset-filters-link"
                onClick={resetAllFilters}
              >
                Reset filters
              </button>
            )}
          </div>

          <div className="page-size-controls" role="group" aria-label="Products per page">
            <span className="page-size-label">Show</span>
            {[12, 24, PRODUCTS.length].map((count) => {
              const label = count === PRODUCTS.length ? 'All' : String(count);
              const isActive = pageSize === count;
              return (
                <button
                  key={count}
                  type="button"
                  className={`page-size-btn${isActive ? ' is-active' : ''}`}
                  onClick={() => setPageSize(count)}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Recently Viewed Shelf (shown once user explores products) */}
        {recentlyViewed.length > 0 && (
          <div className="recently-viewed-strip" aria-label="Recently viewed products">
            <span className="recently-viewed-label">Recently Viewed</span>
            <div className="recently-viewed-row">
              {recentlyViewed.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="recent-chip"
                  onClick={() => onQuickView(item)}
                >
                  <img
                    src={item.image}
                    alt={item.name}
                    referrerPolicy="no-referrer"
                    className="recent-chip-img"
                  />
                  <span className="recent-chip-info">
                    <span className="recent-chip-name">{item.name}</span>
                    <span className="recent-chip-price tabular-nums">
                      ${item.price}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Product Grid, Shimmer Skeleton, or Empty State */}
        {isLoading || initialHydrating || transitionLoading ? (
          <CatalogGridSkeleton
            count={Math.min(pageSize, Math.max(6, visibleProducts.length || 12))}
          />
        ) : visibleProducts.length === 0 ? (
          <div className="catalog-empty">
            <h3>No water gear matches those filters</h3>
            <p>
              Try broadening your search term, switching categories, or clearing
              your price and material filters.
            </p>
            <button
              type="button"
              className="btn btn-primary"
              onClick={resetAllFilters}
            >
              Show All {PRODUCTS.length} Products
            </button>
          </div>
        ) : (
          <MotionConfig reducedMotion="user">
            <div className="catalog-grid">
              {visibleProducts.map((product, index) => (
                <ProductCard
                  key={`${selectedCategory}-${safePage}-${sortBy}-${product.id}`}
                  product={product}
                  index={index}
                  isSaved={savedIds.has(product.id)}
                  isCompared={compareIds.includes(product.id)}
                  onToggleSave={onToggleSave}
                  onToggleCompare={onToggleCompare}
                  onQuickView={onQuickView}
                  onAddToBag={onAddToBag}
                />
              ))}
            </div>
          </MotionConfig>
        )}

        {/* Numbered Pagination */}
        {totalPages > 1 && (
          <nav className="catalog-pagination" aria-label="Catalog pages">
            <button
              type="button"
              className="page-btn"
              disabled={safePage <= 1}
              onClick={() => goToPage(safePage - 1)}
            >
              Previous
            </button>

            <div className="page-numbers">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((num) => (
                <button
                  key={num}
                  type="button"
                  aria-current={num === safePage ? 'page' : undefined}
                  className={`page-num-btn tabular-nums${num === safePage ? ' is-active' : ''}`}
                  onClick={() => goToPage(num)}
                >
                  {num}
                </button>
              ))}
            </div>

            <button
              type="button"
              className="page-btn"
              disabled={safePage >= totalPages}
              onClick={() => goToPage(safePage + 1)}
            >
              Next
            </button>
          </nav>
        )}
      </div>
    </section>
  );
}
