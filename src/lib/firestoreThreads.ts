import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
  type Unsubscribe,
} from 'firebase/firestore';
import type { User } from 'firebase/auth';
import { db, handleFirestoreError, OperationType } from './firebase';
import type {
  CompilationResult,
  ContextSession,
  OutputFormatId,
  ProjectContext,
  ReasoningDepth,
  SessionTurn,
  TargetAgentId,
} from '../types/translator';

function clampString(val: unknown, maxLen: number, fallback = ''): string {
  if (typeof val !== 'string') return fallback;
  return val.slice(0, maxLen);
}

function sanitizeId(raw: string): string {
  const cleaned = raw.replace(/[^a-zA-Z0-9_\-]/g, '_').slice(0, 128);
  return cleaned || `id_${Date.now()}`;
}

function sanitizeProjectContext(ctx: ProjectContext): ProjectContext {
  return {
    techStack: clampString(ctx?.techStack, 1000, ''),
    targetFiles: clampString(ctx?.targetFiles, 1000, ''),
    constraints: clampString(ctx?.constraints, 2000, ''),
  };
}

function sanitizeCompilationResult(res: CompilationResult): CompilationResult {
  const detectedLanguages = Array.isArray(res.detectedLanguages) && res.detectedLanguages.length > 0
    ? res.detectedLanguages.slice(0, 12).map((l) => ({
        language: clampString(l?.language, 64, 'Unknown'),
        code: clampString(l?.code, 16, 'AUTO'),
        role: clampString(l?.role, 200, 'Primary input'),
      }))
    : [{ language: 'English', code: 'EN', role: 'Primary input' }];

  return {
    detectedLanguages,
    primaryLanguageCode: clampString(res.primaryLanguageCode, 24, 'AUTO') || 'AUTO',
    primaryLanguageName: clampString(res.primaryLanguageName, 64, 'Auto') || 'Auto',
    intentCategory: (clampString(res.intentCategory, 64, 'Feature Build') ||
      'Feature Build') as CompilationResult['intentCategory'],
    inferredIntent: clampString(res.inferredIntent, 2000, ''),
    secondaryIntents: Array.isArray(res.secondaryIntents)
      ? res.secondaryIntents.slice(0, 15).map((s) => clampString(s, 300, ''))
      : [],
    keywordNodes: Array.isArray(res.keywordNodes)
      ? res.keywordNodes.slice(0, 30).map((n) => ({
          id: clampString(n?.id, 64, 'k'),
          phrase: clampString(n?.phrase, 300, ''),
          normalizedConcept: clampString(n?.normalizedConcept, 300, ''),
          language: clampString(n?.language, 64, ''),
          category: n?.category || 'Component',
          fromTurn: typeof n?.fromTurn === 'number' ? Math.max(1, Math.min(50, Math.round(n.fromTurn))) : 1,
        }))
      : [],
    keywordRelations: Array.isArray(res.keywordRelations)
      ? res.keywordRelations.slice(0, 50).map((r) => ({
          fromId: clampString(r?.fromId, 64, ''),
          toId: clampString(r?.toId, 64, ''),
          relation: r?.relation || 'REQUIRES',
          rationale: clampString(r?.rationale, 500, ''),
        }))
      : [],
    contextDelta: {
      turnNumber:
        typeof res.contextDelta?.turnNumber === 'number'
          ? Math.max(1, Math.min(50, Math.round(res.contextDelta.turnNumber)))
          : 1,
      carriedOver: Array.isArray(res.contextDelta?.carriedOver)
        ? res.contextDelta.carriedOver.slice(0, 20).map((x) => clampString(x, 400, ''))
        : [],
      newlyAdded: Array.isArray(res.contextDelta?.newlyAdded)
        ? res.contextDelta.newlyAdded.slice(0, 20).map((x) => clampString(x, 400, ''))
        : [],
      updatedDecisions: Array.isArray(res.contextDelta?.updatedDecisions)
        ? res.contextDelta.updatedDecisions.slice(0, 20).map((x) => clampString(x, 400, ''))
        : [],
    },
    contextBridges: Array.isArray(res.contextBridges)
      ? res.contextBridges.slice(0, 25).map((b) => ({
          sourcePhrase: clampString(b?.sourcePhrase, 400, ''),
          sourceLanguage: clampString(b?.sourceLanguage, 64, ''),
          interpretedMeaning: clampString(b?.interpretedMeaning, 600, ''),
          architecturalDecision: clampString(b?.architecturalDecision, 600, ''),
        }))
      : [],
    reasoningSteps: Array.isArray(res.reasoningSteps)
      ? res.reasoningSteps.slice(0, 20).map((s) => ({
          phase: clampString(s?.phase, 120, ''),
          analysis: clampString(s?.analysis, 1000, ''),
          outcome: clampString(s?.outcome, 1000, ''),
        }))
      : [],
    ambiguities: Array.isArray(res.ambiguities)
      ? res.ambiguities.slice(0, 20).map((a) => ({
          topic: clampString(a?.topic, 160, ''),
          questionInSourceLang: clampString(a?.questionInSourceLang, 500, ''),
          questionInEnglish: clampString(a?.questionInEnglish, 500, ''),
          defaultAssumption: clampString(a?.defaultAssumption, 500, ''),
        }))
      : [],
    compiledPrompt: clampString(res.compiledPrompt, 40000, ' '),
    backTranslation: {
      languageName: clampString(res.backTranslation?.languageName, 64, 'English'),
      summary: clampString(res.backTranslation?.summary, 3000, ''),
      keyPoints: Array.isArray(res.backTranslation?.keyPoints)
        ? res.backTranslation.keyPoints.slice(0, 12).map((p) => clampString(p, 500, ''))
        : [],
    },
    checklist: Array.isArray(res.checklist)
      ? res.checklist.slice(0, 40).map((c, idx) => ({
          id: clampString(c?.id, 64, `chk_${idx + 1}`),
          category: clampString(c?.category, 64, 'Requirement'),
          requirement: clampString(c?.requirement, 500, ''),
          verificationHint: clampString(c?.verificationHint, 500, ''),
        }))
      : [],
  };
}

