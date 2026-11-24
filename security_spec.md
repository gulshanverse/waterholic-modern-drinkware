# Waterholic Firestore Security Specification (Phase 0 TDD)

## 1. Data Invariants
1. **Strict Ownership & PII Isolation**: A `/users/{userId}` document contains PII (`email`, `phone`) and can ONLY be read (`get`) or mutated by `request.auth.uid == userId` (with verified email on writes) or a verified Admin. Blanket `list` on `/users` is forbidden.
2. **Master Gate Relational Sync**: Every subcollection document under `/users/{userId}/hydrationLogs`, `/orders`, `/creations`, and `/chatMessages` requires the parent `/users/{userId}` document to exist on create/update and strictly enforces `ownerId == userId == request.auth.uid`.
3. **Immutable Ownership & Timestamps**: `ownerId` and `createdAt` can never change after creation. `createdAt == request.time` on create; `updatedAt == request.time` on update.
4. **Terminal Order Lock**: Once an order reaches `statusStep == 4` (Delivered), non-admin updates are permanently blocked.
5. **Bounded Sizes & ID Guards**: Every single-document path ID passes `isValidId(id)` (`^[a-zA-Z0-9_-]+$`, `<= 128`), every string has explicit `.size()` bounds, and every list has a strict `.size() <= MAX` bound.

## 2. The Dirty Dozen Attack Payloads (Expected: PERMISSION_DENIED)
1. **Cross-User PII Read**: Signed-in User B calls `get(/users/userA)` -> DENIED.
2. **Blanket User Scraping**: Signed-in User A calls `list(/users)` -> DENIED.
3. **Ghost Shadow Field Injection**: User A creates `/users/userA` with extra key `isAdmin: true` -> DENIED (`keys().hasOnly(...)`).
4. **Unverified Email Spoofing**: User with `email: "gulshankumaritggv@gmail.com"` and `email_verified: false` tries to read/write another user's doc -> DENIED.
5. **OwnerId Hijacking**: User A creates `/users/userA/orders/ord1` with `ownerId: "userB"` -> DENIED.
6. **Orphan Subcollection Write**: User A creates `/users/userA/hydrationLogs/2026-11-23` before parent `/users/userA` exists -> DENIED (Master Gate `exists()`).
7. **Timestamp Forgery**: User A writes `createdAt: Timestamp(2020-01-01)` instead of `serverTimestamp()` -> DENIED (`== request.time`).
8. **Immutable Field Tampering**: User A updates `/users/userA` attempting to alter `ownerId` or `createdAt` -> DENIED (`affectedKeys().hasOnly(...)`).
9. **Delivered Order Mutation**: User A attempts to change `statusStep` or `total` on an order where `existing().statusStep == 4` -> DENIED.
10. **ID Poisoning Attack**: User A attempts to create `/users/userA/creations/` with a 500-char ID or invalid characters -> DENIED (`isValidId`).
11. **Denial-of-Wallet Payload**: User A sends a 1MB string in `chatMessages.text` or 500 items in `savedIds` -> DENIED (`.size()` limits).
12. **Self-Admin Escalation**: User A attempts to create `/admins/userA` -> DENIED (`allow write: if false`).
