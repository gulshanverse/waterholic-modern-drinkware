import { useEffect, useState } from 'react';
import { Check, ChevronDown, ChevronUp, Gift, Sparkles } from 'lucide-react';
import type { OrderRecord, SavedAddress, UserProfile } from '../types/profile';
import { BottleColorImage } from './BottleColorImage';
import { useCurrency } from '../contexts/CurrencyContext';

export type GiftWrapStyleId =
  | 'none'
  | 'ocean-linen'
  | 'alpine-kraft'
  | 'rose-ribbon';

export interface BagItemGiftOptions {
  enabled: boolean;
  recipientName?: string;
  message: string;
  giftWrap: boolean;
  wrapStyle: GiftWrapStyleId;
  wrapFee: number;
}

export interface BagLineItem {
  key: string;
  productId: string;
  name: string;
  finishName: string;
  finishId?: string;
  finishHex?: string;
  finishIsTransparent?: boolean;
  finishFilter?: string;
  sizeLabel: string;
  price: number;
  qty: number;
  image: string;
  gift?: BagItemGiftOptions;
}

export const GIFT_WRAP_UNIT_FEE = 2;
const MAX_GIFT_MESSAGE_LENGTH = 180;
const MAX_RECIPIENT_LENGTH = 60;

export const GIFT_WRAP_OPTIONS: {
  id: Exclude<GiftWrapStyleId, 'none'>;
  name: string;
  detail: string;
  swatch: string;
}[] = [
  {
    id: 'ocean-linen',
    name: 'Ocean Linen Box',
    detail: 'Matte recycled box + braided cord',
    swatch: '#0284C7',
  },
  {
    id: 'alpine-kraft',
    name: 'Alpine Kraft',
    detail: 'FSC embossed sleeve + pine ribbon',
    swatch: '#48634B',
  },
  {
    id: 'rose-ribbon',
    name: 'Rose Quartz Foil',
    detail: 'Soft blush wrap + satin bow',
    swatch: '#E495A6',
  },
];

const QUICK_GIFT_NOTES = [
  'Stay hydrated out there!',
  'Happy Birthday! Cheers to crisp sips!',
  'Finals week fuel. You’ve got this!',
];

export function getGiftWrapLabel(styleId?: GiftWrapStyleId): string {
  const match = GIFT_WRAP_OPTIONS.find((opt) => opt.id === styleId);
  return match ? match.name : 'Signature Gift Wrap';
}

interface BagDrawerProps {
  open: boolean;
  items: BagLineItem[];
  studentDiscountActive: boolean;
  profile: UserProfile;
  addresses: SavedAddress[];
  onClose: () => void;
  onUpdateQty: (key: string, delta: number) => void;
  onUpdateItemGift: (key: string, gift: BagItemGiftOptions | undefined) => void;
  onRemoveItem: (key: string) => void;
  onClearBag: () => void;
  onOrderPlaced: (order: OrderRecord) => void;
  onViewOrderInProfile: () => void;
}

const FREE_SHIPPING_THRESHOLD = 18;
const STANDARD_SHIPPING_FEE = 2;

const PROMO_CODES: Record<
  string,
  { label: string; pctOff: number; freeShip?: boolean }
> = {
  WATER10: { label: 'WATER10 (10% Off)', pctOff: 0.1 },
  CAMPUS15: { label: 'CAMPUS15 (15% Student)', pctOff: 0.15 },
  FREESHIP: { label: 'FREESHIP (Free Shipping)', pctOff: 0, freeShip: true },
};