function timestampToIso(ts: unknown): string {
  if (ts instanceof Timestamp) {
    return ts.toDate().toISOString();
  }
  if (typeof ts === 'object' && ts !== null && 'toDate' in ts) {
    const fn = (ts as { toDate?: () => Date }).toDate;
    if (typeof fn === 'function') return fn().toISOString();
  }
  return new Date().toISOString();
}

export async function ensureUserAccountInitialized(user: User): Promise<void> {
  const uid = sanitizeId(user.uid);
  const displayName = clampString(
    user.displayName || user.email?.split('@')[0] || 'User',
    120,
    'User'
  );
  const photoURL = clampString(user.photoURL || '', 500, '');
  const email = clampString(user.email || '', 254, '');

  const userPath = `users/${uid}`;
  const userRef = doc(db, 'users', uid);

  try {
    const snap = await getDoc(userRef);
    if (!snap.exists()) {
      const payload: Record<string, unknown> = {
        uid,
        displayName,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      if (photoURL) payload.photoURL = photoURL;
      await setDoc(userRef, payload);
    } else {
      const updatePayload: Record<string, unknown> = {
        displayName,
        updatedAt: serverTimestamp(),
      };
      if (photoURL) updatePayload.photoURL = photoURL;
      await updateDoc(userRef, updatePayload);
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, userPath);
  }

  if (email) {
    const profilePath = `users/${uid}/private/profile`;
    const profileRef = doc(db, 'users', uid, 'private', 'profile');
    try {
      const profileSnap = await getDoc(profileRef);
      if (!profileSnap.exists()) {
        await setDoc(profileRef, {
          uid,
          email,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } else {
        await updateDoc(profileRef, {
          email,
          updatedAt: serverTimestamp(),
        });
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, profilePath);
    }
  }
}

export function subscribeUserThreads(
  uid: string,
  onThreads: (threads: ContextSession[]) => void,
  onError: (err: Error) => void
): Unsubscribe {
  const safeUid = sanitizeId(uid);
  const path = `users/${safeUid}/threads`;
  const q = query(
    collection(db, 'users', safeUid, 'threads'),
    where('ownerId', '==', safeUid),
    limit(50)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const items: ContextSession[] = snapshot.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          title: typeof data.title === 'string' ? data.title : 'Untitled Thread',
          updatedAt: timestampToIso(data.updatedAt),
          turns: [],
        };
      });
      items.sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );
      onThreads(items);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (wrapped) {
        onError(wrapped instanceof Error ? wrapped : new Error(String(wrapped)));
      }
    }
  );
}

