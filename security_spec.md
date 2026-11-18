# Security Specification — BabelSpec Confidential Threads

## 1. Data Invariants
1. **Verified Identity Gate**: Every read and write requires `request.auth != null` and `request.auth.token.email_verified == true`.
2. **Strict Account Isolation**: All user data lives under `/users/{userId}` where `userId == request.auth.uid`. Cross-user reads, queries, writes, or deletes are unconditionally denied.
3. **PII Separation**: User email is isolated in `/users/{userId}/private/profile` and never exposed in threads, turns, or shared collections.
4. **Immutable Ownership & Timestamps**: `ownerId`/`uid` and `createdAt` cannot change after creation; `createdAt` on create and `updatedAt` on update must equal `request.time`.
5. **Relational & Batch Atomicity**: A `turn` document under `/users/{userId}/threads/{threadId}/turns/{turnId}` cannot be created unless the parent thread document exists (or is created/updated atomically in the same batch via `getAfter`) and belongs to `request.auth.uid`.
6. **Zero Shadow Fields & Bounded Payloads**: Every entity enforces `keys().hasAll(...)` and `keys().hasOnly(...)`, strict type checks, regex ID validation (`^[a-zA-Z0-9_\-]+$`), and upper string/list bounds.

## 2. Dirty Dozen Adversarial Payloads (Must All Return PERMISSION_DENIED)
1. **Unauthenticated Read**: `get(/users/alice/threads/t1)` with `request.auth == null`.
2. **Unverified Email Write**: `create(/users/alice/threads/t1)` with `auth.uid == 'alice'` and `email_verified == false`.
3. **Cross-User Thread Read**: User `bob` attempts `get(/users/alice/threads/t1)`.
4. **Cross-User List Scraping**: User `bob` attempts `list(/users/alice/threads)` or `collectionGroup('threads')`.
5. **Owner Spoofing on Create**: User `bob` creates `/users/bob/threads/t1` with `ownerId: 'alice'`.
6. **PII Access Leak**: User `bob` attempts `get(/users/alice/private/profile)`.
7. **Shadow / Ghost Field Injection**: User `alice` creates `/users/alice/threads/t1` including an extra field `isAdmin: true`.
8. **ID Poisoning**: User `alice` creates `/users/alice/threads/invalid$id..` or a 200-char threadId.
9. **Client Timestamp Forgery**: User `alice` creates `/users/alice/threads/t1` with `createdAt` set to a past client timestamp instead of `request.time`.
10. **Immutable Owner Tampering**: User `alice` updates `/users/alice/threads/t1` trying to change `ownerId` or `createdAt`.
11. **Orphaned Turn Injection**: User `alice` creates `/users/alice/threads/nonexistent/turns/turn1` without creating the parent thread in the same batch.
12. **Payload Exhaustion ("Denial of Wallet")**: User `alice` creates a turn with `rawPrompt` > 16,000 characters or `title` > 200 characters.
