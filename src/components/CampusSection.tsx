import { useState } from 'react';
import { Sparkles, Trophy } from 'lucide-react';
import campusStudyImg from '../assets/images/waterholic_campus_study_logo_1795462052216.jpg';
import campusGymImg from '../assets/images/waterholic_campus_gym_logo_1795462051525.jpg';
import campusDormImg from '../assets/images/waterholic_campus_dorm_logo_1795462072955.jpg';
import { PRODUCTS, type Product } from '../data/products';
import type { BagLineItem } from './BagDrawer';
import type { HydrationLog, UserProfile } from '../types/profile';
import { HydrationChallengesPanel } from './HydrationChallengesPanel';

interface CampusSectionProps {
  studentDiscountActive: boolean;
  studentEmail: string;
  profile: UserProfile;
  hydration: HydrationLog;
  onUnlockStudentDiscount: (email: string) => void;
  onQuickViewProduct: (product: Product, finishId?: string) => void;
  onAddBundleToBag: (item: BagLineItem) => void;
  onLogWater: (label: string, ml: number) => void;
  onShowToast: (msg: string) => void;
}

interface CampusStory {
  id: string;
  kicker: string;
  title: string;
  body: string;
  highlights: string[];
  image: string;
  imageAlt: string;
  recommendedSku: string;
  recommendedFinishId: string;
  ctaLabel: string;
}

interface CampusBundle {
  id: string;
  name: string;
  subtitle: string;
  itemsIncluded: string[];
  bundlePrice: number;
  regularPrice: number;
  image: string;
}

const CAMPUS_STORIES: CampusStory[] = [
  {
    id: 'library',
    kicker: 'Lectures & Quiet Libraries',
    title: 'Zero sweat next to your laptop. Silent on library desks.',
    body: 'Condensation ruins textbooks and laptops inside packed backpacks. Waterholic double-wall vacuum steel stays 100% dry on the outside, while our soft silicone base sets down silently during 8 AM lectures and finals study halls.',
    highlights: [
      'Fits every backpack side sleeve',
      'Zero desk clank with silicone boot',
      '24h ice water through back-to-back labs',
    ],
    image: campusStudyImg,
    imageAlt:
      'Ocean blue Waterholic bottle beside a laptop and notebooks on a sunlit university library desk',
    recommendedSku: 'WH-BOT-005',
    recommendedFinishId: 'blue',
    ctaLabel: 'View Commuter Bottle',
  },
  {
    id: 'dorm',
    kicker: 'Dorm Room & Late-Night Study',
    title: 'Pure filtered tap water — no plastic cases up dorm stairs.',
    body: 'Turn dorm hallway tap water into crisp, lead- and chlorine-free hydration right at your desk. Pair a borosilicate carbon filter pitcher with a bedside carafe so midnight study focus never requires a vending-machine run.',
    highlights: [
      'Plastic-free borosilicate glass core',
      'Filters 600 L per cartridge pack',
      'Saves ~$300/year vs. bottled packs',
    ],
    image: campusDormImg,
    imageAlt:
      'Clear glass water filter pitcher, rose pink Waterholic bottle, and bedside carafe on a bright college dorm desk',
    recommendedSku: 'WH-FIL-030',
    recommendedFinishId: 'transparent',
    ctaLabel: 'View Glass Filter Pitcher',
  },
  {
    id: 'gym',
    kicker: 'Campus Rec, Intramurals & Quad Walks',
    title: 'One-hand flip sips between classes and rec-center workouts.',
    body: 'Stay hydrated from morning weights to afternoon quad walks without unscrewing caps on the move. Choose our Glacier Blue flip-straw sport bottle or 40 oz handle quencher in Rose Pink for effortless all-day sips.',
    highlights: [
      'Leakproof flip-straw & lockable valve',
      '30h iced cold during summer practice',
      'Dishwasher-safe lids & brushed steel straws',
    ],
    image: campusGymImg,
    imageAlt:
      'Glacier blue sports water bottle and pastel rose pink tumbler next to a canvas backpack on a campus fitness studio bench',
    recommendedSku: 'WH-TUM-016',
    recommendedFinishId: 'pink',
    ctaLabel: 'View 40 oz Handle Tumbler',
  },
];

