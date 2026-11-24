import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type User,
} from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  limit,
} from 'firebase/firestore';
import {
  auth,
  db,
  googleProvider,
  handleFirestoreError,
  OperationType,
} from '../lib/firebase';
import type { HydrationLog, OrderRecord, UserProfile } from '../types/profile';

export interface StudioCreationRecord {
  id: string;
  ownerId: string;
  kind: 'image' | 'edit' | 'reel';
  title: string;
  prompt: string;
  aspectRatio: '1:1' | '16:9' | '9:16' | '3:4' | '4:3';
  previewDataUrl?: string;
  createdAtMs: number;
}

export interface PersistedChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  model: string;
  groundingMode: 'none' | 'search' | 'maps';
}

interface CloudProfilePayload {
  profile: Partial<UserProfile>;
  savedIds: string[];
  studentDiscountActive: boolean;
  studentEmail: string;
}

interface AuthContextValue {
  user: User | null;
  authLoading: boolean;
  authError: string | null;
  cloudCreations: StudioCreationRecord[];
  cloudOrders: OrderRecord[];
  cloudChatHistory: PersistedChatMessage[];
  signInWithGoogle: () => Promise<void>;
  signOutUser: () => Promise<void>;
  loadCloudUserBundle: (
    dateKey: string
  ) => Promise<{
    profileDoc: CloudProfilePayload | null;
    hydrationDoc: HydrationLog | null;
  }>;
  syncProfileToCloud: (payload: {
    profile: UserProfile;
    savedIds: string[];
    studentDiscountActive: boolean;
    studentEmail: string;
  }) => Promise<void>;
  syncHydrationToCloud: (hydration: HydrationLog) => Promise<void>;
  saveOrderToCloud: (order: OrderRecord) => Promise<void>;
  saveCreationToCloud: (creation: {
    kind: 'image' | 'edit' | 'reel';
    title: string;
    prompt: string;
    aspectRatio: '1:1' | '16:9' | '9:16' | '3:4' | '4:3';
    previewDataUrl?: string;
  }) => Promise<void>;
  deleteCreationFromCloud: (creationId: string) => Promise<void>;
  saveChatTurnToCloud: (msg: {
    role: 'user' | 'assistant';
    text: string;
    model: string;
    groundingMode: 'none' | 'search' | 'maps';
  }) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function sanitizeId(raw: string): string {
  const cleaned = raw.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 80);
  return cleaned || `id_${Date.now()}`;
}

