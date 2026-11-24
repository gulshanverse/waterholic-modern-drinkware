import { useEffect, useMemo, useState } from 'react';
import {
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDoc,
  increment,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import {
  Check,
  Copy,
  Crown,
  Droplets,
  Flame,
  KeyRound,
  Lock,
  LogIn,
  Plus,
  Trash2,
  Trophy,
  Users,
} from 'lucide-react';
import {
  db,
  handleFirestoreError,
  OperationType,
} from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import type { HydrationLog, UserProfile } from '../types/profile';

export interface LeaderboardParticipant {
  uid: string;
  name: string;
  dormOrCampus: string;
  loggedMl: number;
  streakDays: number;
}

export interface CampusChallengeItem {
  id: string;
  visibility: 'public' | 'private';
  title: string;
  campus: string;
  description: string;
  durationLabel: string;
  targetMl: number;
  inviteCode?: string;
  creatorId: string;
  creatorName: string;
  memberUids: string[];
  dormRoster: LeaderboardParticipant[];
  totalMl: number;
  isSeeded?: boolean;
}

interface HydrationChallengesPanelProps {
  profile: UserProfile;
  hydration: HydrationLog;
  onLogWater: (label: string, ml: number) => void;
  onShowToast: (msg: string) => void;
}

const STORAGE_JOINED_PUBLIC = 'wh_campus_joined_public_v1';
const STORAGE_LOCAL_PRIVATE = 'wh_campus_private_groups_v1';

const SEEDED_PUBLIC_CHALLENGES: CampusChallengeItem[] = [
  {
    id: 'pub_finals_week_streak',
    visibility: 'public',
    title: 'Finals Week 2.5L Focus Streak',
    campus: 'All Campuses · Open Leaderboard',
    description:
      'Replace sugary energy drinks with crisp cold water through finals week. Hit 2,500 ml daily to stay on the podium.',
    durationLabel: '7-Day Sprint',
    targetMl: 2500,
    creatorId: 'waterholic_campus',
    creatorName: 'Waterholic Campus',
    memberUids: [],
    totalMl: 11850,
    isSeeded: true,
    dormRoster: [
      {
        uid: 'seed-maya',
        name: 'Maya Lin',
        dormOrCampus: 'North Science Hall',
        loggedMl: 3100,
        streakDays: 12,
      },
      {
        uid: 'seed-devon',
        name: 'Devon Brooks',
        dormOrCampus: 'West Quad Commons',
        loggedMl: 2850,
        streakDays: 9,
      },
      {
        uid: 'seed-priya',
        name: 'Priya Nair',
        dormOrCampus: 'Engineering Annex',
        loggedMl: 2600,
        streakDays: 14,
      },
      {
        uid: 'seed-liam',
        name: 'Liam O’Connor',
        dormOrCampus: 'Baker Hall 4F',
        loggedMl: 2150,
        streakDays: 6,
      },
      {
        uid: 'seed-sofia',
        name: 'Sofia Alvarez',
        dormOrCampus: 'Honors Pavilion',
        loggedMl: 1900,
        streakDays: 5,
      },
    ],
  },
  {
    id: 'pub_zero_plastic_cup',
    visibility: 'public',
    title: 'Zero-Plastic Campus Refill Cup',
    campus: 'Inter-Dorm Sustainability Cup',
    description:
      'Log every reusable bottle refill across campus water stations. Every 500 ml refill prevents one disposable plastic bottle.',
    durationLabel: '30-Day Cup',
    targetMl: 3000,
    creatorId: 'waterholic_campus',
    creatorName: 'Green Campus Collective',
    memberUids: [],
    totalMl: 14200,
    isSeeded: true,
    dormRoster: [
      {
        uid: 'seed-kyle',
        name: 'Kyle Tanaka',
        dormOrCampus: 'Cedar Hall Eco Wing',
        loggedMl: 3400,
        streakDays: 19,
      },
      {
        uid: 'seed-amara',
        name: 'Amara Osei',
        dormOrCampus: 'South Library Fellows',
        loggedMl: 3050,
        streakDays: 15,
      },
      {
        uid: 'seed-elena',
        name: 'Elena Park',
        dormOrCampus: 'Studio Arts Dorm',
        loggedMl: 2700,
        streakDays: 11,
      },
      {
        uid: 'seed-noah',
        name: 'Noah Patel',
        dormOrCampus: 'Maple Terrace',
        loggedMl: 2250,
        streakDays: 8,
      },
    ],
  },
  {
    id: 'pub_rec_center_sprint',
    visibility: 'public',
    title: 'Rec Center & Intramural Hydration',
    campus: 'Campus Athletics & Rec',
    description:
      'Built for morning lifters, club runners, and intramural squads chasing peak hydration and clean electrolyte recovery.',
    durationLabel: 'Weekly Leaderboard',
    targetMl: 3500,
    creatorId: 'waterholic_campus',
    creatorName: 'Campus Rec Club',
    memberUids: [],
    totalMl: 13650,
    isSeeded: true,
    dormRoster: [
      {
        uid: 'seed-jordan',
        name: 'Jordan Reyes',
        dormOrCampus: 'Track & Field Club',
        loggedMl: 3800,
        streakDays: 21,
      },
      {
        uid: 'seed-chloe',
        name: 'Chloe Bennett',
        dormOrCampus: 'Varsity Rowing',
        loggedMl: 3450,
        streakDays: 16,
      },
      {
        uid: 'seed-marcus',
        name: 'Marcus Bell',
        dormOrCampus: 'Intramural Hoops',
        loggedMl: 2950,
        streakDays: 10,
      },
      {
        uid: 'seed-hana',
        name: 'Hana Kim',
        dormOrCampus: 'Climbing Co-op',
        loggedMl: 2400,
        streakDays: 7,
      },
    ],
  },
];

const STARTER_LOCAL_PRIVATE_GROUP: CampusChallengeItem = {
  id: 'local_baker_suite_308',
  visibility: 'private',
  title: 'Baker Hall 308 Suite Goal',
  campus: 'Baker Hall · Floor 3',
  description:
    'Daily roommate pact: hit 10 liters together before midnight study check-in.',
  durationLabel: 'Daily Group Goal',
  targetMl: 10000,
  inviteCode: 'BAKER3',
  creatorId: 'local-user',
  creatorName: 'Alex Mercer',
  memberUids: ['local-user', 'mate-sam', 'mate-zoe', 'mate-ethan'],
  totalMl: 6950,
  dormRoster: [
    {
      uid: 'mate-sam',
      name: 'Sam Rivera',
      dormOrCampus: 'Room 308B',
      loggedMl: 2400,
      streakDays: 8,
    },
    {
      uid: 'mate-zoe',
      name: 'Zoe Chen',
      dormOrCampus: 'Room 308C',
      loggedMl: 2150,
      streakDays: 6,
    },
    {
      uid: 'mate-ethan',
      name: 'Ethan Brooks',
      dormOrCampus: 'Room 308D',
      loggedMl: 1650,
      streakDays: 4,
    },
  ],
};

function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

function readLocal<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function HydrationChallengesPanel({
  profile,
  hydration,
  onLogWater,
  onShowToast,
}: HydrationChallengesPanelProps) {
  const { user, signInWithGoogle } = useAuth();
  const [subView, setSubView] = useState<'public' | 'private'>('public');

  // Public leaderboard state
  const [selectedPublicId, setSelectedPublicId] = useState<string>(
    SEEDED_PUBLIC_CHALLENGES[0].id
  );
  const [cloudPublicChallenges, setCloudPublicChallenges] = useState<
    CampusChallengeItem[]
  >([]);
  const [cloudPublicEntries, setCloudPublicEntries] = useState<
    LeaderboardParticipant[]
  >([]);
  const [joinedPublicIds, setJoinedPublicIds] = useState<string[]>(() =>
    readLocal<string[]>(STORAGE_JOINED_PUBLIC, ['pub_finals_week_streak'])
  );

  // Private dorm groups state
  const [cloudPrivateGroups, setCloudPrivateGroups] = useState<
    CampusChallengeItem[]
  >([]);
  const [localPrivateGroups, setLocalPrivateGroups] = useState<
    CampusChallengeItem[]
  >(() =>
    readLocal<CampusChallengeItem[]>(STORAGE_LOCAL_PRIVATE, [
      STARTER_LOCAL_PRIVATE_GROUP,
    ])
  );

  // Create group / Join by code forms
  const [showCreateForm, setShowCreateForm] = useState<boolean>(false);
  const [newTitle, setNewTitle] = useState<string>('');
  const [newDorm, setNewDorm] = useState<string>(
    profile.university || 'Baker Hall · Floor 3'
  );
  const [newDesc, setNewDesc] = useState<string>('');
  const [newTargetMl, setNewTargetMl] = useState<number>(10000);
  const [newDuration, setNewDuration] = useState<string>('Daily Group Goal');
  const [newVisibility, setNewVisibility] = useState<'private' | 'public'>(
    'private'
  );
  const [creating, setCreating] = useState<boolean>(false);

  const [inviteInput, setInviteInput] = useState<string>('');
  const [joinBusy, setJoinBusy] = useState<boolean>(false);
  const [joinError, setJoinError] = useState<string>('');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const currentUid = user?.uid ?? 'local-user';
  const currentDisplayName = (
    user?.displayName ||
    profile.name ||
    'Campus Member'
  ).slice(0, 80);
  const currentDormLabel = (profile.university || 'Campus Resident').slice(0, 80);
  const currentStreak = Math.max(1, Math.min(30, hydration.entries.length + 2));

  useEffect(() => {
    try {
      window.localStorage.setItem(
        STORAGE_JOINED_PUBLIC,
        JSON.stringify(joinedPublicIds)
      );
    } catch {
      // ignore storage errors
    }
  }, [joinedPublicIds]);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        STORAGE_LOCAL_PRIVATE,
        JSON.stringify(localPrivateGroups)
      );
    } catch {
      // ignore storage errors
    }
  }, [localPrivateGroups]);

  // Listen to public campus challenges in Firestore
  useEffect(() => {
    const path = 'campusChallenges';
    const q = query(
      collection(db, path),
      where('visibility', '==', 'public'),
      orderBy('createdAt', 'desc'),
      limit(12)
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        const list: CampusChallengeItem[] = snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            visibility: 'public',
            title: String(data.title ?? 'Campus Challenge'),
            campus: String(data.campus ?? 'Campus'),
            description: String(data.description ?? ''),
            durationLabel: String(data.durationLabel ?? '7-Day Sprint'),
            targetMl: Number(data.targetMl ?? 2500),
            creatorId: String(data.creatorId ?? ''),
            creatorName: String(data.creatorName ?? 'Member'),
            memberUids: Array.isArray(data.memberUids)
              ? data.memberUids.map(String)
              : [],
            dormRoster: Array.isArray(data.dormRoster) ? data.dormRoster : [],
            totalMl: Number(data.totalMl ?? 0),
          };
        });
        setCloudPublicChallenges(list);
      },
      (error) => {
        try {
          handleFirestoreError(error, OperationType.LIST, path);
        } catch {
          // Resilient fallback to curated seeded leaderboards
        }
      }
    );
    return () => unsub();
  }, []);

  // Listen to live entries of the currently selected cloud public challenge
  useEffect(() => {
    const isCloud = cloudPublicChallenges.some(
      (c) => c.id === selectedPublicId
    );
    if (!isCloud) {
      setCloudPublicEntries([]);
      return;
    }

    const entriesPath = `campusChallenges/${selectedPublicId}/entries`;
    const q = query(
      collection(db, 'campusChallenges', selectedPublicId, 'entries'),
      where('visibility', '==', 'public'),
      orderBy('loggedMl', 'desc'),
      limit(30)
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        const list: LeaderboardParticipant[] = snap.docs.map((d) => {
          const data = d.data();
          return {
            uid: String(data.userId ?? d.id),
            name: String(data.displayName ?? 'Student'),
            dormOrCampus: String(data.dormOrCampus ?? 'Campus'),
            loggedMl: Number(data.loggedMl ?? 0),
            streakDays: Number(data.streakDays ?? 1),
          };
        });
        setCloudPublicEntries(list);
      },
      (error) => {
        try {
          handleFirestoreError(error, OperationType.LIST, entriesPath);
        } catch {
          // Resilient listener
        }
      }
    );
    return () => unsub();
  }, [selectedPublicId, cloudPublicChallenges]);

  // Listen to signed-in user's private dorm groups in Firestore
  useEffect(() => {
    if (!user) {
      setCloudPrivateGroups([]);
      return;
    }
    const path = 'campusChallenges';
    const q = query(
      collection(db, path),
      where('visibility', '==', 'private'),
      where('memberUids', 'array-contains', user.uid),
      limit(20)
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        const list: CampusChallengeItem[] = snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            visibility: 'private',
            title: String(data.title ?? 'Dorm Group'),
            campus: String(data.campus ?? 'Campus Dorm'),
            description: String(data.description ?? ''),
            durationLabel: String(data.durationLabel ?? 'Daily Group Goal'),
            targetMl: Number(data.targetMl ?? 10000),
            inviteCode:
              typeof data.inviteCode === 'string' ? data.inviteCode : undefined,
            creatorId: String(data.creatorId ?? ''),
            creatorName: String(data.creatorName ?? 'Member'),
            memberUids: Array.isArray(data.memberUids)
              ? data.memberUids.map(String)
              : [],
            dormRoster: Array.isArray(data.dormRoster) ? data.dormRoster : [],
            totalMl: Number(data.totalMl ?? 0),
          };
        });
        setCloudPrivateGroups(list);
      },
      (error) => {
        try {
          handleFirestoreError(error, OperationType.LIST, path);
        } catch {
          // Resilient listener
        }
      }
    );
    return () => unsub();
  }, [user]);

  const allPublicChallenges = useMemo(
    () => [...cloudPublicChallenges, ...SEEDED_PUBLIC_CHALLENGES],
    [cloudPublicChallenges]
  );

  const activePublicChallenge = useMemo(
    () =>
      allPublicChallenges.find((c) => c.id === selectedPublicId) ??
      allPublicChallenges[0],
    [allPublicChallenges, selectedPublicId]
  );

  const isJoinedActivePublic = useMemo(() => {
    if (!activePublicChallenge) return false;
    if (!activePublicChallenge.isSeeded) {
      return (
        cloudPublicEntries.some((e) => e.uid === currentUid) ||
        joinedPublicIds.includes(activePublicChallenge.id)
      );
    }
    return joinedPublicIds.includes(activePublicChallenge.id);
  }, [activePublicChallenge, cloudPublicEntries, joinedPublicIds, currentUid]);

  // Build ranked leaderboard rows including the current student's live intake when joined
  const rankedPublicEntries = useMemo(() => {
    if (!activePublicChallenge) return [];
    const base = activePublicChallenge.isSeeded
      ? [...activePublicChallenge.dormRoster]
      : cloudPublicEntries.length > 0
        ? [...cloudPublicEntries]
        : [...activePublicChallenge.dormRoster];

    if (isJoinedActivePublic) {
      const idx = base.findIndex((p) => p.uid === currentUid);
      const myRow: LeaderboardParticipant = {
        uid: currentUid,
        name: currentDisplayName,
        dormOrCampus: currentDormLabel,
        loggedMl: hydration.consumedMl,
        streakDays: currentStreak,
      };
      if (idx >= 0) {
        base[idx] = { ...base[idx], loggedMl: Math.max(base[idx].loggedMl, hydration.consumedMl) };
      } else {
        base.push(myRow);
      }
    }

    return base.sort((a, b) => b.loggedMl - a.loggedMl);
  }, [
    activePublicChallenge,
    cloudPublicEntries,
    isJoinedActivePublic,
    currentUid,
    currentDisplayName,
    currentDormLabel,
    hydration.consumedMl,
    currentStreak,
  ]);

  const displayedPrivateGroups = useMemo(() => {
    const merged = user
      ? [...cloudPrivateGroups, ...localPrivateGroups]
      : localPrivateGroups;

    // Ensure the current student's live intake is reflected in their local starter dorm group too
    return merged.map((grp) => {
      if (grp.id.startsWith('local_')) {
        const hasMe = grp.dormRoster.some((m) => m.uid === currentUid || m.uid === 'local-user');
        const roster = hasMe
          ? grp.dormRoster.map((m) =>
              m.uid === currentUid || m.uid === 'local-user'
                ? {
                    ...m,
                    uid: currentUid,
                    name: currentDisplayName,
                    loggedMl: hydration.consumedMl,
                    streakDays: currentStreak,
                  }
                : m
            )
          : [
              {
                uid: currentUid,
                name: currentDisplayName,
                dormOrCampus: currentDormLabel,
                loggedMl: hydration.consumedMl,
                streakDays: currentStreak,
              },
              ...grp.dormRoster,
            ];
        const totalMl = roster.reduce((acc, m) => acc + m.loggedMl, 0);
        return { ...grp, dormRoster: roster, totalMl };
      }
      return grp;
    });
  }, [
    user,
    cloudPrivateGroups,
    localPrivateGroups,
    currentUid,
    currentDisplayName,
    currentDormLabel,
    hydration.consumedMl,
    currentStreak,
  ]);

  const handleJoinPublicChallenge = async (challenge: CampusChallengeItem) => {
    if (!joinedPublicIds.includes(challenge.id)) {
      setJoinedPublicIds((prev) => [...prev, challenge.id]);
    }

    if (user && !challenge.isSeeded) {
      const entryPath = `campusChallenges/${challenge.id}/entries/${user.uid}`;
      const entryRef = doc(db, 'campusChallenges', challenge.id, 'entries', user.uid);
      try {
        const snap = await getDoc(entryRef);
        if (snap.exists()) {
          await updateDoc(entryRef, {
            displayName: currentDisplayName,
            dormOrCampus: currentDormLabel,
            loggedMl: hydration.consumedMl,
            streakDays: currentStreak,
            updatedAt: serverTimestamp(),
          });
        } else {
          await setDoc(entryRef, {
            challengeId: challenge.id,
            visibility: 'public',
            userId: user.uid,
            displayName: currentDisplayName,
            dormOrCampus: currentDormLabel,
            loggedMl: hydration.consumedMl,
            streakDays: currentStreak,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }
      } catch (error) {
        try {
          handleFirestoreError(error, OperationType.WRITE, entryPath);
        } catch {
          // Local join remains active
        }
      }
    }

    onShowToast(`Joined "${challenge.title}" — your hydration is live on the leaderboard`);
  };

  const handleLeavePublicChallenge = async (challenge: CampusChallengeItem) => {
    setJoinedPublicIds((prev) => prev.filter((id) => id !== challenge.id));
    if (user && !challenge.isSeeded) {
      const entryPath = `campusChallenges/${challenge.id}/entries/${user.uid}`;
      try {
        await deleteDoc(doc(db, 'campusChallenges', challenge.id, 'entries', user.uid));
      } catch (error) {
        try {
          handleFirestoreError(error, OperationType.DELETE, entryPath);
        } catch {
          // ignore
        }
      }
    }
    onShowToast(`Left "${challenge.title}"`);
  };

  const handleQuickLogAndSync = async (label: string, ml: number) => {
    onLogWater(label, ml);
    const nextConsumed = hydration.consumedMl + ml;

    // Sync active cloud public entry if signed in & joined
    if (user && activePublicChallenge && !activePublicChallenge.isSeeded && isJoinedActivePublic) {
      const entryRef = doc(
        db,
        'campusChallenges',
        activePublicChallenge.id,
        'entries',
        user.uid
      );
      try {
        const snap = await getDoc(entryRef);
        if (snap.exists()) {
          await updateDoc(entryRef, {
            displayName: currentDisplayName,
            dormOrCampus: currentDormLabel,
            loggedMl: nextConsumed,
            streakDays: currentStreak,
            updatedAt: serverTimestamp(),
          });
        }
      } catch {
        // non-blocking
      }
    }

    // Sync user's intake across all joined cloud private dorm groups
    if (user && cloudPrivateGroups.length > 0) {
      for (const grp of cloudPrivateGroups) {
        const updatedRoster = grp.dormRoster.map((m) =>
          m.uid === user.uid
            ? {
                ...m,
                name: currentDisplayName,
                loggedMl: nextConsumed,
                streakDays: currentStreak,
              }
            : m
        );
        if (!updatedRoster.some((m) => m.uid === user.uid)) {
          updatedRoster.push({
            uid: user.uid,
            name: currentDisplayName,
            dormOrCampus: currentDormLabel,
            loggedMl: nextConsumed,
            streakDays: currentStreak,
          });
        }
        const totalMl = updatedRoster.reduce((acc, m) => acc + m.loggedMl, 0);
        try {
          await updateDoc(doc(db, 'campusChallenges', grp.id), {
            memberUids: grp.memberUids,
            dormRoster: updatedRoster.slice(0, 25),
            totalMl,
            updatedAt: serverTimestamp(),
          });
        } catch {
          // non-blocking
        }
      }
    }
  };

  const handleCreateChallenge = async (e: React.FormEvent) => {
    e.preventDefault();
    const title = newTitle.trim();
    const campus = newDorm.trim() || 'Campus Dorm';
    if (title.length < 2) {
      onShowToast('Give your hydration challenge a name (at least 2 characters)');
      return;
    }

    setCreating(true);
    const inviteCode =
      newVisibility === 'private' ? generateInviteCode() : undefined;
    const starterEntry: LeaderboardParticipant = {
      uid: currentUid,
      name: currentDisplayName,
      dormOrCampus: campus,
      loggedMl: hydration.consumedMl,
      streakDays: currentStreak,
    };

    try {
      if (user) {
        const challengeId = `${newVisibility === 'private' ? 'priv' : 'pub'}_${Date.now()}_${Math.random()
          .toString(36)
          .slice(2, 7)}`;
        const challengeRef = doc(db, 'campusChallenges', challengeId);

        const payload: Record<string, unknown> = {
          visibility: newVisibility,
          title: title.slice(0, 100),
          campus: campus.slice(0, 100),
          description: (
            newDesc.trim() ||
            (newVisibility === 'private'
              ? 'Private dorm squad hydration goal — hit the target together!'
              : 'Open campus hydration leaderboard — log every refill to climb the ranks.')
          ).slice(0, 280),
          durationLabel: newDuration.slice(0, 40),
          targetMl: Math.max(1000, Math.min(250000, Number(newTargetMl) || 10000)),
          creatorId: user.uid,
          creatorName: currentDisplayName,
          memberUids: [user.uid],
          dormRoster: [starterEntry],
          totalMl: hydration.consumedMl,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };

        if (inviteCode) {
          payload.inviteCode = inviteCode;
        }

        // Atomic writeBatch guarantees challenge + invite lookup exist together
        const batch = writeBatch(db);
        batch.set(challengeRef, payload);

        if (inviteCode) {
          const inviteRef = doc(db, 'challengeInvites', inviteCode);
          batch.set(inviteRef, {
            code: inviteCode,
            challengeId,
            creatorId: user.uid,
            createdAt: serverTimestamp(),
          });
        } else {
          // Also seed creator into public leaderboard entries subcollection
          const entryRef = doc(
            db,
            'campusChallenges',
            challengeId,
            'entries',
            user.uid
          );
          batch.set(entryRef, {
            challengeId,
            visibility: 'public',
            userId: user.uid,
            displayName: currentDisplayName,
            dormOrCampus: campus,
            loggedMl: hydration.consumedMl,
            streakDays: currentStreak,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }

        await batch.commit();

        if (newVisibility === 'public') {
          setSelectedPublicId(challengeId);
          setJoinedPublicIds((prev) =>
            prev.includes(challengeId) ? prev : [...prev, challengeId]
          );
          setSubView('public');
        } else {
          setSubView('private');
        }
        onShowToast(
          inviteCode
            ? `Created "${title}"! Share invite code ${inviteCode} with dorm mates`
            : `Launched public leaderboard "${title}"`
        );
      } else {
        // Guest local mode — instant interactive creation
        const localId = `local_${Date.now()}`;
        const localItem: CampusChallengeItem = {
          id: localId,
          visibility: newVisibility,
          title: title.slice(0, 100),
          campus: campus.slice(0, 100),
          description:
            newDesc.trim() ||
            'Dorm hydration pact — sign in with Google anytime to sync live with roommates.',
          durationLabel: newDuration,
          targetMl: Math.max(1000, Math.min(250000, Number(newTargetMl) || 10000)),
          inviteCode,
          creatorId: currentUid,
          creatorName: currentDisplayName,
          memberUids: [currentUid],
          dormRoster: [starterEntry],
          totalMl: hydration.consumedMl,
        };
        setLocalPrivateGroups((prev) => [localItem, ...prev]);
        setSubView('private');
        onShowToast(
          `Created "${title}" locally (Sign in with Google to share invite code ${inviteCode} live)`
        );
      }

      setNewTitle('');
      setNewDesc('');
      setShowCreateForm(false);
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : 'Could not create challenge.';
      onShowToast(msg);
    } finally {
      setCreating(false);
    }
  };

  const handleJoinByInviteCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = inviteInput
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '');
    if (code.length < 4) {
      setJoinError('Enter a valid 6-character dorm invite code (e.g. BAKER3).');
      return;
    }
    setJoinError('');

    if (!user) {
      const matchedLocal = localPrivateGroups.find((g) => g.inviteCode === code);
      if (matchedLocal) {
        onShowToast(`You are already in "${matchedLocal.title}"`);
        setInviteInput('');
        return;
      }
      setJoinError(
        'Sign in with Google above to join a dorm mate’s live cloud group by invite code.'
      );
      return;
    }

    setJoinBusy(true);
    const invitePath = `challengeInvites/${code}`;
    try {
      const inviteSnap = await getDoc(doc(db, 'challengeInvites', code));
      if (!inviteSnap.exists()) {
        setJoinError(`No private dorm group found for code "${code}".`);
        setJoinBusy(false);
        return;
      }

      const challengeId = String(inviteSnap.data().challengeId ?? '');
      if (!challengeId) {
        setJoinError('Invalid invite code.');
        setJoinBusy(false);
        return;
      }

      if (cloudPrivateGroups.some((g) => g.id === challengeId)) {
        onShowToast('You are already a member of this dorm group');
        setInviteInput('');
        setJoinBusy(false);
        return;
      }

      const memberObj: LeaderboardParticipant = {
        uid: user.uid,
        name: currentDisplayName,
        dormOrCampus: currentDormLabel,
        loggedMl: hydration.consumedMl,
        streakDays: currentStreak,
      };

      // Atomic join via arrayUnion + increment (no pre-read needed on private group!)
      const challengePath = `campusChallenges/${challengeId}`;
      try {
        await updateDoc(doc(db, 'campusChallenges', challengeId), {
          memberUids: arrayUnion(user.uid),
          dormRoster: arrayUnion(memberObj),
          totalMl: increment(hydration.consumedMl),
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, challengePath);
      }

      setInviteInput('');
      setSubView('private');
      onShowToast('Joined dorm hydration group! Syncing live progress now');
    } catch (error) {
      try {
        handleFirestoreError(error, OperationType.GET, invitePath);
      } catch {
        setJoinError('Unable to verify that invite code right now.');
      }
    } finally {
      setJoinBusy(false);
    }
  };

  const handleDeletePrivateGroup = async (grp: CampusChallengeItem) => {
    if (grp.id.startsWith('local_')) {
      setLocalPrivateGroups((prev) => prev.filter((g) => g.id !== grp.id));
      onShowToast(`Removed "${grp.title}"`);
      return;
    }
    if (!user) return;
    try {
      await deleteDoc(doc(db, 'campusChallenges', grp.id));
      if (grp.inviteCode) {
        await deleteDoc(doc(db, 'challengeInvites', grp.inviteCode)).catch(() => {});
      }
      onShowToast(`Deleted dorm group "${grp.title}"`);
    } catch (error) {
      try {
        handleFirestoreError(
          error,
          OperationType.DELETE,
          `campusChallenges/${grp.id}`
        );
      } catch {
        onShowToast('Only the group creator can delete this group');
      }
    }
  };

  const handleCopyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      onShowToast(`Invite code ${code} copied — send it to your dorm mates`);
      window.setTimeout(() => {
        setCopiedCode((c) => (c === code ? null : c));
      }, 2200);
    } catch {
      onShowToast(`Share invite code: ${code}`);
    }
  };

  const myDailyPct = Math.min(
    100,
    Math.round((hydration.consumedMl / Math.max(500, profile.dailyGoalMl)) * 100)
  );

  return (
    <div className="challenges-shell">
      {/* Live Student Hydration Strip + Quick Log */}
      <div className="challenges-sync-bar">
        <div className="challenges-sync-left">
          <div className="challenges-sync-icon" aria-hidden="true">
            <Droplets size={20} />
          </div>
          <div>
            <div className="challenges-sync-title">
              <strong>{currentDisplayName}</strong>
              <span className="challenges-streak-tag tabular-nums">
                <Flame size={13} aria-hidden="true" />
                {currentStreak}-day streak
              </span>
            </div>
            <p className="challenges-sync-sub tabular-nums">
              Today&apos;s intake: <strong>{hydration.consumedMl} ml</strong> /{' '}
              {profile.dailyGoalMl} ml ({myDailyPct}%) — auto-synced across your
              joined challenges
            </p>
          </div>
        </div>

        <div className="challenges-sync-actions">
          <button
            type="button"
            className="hydration-add-btn"
            onClick={() => void handleQuickLogAndSync('Challenge Glass', 250)}
          >
            +250 ml
          </button>
          <button
            type="button"
            className="hydration-add-btn"
            onClick={() => void handleQuickLogAndSync('Campus Bottle Refill', 500)}
          >
            +500 ml Refill
          </button>
          {!user && (
            <button
              type="button"
              className="btn-card-primary challenges-signin-btn"
              onClick={() => void signInWithGoogle().catch(() => {})}
            >
              <LogIn size={14} aria-hidden="true" />
              Sign In to Sync Live
            </button>
          )}
        </div>
      </div>

      {/* Sub-view switcher: Public Leaderboards vs Private Dorm Groups */}
      <div className="challenges-toolbar">
        <div
          className="challenges-subtabs"
          role="tablist"
          aria-label="Hydration challenge categories"
        >
          <button
            type="button"
            role="tab"
            aria-selected={subView === 'public'}
            className={`challenges-subtab${subView === 'public' ? ' is-active' : ''}`}
            onClick={() => setSubView('public')}
          >
            <Trophy size={15} aria-hidden="true" />
            Public Leaderboards ({allPublicChallenges.length})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={subView === 'private'}
            className={`challenges-subtab${subView === 'private' ? ' is-active' : ''}`}
            onClick={() => setSubView('private')}
          >
            <Lock size={15} aria-hidden="true" />
            Private Dorm Groups ({displayedPrivateGroups.length})
          </button>
        </div>

        <button
          type="button"
          className="btn btn-primary challenges-create-trigger"
          onClick={() => {
            setNewVisibility(subView === 'public' ? 'public' : 'private');
            setShowCreateForm((v) => !v);
          }}
        >
          <Plus size={16} aria-hidden="true" />
          {showCreateForm ? 'Close Builder' : 'New Group / Challenge'}
        </button>
      </div>

      {/* Collapsible Challenge / Private Dorm Group Creator */}
      {showCreateForm && (
        <form className="challenges-create-card" onSubmit={handleCreateChallenge}>
          <div className="challenges-create-head">
            <h3>
              {newVisibility === 'private'
                ? 'Create a Private Dorm Group Goal'
                : 'Launch a Public Campus Leaderboard'}
            </h3>
            <div className="option-row">
              <button
                type="button"
                className={`pill-option${newVisibility === 'private' ? ' is-active' : ''}`}
                onClick={() => {
                  setNewVisibility('private');
                  setNewTargetMl(10000);
                  setNewDuration('Daily Group Goal');
                }}
              >
                Private Dorm Group
              </button>
              <button
                type="button"
                className={`pill-option${newVisibility === 'public' ? ' is-active' : ''}`}
                onClick={() => {
                  setNewVisibility('public');
                  setNewTargetMl(2500);
                  setNewDuration('7-Day Sprint');
                }}
              >
                Public Leaderboard
              </button>
            </div>
          </div>

          <div className="challenges-form-grid">
            <label className="challenges-field">
              <span>Challenge / Squad Name</span>
              <input
                type="text"
                required
                maxLength={100}
                placeholder={
                  newVisibility === 'private'
                    ? 'e.g. Baker Hall 3F Hydro Squad'
                    : 'e.g. Engineering Library Finals Hydration'
                }
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
              />
            </label>

            <label className="challenges-field">
              <span>Dorm Hall or Campus</span>
              <input
                type="text"
                required
                maxLength={100}
                placeholder="e.g. Baker Hall · Floor 3"
                value={newDorm}
                onChange={(e) => setNewDorm(e.target.value)}
              />
            </label>

            <label className="challenges-field">
              <span>
                {newVisibility === 'private'
                  ? 'Collective Group Goal (ml)'
                  : 'Daily Student Target (ml)'}
              </span>
              <input
                type="number"
                min={1000}
                max={250000}
                step={500}
                value={newTargetMl}
                onChange={(e) => setNewTargetMl(Number(e.target.value))}
              />
            </label>

            <label className="challenges-field">
              <span>Timeframe</span>
              <select
                value={newDuration}
                onChange={(e) => setNewDuration(e.target.value)}
              >
                <option value="Daily Group Goal">Daily Group Goal</option>
                <option value="7-Day Sprint">7-Day Sprint</option>
                <option value="Finals Week">Finals Week</option>
                <option value="30-Day Cup">30-Day Campus Cup</option>
              </select>
            </label>
          </div>

          <label className="challenges-field">
            <span>Goal Note (optional)</span>
            <input
              type="text"
              maxLength={280}
              placeholder="e.g. Loser buys cold brew after Friday's exam!"
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
            />
          </label>

          <div className="challenges-form-footer">
            <span className="challenges-form-hint">
              {newVisibility === 'private'
                ? 'An exclusive 6-character invite code is generated automatically for your dorm mates.'
                : 'Visible to all Waterholic students so anyone on campus can join and compete.'}
            </span>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={creating}
            >
              {creating
                ? 'Launching...'
                : newVisibility === 'private'
                  ? 'Create Dorm Group & Generate Code'
                  : 'Publish Campus Leaderboard'}
            </button>
          </div>
        </form>
      )}

      {/* VIEW 1: PUBLIC CAMPUS LEADERBOARDS */}
      {subView === 'public' && activePublicChallenge && (
        <div className="challenges-public-layout">
          {/* Challenge Selector List */}
          <div className="challenges-list-col">
            {allPublicChallenges.map((ch) => {
              const isSelected = ch.id === activePublicChallenge.id;
              const isJoined =
                joinedPublicIds.includes(ch.id) ||
                (!ch.isSeeded && ch.memberUids.includes(currentUid));
              return (
                <button
                  key={ch.id}
                  type="button"
                  className={`challenge-pick-card${isSelected ? ' is-active' : ''}`}
                  onClick={() => setSelectedPublicId(ch.id)}
                >
                  <div className="challenge-pick-top">
                    <span className="challenge-duration-pill">
                      {ch.durationLabel}
                    </span>
                    {isJoined && (
                      <span className="challenge-joined-badge">Joined ✓</span>
                    )}
                  </div>
                  <h4>{ch.title}</h4>
                  <p>{ch.campus}</p>
                  <div className="challenge-pick-meta tabular-nums">
                    <span>Target: {(ch.targetMl / 1000).toFixed(1)} L / day</span>
                    <span>·</span>
                    <span>
                      {ch.dormRoster.length + (isJoined && ch.isSeeded ? 1 : 0)}{' '}
                      students
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Active Leaderboard Board */}
          <div className="leaderboard-card">
            <div className="leaderboard-head">
              <div>
                <span className="campus-card-kicker">
                  {activePublicChallenge.campus} ·{' '}
                  {activePublicChallenge.durationLabel}
                </span>
                <h3>{activePublicChallenge.title}</h3>
                <p>{activePublicChallenge.description}</p>
              </div>
              <div className="leaderboard-head-cta">
                {isJoinedActivePublic ? (
                  <button
                    type="button"
                    className="btn-card-ghost"
                    onClick={() =>
                      void handleLeavePublicChallenge(activePublicChallenge)
                    }
                  >
                    Leave Challenge
                  </button>
                ) : (
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() =>
                      void handleJoinPublicChallenge(activePublicChallenge)
                    }
                  >
                    Join Leaderboard
                  </button>
                )}
              </div>
            </div>

            <div className="leaderboard-rows" role="list">
              {rankedPublicEntries.map((entry, idx) => {
                const rank = idx + 1;
                const pct = Math.min(
                  100,
                  Math.round(
                    (entry.loggedMl / Math.max(500, activePublicChallenge.targetMl)) *
                      100
                  )
                );
                const isMe = entry.uid === currentUid;
                return (
                  <div
                    key={`${entry.uid}-${idx}`}
                    role="listitem"
                    className={`leaderboard-row${isMe ? ' is-me' : ''}`}
                  >
                    <div
                      className={`leaderboard-rank${
                        rank <= 3 ? ` is-top-${rank}` : ''
                      } tabular-nums`}
                    >
                      {rank === 1 ? (
                        <Crown size={15} aria-hidden="true" />
                      ) : (
                        `#${rank}`
                      )}
                    </div>
                    <div className="leaderboard-user">
                      <div className="leaderboard-name-line">
                        <strong>
                          {entry.name} {isMe && <em>(You)</em>}
                        </strong>
                        <span className="leaderboard-dorm">
                          {entry.dormOrCampus}
                        </span>
                      </div>
                      <div className="leaderboard-bar-track" aria-hidden="true">
                        <div
                          className="leaderboard-bar-fill"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                    <div className="leaderboard-stats tabular-nums">
                      <strong>{entry.loggedMl.toLocaleString()} ml</strong>
                      <span>
                        <Flame size={12} aria-hidden="true" />
                        {entry.streakDays}d
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: PRIVATE DORM GROUPS */}
      {subView === 'private' && (
        <div className="dorm-groups-wrap">
          {/* Join Private Group by Invite Code Bar */}
          <form className="dorm-join-bar" onSubmit={handleJoinByInviteCode}>
            <div className="dorm-join-copy">
              <KeyRound size={18} aria-hidden="true" />
              <div>
                <strong>Have a dorm invite code?</strong>
                <span>
                  Enter your roommate&apos;s 6-character code to join their private
                  hydration goal.
                </span>
              </div>
            </div>
            <div className="dorm-join-inputs">
              <input
                type="text"
                maxLength={12}
                placeholder="e.g. BAKER3"
                aria-label="Dorm group invite code"
                value={inviteInput}
                onChange={(e) => {
                  setInviteInput(e.target.value.toUpperCase());
                  if (joinError) setJoinError('');
                }}
              />
              <button
                type="submit"
                className="btn btn-primary"
                disabled={joinBusy}
              >
                {joinBusy ? 'Joining...' : 'Join Dorm Group'}
              </button>
            </div>
            {joinError && (
              <p className="creativelab-error dorm-join-err" role="alert">
                {joinError}
              </p>
            )}
          </form>

          {/* Active Private Dorm Group Cards */}
          <div className="dorm-groups-grid">
            {displayedPrivateGroups.map((grp) => {
              const groupPct = Math.min(
                100,
                Math.round((grp.totalMl / Math.max(1000, grp.targetMl)) * 100)
              );
              const isCreator =
                grp.creatorId === currentUid || grp.id.startsWith('local_');
              const sortedMembers = [...grp.dormRoster].sort(
                (a, b) => b.loggedMl - a.loggedMl
              );

              return (
                <article key={grp.id} className="dorm-group-card">
                  <div className="dorm-group-head">
                    <div>
                      <span className="campus-card-kicker">
                        <Lock size={11} aria-hidden="true" /> Private ·{' '}
                        {grp.campus}
                      </span>
                      <h4>{grp.title}</h4>
                      <p>{grp.description}</p>
                    </div>
                    {grp.inviteCode && (
                      <button
                        type="button"
                        className="dorm-code-btn tabular-nums"
                        onClick={() => void handleCopyCode(grp.inviteCode!)}
                        title="Copy invite code to share with dorm mates"
                      >
                        {copiedCode === grp.inviteCode ? (
                          <>
                            <Check size={13} aria-hidden="true" /> Copied
                          </>
                        ) : (
                          <>
                            <Copy size={13} aria-hidden="true" />{' '}
                            {grp.inviteCode}
                          </>
                        )}
                      </button>
                    )}
                  </div>

                  {/* Collective Group Goal Progress */}
                  <div className="dorm-goal-box">
                    <div className="dorm-goal-numbers tabular-nums">
                      <span>
                        <strong>{grp.totalMl.toLocaleString()} ml</strong> of{' '}
                        {grp.targetMl.toLocaleString()} ml ({grp.durationLabel})
                      </span>
                      <strong>{groupPct}%</strong>
                    </div>
                    <div className="hydration-progress-track" aria-hidden="true">
                      <div
                        className="hydration-progress-fill"
                        style={{ width: `${groupPct}%` }}
                      />
                    </div>
                  </div>

                  {/* Dorm Mates Roster */}
                  <div className="dorm-roster-list">
                    <div className="dorm-roster-label">
                      <Users size={13} aria-hidden="true" />
                      <span>Dorm Mates ({sortedMembers.length})</span>
                    </div>
                    {sortedMembers.map((mate) => {
                      const sharePct = Math.min(
                        100,
                        Math.round(
                          (mate.loggedMl /
                            Math.max(1000, grp.targetMl / Math.max(1, sortedMembers.length))) *
                            100
                        )
                      );
                      const isMe =
                        mate.uid === currentUid || mate.uid === 'local-user';
                      return (
                        <div
                          key={mate.uid}
                          className={`dorm-mate-row${isMe ? ' is-me' : ''}`}
                        >
                          <div className="dorm-mate-info">
                            <strong>
                              {mate.name} {isMe && <em>(You)</em>}
                            </strong>
                            <span>{mate.dormOrCampus}</span>
                          </div>
                          <div className="dorm-mate-progress">
                            <div className="leaderboard-bar-track">
                              <div
                                className="leaderboard-bar-fill"
                                style={{ width: `${sharePct}%` }}
                              />
                            </div>
                            <span className="tabular-nums">
                              {mate.loggedMl.toLocaleString()} ml
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="dorm-group-footer">
                    <button
                      type="button"
                      className="btn-card-primary"
                      onClick={() =>
                        void handleQuickLogAndSync(
                          `${grp.title} Refill`,
                          500
                        )
                      }
                    >
                      +500 ml for Team
                    </button>
                    {isCreator && (
                      <button
                        type="button"
                        className="bag-remove-btn dorm-delete-btn"
                        aria-label={`Delete ${grp.title}`}
                        onClick={() => void handleDeletePrivateGroup(grp)}
                      >
                        <Trash2 size={14} aria-hidden="true" />
                        Remove
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