const CAMPUS_BUNDLES: CampusBundle[] = [
  {
    id: 'campus-lecture-pack',
    name: 'Lecture & Library Starter Pack',
    subtitle: 'Quiet desk set-down + backpack-safe zero-sweat daily carry',
    itemsIncluded: [
      'Commuter Narrow-Spout Bottle (650 ml · Ocean Blue)',
      'Protective Matte Silicone Bottle Boot',
      'Brushed Steel Reusable Straw 6-Pack',
    ],
    bundlePrice: 58,
    regularPrice: 70,
    image: campusStudyImg,
  },
  {
    id: 'campus-dorm-pack',
    name: 'Dorm Room Hydration Kit',
    subtitle: 'Pure filtered water on your desk all semester without plastic waste',
    itemsIncluded: [
      'PureFlow Glass Carbon Filter Pitcher (2.4 L)',
      'Nordic Borosilicate Bedside Carafe Set (850 ml)',
      'Effervescent Bottle Cleaning Tablets (36-Pack)',
    ],
    bundlePrice: 114,
    regularPrice: 132,
    image: campusDormImg,
  },
  {
    id: 'campus-finals-pack',
    name: 'Finals Week All-Nighter Pack',
    subtitle: 'Premium cold hydration + 12h hot tea/coffee + rapid electrolytes',
    itemsIncluded: [
      'Waterholic Rose Quartz Pink Premium Bottle (950 ml)',
      'Commuter 360° Spill-Lock Thermal Mug (500 ml)',
      'Alpine Citrus Daily Electrolyte Sticks (30-Pack)',
    ],
    bundlePrice: 142,
    regularPrice: 167,
    image: campusGymImg,
  },
];

