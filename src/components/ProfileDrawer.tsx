import { useEffect, useMemo, useState } from 'react';
import { CATEGORY_MAP, PRODUCTS, type Product } from '../data/products';
import type {
  HydrationLog,
  HydrationMilestoneStats,
  OrderRecord,
  SavedAddress,
  UserProfile,
} from '../types/profile';
import type { AddToBagPayload } from './CatalogSection';
import {
  getGiftWrapLabel,
  type BagLineItem,
} from './BagDrawer';
import {
  ShareHydrationModal,
  type ShareMode,
} from './ShareHydrationModal';
import { MilestoneBadgesPanel } from './MilestoneBadgesPanel';
import { WeeklyHydrationChart } from './WeeklyHydrationChart';
import {
  evaluateMilestones,
  type MilestoneBadgeId,
} from '../utils/hydrationMilestones';
import { useAuth } from '../contexts/AuthContext';
import { useCurrency } from '../contexts/CurrencyContext';
import {
  COUNTRY_CURRENCIES,
  normalizeCountryCode,
  type CountryCode,
} from '../utils/currency';
import { Cloud, Gift, Globe, LogIn, LogOut } from 'lucide-react';
import { triggerAddToBagHaptic } from '../utils/hapticFeedback';

export type ProfileTab = 'overview' | 'orders' | 'addresses' | 'wishlist';

interface ProfileDrawerProps {
  open: boolean;
  initialTab?: ProfileTab;
  profile: UserProfile;
  addresses: SavedAddress[];
  orders: OrderRecord[];
  hydration: HydrationLog;
  milestoneStats: HydrationMilestoneStats;
  recentlyUnlockedBadgeIds?: MilestoneBadgeId[];
  savedIds: Set<string>;
  studentDiscountActive: boolean;
  onClose: () => void;
  onUpdateProfile: (next: UserProfile) => void;
  onLogWater: (label: string, ml: number) => void;
  onResetWater: () => void;
  onDismissMilestoneCelebration?: () => void;
  onAddAddress: (addr: Omit<SavedAddress, 'id'>) => void;
  onDeleteAddress: (id: string) => void;
  onSetDefaultAddress: (id: string) => void;
  onToggleSave: (productId: string) => void;
  onQuickViewProduct: (product: Product) => void;
  onAddToBag: (payload: AddToBagPayload) => void;
  onReorderItems: (items: BagLineItem[]) => void;
}

const ORDER_STEPS = ['Confirmed', 'Packed', 'In Transit', 'Delivered'];