export function BagDrawer({
  open,
  items,
  studentDiscountActive,
  profile,
  addresses,
  onClose,
  onUpdateQty,
  onUpdateItemGift,
  onRemoveItem,
  onClearBag,
  onOrderPlaced,
  onViewOrderInProfile,
}: BagDrawerProps) {
  const { formatPrice } = useCurrency();
  const [step, setStep] = useState<'bag' | 'checkout' | 'confirmed'>('bag');
  const [customerName, setCustomerName] = useState(profile.name);
  const [contact, setContact] = useState(profile.email);
  const [address, setAddress] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'cod'>('card');
  const [promoInput, setPromoInput] = useState('');
  const [appliedPromoCode, setAppliedPromoCode] = useState<string | null>(null);
  const [promoError, setPromoError] = useState('');
  const [formError, setFormError] = useState('');
  const [confirmedOrder, setConfirmedOrder] = useState<OrderRecord | null>(null);
  const [collapsedGiftKeys, setCollapsedGiftKeys] = useState<
    Record<string, boolean>
  >({});

  // Pre-fill checkout fields from profile & default saved address
  useEffect(() => {
    if (step !== 'checkout') return;
    if (!customerName && profile.name) setCustomerName(profile.name);
    if (!contact && (profile.email || profile.phone)) {
      setContact(profile.email || profile.phone);
    }
    if (!address && addresses.length > 0) {
      const def = addresses.find((a) => a.isDefault) ?? addresses[0];
      setAddress(`${def.street}, ${def.cityStateZip}`);
    }
  }, [step, profile, addresses, customerName, contact, address]);

  const subtotal = items.reduce((sum, item) => sum + item.price * item.qty, 0);
  const promoObj = appliedPromoCode ? PROMO_CODES[appliedPromoCode] : null;
  const effectivePct = Math.max(
    studentDiscountActive ? 0.15 : 0,
    promoObj?.pctOff ?? 0
  );
  const discountAmount = Math.round(subtotal * effectivePct);
  const discountLabel =
    effectivePct === 0
      ? undefined
      : promoObj && promoObj.pctOff >= (studentDiscountActive ? 0.15 : 0)
        ? promoObj.label
        : 'Student Discount (15% .edu)';

  const giftWrapUnits = items.reduce(
    (sum, item) =>
      sum + (item.gift?.enabled && item.gift.giftWrap ? item.qty : 0),
    0
  );
  const giftWrapTotal = items.reduce((sum, item) => {
    if (item.gift?.enabled && item.gift.giftWrap) {
      const unitFee = item.gift.wrapFee || GIFT_WRAP_UNIT_FEE;
      return sum + unitFee * item.qty;
    }
    return sum;
  }, 0);
  const giftedItems = items.filter(
    (item) =>
      item.gift?.enabled &&
      (item.gift.giftWrap || Boolean(item.gift.message.trim()))
  );

  const discountedSubtotal = Math.max(0, subtotal - discountAmount);
  const totalCount = items.reduce((sum, item) => sum + item.qty, 0);
  const qualifiesFreeShipping =
    discountedSubtotal >= FREE_SHIPPING_THRESHOLD || Boolean(promoObj?.freeShip);
  const shippingCost =
    items.length === 0 || qualifiesFreeShipping ? 0 : STANDARD_SHIPPING_FEE;
  const grandTotal = discountedSubtotal + giftWrapTotal + shippingCost;
  const remainingForFree = Math.max(
    0,
    FREE_SHIPPING_THRESHOLD - discountedSubtotal
  );
  const shippingPct = Math.min(
    100,
    (discountedSubtotal / FREE_SHIPPING_THRESHOLD) * 100
  );

  const handleToggleGiftMessage = (item: BagLineItem) => {
    const currentlyEnabled = Boolean(item.gift?.enabled);
    if (currentlyEnabled) {
      onUpdateItemGift(item.key, {
        enabled: false,
        recipientName: item.gift?.recipientName ?? '',
        message: item.gift?.message ?? '',
        giftWrap: false,
        wrapStyle: item.gift?.wrapStyle ?? 'ocean-linen',
        wrapFee: 0,
      });
      return;
    }

    setCollapsedGiftKeys((prev) => ({ ...prev, [item.key]: false }));
    onUpdateItemGift(item.key, {
      enabled: true,
      recipientName: item.gift?.recipientName ?? '',
      message: item.gift?.message ?? '',
      giftWrap: item.gift?.giftWrap ?? false,
      wrapStyle:
        item.gift?.wrapStyle && item.gift.wrapStyle !== 'none'
          ? item.gift.wrapStyle
          : 'ocean-linen',
      wrapFee: item.gift?.giftWrap ? GIFT_WRAP_UNIT_FEE : 0,
    });
  };

  const handleUpdateGiftField = (
    item: BagLineItem,
    patch: Partial<BagItemGiftOptions>
  ) => {
    const current: BagItemGiftOptions = item.gift ?? {
      enabled: true,
      recipientName: '',
      message: '',
      giftWrap: false,
      wrapStyle: 'ocean-linen',
      wrapFee: 0,
    };
    const nextGiftWrap =
      typeof patch.giftWrap === 'boolean' ? patch.giftWrap : current.giftWrap;
    const nextWrapStyle: GiftWrapStyleId = nextGiftWrap
      ? patch.wrapStyle && patch.wrapStyle !== 'none'
        ? patch.wrapStyle
        : current.wrapStyle !== 'none'
          ? current.wrapStyle
          : 'ocean-linen'
      : current.wrapStyle;

    onUpdateItemGift(item.key, {
      ...current,
      ...patch,
      enabled: true,
      giftWrap: nextGiftWrap,
      wrapStyle: nextWrapStyle,
      wrapFee: nextGiftWrap ? GIFT_WRAP_UNIT_FEE : 0,
      recipientName: (patch.recipientName ?? current.recipientName ?? '').slice(
        0,
        MAX_RECIPIENT_LENGTH
      ),
      message: (patch.message ?? current.message ?? '').slice(
        0,
        MAX_GIFT_MESSAGE_LENGTH
      ),
    });
  };

  const handleClose = () => {
    if (step === 'confirmed') {
      setStep('bag');
    }
    onClose();
  };

  const handleApplyPromo = (e: React.FormEvent) => {
    e.preventDefault();
    const code = promoInput.trim().toUpperCase();
    if (!code) return;
    if (PROMO_CODES[code]) {
      setAppliedPromoCode(code);
      setPromoError('');
      setPromoInput('');
    } else {
      setPromoError('Invalid code. Try WATER10, CAMPUS15, or FREESHIP.');
    }
  };

  const handlePlaceOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim() || !contact.trim() || !address.trim()) {
      setFormError('Please fill in your name, contact info, and delivery address.');
      return;
    }
    setFormError('');
    const orderNum = `WH-${Math.floor(1000 + Math.random() * 9000)}`;
    const normalizedItems: BagLineItem[] = items.map((item) => {
      if (!item.gift?.enabled) {
        const rest = { ...item };
        delete rest.gift;
        return rest;
      }
      const trimmedMsg = item.gift.message.trim().slice(0, MAX_GIFT_MESSAGE_LENGTH);
      const trimmedRecipient = (item.gift.recipientName ?? '')
        .trim()
        .slice(0, MAX_RECIPIENT_LENGTH);
      if (!item.gift.giftWrap && !trimmedMsg && !trimmedRecipient) {
        const rest = { ...item };
        delete rest.gift;
        return rest;
      }
      return {
        ...item,
        gift: {
          enabled: true,
          recipientName: trimmedRecipient,
          message: trimmedMsg,
          giftWrap: item.gift.giftWrap,
          wrapStyle: item.gift.giftWrap ? item.gift.wrapStyle : 'none',
          wrapFee: item.gift.giftWrap ? GIFT_WRAP_UNIT_FEE : 0,
        },
      };
    });

    const newOrder: OrderRecord = {
      orderNumber: orderNum,
      date: new Date().toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }),
      customerName: customerName.trim(),
      contact: contact.trim(),
      address: address.trim(),
      paymentMethod,
      items: normalizedItems,
      subtotal,
      discountAmount,
      discountLabel,
      giftWrapTotal,
      shippingCost,
      total: grandTotal,
      statusStep: 1,
    };
    setConfirmedOrder(newOrder);
    onOrderPlaced(newOrder);
    onClearBag();
    setStep('confirmed');
  };

  const confirmedGiftCount = confirmedOrder
    ? confirmedOrder.items.filter(
        (item) =>
          item.gift?.enabled &&
          (item.gift.giftWrap || Boolean(item.gift.message.trim()))
      ).length
    : 0;

  return (
    <>
      <div
        className="drawer-backdrop"
        id="drawer-backdrop"
        hidden={!open}
        onClick={handleClose}
      />
      <aside
        className="bag-drawer"
        id="bag-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="drawer-title"
        hidden={!open}
        data-lenis-prevent
      >
        <div className="drawer-header">
          <div className="drawer-title-group">
            {step === 'checkout' && (
              <button
                type="button"
                className="drawer-back-btn"
                onClick={() => setStep('bag')}
                aria-label="Back to bag"
              >
                ←
              </button>
            )}
            <h2 id="drawer-title" className="drawer-title">
              {step === 'bag'
                ? `Bag (${totalCount})`
                : step === 'checkout'
                  ? 'Express Checkout'
                  : 'Order Confirmed'}
            </h2>
          </div>

          <button
            type="button"
            className="icon-btn"
            id="drawer-close"
            aria-label="Close bag"
            onClick={handleClose}
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

        {/* Free Shipping Progress Strip */}
        {step === 'bag' && items.length > 0 && (
          <div className="shipping-bar-wrap">
            <div className="shipping-bar-text tabular-nums">
              {qualifiesFreeShipping ? (
                <span>Free Express Shipping unlocked</span>
              ) : (
                <span>
                  Add <strong>{formatPrice(remainingForFree)}</strong> more for Free Express
                  Shipping
                </span>
              )}
            </div>
            <div className="shipping-bar-track" aria-hidden="true">
              <div
                className="shipping-bar-fill"
                style={{ width: `${shippingPct}%` }}
              />
            </div>
          </div>
        )}

        <div className="drawer-body" id="drawer-body" data-lenis-prevent>
          {step === 'confirmed' && confirmedOrder ? (
            <div className="checkout-receipt">
              <div className="receipt-check" aria-hidden="true">
                ✓
              </div>
              <h3>Order #{confirmedOrder.orderNumber} Confirmed</h3>
              <p>
                Preparing shipment for {confirmedOrder.customerName}.{' '}
                {confirmedOrder.items.reduce((s, i) => s + i.qty, 0)}{' '}
                {confirmedOrder.items.reduce((s, i) => s + i.qty, 0) === 1
                  ? 'item'
                  : 'items'}{' '}
                totaling{' '}
                <strong className="tabular-nums">{formatPrice(confirmedOrder.total)}</strong>{' '}
                ({confirmedOrder.paymentMethod === 'cod'
                  ? 'Cash on Delivery'
                  : 'Card Paid'}).
              </p>
              {confirmedGiftCount > 0 && (
                <div className="receipt-gift-note">
                  <Gift size={15} aria-hidden="true" />
                  <span>
                    Includes personalized gift details for {confirmedGiftCount}{' '}
                    {confirmedGiftCount === 1 ? 'item' : 'items'}
                    {(confirmedOrder.giftWrapTotal ?? 0) > 0
                      ? ' with Waterholic gift wrapping'
                      : ''}
                    .
                  </span>
                </div>
              )}
              <button
                type="button"
                className="btn btn-primary btn-full"
                onClick={() => {
                  setStep('bag');
                  onClose();
                  onViewOrderInProfile();
                }}
              >
                Track Order in Web Profile
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-full"
                onClick={() => {
                  setStep('bag');
                  onClose();
                }}
              >
                Continue Shopping
              </button>
            </div>
          ) : step === 'checkout' ? (
            <form
              id="checkout-form"
              className="checkout-form"
              onSubmit={handlePlaceOrder}
            >
              {addresses.length > 0 && (
                <div className="form-field">
                  <span>Quick-Fill Saved Address</span>
                  <div className="payment-options">
                    {addresses.map((addr) => {
                      const fullAddr = `${addr.street}, ${addr.cityStateZip}`;
                      const isSel = address === fullAddr;
                      return (
                        <button
                          key={addr.id}
                          type="button"
                          className={`pill-option${isSel ? ' is-active' : ''}`}
                          onClick={() => {
                            setAddress(fullAddr);
                            setCustomerName(addr.recipient);
                          }}
                        >
                          {addr.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="form-field">
                <label htmlFor="checkout-name">Full Name</label>
                <input
                  id="checkout-name"
                  type="text"
                  required
                  placeholder="Alex Mercer"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                />
              </div>

              <div className="form-field">
                <label htmlFor="checkout-contact">Email or Phone</label>
                <input
                  id="checkout-contact"
                  type="text"
                  required
                  placeholder="alex@example.com"
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                />
              </div>

              <div className="form-field">
                <label htmlFor="checkout-address">Shipping Address</label>
                <textarea
                  id="checkout-address"
                  rows={3}
                  required
                  placeholder="742 Alpine Ridge Rd, Boulder, CO 80302"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                />
              </div>

              <div className="form-field">
                <span>Payment Method</span>
                <div className="payment-options">
                  <button
                    type="button"
                    className={`pill-option${paymentMethod === 'card' ? ' is-active' : ''}`}
                    onClick={() => setPaymentMethod('card')}
                  >
                    Card / Express Pay
                  </button>
                  <button
                    type="button"
                    className={`pill-option${paymentMethod === 'cod' ? ' is-active' : ''}`}
                    onClick={() => setPaymentMethod('cod')}
                  >
                    Cash on Delivery
                  </button>
                </div>
              </div>

              {giftedItems.length > 0 && (
                <div className="checkout-gift-summary">
                  <div className="checkout-gift-summary-head">
                    <Gift size={14} aria-hidden="true" />
                    <span>Gift Notes & Wrapping ({giftedItems.length})</span>
                  </div>
                  <div className="checkout-gift-list">
                    {giftedItems.map((item) => (
                      <div key={item.key} className="checkout-gift-item">
                        <div className="checkout-gift-item-title">
                          <strong>{item.name}</strong>
                          {item.gift?.giftWrap && (
                            <span className="gift-mini-tag">
                              {getGiftWrapLabel(item.gift.wrapStyle)}
                            </span>
                          )}
                        </div>
                        {item.gift?.recipientName?.trim() && (
                          <div className="checkout-gift-recipient">
                            To: {item.gift.recipientName.trim()}
                          </div>
                        )}
                        {item.gift?.message.trim() && (
                          <p className="checkout-gift-quote">
                            “{item.gift.message.trim()}”
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {formError && <p className="form-error">{formError}</p>}

              <div className="checkout-summary-box">
                <div className="summary-line tabular-nums">
                  <span>Items ({totalCount})</span>
                  <span>{formatPrice(subtotal)}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="summary-line summary-line-discount tabular-nums">
                    <span>{discountLabel}</span>
                    <span>-{formatPrice(discountAmount)}</span>
                  </div>
                )}
                {giftWrapTotal > 0 && (
                  <div className="summary-line tabular-nums">
                    <span>Gift Wrapping ({giftWrapUnits})</span>
                    <span>+{formatPrice(giftWrapTotal)}</span>
                  </div>
                )}
                <div className="summary-line tabular-nums">
                  <span>Shipping</span>
                  <span>{shippingCost === 0 ? 'Free' : formatPrice(shippingCost)}</span>
                </div>
                <div className="summary-line summary-line-total tabular-nums">
                  <span>Total Due</span>
                  <span>{formatPrice(grandTotal)}</span>
                </div>
              </div>
            </form>
          ) : items.length === 0 ? (
            <div className="drawer-empty" id="drawer-empty">
              <p>Your Waterholic bag is empty.</p>
              <a
                href="#catalog"
                className="btn btn-primary btn-sm"
                id="drawer-empty-cta"
                onClick={handleClose}
              >
                Explore All Products
              </a>
            </div>
          ) : (
            <div className="drawer-items" id="drawer-items">
              {items.map((item) => {
                const giftEnabled = Boolean(item.gift?.enabled);
                const isGiftCollapsed = Boolean(collapsedGiftKeys[item.key]);
                const itemWrapTotal =
                  giftEnabled && item.gift?.giftWrap
                    ? (item.gift.wrapFee || GIFT_WRAP_UNIT_FEE) * item.qty
                    : 0;
                const itemLineTotal = item.price * item.qty + itemWrapTotal;
                const messageLen = item.gift?.message?.length ?? 0;

                return (
                  <div
                    key={item.key}
                    className={`bag-item bag-item-stack${giftEnabled ? ' has-gift' : ''}`}
                  >
                    <div className="bag-item-main">
                      <BottleColorImage
                        src={item.image}
                        alt={item.name}
                        maxDimension={240}
                        className="bag-item-thumb"
                        finish={
                          item.finishHex
                            ? {
                                id: item.finishId ?? item.finishName,
                                hex: item.finishHex,
                                isTransparent: item.finishIsTransparent,
                                filter: item.finishFilter,
                              }
                            : undefined
                        }
                      />
                      <div className="bag-item-info">
                        <div className="bag-item-top">
                          <div className="bag-item-name">{item.name}</div>
                          <button
                            type="button"
                            className="bag-remove-btn"
                            aria-label={`Remove ${item.name}`}
                            onClick={() => onRemoveItem(item.key)}
                          >
                            Remove
                          </button>
                        </div>
                        <div className="bag-item-meta tabular-nums">
                          {item.finishName} · {item.sizeLabel} · {formatPrice(item.price)}
                        </div>
                        <div className="bag-qty-row">
                          <button
                            type="button"
                            className="qty-btn"
                            aria-label="Decrease quantity"
                            onClick={() => onUpdateQty(item.key, -1)}
                          >
                            -
                          </button>
                          <span className="bag-qty tabular-nums">
                            {item.qty}
                          </span>
                          <button
                            type="button"
                            className="qty-btn"
                            aria-label="Increase quantity"
                            onClick={() => onUpdateQty(item.key, 1)}
                          >
                            +
                          </button>
                          <span className="bag-line-total tabular-nums">
                            {formatPrice(itemLineTotal)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Per-Item Gift Message Toggle & Personalization Panel */}
                    <div className="bag-gift-section">
                      <div className="bag-gift-toggle-row">
                        <div className="bag-gift-toggle-label">
                          <Gift size={14} aria-hidden="true" />
                          <span>Gift Message</span>
                          {giftEnabled && (
                            <span className="gift-status-hint">
                              {item.gift?.giftWrap && item.gift?.message.trim()
                                ? 'Wrap + Note'
                                : item.gift?.giftWrap
                                  ? `+${formatPrice(itemWrapTotal)} Wrap`
                                  : item.gift?.message.trim()
                                    ? 'Note added'
                                    : 'Free note'}
                            </span>
                          )}
                        </div>

                        <div className="bag-gift-toggle-controls">
                          {giftEnabled && (
                            <button
                              type="button"
                              className="gift-collapse-btn"
                              aria-label={
                                isGiftCollapsed
                                  ? `Edit gift options for ${item.name}`
                                  : `Collapse gift options for ${item.name}`
                              }
                              onClick={() =>
                                setCollapsedGiftKeys((prev) => ({
                                  ...prev,
                                  [item.key]: !prev[item.key],
                                }))
                              }
                            >
                              {isGiftCollapsed ? (
                                <>
                                  Edit <ChevronDown size={13} aria-hidden="true" />
                                </>
                              ) : (
                                <>
                                  Hide <ChevronUp size={13} aria-hidden="true" />
                                </>
                              )}
                            </button>
                          )}

                          <button
                            type="button"
                            role="switch"
                            aria-checked={giftEnabled}
                            aria-label={`Toggle Gift Message for ${item.name}`}
                            className={`gift-switch${giftEnabled ? ' is-on' : ''}`}
                            onClick={() => handleToggleGiftMessage(item)}
                          >
                            <span className="gift-switch-thumb" />
                          </button>
                        </div>
                      </div>

                      {giftEnabled && isGiftCollapsed && (
                        <div className="bag-gift-collapsed-summary">
                          {item.gift?.giftWrap && (
                            <span className="gift-mini-tag">
                              {getGiftWrapLabel(item.gift.wrapStyle)} (+
                              {formatPrice(itemWrapTotal)})
                            </span>
                          )}
                          {item.gift?.message.trim() ? (
                            <span className="gift-collapsed-quote">
                              “{item.gift.message.trim()}”
                            </span>
                          ) : (
                            <span className="gift-collapsed-quote">
                              Complimentary printed card ready. Tap Edit to write
                              your note.
                            </span>
                          )}
                        </div>
                      )}

                      {giftEnabled && !isGiftCollapsed && (
                        <div className="bag-gift-panel">
                          {/* Optional Gift Wrapping Upgrade */}
                          <div className="gift-wrap-box">
                            <label className="gift-wrap-check-row">
                              <input
                                type="checkbox"
                                checked={Boolean(item.gift?.giftWrap)}
                                onChange={(e) =>
                                  handleUpdateGiftField(item, {
                                    giftWrap: e.target.checked,
                                  })
                                }
                              />
                              <span className="gift-wrap-check-copy">
                                <strong>Add Waterholic Gift Wrapping</strong>
                                <span>
                                  Eco presentation box + ribbon (+
                                  {formatPrice(GIFT_WRAP_UNIT_FEE)} / unit)
                                </span>
                              </span>
                            </label>

                            {item.gift?.giftWrap && (
                              <div
                                className="gift-wrap-styles"
                                role="radiogroup"
                                aria-label={`Gift wrapping style for ${item.name}`}
                              >
                                {GIFT_WRAP_OPTIONS.map((opt) => {
                                  const active = item.gift?.wrapStyle === opt.id;
                                  return (
                                    <button
                                      key={opt.id}
                                      type="button"
                                      role="radio"
                                      aria-checked={active}
                                      className={`gift-wrap-style-btn${active ? ' is-active' : ''}`}
                                      onClick={() =>
                                        handleUpdateGiftField(item, {
                                          giftWrap: true,
                                          wrapStyle: opt.id,
                                        })
                                      }
                                    >
                                      <span
                                        className="gift-wrap-swatch"
                                        style={{ background: opt.swatch }}
                                        aria-hidden="true"
                                      >
                                        {active && (
                                          <Check size={10} color="#ffffff" />
                                        )}
                                      </span>
                                      <span className="gift-wrap-style-text">
                                        <strong>{opt.name}</strong>
                                        <span>{opt.detail}</span>
                                      </span>
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </div>

                          {/* Recipient Name */}
                          <div className="gift-field">
                            <label htmlFor={`gift-to-${item.key}`}>
                              Recipient Name (Optional)
                            </label>
                            <input
                              id={`gift-to-${item.key}`}
                              type="text"
                              className="gift-input"
                              maxLength={MAX_RECIPIENT_LENGTH}
                              placeholder="e.g. Maya"
                              value={item.gift?.recipientName ?? ''}
                              onChange={(e) =>
                                handleUpdateGiftField(item, {
                                  recipientName: e.target.value,
                                })
                              }
                            />
                          </div>

                          {/* Personalized Note */}
                          <div className="gift-field">
                            <div className="gift-field-head">
                              <label htmlFor={`gift-msg-${item.key}`}>
                                Personalized Note (Free Printed Card)
                              </label>
                              <span className="gift-char-count tabular-nums">
                                {messageLen}/{MAX_GIFT_MESSAGE_LENGTH}
                              </span>
                            </div>
                            <textarea
                              id={`gift-msg-${item.key}`}
                              className="gift-textarea"
                              rows={2}
                              maxLength={MAX_GIFT_MESSAGE_LENGTH}
                              placeholder="Write a personal note to include with this item..."
                              value={item.gift?.message ?? ''}
                              onChange={(e) =>
                                handleUpdateGiftField(item, {
                                  message: e.target.value,
                                })
                              }
                            />
                            <div className="gift-quick-notes">
                              {QUICK_GIFT_NOTES.map((preset) => (
                                <button
                                  key={preset}
                                  type="button"
                                  className="gift-preset-btn"
                                  onClick={() =>
                                    handleUpdateGiftField(item, {
                                      message: preset,
                                    })
                                  }
                                >
                                  <Sparkles size={11} aria-hidden="true" />
                                  {preset}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Live Mini Gift Card Preview */}
                          {(item.gift?.message.trim() ||
                            item.gift?.recipientName?.trim() ||
                            item.gift?.giftWrap) && (
                            <div className="gift-card-preview">
                              <div className="gift-card-preview-top">
                                <span>WATERHOLIC GIFT CARD</span>
                                {item.gift?.giftWrap && (
                                  <span>
                                    {getGiftWrapLabel(item.gift.wrapStyle)}
                                  </span>
                                )}
                              </div>
                              {item.gift?.recipientName?.trim() && (
                                <div className="gift-card-preview-to">
                                  To {item.gift.recipientName.trim()},
                                </div>
                              )}
                              <p className="gift-card-preview-msg">
                                {item.gift?.message.trim()
                                  ? `“${item.gift.message.trim()}”`
                                  : 'Blank signature card ready for your handwriting.'}
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Promo Code Box */}
              <div className="promo-box">
                <form className="promo-row" onSubmit={handleApplyPromo}>
                  <input
                    type="text"
                    className="promo-input"
                    placeholder="Promo code (WATER10, CAMPUS15, FREESHIP)"
                    aria-label="Promo code"
                    value={promoInput}
                    onChange={(e) => {
                      setPromoInput(e.target.value);
                      if (promoError) setPromoError('');
                    }}
                  />
                  <button type="submit" className="btn-card-secondary">
                    Apply
                  </button>
                </form>
                {promoError && <p className="form-error">{promoError}</p>}
                {appliedPromoCode && (
                  <div className="promo-applied-row">
                    <span>Applied: {PROMO_CODES[appliedPromoCode].label}</span>
                    <button
                      type="button"
                      className="bag-remove-btn"
                      onClick={() => setAppliedPromoCode(null)}
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {step === 'bag' && items.length > 0 && (
          <div className="drawer-footer" id="drawer-footer">
            <div className="drawer-breakdown">
              <div className="drawer-sub-row tabular-nums">
                <span>Subtotal</span>
                <span>{formatPrice(subtotal)}</span>
              </div>
              {discountAmount > 0 && (
                <div className="drawer-sub-row summary-line-discount tabular-nums">
                  <span>{discountLabel}</span>
                  <span>-{formatPrice(discountAmount)}</span>
                </div>
              )}
              {giftWrapTotal > 0 && (
                <div className="drawer-sub-row tabular-nums">
                  <span>Gift Wrapping ({giftWrapUnits})</span>
                  <span>+{formatPrice(giftWrapTotal)}</span>
                </div>
              )}
              <div className="drawer-sub-row tabular-nums">
                <span>Shipping</span>
                <span>{shippingCost === 0 ? 'Free' : formatPrice(shippingCost)}</span>
              </div>
            </div>
            <div className="drawer-total-row">
              <span>Total</span>
              <span className="drawer-total tabular-nums" id="drawer-total">
                {formatPrice(grandTotal)}
              </span>
            </div>
            <button
              type="button"
              className="btn btn-primary btn-full"
              id="checkout-btn"
              onClick={() => setStep('checkout')}
            >
              Proceed to Checkout
            </button>
          </div>
        )}

        {step === 'checkout' && (
          <div className="drawer-footer">
            <button
              type="submit"
              form="checkout-form"
              className="btn btn-primary btn-full"
            >
              Confirm Order · {formatPrice(grandTotal)}
            </button>
          </div>
        )}
      </aside>
    </>
  );
}