export function CampusSection({
  studentDiscountActive,
  studentEmail,
  profile,
  hydration,
  onUnlockStudentDiscount,
  onQuickViewProduct,
  onAddBundleToBag,
  onLogWater,
  onShowToast,
}: CampusSectionProps) {
  const [activeTab, setActiveTab] = useState<'essentials' | 'challenges'>(
    'essentials'
  );
  const [emailInput, setEmailInput] = useState(studentEmail);
  const [emailError, setEmailError] = useState('');
  const [addedBundleId, setAddedBundleId] = useState<string | null>(null);

  const handleStoryProductClick = (story: CampusStory) => {
    const matched =
      PRODUCTS.find((p) => p.sku === story.recommendedSku) ?? PRODUCTS[0];
    onQuickViewProduct(matched, story.recommendedFinishId);
  };

  const handleAddBundle = (bundle: CampusBundle) => {
    onAddBundleToBag({
      key: `${bundle.id}__campus-bundle`,
      productId: bundle.id,
      name: bundle.name,
      finishName: 'Campus Bundle',
      sizeLabel: '3-Piece Kit',
      price: bundle.bundlePrice,
      qty: 1,
      image: bundle.image,
    });
    setAddedBundleId(bundle.id);
    window.setTimeout(() => {
      setAddedBundleId((curr) => (curr === bundle.id ? null : curr));
    }, 1200);
  };

  const handleVerifyStudent = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = emailInput.trim().toLowerCase();
    const isAcademic =
      /^[^\s@]+@[^\s@]+\.(edu|ac\.[a-z]{2,}|edu\.[a-z]{2,})$/i.test(cleaned);
    if (!isAcademic) {
      setEmailError(
        'Enter a valid college email ending in .edu or .ac (e.g. alex@state.edu).'
      );
      return;
    }
    setEmailError('');
    onUnlockStudentDiscount(cleaned);
  };

  return (
    <section
      id="campus"
      className="campus-section"
      aria-label="Waterholic for College Students"
    >
      <div className="container">
        <div className="campus-header">
          <div className="campus-heading-group">
            <span className="campus-kicker">Waterholic Campus Edition</span>
            <h2 className="section-title">
              Built for college days, late-night study, and dorm life.
            </h2>
            <p className="campus-sub">
              From silent library desks and leakproof backpack commutes to dorm
              water filtration and rec-center workouts — designed for how
              students actually hydrate from freshman orientation to graduation.
            </p>
          </div>

          <div className="campus-impact-grid" aria-label="Student sustainability and savings impact">
            <div className="campus-stat-item">
              <span className="campus-stat-val tabular-nums">1,460+</span>
              <span className="campus-stat-lbl">Plastic bottles replaced per degree</span>
            </div>
            <div className="campus-stat-item">
              <span className="campus-stat-val tabular-nums">$1,200+</span>
              <span className="campus-stat-lbl">Saved vs. campus vending machines</span>
            </div>
            <div className="campus-stat-item">
              <span className="campus-stat-val tabular-nums">15% Off</span>
              <span className="campus-stat-lbl">Instant .edu student perk</span>
            </div>
          </div>
        </div>

        {/* Campus Mode Switcher Tabs: Essentials vs Hydration Challenges */}
        <div
          className="campus-mode-tabs"
          role="tablist"
          aria-label="Campus Edition sections"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'essentials'}
            className={`campus-mode-tab${activeTab === 'essentials' ? ' is-active' : ''}`}
            onClick={() => setActiveTab('essentials')}
          >
            <Sparkles size={16} aria-hidden="true" />
            Campus Gear &amp; Packs
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'challenges'}
            className={`campus-mode-tab${activeTab === 'challenges' ? ' is-active' : ''}`}
            onClick={() => setActiveTab('challenges')}
          >
            <Trophy size={16} aria-hidden="true" />
            Hydration Challenges
            <span className="campus-tab-badge">Live</span>
          </button>
        </div>

        {activeTab === 'challenges' ? (
          <HydrationChallengesPanel
            profile={profile}
            hydration={hydration}
            onLogWater={onLogWater}
            onShowToast={onShowToast}
          />
        ) : (
          <>
            {/* 3 Real Campus Use-Case Editorial Cards */}
            <div className="campus-stories-grid">
          {CAMPUS_STORIES.map((story) => (
            <article key={story.id} className="campus-story-card">
              <div className="campus-story-media">
                <img
                  src={story.image}
                  alt={story.imageAlt}
                  loading="lazy"
                  referrerPolicy="no-referrer"
                  className="campus-story-img"
                />
              </div>
              <div className="campus-story-body">
                <span className="campus-card-kicker">{story.kicker}</span>
                <h3 className="campus-story-title">{story.title}</h3>
                <p className="campus-story-desc">{story.body}</p>
                <ul className="campus-highlights">
                  {story.highlights.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
                <button
                  type="button"
                  className="btn-card-secondary campus-story-cta"
                  onClick={() => handleStoryProductClick(story)}
                >
                  {story.ctaLabel}
                </button>
              </div>
            </article>
          ))}
        </div>

        {/* Curated Student Starter Bundles */}
        <div className="campus-bundles-block">
          <div className="campus-sub-header">
            <div>
              <h3 className="campus-block-title">Campus Starter Packs</h3>
              <p className="campus-block-sub">
                Pre-paired student bundles that stack with your 15% .edu student
                discount at checkout.
              </p>
            </div>
          </div>

          <div className="campus-bundles-grid">
            {CAMPUS_BUNDLES.map((bundle) => {
              const savings = bundle.regularPrice - bundle.bundlePrice;
              const isAdded = addedBundleId === bundle.id;
              return (
                <article key={bundle.id} className="bundle-card">
                  <div className="bundle-card-top">
                    <span className="bundle-kicker tabular-nums">
                      3-Piece Student Kit · Save ${savings}
                    </span>
                    <h4 className="bundle-title">{bundle.name}</h4>
                    <p className="bundle-subtitle">{bundle.subtitle}</p>
                  </div>

                  <ul className="bundle-list">
                    {bundle.itemsIncluded.map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>

                  <div className="bundle-footer">
                    <div className="bundle-pricing tabular-nums">
                      <span className="bundle-price">${bundle.bundlePrice}</span>
                      <span className="bundle-reg-price">
                        ${bundle.regularPrice}
                      </span>
                    </div>
                    <button
                      type="button"
                      className={`btn-card-primary${isAdded ? ' is-added' : ''}`}
                      onClick={() => handleAddBundle(bundle)}
                    >
                      {isAdded ? 'Pack Added ✓' : 'Add Pack to Bag'}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </div>

        {/* Live .EDU Student Discount Activator */}
        <div className="student-perk-bar">
          <div className="student-perk-copy">
            <h3>Unlock 15% Off Every Order with Your College Email</h3>
            <p>
              Verify your <code>.edu</code> or <code>.ac</code> campus address
              to automatically apply a 15% student discount in your Waterholic
              bag — works on all bottles, dorm filter pitchers, and packs.
            </p>
          </div>

          {studentDiscountActive ? (
            <div className="student-perk-active" role="status">
              <span className="perk-check" aria-hidden="true">
                ✓
              </span>
              <div>
                <strong>15% Student Discount Active</strong>
                <span>Verified for {studentEmail} · Applied automatically in Bag</span>
              </div>
            </div>
          ) : (
            <form className="student-perk-form" onSubmit={handleVerifyStudent}>
              <div className="student-input-row">
                <input
                  type="email"
                  className="student-email-input"
                  placeholder="you@university.edu"
                  aria-label="College .edu email address"
                  value={emailInput}
                  onChange={(e) => {
                    setEmailInput(e.target.value);
                    if (emailError) setEmailError('');
                  }}
                />
                <button type="submit" className="btn btn-primary">
                  Unlock 15% Off
                </button>
              </div>
              {emailError && <p className="form-error">{emailError}</p>}
            </form>
          )}
        </div>
          </>
        )}
      </div>
    </section>
  );
}
