import { useEffect, useState } from 'react';
import { CATEGORIES, PRODUCTS, type CategoryId, type Product } from '../data/products';
import type { ProfileTab } from './ProfileDrawer';

export type FooterDocKey =
  | 'shipping'
  | 'care'
  | 'campus'
  | 'sustainability'
  | 'privacy'
  | 'terms'
  | 'accessibility';

interface FooterDocContent {
  kicker: string;
  title: string;
  summary: string;
  points: { heading: string; body: string }[];
  ctaLabel: string;
  ctaHref?: string;
  ctaAction?: 'catalog' | 'campus' | 'support' | 'orders';
}

const FOOTER_DOCS: Record<FooterDocKey, FooterDocContent> = {
  shipping: {
    kicker: 'Delivery & Returns',
    title: 'Shipping & 45-Day Returns',
    summary:
      'Every Waterholic vessel ships in 100% plastic-free recyclable kraft packaging from regional fulfillment hubs.',
    points: [
      {
        heading: 'Free Express Shipping ($60+)',
        body: 'Orders of $60 or more automatically qualify for complimentary 2–4 business day tracked express delivery. Standard shipping on smaller orders is a flat $6.',
      },
      {
        heading: '45-Day Colour Exchange & Returns',
        body: 'Unused bottles, carafes, and accessories can be returned or exchanged for any of our 6 finishes within 45 days of delivery with zero restocking fees.',
      },
      {
        heading: 'Real-Time Order Tracking',
        body: 'Check confirmation, packing, and transit milestones anytime from your Member Profile under Track Orders.',
      },
    ],
    ctaLabel: 'Track Your Orders',
    ctaAction: 'orders',
  },
  care: {
    kicker: 'Product Longevity',
    title: 'Bottle Care & Cleaning Guide',
    summary:
      'Simple care routines keep double-wall vacuum insulation and matte powder coatings performing for decades.',
    points: [
      {
        heading: 'Insulated Steel & Copper Vessels',
        body: 'Hand-wash powder-coated 18/8 stainless steel and hammered copper bodies with warm soapy water and a soft bamboo brush to preserve the matte finish and laser-etched logo.',
      },
      {
        heading: 'Lids, Straws & Borosilicate Glass',
        body: 'All BPA/PFAS-free chug caps, silicone boots, stainless straws, and borosilicate glass carafes are top-rack dishwasher safe. Remove silicone gaskets weekly for a thorough rinse.',
      },
      {
        heading: 'Filter Cartridges & UV-C Caps',
        body: 'Replace coconut-carbon filter cartridges every 150 L (roughly 2 months of daily use). Recharge UV-C self-cleaning lids via USB-C every 30 days.',
      },
    ],
    ctaLabel: 'Browse Lids & Care Gear',
    ctaAction: 'catalog',
  },
  campus: {
    kicker: 'Waterholic Campus Edition',
    title: 'College & University Student Program',
    summary:
      'Verified college students, faculty, and researchers receive 15% off every Waterholic bottle, dorm filter pitcher, and study bundle.',
    points: [
      {
        heading: 'Instant .edu Verification',
        body: 'Verify any valid .edu or .ac academic email in the Campus Edition section or enter promo code CAMPUS15 directly inside your Shopping Bag.',
      },
      {
        heading: 'Built for Lecture Halls & Dorms',
        body: 'Silent silicone desk boots prevent clanking on library tables, zero-condensation walls keep laptops dry, and 1.5 L capacities last through full lab days.',
      },
      {
        heading: 'Campus Bundles & Group Orders',
        body: 'Save even more with curated Dorm Hydration Kits or contact our Campus Team for club, athletics, and orientation bulk orders.',
      },
    ],
    ctaLabel: 'Explore Campus Edition',
    ctaAction: 'campus',
  },
  sustainability: {
    kicker: 'Materials & Impact',
    title: 'Sustainability & BPA-Free Pledge',
    summary:
      'Every reusable Waterholic bottle replaces an estimated 1,460 single-use plastic bottles over its lifetime.',
    points: [
      {
        heading: 'Certified 100% BPA & PFAS-Free',
        body: 'Every gasket, flip-straw, TPU soft flask, and powder finish is independently lab-tested free of BPA, BPS, phthalates, and PFAS.',
      },
      {
        heading: 'Recycled 18/8 Pro-Grade Steel',
        body: 'Our insulated bottles and tumblers use 90% post-consumer recycled 18/8 stainless steel paired with lead-free vacuum sealing.',
      },
      {
        heading: 'Lifetime Repair & Replacement',
        body: 'Spare lids, gaskets, and silicone boots are stocked individually so you can refresh wear parts rather than replacing an entire bottle.',
      },
    ],
    ctaLabel: 'Submit a Warranty Request',
    ctaAction: 'support',
  },
  privacy: {
    kicker: 'Legal',
    title: 'Privacy Policy',
    summary:
      'Waterholic respects your privacy and keeps your hydration profile, saved addresses, and wishlist strictly under your control.',
    points: [
      {
        heading: 'Local Profile Storage',
        body: 'Your shopping bag, daily hydration tracker logs, saved wishlist, and shipping preferences are stored locally in your browser so your storefront remembers you across visits.',
      },
      {
        heading: 'Zero Data Brokerage',
        body: 'We never sell, rent, or trade your email address, student verification status, or purchase history to third-party ad networks.',
      },
      {
        heading: 'Communication Control',
        body: 'Hydration Club newsletter dispatches and order updates are strictly opt-in, and you can unsubscribe or clear stored preferences at any time.',
      },
    ],
    ctaLabel: 'Contact Support',
    ctaAction: 'support',
  },
  terms: {
    kicker: 'Legal',
    title: 'Terms of Service',
    summary:
      'Clear, transparent terms governing purchases, promo codes, and lifetime warranty coverage across the Waterholic storefront.',
    points: [
      {
        heading: 'Pricing & Promo Codes',
        body: 'All prices are listed in USD. Promo codes (WATER10, CAMPUS15, HYDRATE20) apply cleanly at checkout; student 15% savings pair automatically when verified.',
      },
      {
        heading: 'Lifetime Warranty Scope',
        body: 'Covers vacuum insulation failure, manufacturing defects, and leaky threads for the original owner. Normal cosmetic trail scuffs are excluded.',
      },
      {
        heading: 'Order Modifications',
        body: 'Shipping addresses and finish selections can be updated anytime before dispatch through our Support form.',
      },
    ],
    ctaLabel: 'Open Support & Warranty',
    ctaAction: 'support',
  },
  accessibility: {
    kicker: 'Inclusive Design',
    title: 'Accessibility Statement',
    summary:
      'Waterholic is committed to making our entire catalog, configurators, and checkout accessible to every visitor.',
    points: [
      {
        heading: 'Keyboard & Screen Reader Navigation',
        body: 'All menus, finish swatches, drawers, and modals support full keyboard traversal, Escape dismissal, and descriptive ARIA labels.',
      },
      {
        heading: 'Contrast & Reduced Motion',
        body: 'Both our Light and Dark themes maintain WCAG AA colour contrast ratios, and scroll animations automatically respect prefers-reduced-motion settings.',
      },
      {
        heading: 'Accessibility Feedback',
        body: 'If you encounter any barrier while browsing or checking out, reach out via our Support section and we will address it promptly.',
      },
    ],
    ctaLabel: 'Share Feedback',
    ctaAction: 'support',
  },
};