async function compressDataUrl(dataUrl: string, maxChars = 360000): Promise<string | undefined> {
  if (!dataUrl || !dataUrl.startsWith('data:image/')) return undefined;
  if (dataUrl.length <= maxChars) return dataUrl;
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const maxDim = 640;
      const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(img.width * scale));
      canvas.height = Math.max(1, Math.round(img.height * scale));
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(undefined);
        return;
      }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const jpeg = canvas.toDataURL('image/jpeg', 0.72);
      resolve(jpeg.length <= maxChars ? jpeg : undefined);
    };
    img.onerror = () => resolve(undefined);
    img.src = dataUrl;
  });
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [cloudCreations, setCloudCreations] = useState<StudioCreationRecord[]>([]);
  const [cloudOrders, setCloudOrders] = useState<OrderRecord[]>([]);
  const [cloudChatHistory, setCloudChatHistory] = useState<PersistedChatMessage[]>([]);

  const ensureParentUserDoc = useCallback(async (u: User) => {
    const userPath = `users/${u.uid}`;
    const userRef = doc(db, 'users', u.uid);
    try {
      const snap = await getDoc(userRef);
      if (!snap.exists()) {
        await setDoc(userRef, {
          ownerId: u.uid,
          name: (u.displayName || 'Waterholic Member').slice(0, 120),
          email: (u.email || '').slice(0, 180),
          phone: '',
          university: '',
          preferredColor: 'Ocean Blue',
          dailyGoalMl: 2500,
          memberSince: new Date().toLocaleDateString('en-US', {
            month: 'short',
            year: 'numeric',
          }),
          savedIds: [],
          studentDiscountActive: false,
          studentEmail: '',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, userPath);
    }
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (nextUser) => {
      setUser(nextUser);
      setAuthLoading(false);
      if (nextUser) {
        try {
          await ensureParentUserDoc(nextUser);
        } catch {
          // Error already logged via handleFirestoreError
        }
      } else {
        setCloudCreations([]);
        setCloudOrders([]);
        setCloudChatHistory([]);
      }
    });
    return () => unsub();
  }, [ensureParentUserDoc]);

  // Real-time listeners for user's saved AI Studio creations, orders & concierge history
  useEffect(() => {
    if (!user) return;

    const creationsPath = `users/${user.uid}/creations`;
    const creationsQuery = query(
      collection(db, 'users', user.uid, 'creations'),
      where('ownerId', '==', user.uid),
      orderBy('createdAt', 'desc'),
      limit(18)
    );
    const unsubCreations = onSnapshot(
      creationsQuery,
      (snap) => {
        const list: StudioCreationRecord[] = snap.docs.map((d) => {
          const data = d.data();
          const ts = data.createdAt?.toMillis?.() ?? Date.now();
          return {
            id: d.id,
            ownerId: String(data.ownerId ?? user.uid),
            kind: (data.kind as 'image' | 'edit' | 'reel') || 'image',
            title: String(data.title ?? 'Custom Design'),
            prompt: String(data.prompt ?? ''),
            aspectRatio:
              (data.aspectRatio as StudioCreationRecord['aspectRatio']) || '1:1',
            previewDataUrl:
              typeof data.previewDataUrl === 'string'
                ? data.previewDataUrl
                : undefined,
            createdAtMs: ts,
          };
        });
        setCloudCreations(list);
      },
      (error) => {
        try {
          handleFirestoreError(error, OperationType.LIST, creationsPath);
        } catch {
          // Keep UI resilient if index is warming up
        }
      }
    );

    const ordersPath = `users/${user.uid}/orders`;
    const ordersQuery = query(
      collection(db, 'users', user.uid, 'orders'),
      where('ownerId', '==', user.uid),
      orderBy('createdAt', 'desc'),
      limit(20)
    );
    const unsubOrders = onSnapshot(
      ordersQuery,
      (snap) => {
        const list: OrderRecord[] = snap.docs.map((d) => {
          const data = d.data();
          return {
            orderNumber: String(data.orderNumber ?? d.id),
            date: String(data.date ?? ''),
            customerName: String(data.customerName ?? ''),
            contact: String(data.contact ?? ''),
            address: String(data.address ?? ''),
            paymentMethod: data.paymentMethod === 'cod' ? 'cod' : 'card',
            items: Array.isArray(data.items) ? data.items : [],
            subtotal: Number(data.subtotal ?? 0),
            discountAmount: Number(data.discountAmount ?? 0),
            discountLabel:
              typeof data.discountLabel === 'string'
                ? data.discountLabel
                : undefined,
            giftWrapTotal:
              typeof data.giftWrapTotal === 'number' ? data.giftWrapTotal : 0,
            shippingCost: Number(data.shippingCost ?? 0),
            total: Number(data.total ?? 0),
            statusStep: (Number(data.statusStep) as 1 | 2 | 3 | 4) || 1,
          };
        });
        setCloudOrders(list);
      },
      (error) => {
        try {
          handleFirestoreError(error, OperationType.LIST, ordersPath);
        } catch {
          // Resilient listener
        }
      }
    );

    const chatPath = `users/${user.uid}/chatMessages`;
    const chatQuery = query(
      collection(db, 'users', user.uid, 'chatMessages'),
      where('ownerId', '==', user.uid),
      orderBy('createdAt', 'asc'),
      limit(30)
    );
    const unsubChat = onSnapshot(
      chatQuery,
      (snap) => {
        const list: PersistedChatMessage[] = snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            role: data.role === 'assistant' ? 'assistant' : 'user',
            text: String(data.text ?? ''),
            model: String(data.model ?? 'gemini-4-hydrogen'),
            groundingMode:
              data.groundingMode === 'search' || data.groundingMode === 'maps'
                ? data.groundingMode
                : 'none',
          };
        });
        setCloudChatHistory(list);
      },
      (error) => {
        try {
          handleFirestoreError(error, OperationType.LIST, chatPath);
        } catch {
          // Resilient listener
        }
      }
    );

    return () => {
      unsubCreations();
      unsubOrders();
      unsubChat();
    };
  }, [user]);

  const signInWithGoogle = useCallback(async () => {
    setAuthError(null);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      if (result.user) {
        await ensureParentUserDoc(result.user);
      }
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : 'Google sign-in failed.';
      setAuthError(msg);
      throw error;
    }
  }, [ensureParentUserDoc]);

  const signOutUser = useCallback(async () => {
    setAuthError(null);
    await signOut(auth);
  }, []);

  const loadCloudUserBundle = useCallback(
    async (dateKey: string) => {
      if (!user) return { profileDoc: null, hydrationDoc: null };
      const userPath = `users/${user.uid}`;
      const hydPath = `users/${user.uid}/hydrationLogs/${dateKey}`;
      let profileDoc: CloudProfilePayload | null = null;
      let hydrationDoc: HydrationLog | null = null;

      try {
        const snap = await getDoc(doc(db, 'users', user.uid));
        if (snap.exists()) {
          const d = snap.data();
          profileDoc = {
            profile: {
              name: String(d.name ?? user.displayName ?? 'Waterholic Member'),
              email: String(d.email ?? user.email ?? ''),
              phone: String(d.phone ?? ''),
              university: String(d.university ?? ''),
              preferredColor: String(d.preferredColor ?? 'Ocean Blue'),
              dailyGoalMl: Number(d.dailyGoalMl ?? 2500),
              memberSince: String(d.memberSince ?? 'Nov 2026'),
              signedIn: true,
            },
            savedIds: Array.isArray(d.savedIds) ? d.savedIds.map(String) : [],
            studentDiscountActive: Boolean(d.studentDiscountActive),
            studentEmail: String(d.studentEmail ?? ''),
          };
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, userPath);
      }

      try {
        const hydSnap = await getDoc(
          doc(db, 'users', user.uid, 'hydrationLogs', sanitizeId(dateKey))
        );
        if (hydSnap.exists()) {
          const d = hydSnap.data();
          hydrationDoc = {
            dateKey: String(d.dateKey ?? dateKey),
            consumedMl: Number(d.consumedMl ?? 0),
            entries: Array.isArray(d.entries) ? d.entries : [],
          };
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, hydPath);
      }

      return { profileDoc, hydrationDoc };
    },
    [user]
  );

  const syncProfileToCloud = useCallback(
    async (payload: {
      profile: UserProfile;
      savedIds: string[];
      studentDiscountActive: boolean;
      studentEmail: string;
    }) => {
      if (!user) return;
      const userPath = `users/${user.uid}`;
      const userRef = doc(db, 'users', user.uid);
      try {
        const snap = await getDoc(userRef);
        const boundedSaved = payload.savedIds.slice(0, 120);
        if (snap.exists()) {
          await updateDoc(userRef, {
            name: payload.profile.name.slice(0, 120) || 'Waterholic Member',
            email: payload.profile.email.slice(0, 180),
            phone: payload.profile.phone.slice(0, 40),
            university: payload.profile.university.slice(0, 120),
            preferredColor: payload.profile.preferredColor.slice(0, 60),
            dailyGoalMl: Math.max(
              500,
              Math.min(8000, Number(payload.profile.dailyGoalMl) || 2500)
            ),
            savedIds: boundedSaved,
            studentDiscountActive: Boolean(payload.studentDiscountActive),
            studentEmail: payload.studentEmail.slice(0, 180),
            updatedAt: serverTimestamp(),
          });
        } else {
          await setDoc(userRef, {
            ownerId: user.uid,
            name: payload.profile.name.slice(0, 120) || 'Waterholic Member',
            email: payload.profile.email.slice(0, 180),
            phone: payload.profile.phone.slice(0, 40),
            university: payload.profile.university.slice(0, 120),
            preferredColor: payload.profile.preferredColor.slice(0, 60),
            dailyGoalMl: Math.max(
              500,
              Math.min(8000, Number(payload.profile.dailyGoalMl) || 2500)
            ),
            memberSince: payload.profile.memberSince.slice(0, 40) || 'Nov 2026',
            savedIds: boundedSaved,
            studentDiscountActive: Boolean(payload.studentDiscountActive),
            studentEmail: payload.studentEmail.slice(0, 180),
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, userPath);
      }
    },
    [user]
  );

  const syncHydrationToCloud = useCallback(
    async (hydration: HydrationLog) => {
      if (!user) return;
      await ensureParentUserDoc(user);
      const safeDate = sanitizeId(hydration.dateKey);
      const path = `users/${user.uid}/hydrationLogs/${safeDate}`;
      const ref = doc(db, 'users', user.uid, 'hydrationLogs', safeDate);
      try {
        const snap = await getDoc(ref);
        const boundedEntries = hydration.entries.slice(0, 60);
        const consumedMl = Math.max(
          0,
          Math.min(25000, Number(hydration.consumedMl) || 0)
        );
        if (snap.exists()) {
          await updateDoc(ref, {
            consumedMl,
            entries: boundedEntries,
            updatedAt: serverTimestamp(),
          });
        } else {
          await setDoc(ref, {
            ownerId: user.uid,
            dateKey: safeDate,
            consumedMl,
            entries: boundedEntries,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, path);
      }
    },
    [user, ensureParentUserDoc]
  );

  const saveOrderToCloud = useCallback(
    async (order: OrderRecord) => {
      if (!user) return;
      await ensureParentUserDoc(user);
      const safeId = sanitizeId(`${order.orderNumber}_${Date.now()}`);
      const path = `users/${user.uid}/orders/${safeId}`;
      try {
        const sanitizedItems = order.items.slice(0, 50).map((item) => {
          const base: Record<string, unknown> = {
            key: String(item.key).slice(0, 140),
            productId: String(item.productId).slice(0, 64),
            name: String(item.name).slice(0, 140),
            finishName: String(item.finishName).slice(0, 60),
            sizeLabel: String(item.sizeLabel).slice(0, 40),
            price: Math.max(0, Number(item.price) || 0),
            qty: Math.max(1, Math.min(99, Number(item.qty) || 1)),
            image: String(item.image).slice(0, 500),
          };
          if (item.finishId) base.finishId = String(item.finishId).slice(0, 40);
          if (item.finishHex) base.finishHex = String(item.finishHex).slice(0, 20);
          if (typeof item.finishIsTransparent === 'boolean') {
            base.finishIsTransparent = item.finishIsTransparent;
          }
          if (item.finishFilter) {
            base.finishFilter = String(item.finishFilter).slice(0, 140);
          }
          if (item.gift?.enabled) {
            base.gift = {
              enabled: true,
              recipientName: (item.gift.recipientName ?? '').trim().slice(0, 60),
              message: (item.gift.message ?? '').trim().slice(0, 180),
              giftWrap: Boolean(item.gift.giftWrap),
              wrapStyle: item.gift.giftWrap ? item.gift.wrapStyle : 'none',
              wrapFee: item.gift.giftWrap
                ? Math.max(0, Math.min(50, Number(item.gift.wrapFee) || 0))
                : 0,
            };
          }
          return base;
        });

        const docPayload: Record<string, unknown> = {
          ownerId: user.uid,
          orderNumber: order.orderNumber.slice(0, 40),
          date: order.date.slice(0, 40),
          customerName: order.customerName.slice(0, 120) || 'Waterholic Member',
          contact: order.contact.slice(0, 180),
          address: order.address.slice(0, 300),
          paymentMethod: order.paymentMethod === 'cod' ? 'cod' : 'card',
          items: sanitizedItems,
          subtotal: Math.max(0, Number(order.subtotal) || 0),
          discountAmount: Math.max(0, Number(order.discountAmount) || 0),
          shippingCost: Math.max(0, Number(order.shippingCost) || 0),
          total: Math.max(0, Number(order.total) || 0),
          statusStep: order.statusStep,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };
        if (order.discountLabel) {
          docPayload.discountLabel = order.discountLabel.slice(0, 120);
        }
        if (typeof order.giftWrapTotal === 'number' && order.giftWrapTotal > 0) {
          docPayload.giftWrapTotal = Math.max(
            0,
            Math.min(10000, order.giftWrapTotal)
          );
        }
        await setDoc(doc(db, 'users', user.uid, 'orders', safeId), docPayload);
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, path);
      }
    },
    [user, ensureParentUserDoc]
  );

  const saveCreationToCloud = useCallback(
    async (creation: {
      kind: 'image' | 'edit' | 'reel';
      title: string;
      prompt: string;
      aspectRatio: '1:1' | '16:9' | '9:16' | '3:4' | '4:3';
      previewDataUrl?: string;
    }) => {
      if (!user) return;
      await ensureParentUserDoc(user);
      const safeId = sanitizeId(`cr_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`);
      const path = `users/${user.uid}/creations/${safeId}`;
      try {
        const compressed = creation.previewDataUrl
          ? await compressDataUrl(creation.previewDataUrl)
          : undefined;
        const payload: Record<string, unknown> = {
          ownerId: user.uid,
          kind: creation.kind,
          title: creation.title.slice(0, 140) || 'Custom Waterholic Design',
          prompt: creation.prompt.slice(0, 1200) || 'Waterholic studio design',
          aspectRatio: creation.aspectRatio,
          createdAt: serverTimestamp(),
        };
        if (compressed) {
          payload.previewDataUrl = compressed;
        }
        await setDoc(doc(db, 'users', user.uid, 'creations', safeId), payload);
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, path);
      }
    },
    [user, ensureParentUserDoc]
  );

  const deleteCreationFromCloud = useCallback(
    async (creationId: string) => {
      if (!user) return;
      const safeId = sanitizeId(creationId);
      const path = `users/${user.uid}/creations/${safeId}`;
      try {
        await deleteDoc(doc(db, 'users', user.uid, 'creations', safeId));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, path);
      }
    },
    [user]
  );

  const saveChatTurnToCloud = useCallback(
    async (msg: {
      role: 'user' | 'assistant';
      text: string;
      model: string;
      groundingMode: 'none' | 'search' | 'maps';
    }) => {
      if (!user) return;
      await ensureParentUserDoc(user);
      const safeId = sanitizeId(`msg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`);
      const path = `users/${user.uid}/chatMessages/${safeId}`;
      try {
        await setDoc(doc(db, 'users', user.uid, 'chatMessages', safeId), {
          ownerId: user.uid,
          role: msg.role,
          text: msg.text.slice(0, 8000),
          model: msg.model.slice(0, 80),
          groundingMode: msg.groundingMode,
          createdAt: serverTimestamp(),
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, path);
      }
    },
    [user, ensureParentUserDoc]
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        authLoading,
        authError,
        cloudCreations,
        cloudOrders,
        cloudChatHistory,
        signInWithGoogle,
        signOutUser,
        loadCloudUserBundle,
        syncProfileToCloud,
        syncHydrationToCloud,
        saveOrderToCloud,
        saveCreationToCloud,
        deleteCreationFromCloud,
        saveChatTurnToCloud,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return ctx;
}