export function ProfileDrawer({
  open,
  initialTab,
  profile,
  addresses,
  orders,
  hydration,
  milestoneStats,
  recentlyUnlockedBadgeIds = [],
  savedIds,
  studentDiscountActive,
  onClose,
  onUpdateProfile,
  onLogWater,
  onResetWater,
  onDismissMilestoneCelebration,
  onAddAddress,
  onDeleteAddress,
  onSetDefaultAddress,
  onToggleSave,
  onQuickViewProduct,
  onAddToBag,
  onReorderItems,
}: ProfileDrawerProps) {
  const { user, authLoading, authError, signInWithGoogle, signOutUser } = useAuth();
  const { countryCode, currency, setCountryCode, formatPrice } = useCurrency();
  const [activeTab, setActiveTab] = useState<ProfileTab>(initialTab ?? 'overview');
  const [editingProfile, setEditingProfile] = useState(false);
  const [draftProfile, setDraftProfile] = useState<UserProfile>(profile);
  const [trackQuery, setTrackQuery] = useState('');
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [newAddrLabel, setNewAddrLabel] = useState('Dorm Room');
  const [newAddrRecipient, setNewAddrRecipient] = useState(profile.name);
  const [newAddrStreet, setNewAddrStreet] = useState('');
  const [newAddrCity, setNewAddrCity] = useState('');
  const [shareOpen, setShareOpen] = useState(false);
  const [shareInitialMode, setShareInitialMode] = useState<ShareMode>('progress');
  const [shareInitialProductId, setShareInitialProductId] = useState<string | null>(null);

  const openShareStudio = (mode: ShareMode, productId: string | null = null) => {
    setShareInitialMode(mode);
    setShareInitialProductId(productId);
    setShareOpen(true);
  };

  useEffect(() => {
    if (open && initialTab) {
      setActiveTab(initialTab);
    }
  }, [open, initialTab]);

  useEffect(() => {
    if (!editingProfile) {
      setDraftProfile(profile);
    }
  }, [profile, editingProfile]);

  const savedProducts = PRODUCTS.filter((p) => savedIds.has(p.id));
  const hydrationPct = Math.min(
    100,
    Math.round((hydration.consumedMl / Math.max(500, profile.dailyGoalMl)) * 100)
  );
  const initials =
    profile.name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('') || 'WH';

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateProfile({
      ...draftProfile,
      name: draftProfile.name.trim() || 'Waterholic Member',
      country: normalizeCountryCode(draftProfile.country),
      dailyGoalMl: Math.max(1000, Math.min(6000, Number(draftProfile.dailyGoalMl) || 2500)),
      signedIn: true,
    });
    setEditingProfile(false);
  };

  const handleCreateAddress = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAddrStreet.trim() || !newAddrCity.trim()) return;
    onAddAddress({
      label: newAddrLabel.trim() || 'Address',
      recipient: newAddrRecipient.trim() || profile.name,
      street: newAddrStreet.trim(),
      cityStateZip: newAddrCity.trim(),
      isDefault: addresses.length === 0,
    });
    setNewAddrStreet('');
    setNewAddrCity('');
    setShowAddressForm(false);
  };

  const filteredOrders = trackQuery.trim()
    ? orders.filter((o) =>
        o.orderNumber.toLowerCase().includes(trackQuery.trim().toLowerCase())
      )
    : orders;

  const lifetimeSpent = orders.reduce((sum, o) => sum + o.total, 0);
  const memberTier =
    lifetimeSpent >= 60
      ? 'Glacier Elite'
      : lifetimeSpent >= 24
        ? 'Alpine Club'
        : 'Hydration Member';

  const unlockedMedalCount = useMemo(
    () => evaluateMilestones(milestoneStats).filter((m) => m.unlocked).length,
    [milestoneStats]
  );

  const bottlesSaved = Math.max(
    12,
    Math.round(milestoneStats.totalMlAllTime / 500) + orders.length * 48
  );

  return (
    <>
      <div
        className="drawer-backdrop"
        hidden={!open}
        onClick={onClose}
      />
      <aside
        className="profile-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-drawer-title"
        hidden={!open}
        data-lenis-prevent
      >
        <div className="drawer-header">
          <div className="profile-header-identity">
            <div className="profile-avatar" aria-hidden="true">
              {initials}
            </div>
            <div>
              <h2 id="profile-drawer-title" className="drawer-title">
                {profile.name}
              </h2>
              <div className="profile-header-meta">
                <span>{memberTier}</span>
                <span aria-hidden="true">·</span>
                <span className="tabular-nums">{unlockedMedalCount}/6 Medals</span>
                <span aria-hidden="true">·</span>
                <span className="tabular-nums">
                  {currency.countryName} ({currency.symbol.trim()} {currency.currencyCode})
                </span>
                {studentDiscountActive && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="profile-perk-tag">15% .edu Active</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <button
            type="button"
            className="icon-btn"
            aria-label="Close web profile"
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

        {/* Profile Navigation Tabs */}
        <div className="profile-tabs" role="tablist" aria-label="Account sections">
          {(
            [
              { id: 'overview', label: 'Profile' },
              { id: 'orders', label: `Orders (${orders.length})` },
              { id: 'addresses', label: `Addresses (${addresses.length})` },
              { id: 'wishlist', label: `Saved (${savedProducts.length})` },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              className={`profile-tab-btn${activeTab === tab.id ? ' is-active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="drawer-body profile-body" data-lenis-prevent>
          {/* TAB 1: PROFILE OVERVIEW & DAILY HYDRATION TRACKER */}
          {activeTab === 'overview' && (
            <div className="profile-stack">
              {/* Google Cloud Account Sign-In & Sync */}
              <div className="profile-card profile-cloud-card">
                <div className="profile-cloud-row">
                  <div className="profile-cloud-info">
                    <span className="profile-cloud-icon" aria-hidden="true">
                      <Cloud size={17} />
                    </span>
                    <div>
                      <h3>
                        {user
                          ? `Signed in as ${user.displayName || user.email}`
                          : 'Sync Your Waterholic Profile'}
                      </h3>
                      <p className="profile-muted">
                        {user
                          ? 'Your hydration logs, saved gear, orders & AI Studio creations stay synced across devices.'
                          : 'Sign in with Google to save hydration progress, orders, wishlist & AI bottle designs to the cloud.'}
                      </p>
                    </div>
                  </div>
                  {user ? (
                    <button
                      type="button"
                      className="btn-card-ghost"
                      onClick={() => void signOutUser()}
                    >
                      <LogOut size={14} aria-hidden="true" />
                      Sign Out
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="btn-card-primary"
                      disabled={authLoading}
                      onClick={() => void signInWithGoogle().catch(() => {})}
                    >
                      <LogIn size={14} aria-hidden="true" />
                      {authLoading ? 'Loading...' : 'Sign in with Google'}
                    </button>
                  )}
                </div>
                {authError && (
                  <p className="creativelab-error" role="alert">
                    {authError}
                  </p>
                )}
              </div>

              {/* Daily Hydration Goal Tracker */}
              <div className="profile-card">
                <div className="profile-card-head">
                  <div>
                    <h3>Daily Hydration Tracker</h3>
                    <p className="profile-muted tabular-nums">
                      {hydration.consumedMl} ml of {profile.dailyGoalMl} ml goal (
                      {hydrationPct}%)
                    </p>
                  </div>
                  <button
                    type="button"
                    className="bag-remove-btn"
                    onClick={onResetWater}
                  >
                    Reset day
                  </button>
                </div>

                <div className="hydration-progress-track" aria-hidden="true">
                  <div
                    className="hydration-progress-fill"
                    style={{ width: `${hydrationPct}%` }}
                  />
                </div>

                <div className="hydration-quick-row">
                  <button
                    type="button"
                    className="hydration-add-btn"
                    onClick={() => onLogWater('Glass of Water', 250)}
                  >
                    +250 ml Glass
                  </button>
                  <button
                    type="button"
                    className="hydration-add-btn"
                    onClick={() => onLogWater('Bottle Refill', 500)}
                  >
                    +500 ml Refill
                  </button>
                  <button
                    type="button"
                    className="hydration-add-btn"
                    onClick={() => onLogWater('Waterholic Flask', 950)}
                  >
                    +950 ml Flask
                  </button>
                </div>

                {hydration.entries.length > 0 && (
                  <div className="hydration-log-list">
                    {hydration.entries.slice(0, 4).map((entry) => (
                      <div key={entry.id} className="hydration-log-row tabular-nums">
                        <span>{entry.label}</span>
                        <span>
                          +{entry.ml} ml · {entry.time}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="hydration-share-bar">
                  <button
                    type="button"
                    className="btn-card-primary hydration-share-btn"
                    onClick={() => openShareStudio('progress')}
                  >
                    Share your Hydration
                  </button>
                  <button
                    type="button"
                    className="btn-card-secondary"
                    onClick={() =>
                      openShareStudio('product', savedProducts[0]?.id ?? null)
                    }
                  >
                    Share Favorite Bottle
                  </button>
                </div>
              </div>

              {/* Weekly Hydration Trends (Last 7 Days, Recharts) */}
              {open && (
                <WeeklyHydrationChart
                  dailyTotals={milestoneStats.dailyTotals}
                  todayKey={hydration.dateKey}
                  todayConsumedMl={hydration.consumedMl}
                  dailyGoalMl={profile.dailyGoalMl}
                />
              )}

              {/* Milestone Badges & Dynamic Animated SVG Medals */}
              <MilestoneBadgesPanel
                stats={milestoneStats}
                recentlyUnlockedIds={recentlyUnlockedBadgeIds}
                onLogWater={onLogWater}
                onDismissCelebration={onDismissMilestoneCelebration}
              />

              {/* Account Stats Summary */}
              <div className="profile-stats-grid tabular-nums">
                <div className="profile-stat-box">
                  <span className="profile-stat-num">{orders.length}</span>
                  <span className="profile-stat-lbl">Orders</span>
                </div>
                <div className="profile-stat-box">
                  <span className="profile-stat-num">{savedProducts.length}</span>
                  <span className="profile-stat-lbl">Saved</span>
                </div>
                <div className="profile-stat-box">
                  <span className="profile-stat-num">{bottlesSaved}</span>
                  <span className="profile-stat-lbl">Bottles Saved</span>
                </div>
              </div>

              {/* Member Details / Edit Profile Form */}
              <div className="profile-card">
                <div className="profile-card-head">
                  <h3>Member Details</h3>
                  {!editingProfile && (
                    <button
                      type="button"
                      className="btn-card-secondary"
                      onClick={() => {
                        setDraftProfile(profile);
                        setEditingProfile(true);
                      }}
                    >
                      Edit Profile
                    </button>
                  )}
                </div>

                {editingProfile ? (
                  <form className="checkout-form" onSubmit={handleSaveProfile}>
                    <div className="form-field">
                      <label htmlFor="prof-name">Full Name</label>
                      <input
                        id="prof-name"
                        type="text"
                        required
                        value={draftProfile.name}
                        onChange={(e) =>
                          setDraftProfile({ ...draftProfile, name: e.target.value })
                        }
                      />
                    </div>
                    <div className="form-field">
                      <label htmlFor="prof-email">Email Address</label>
                      <input
                        id="prof-email"
                        type="email"
                        required
                        value={draftProfile.email}
                        onChange={(e) =>
                          setDraftProfile({ ...draftProfile, email: e.target.value })
                        }
                      />
                    </div>
                    <div className="form-field">
                      <label htmlFor="prof-phone">Phone Number</label>
                      <input
                        id="prof-phone"
                        type="tel"
                        value={draftProfile.phone}
                        onChange={(e) =>
                          setDraftProfile({ ...draftProfile, phone: e.target.value })
                        }
                      />
                    </div>
                    <div className="form-field">
                      <label htmlFor="prof-uni">College / University (Optional)</label>
                      <input
                        id="prof-uni"
                        type="text"
                        placeholder="e.g. University of Colorado"
                        value={draftProfile.university}
                        onChange={(e) =>
                          setDraftProfile({
                            ...draftProfile,
                            university: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="form-field">
                      <label htmlFor="prof-goal">Daily Water Goal (ml)</label>
                      <input
                        id="prof-goal"
                        type="number"
                        min={1000}
                        max={6000}
                        step={250}
                        value={draftProfile.dailyGoalMl}
                        onChange={(e) =>
                          setDraftProfile({
                            ...draftProfile,
                            dailyGoalMl: Number(e.target.value),
                          })
                        }
                      />
                    </div>
                    <div className="form-field">
                      <label htmlFor="prof-country">Country &amp; Pricing Currency</label>
                      <select
                        id="prof-country"
                        className="filter-select"
                        value={normalizeCountryCode(draftProfile.country)}
                        onChange={(e) =>
                          setDraftProfile({
                            ...draftProfile,
                            country: normalizeCountryCode(e.target.value),
                          })
                        }
                      >
                        {COUNTRY_CURRENCIES.map((c) => (
                          <option key={c.code} value={c.code}>
                            {c.countryName} ({c.symbol.trim()} {c.currencyCode})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="form-field">
                      <label htmlFor="prof-color">Preferred Bottle Colour</label>
                      <select
                        id="prof-color"
                        className="filter-select"
                        value={draftProfile.preferredColor}
                        onChange={(e) =>
                          setDraftProfile({
                            ...draftProfile,
                            preferredColor: e.target.value,
                          })
                        }
                      >
                        <option value="Ocean Blue">Ocean Blue</option>
                        <option value="Rose Pink">Rose Pink</option>
                        <option value="Transparent">Transparent</option>
                        <option value="Alpine Sage">Alpine Sage</option>
                        <option value="Basalt Black">Basalt Black</option>
                        <option value="Glacier Silver">Glacier Silver</option>
                      </select>
                    </div>
                    <div className="profile-form-actions">
                      <button
                        type="button"
                        className="btn-card-secondary"
                        onClick={() => setEditingProfile(false)}
                      >
                        Cancel
                      </button>
                      <button type="submit" className="btn-card-primary">
                        Save Changes
                      </button>
                    </div>
                  </form>
                ) : (
                  <>
                    <div className="profile-country-switcher">
                      <label
                        htmlFor="prof-quick-country"
                        className="profile-country-label"
                      >
                        <Globe size={14} aria-hidden="true" />
                        <span>Country &amp; Currency</span>
                      </label>
                      <select
                        id="prof-quick-country"
                        className="filter-select profile-country-select"
                        aria-label="Select country and pricing currency"
                        value={countryCode}
                        onChange={(e) =>
                          setCountryCode(e.target.value as CountryCode)
                        }
                      >
                        {COUNTRY_CURRENCIES.map((c) => (
                          <option key={c.code} value={c.code}>
                            {c.countryName} ({c.symbol.trim()} {c.currencyCode})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="modal-specs-table">
                      <div className="modal-spec-row">
                        <span>Email</span>
                        <span>{profile.email}</span>
                      </div>
                      <div className="modal-spec-row">
                        <span>Phone</span>
                        <span className="tabular-nums">{profile.phone || 'Not set'}</span>
                      </div>
                      <div className="modal-spec-row">
                        <span>Campus</span>
                        <span>{profile.university || 'Not set'}</span>
                      </div>
                      <div className="modal-spec-row">
                        <span>Preferred Colour</span>
                        <span>{profile.preferredColor}</span>
                      </div>
                      <div className="modal-spec-row">
                        <span>Member Since</span>
                        <span>{profile.memberSince}</span>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: ORDER HISTORY & LIVE TRACKING */}
          {activeTab === 'orders' && (
            <div className="profile-stack">
              <div className="order-track-search">
                <input
                  type="search"
                  className="catalog-search-input"
                  style={{ paddingLeft: '14px' }}
                  placeholder="Filter by Order ID (e.g. WH-4821)..."
                  aria-label="Track order by ID"
                  value={trackQuery}
                  onChange={(e) => setTrackQuery(e.target.value)}
                />
              </div>

              {filteredOrders.length === 0 ? (
                <div className="profile-empty-box">
                  <p>
                    {orders.length === 0
                      ? 'You have not placed an order yet. Completed checkouts will appear here with live shipment tracking.'
                      : 'No order matches that ID.'}
                  </p>
                  <a
                    href="#catalog"
                    className="btn btn-primary btn-sm"
                    onClick={onClose}
                  >
                    Shop Waterholic
                  </a>
                </div>
              ) : (
                filteredOrders.map((order) => (
                  <article key={order.orderNumber} className="order-history-card">
                    <div className="order-history-top">
                      <div>
                        <strong className="tabular-nums">
                          Order #{order.orderNumber}
                        </strong>
                        <div className="profile-muted">{order.date}</div>
                      </div>
                      <span className="order-history-total tabular-nums">
                        {formatPrice(order.total)}
                      </span>
                    </div>

                    <div className="order-tracker" aria-label="Shipment progress">
                      {ORDER_STEPS.map((label, idx) => {
                        const done = idx + 1 <= order.statusStep;
                        return (
                          <div
                            key={label}
                            className={`tracker-step${done ? ' is-done' : ''}`}
                          >
                            <span className="tracker-dot" />
                            <span>{label}</span>
                          </div>
                        );
                      })}
                    </div>

                    <div className="order-items-mini">
                      {order.items.map((item) => {
                        const hasGift =
                          item.gift?.enabled &&
                          (item.gift.giftWrap ||
                            Boolean(item.gift.message?.trim()) ||
                            Boolean(item.gift.recipientName?.trim()));
                        const wrapFee =
                          item.gift?.enabled && item.gift.giftWrap
                            ? (item.gift.wrapFee || 5) * item.qty
                            : 0;
                        return (
                          <div key={item.key} className="order-mini-entry">
                            <div className="order-mini-row tabular-nums">
                              <span>
                                {item.qty}× {item.name} ({item.finishName})
                              </span>
                              <span>{formatPrice(item.price * item.qty + wrapFee)}</span>
                            </div>
                            {hasGift && item.gift && (
                              <div className="order-mini-gift">
                                <Gift size={12} aria-hidden="true" />
                                <span>
                                  {item.gift.giftWrap
                                    ? `${getGiftWrapLabel(item.gift.wrapStyle)}`
                                    : 'Gift Card'}
                                  {item.gift.recipientName?.trim()
                                    ? ` · To ${item.gift.recipientName.trim()}`
                                    : ''}
                                  {item.gift.message?.trim()
                                    ? `: “${item.gift.message.trim()}”`
                                    : ''}
                                </span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    <div className="order-history-footer">
                      <span className="profile-muted">
                        Ship to: {order.address}
                      </span>
                      <button
                        type="button"
                        className="btn-card-secondary"
                        onClick={() => {
                          onReorderItems(order.items);
                          onClose();
                        }}
                      >
                        Reorder
                      </button>
                    </div>
                  </article>
                ))
              )}
            </div>
          )}

          {/* TAB 3: SAVED SHIPPING ADDRESSES */}
          {activeTab === 'addresses' && (
            <div className="profile-stack">
              <div className="profile-card-head">
                <h3>Saved Addresses</h3>
                <button
                  type="button"
                  className="btn-card-primary"
                  onClick={() => setShowAddressForm((v) => !v)}
                >
                  {showAddressForm ? 'Close Form' : '+ Add Address'}
                </button>
              </div>

              {showAddressForm && (
                <form
                  className="profile-card checkout-form"
                  onSubmit={handleCreateAddress}
                >
                  <div className="form-field">
                    <label htmlFor="addr-label">Label</label>
                    <input
                      id="addr-label"
                      type="text"
                      required
                      placeholder="Dorm Room, Home, Campus Mailroom"
                      value={newAddrLabel}
                      onChange={(e) => setNewAddrLabel(e.target.value)}
                    />
                  </div>
                  <div className="form-field">
                    <label htmlFor="addr-recipient">Recipient Name</label>
                    <input
                      id="addr-recipient"
                      type="text"
                      required
                      value={newAddrRecipient}
                      onChange={(e) => setNewAddrRecipient(e.target.value)}
                    />
                  </div>
                  <div className="form-field">
                    <label htmlFor="addr-street">Street / Dorm Building</label>
                    <input
                      id="addr-street"
                      type="text"
                      required
                      placeholder="214 Baker Hall, Room 308"
                      value={newAddrStreet}
                      onChange={(e) => setNewAddrStreet(e.target.value)}
                    />
                  </div>
                  <div className="form-field">
                    <label htmlFor="addr-city">City, State & ZIP</label>
                    <input
                      id="addr-city"
                      type="text"
                      required
                      placeholder="Boulder, CO 80309"
                      value={newAddrCity}
                      onChange={(e) => setNewAddrCity(e.target.value)}
                    />
                  </div>
                  <button type="submit" className="btn-card-primary">
                    Save Address
                  </button>
                </form>
              )}

              {addresses.map((addr) => (
                <div key={addr.id} className="profile-card address-card">
                  <div className="address-card-head">
                    <strong>
                      {addr.label}
                      {addr.isDefault && (
                        <span className="profile-perk-tag"> · Default</span>
                      )}
                    </strong>
                    <div className="address-actions">
                      {!addr.isDefault && (
                        <button
                          type="button"
                          className="bag-remove-btn"
                          onClick={() => onSetDefaultAddress(addr.id)}
                        >
                          Set Default
                        </button>
                      )}
                      {addresses.length > 1 && (
                        <button
                          type="button"
                          className="bag-remove-btn"
                          onClick={() => onDeleteAddress(addr.id)}
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                  <p className="profile-muted">
                    {addr.recipient}
                    <br />
                    {addr.street}
                    <br />
                    {addr.cityStateZip}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* TAB 4: SAVED WISHLIST */}
          {activeTab === 'wishlist' && (
            <div className="profile-stack">
              {savedProducts.length === 0 ? (
                <div className="profile-empty-box">
                  <p>
                    Tap the heart icon on any of our {PRODUCTS.length} water
                    products to save favourites here for quick comparison or
                    checkout.
                  </p>
                  <a
                    href="#catalog"
                    className="btn btn-primary btn-sm"
                    onClick={onClose}
                  >
                    Browse Catalog
                  </a>
                </div>
              ) : (
                savedProducts.map((product) => {
                  const defaultFinish = product.finishes[0];
                  const defaultSize =
                    product.sizes.find((s) => s.priceDelta === 0) ??
                    product.sizes[0];
                  return (
                    <div key={product.id} className="bag-item">
                      <img
                        src={product.image}
                        alt={product.name}
                        referrerPolicy="no-referrer"
                        className="bag-item-thumb"
                      />
                      <div className="bag-item-info">
                        <div className="bag-item-top">
                          <div className="bag-item-name">{product.name}</div>
                          <button
                            type="button"
                            className="bag-remove-btn"
                            onClick={() => onToggleSave(product.id)}
                          >
                            Remove
                          </button>
                        </div>
                        <div className="bag-item-meta tabular-nums">
                          {CATEGORY_MAP[product.category].shortName} ·{' '}
                          {formatPrice(product.price)}
                        </div>
                        <div className="wishlist-row-actions">
                          <button
                            type="button"
                            className="btn-card-secondary"
                            onClick={() => openShareStudio('product', product.id)}
                          >
                            Share Card
                          </button>
                          <button
                            type="button"
                            className="btn-card-secondary"
                            onClick={() => {
                              onClose();
                              onQuickViewProduct(product);
                            }}
                          >
                            Details
                          </button>
                          <button
                            type="button"
                            className="btn-card-primary"
                            onClick={(e) => {
                              triggerAddToBagHaptic(e.currentTarget);
                              onAddToBag({
                                product,
                                finish: defaultFinish,
                                sizeLabel:
                                  defaultSize?.label ?? product.capacity,
                                unitPrice:
                                  product.price +
                                  (defaultSize?.priceDelta ?? 0),
                                qty: 1,
                              });
                            }}
                          >
                            Add to Bag
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </aside>

      <ShareHydrationModal
        open={shareOpen}
        initialMode={shareInitialMode}
        initialProductId={shareInitialProductId}
        profile={profile}
        hydration={hydration}
        savedProducts={savedProducts}
        bottlesSaved={bottlesSaved}
        memberTier={memberTier}
        onClose={() => setShareOpen(false)}
      />
    </>
  );
}