export function subscribeThreadTurns(
  uid: string,
  threadId: string,
  onTurns: (turns: SessionTurn[]) => void,
  onError: (err: Error) => void
): Unsubscribe {
  const safeUid = sanitizeId(uid);
  const safeThreadId = sanitizeId(threadId);
  const path = `users/${safeUid}/threads/${safeThreadId}/turns`;
  const q = query(
    collection(db, 'users', safeUid, 'threads', safeThreadId, 'turns'),
    where('ownerId', '==', safeUid),
    where('threadId', '==', safeThreadId),
    limit(50)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const turns: SessionTurn[] = snapshot.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          turnNumber: typeof data.turnNumber === 'number' ? data.turnNumber : 1,
          createdAt: timestampToIso(data.createdAt),
          durationMs: typeof data.durationMs === 'number' ? data.durationMs : 0,
          rawPrompt: typeof data.rawPrompt === 'string' ? data.rawPrompt : '',
          projectContext: (data.projectContext || {
            techStack: '',
            targetFiles: '',
            constraints: '',
          }) as ProjectContext,
          targetAgent: (data.targetAgent || 'universal') as TargetAgentId,
          outputFormat: (data.outputFormat || 'structured-markdown') as OutputFormatId,
          reasoningDepth: (data.reasoningDepth || 'balanced') as ReasoningDepth,
          result: data.result as CompilationResult,
        };
      });
      turns.sort((a, b) => a.turnNumber - b.turnNumber);
      onTurns(turns);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (wrapped) {
        onError(wrapped instanceof Error ? wrapped : new Error(String(wrapped)));
      }
    }
  );
}

export async function saveThreadTurn(params: {
  uid: string;
  threadId: string;
  isNewThread: boolean;
  title: string;
  turnNumber: number;
  durationMs: number;
  rawPrompt: string;
  projectContext: ProjectContext;
  targetAgent: TargetAgentId;
  outputFormat: OutputFormatId;
  reasoningDepth: ReasoningDepth;
  result: CompilationResult;
}): Promise<{ threadId: string; turnId: string }> {
  const safeUid = sanitizeId(params.uid);
  const safeThreadId = sanitizeId(params.threadId);
  const safeTurnId = sanitizeId(`turn_${params.turnNumber}_${Date.now()}`);
  const safeResult = sanitizeCompilationResult(params.result);
  const safeCtx = sanitizeProjectContext(params.projectContext);

  const threadRef = doc(db, 'users', safeUid, 'threads', safeThreadId);
  const turnRef = doc(
    db,
    'users',
    safeUid,
    'threads',
    safeThreadId,
    'turns',
    safeTurnId
  );

  const clampedTitle = clampString(params.title.trim(), 200, 'Untitled Thread') || 'Untitled Thread';
  const clampedTurnCount = Math.max(1, Math.min(50, Math.round(params.turnNumber)));
  const clampedLang = clampString(safeResult.primaryLanguageCode, 24, 'AUTO') || 'AUTO';
  const clampedIntent = clampString(safeResult.intentCategory, 64, 'Feature Build') || 'Feature Build';

  const batch = writeBatch(db);

  if (params.isNewThread) {
    batch.set(threadRef, {
      id: safeThreadId,
      ownerId: safeUid,
      title: clampedTitle,
      turnCount: clampedTurnCount,
      latestLanguageCode: clampedLang,
      latestIntentCategory: clampedIntent,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } else {
    batch.update(threadRef, {
      title: clampedTitle,
      turnCount: clampedTurnCount,
      latestLanguageCode: clampedLang,
      latestIntentCategory: clampedIntent,
      updatedAt: serverTimestamp(),
    });
  }

  batch.set(turnRef, {
    id: safeTurnId,
    ownerId: safeUid,
    threadId: safeThreadId,
    turnNumber: clampedTurnCount,
    durationMs: Math.max(0, Math.min(600000, Math.round(params.durationMs))),
    rawPrompt: clampString(params.rawPrompt.trim(), 16000, ' '),
    targetAgent: params.targetAgent,
    outputFormat: params.outputFormat,
    reasoningDepth: params.reasoningDepth,
    projectContext: safeCtx,
    result: safeResult,
    createdAt: serverTimestamp(),
  });

  try {
    await batch.commit();
    return { threadId: safeThreadId, turnId: safeTurnId };
  } catch (err) {
    handleFirestoreError(
      err,
      OperationType.WRITE,
      `users/${safeUid}/threads/${safeThreadId}/turns/${safeTurnId}`
    );
  }
}

export async function deleteUserThread(
  uid: string,
  threadId: string
): Promise<void> {
  const safeUid = sanitizeId(uid);
  const safeThreadId = sanitizeId(threadId);
  const turnsPath = `users/${safeUid}/threads/${safeThreadId}/turns`;
  const threadPath = `users/${safeUid}/threads/${safeThreadId}`;

  try {
    const turnsQuery = query(
      collection(db, 'users', safeUid, 'threads', safeThreadId, 'turns'),
      where('ownerId', '==', safeUid),
      where('threadId', '==', safeThreadId),
      limit(50)
    );
    const snap = await getDocs(turnsQuery);
    const batch = writeBatch(db);
    for (const d of snap.docs) {
      batch.delete(d.ref);
    }
    batch.delete(doc(db, 'users', safeUid, 'threads', safeThreadId));
    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `${threadPath} (${turnsPath})`);
  }
}