interface SiteFooterProps {
  theme: 'light' | 'dark';
  totalBagQty: number;
  savedCount: number;
  compareCount: number;
  studentDiscountActive: boolean;
  onToggleTheme: () => void;
  onJumpToCategory: (catId: CategoryId) => void;
  onOpenProfile: (tab: ProfileTab) => void;
  onOpenBag: () => void;
  onOpenCompare: () => void;
  onOpenQuickView: (product: Product) => void;
  onNewsletterJoined: (email: string) => void;
  onShowToast: (message: string) => void;
}

export function SiteFooter({
  theme,
  totalBagQty,
  savedCount,
  compareCount,
  studentDiscountActive,
  onToggleTheme,
  onJumpToCategory,
  onOpenProfile,
  onOpenBag,
  onOpenCompare,
  onOpenQuickView,
  onNewsletterJoined,
  onShowToast,
}: SiteFooterProps) {
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [subscribedEmail, setSubscribedEmail] = useState<string>(() => {
    try {
      return window.localStorage.getItem('wh_footer_newsletter') ?? '';
    } catch {
      return '';
    }
  });
  const [copiedKey, setCopiedKey] = useState<'code' | 'email' | null>(null);
  const [activeDoc, setActiveDoc] = useState<FooterDocKey | null>(null);

  useEffect(() => {
    if (!activeDoc) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setActiveDoc(null);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [activeDoc]);

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = email.trim();
    if (!cleaned || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleaned)) {
      setEmailError('Please enter a valid email address.');
      return;
    }
    setEmailError(null);
    setSubscribedEmail(cleaned);
    setEmail('');
    try {
      window.localStorage.setItem('wh_footer_newsletter', cleaned);
    } catch {
      // Ignore storage quota errors
    }
    onNewsletterJoined(cleaned);
  };

  const handleCopyText = (text: string, key: 'code' | 'email', toastMsg: string) => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).catch(() => {});
    }
    setCopiedKey(key);
    onShowToast(toastMsg);
    window.setTimeout(() => {
      setCopiedKey((prev) => (prev === key ? null : prev));
    }, 2200);
  };

  const handleOpenRoseQuartz = () => {
    const roseBottle =
      PRODUCTS.find((p) => p.name.toLowerCase().includes('rose quartz')) ??
      PRODUCTS[0];
    if (roseBottle) {
      onOpenQuickView(roseBottle);
    }
  };

  const handleDocCta = (action?: FooterDocContent['ctaAction']) => {
    setActiveDoc(null);
    if (action === 'orders') {
      onOpenProfile('orders');
    } else if (action === 'catalog') {
      onJumpToCategory('accessories');
    } else if (action === 'campus') {
      scrollToSection('campus');
    } else if (action === 'support') {
      scrollToSection('support');
    }
  };

  const currentDoc = activeDoc ? FOOTER_DOCS[activeDoc] : null;

  return (
    <>
      <footer className="site-footer" aria-label="Site footer">
        <div className="container">
          <div className="footer-grid">
            {/* Brand Identity & Newsletter Column */}
            <div className="footer-brand-col">
              <button
                type="button"
                className="footer-brand-btn"
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              >
                <svg
                  className="footer-brand-drop"
                  viewBox="0 0 24 28"
                  fill="none"
                  aria-hidden="true"
                >
                  <path
                    d="M12 1.8C12 1.8 3.2 12.1 3.2 18.2C3.2 23.06 7.14 27 12 27C16.86 27 20.8 23.06 20.8 18.2C20.8 12.1 12 1.8 12 1.8Z"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M8.5 18.8C8.9 21.1 10.6 22.8 12.8 23.1"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                </svg>
                <span>Waterholic</span>
              </button>

              <p className="footer-tagline">
                Engineered for pure, all-day hydration. Explore {PRODUCTS.length}{' '}
                insulated vessels, purifiers, and everyday essentials across 6
                signature finishes.
              </p>

              {/* Working Hydration Club Newsletter */}
              <div className="footer-newsletter">
                <p className="footer-newsletter-label">
                  Join the Hydration Club — 10% off your first refill
                </p>
                {subscribedEmail ? (
                  <div className="footer-subscribed-box" role="status">
                    <div className="footer-subscribed-top">
                      <span>Subscribed as {subscribedEmail}</span>
                      <button
                        type="button"
                        className="footer-inline-action"
                        onClick={() => {
                          setSubscribedEmail('');
                          try {
                            window.localStorage.removeItem('wh_footer_newsletter');
                          } catch {
                            // ignore
                          }
                        }}
                      >
                        Change
                      </button>
                    </div>
                    <div className="footer-promo-row">
                      <span>
                        Code: <strong className="tabular-nums">WATER10</strong>
                      </span>
                      <button
                        type="button"
                        className="footer-copy-btn"
                        onClick={() =>
                          handleCopyText(
                            'WATER10',
                            'code',
                            'Promo code WATER10 copied — apply in your bag'
                          )
                        }
                      >
                        {copiedKey === 'code' ? 'Copied' : 'Copy Code'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <form
                    className="footer-newsletter-form"
                    onSubmit={handleSubscribe}
                    noValidate
                  >
                    <label htmlFor="footer-email-input" className="sr-only">
                      Email address
                    </label>
                    <input
                      id="footer-email-input"
                      type="email"
                      className="footer-newsletter-input"
                      placeholder="you@domain.com"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (emailError) setEmailError(null);
                      }}
                      autoComplete="email"
                    />
                    <button type="submit" className="footer-newsletter-submit">
                      Join
                    </button>
                  </form>
                )}
                {emailError && (
                  <p className="footer-newsletter-error" role="alert">
                    {emailError}
                  </p>
                )}
              </div>

              {/* Clean Utility Controls: Theme Switch, Support Email Copy, Back to Top */}
              <div className="footer-utility-row">
                <button
                  type="button"
                  className="footer-utility-link"
                  onClick={onToggleTheme}
                >
                  {theme === 'light' ? 'Dark Mode' : 'Light Mode'}
                </button>
                <span aria-hidden="true" className="footer-sep">
                  ·
                </span>
                <button
                  type="button"
                  className="footer-utility-link"
                  onClick={() =>
                    handleCopyText(
                      'support@waterholic.co',
                      'email',
                      'Copied support@waterholic.co to clipboard'
                    )
                  }
                >
                  {copiedKey === 'email'
                    ? 'Email Copied'
                    : 'support@waterholic.co'}
                </button>
                <span aria-hidden="true" className="footer-sep">
                  ·
                </span>
                <button
                  type="button"
                  className="footer-utility-link"
                  onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                >
                  Back to Top ↑
                </button>
              </div>
            </div>

            {/* Column 1: Shop Categories */}
            <nav className="footer-col" aria-label="Shop categories">
              <h3 className="footer-col-heading">Shop</h3>
              <ul className="footer-link-list">
                {CATEGORIES.map((cat) => (
                  <li key={cat.id}>
                    <button
                      type="button"
                      className="footer-link"
                      onClick={() => onJumpToCategory(cat.id)}
                    >
                      {cat.shortName}
                    </button>
                  </li>
                ))}
              </ul>
            </nav>

            {/* Column 2: Featured Collections */}
            <nav className="footer-col" aria-label="Collections and stories">
              <h3 className="footer-col-heading">Explore</h3>
              <ul className="footer-link-list">
                <li>
                  <button
                    type="button"
                    className="footer-link"
                    onClick={handleOpenRoseQuartz}
                  >
                    Rose Quartz Premium Pink
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    className="footer-link"
                    onClick={() => scrollToSection('order')}
                  >
                    Configure Flagship Flask
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    className="footer-link"
                    onClick={() => scrollToSection('campus')}
                  >
                    College Campus Edition
                    {studentDiscountActive ? ' (15% Active)' : ''}
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    className="footer-link"
                    onClick={() => scrollToSection('showcase')}
                  >
                    4K Finish Showcase
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    className="footer-link"
                    onClick={() => scrollToSection('thermal')}
                  >
                    24h Thermal Lab
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    className="footer-link"
                    onClick={() => scrollToSection('craft')}
                  >
                    Materials & Craftsmanship
                  </button>
                </li>
              </ul>
            </nav>

            {/* Column 3: Account & Shopping */}
            <nav className="footer-col" aria-label="Account and shopping">
              <h3 className="footer-col-heading">Account</h3>
              <ul className="footer-link-list">
                <li>
                  <button
                    type="button"
                    className="footer-link"
                    onClick={() => onOpenProfile('overview')}
                  >
                    Member Profile & Hydration
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    className="footer-link"
                    onClick={() => onOpenProfile('orders')}
                  >
                    Track Orders
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    className="footer-link"
                    onClick={() => onOpenProfile('wishlist')}
                  >
                    Saved Wishlist{savedCount > 0 ? ` (${savedCount})` : ''}
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    className="footer-link"
                    onClick={() => onOpenProfile('addresses')}
                  >
                    Saved Addresses
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    className="footer-link"
                    onClick={onOpenBag}
                  >
                    Shopping Bag{totalBagQty > 0 ? ` (${totalBagQty})` : ''}
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    className="footer-link"
                    onClick={onOpenCompare}
                  >
                    Compare Vessels{compareCount > 0 ? ` (${compareCount}/3)` : ''}
                  </button>
                </li>
              </ul>
            </nav>

            {/* Column 4: Support & Policies */}
            <nav className="footer-col" aria-label="Support and policies">
              <h3 className="footer-col-heading">Care & Help</h3>
              <ul className="footer-link-list">
                <li>
                  <button
                    type="button"
                    className="footer-link"
                    onClick={() => scrollToSection('support')}
                  >
                    Lifetime Warranty & FAQ
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    className="footer-link"
                    onClick={() => setActiveDoc('shipping')}
                  >
                    Shipping & 45-Day Returns
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    className="footer-link"
                    onClick={() => setActiveDoc('care')}
                  >
                    Bottle Care & Cleaning
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    className="footer-link"
                    onClick={() => setActiveDoc('campus')}
                  >
                    Student 15% Program
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    className="footer-link"
                    onClick={() => setActiveDoc('sustainability')}
                  >
                    BPA-Free Sustainability
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    className="footer-link"
                    onClick={() => scrollToSection('support')}
                  >
                    Contact Support
                  </button>
                </li>
              </ul>
            </nav>
          </div>

          {/* Clean Hairline Bottom Legal Bar */}
          <div className="footer-bottom">
            <p className="footer-copy">
              © 2026 Waterholic Hydration Co. All rights reserved.
            </p>

            <div className="footer-legal-links" aria-label="Legal policies">
              <button
                type="button"
                className="footer-legal-link"
                onClick={() => setActiveDoc('privacy')}
              >
                Privacy Policy
              </button>
              <span aria-hidden="true" className="footer-sep">
                ·
              </span>
              <button
                type="button"
                className="footer-legal-link"
                onClick={() => setActiveDoc('terms')}
              >
                Terms of Service
              </button>
              <span aria-hidden="true" className="footer-sep">
                ·
              </span>
              <button
                type="button"
                className="footer-legal-link"
                onClick={() => setActiveDoc('accessibility')}
              >
                Accessibility
              </button>
            </div>

            <p className="footer-meta tabular-nums">
              {PRODUCTS.length} Products · 6 Finishes · Lifetime Warranty
            </p>
          </div>
        </div>
      </footer>

      {/* Functional Policy & Guide Modal */}
      {currentDoc && (
        <div
          className="footer-doc-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="footer-doc-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) setActiveDoc(null);
          }}
        >
          <div className="footer-doc-modal">
            <div className="footer-doc-header">
              <div>
                <span className="footer-doc-kicker">{currentDoc.kicker}</span>
                <h2 id="footer-doc-title" className="footer-doc-title">
                  {currentDoc.title}
                </h2>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                aria-label="Close dialog"
                onClick={() => setActiveDoc(null)}
              >
                ×
              </button>
            </div>

            <p className="footer-doc-summary">{currentDoc.summary}</p>

            <div className="footer-doc-points">
              {currentDoc.points.map((pt) => (
                <div key={pt.heading} className="footer-doc-point">
                  <h3>{pt.heading}</h3>
                  <p>{pt.body}</p>
                </div>
              ))}
            </div>

            <div className="footer-doc-actions">
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => handleDocCta(currentDoc.ctaAction)}
              >
                {currentDoc.ctaLabel}
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setActiveDoc(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
