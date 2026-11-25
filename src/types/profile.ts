import type { BagLineItem } from '../components/BagDrawer';
import type { CountryCode } from '../utils/currency';

export interface SavedAddress {
  id: string;
  label: string;
  recipient: string;
  street: string;
  cityStateZip: string;
  isDefault: boolean;
}

export interface UserProfile {
  name: string;
  email: string;
  phone: string;
  university: string;
  country: CountryCode;
  preferredColor: string;
  dailyGoalMl: number;
  memberSince: string;
  signedIn: boolean;
}

export interface HydrationLog {
  dateKey: string;
  consumedMl: number;
  entries: { id: string; label: string; ml: number; time: string }[];
}

export interface HydrationMilestoneStats {
  dailyTotals: Record<string, number>;
  totalMlAllTime: number;
  currentStreakDays: number;
  bestStreakDays: number;
  daysGoalMet: number;
  dailyGoalMl: number;
  todayConsumedMl: number;
}

export interface OrderRecord {
  orderNumber: string;
  date: string;
  customerName: string;
  contact: string;
  address: string;
  paymentMethod: 'card' | 'cod';
  items: BagLineItem[];
  subtotal: number;
  discountAmount: number;
  discountLabel?: string;
  giftWrapTotal?: number;
  shippingCost: number;
  total: number;
  statusStep: 1 | 2 | 3 | 4; // 1: Confirmed, 2: Packed, 3: In Transit, 4: Delivered
}

export interface ProductReview {
  id: string;
  author: string;
  rating: number;
  date: string;
  comment: string;
  verified?: boolean;
}
