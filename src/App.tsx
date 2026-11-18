import { useEffect, useMemo, useRef, useState } from 'react';
import { AuthGate } from './components/AuthGate';
import { ContextMapView } from './components/ContextMapView';
import { FormatGuideView } from './components/FormatGuideView';
import { Header, type ActiveView } from './components/Header';
import { HistoryView } from './components/HistoryView';
import { OutputPane } from './components/OutputPane';
import { Sidebar } from './components/Sidebar';
import { SourceInputPane } from './components/SourceInputPane';
import { WorkspaceToolbar } from './components/WorkspaceToolbar';
import { useAuth } from './contexts/AuthContext';
import { MULTILINGUAL_PRESETS } from './data/presets';
import {
  deleteUserThread,
  saveThreadTurn,
  subscribeThreadTurns,
  subscribeUserThreads,
} from './lib/firestoreThreads';
import type {
  CompilationResult,
  ContextSession,
  MultilingualPreset,
  OutputFormatId,
  ProjectContext,
  ReasoningDepth,
  SessionTurn,
  TargetAgentId,
} from './types/translator';

const THEME_STORAGE_KEY = 'babelspec.theme.v1';

const EMPTY_CONTEXT: ProjectContext = {
  techStack: '',
  targetFiles: '',
  constraints: '',
};

export default function App() {
  const { user, authReady, authBusy, authError, signIn, signOut } = useAuth();

  const [activeView, setActiveView] = useState<ActiveView>('compiler');
  const [isDark, setIsDark] = useState<boolean>(() => {
    try {
      return localStorage.getItem(THEME_STORAGE_KEY) === 'dark';
    } catch {
      return false;
    }
  });

  const [sessions, setSessions] = useState<ContextSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [activeTurns, setActiveTurns] = useState<SessionTurn[]>([]);
  const [selectedTurnIndex, setSelectedTurnIndex] = useState<number>(0);

  const [rawPrompt, setRawPrompt] = useState('');
  const [sourceLanguageHint, setSourceLanguageHint] = useState('auto');
  const [projectContext, setProjectContext] = useState<ProjectContext>(EMPTY_CONTEXT);
  const [targetAgent, setTargetAgent] = useState<TargetAgentId>('universal');
  const [outputFormat, setOutputFormat] =
    useState<OutputFormatId>('structured-markdown');
  const [reasoningDepth, setReasoningDepth] = useState<ReasoningDepth>('balanced');
  const [activePresetId, setActivePresetId] = useState<string | null>(null);

  const [isCompiling, setIsCompiling] = useState(false);
  const [streamStage, setStreamStage] = useState('');
  const [streamChars, setStreamChars] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    try {
      localStorage.setItem(THEME_STORAGE_KEY, isDark ? 'dark' : 'light');
    } catch {
      // Ignore storage errors
    }
  }, [isDark]);

  // Subscribe to the authenticated user's confidential threads only when authReady && verified.
  useEffect(() => {
    if (!authReady || !user || !user.emailVerified) {
      setSessions([]);
      setActiveSessionId(null);
      setActiveTurns([]);
      setSelectedTurnIndex(0);
      return;
    }

    const unsubscribe = subscribeUserThreads(
      user.uid,
      (threads) => {
        setSessions(threads);
      },
      (err) => {
        setErrorMessage(err.message);
      }
    );

    return () => unsubscribe();
  }, [authReady, user]);

  // Subscribe to turns for the active confidential thread.
  useEffect(() => {
    if (!authReady || !user || !user.emailVerified || !activeSessionId) {
      setActiveTurns([]);
      return;
    }

    const unsubscribe = subscribeThreadTurns(
      user.uid,
      activeSessionId,
      (turns) => {
        setActiveTurns(turns);
        if (turns.length > 0) {
          const latest = turns[turns.length - 1];
          setSelectedTurnIndex((prev) =>
            prev >= turns.length ? turns.length - 1 : prev
          );
          setProjectContext(latest.projectContext);
          setTargetAgent(latest.targetAgent);
          setOutputFormat(latest.outputFormat);
          setReasoningDepth(latest.reasoningDepth);
        }
      },
      (err) => {
        setErrorMessage(err.message);
      }
    );

    return () => unsubscribe();
  }, [authReady, user, activeSessionId]);

  const activeSession = useMemo(
    () => sessions.find((s) => s.id === activeSessionId) || null,
    [sessions, activeSessionId]
  );

  const activePreset = useMemo(
    () => MULTILINGUAL_PRESETS.find((p) => p.id === activePresetId) || null,
    [activePresetId]
  );

  const handleNewThread = () => {
    abortRef.current?.abort();
    setActiveSessionId(null);
    setActiveTurns([]);
    setSelectedTurnIndex(0);
    setRawPrompt('');
    setProjectContext(EMPTY_CONTEXT);
    setActivePresetId(null);
    setErrorMessage(null);
    setActiveView('compiler');
  };

  const handleSelectSession = (sessionId: string) => {
    abortRef.current?.abort();
    setActiveSessionId(sessionId);
    setSelectedTurnIndex(0);
    setRawPrompt('');
    setActivePresetId(null);
    setErrorMessage(null);
    setActiveView('compiler');
  };

  const handleDeleteSession = async (sessionId: string) => {
    if (!user) return;
    try {
      await deleteUserThread(user.uid, sessionId);
      if (activeSessionId === sessionId) {
        setActiveSessionId(null);
        setActiveTurns([]);
        setSelectedTurnIndex(0);
      }
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Failed to delete thread.'
      );
    }
  };

  const handleLoadPreset = (preset: MultilingualPreset) => {
    abortRef.current?.abort();
    setActiveSessionId(null);
    setActiveTurns([]);
    setSelectedTurnIndex(0);
    setRawPrompt(preset.rawPrompt);
    setProjectContext({ ...preset.projectContext });
    setTargetAgent(preset.targetAgent);
    setOutputFormat(preset.outputFormat);
    setSourceLanguageHint('auto');
    setActivePresetId(preset.id);
    setErrorMessage(null);
    setActiveView('compiler');
  };

  const handleSignOut = async () => {
    abortRef.current?.abort();
    setSessions([]);
    setActiveSessionId(null);
    setActiveTurns([]);
    setSelectedTurnIndex(0);
    setRawPrompt('');
    setProjectContext(EMPTY_CONTEXT);
    setErrorMessage(null);
    await signOut();
  };

  const handleCompile = async () => {
    const trimmed = rawPrompt.trim();
    if (!trimmed || isCompiling || !user || !user.emailVerified) return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setIsCompiling(true);
    setErrorMessage(null);
    setStreamStage('Initializing contextual reasoning engine...');
    setStreamChars(0);

    const priorTurnsPayload = activeTurns.map((t) => ({
      turnNumber: t.turnNumber,
      rawPrompt: t.rawPrompt,
      primaryLanguageName: t.result.primaryLanguageName,
      intentCategory: t.result.intentCategory,
      inferredIntent: t.result.inferredIntent,
      compiledPrompt: t.result.compiledPrompt,
      projectContext: t.projectContext,
      keyEntities: (t.result.keywordNodes || []).map(
        (k) => `${k.normalizedConcept} (${k.phrase})`
      ),
    }));

    try {
      const idToken = await user.getIdToken();
      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        signal: controller.signal,
        body: JSON.stringify({
          rawPrompt: trimmed,
          projectContext,
          targetAgent,
          outputFormat,
          reasoningDepth,
          sourceLanguageHint,
          priorTurns: priorTurnsPayload,
        }),
      });

      if (!response.ok) {
        let msg = `Request failed with status ${response.status}`;
        try {
          const errJson = await response.json();
          if (errJson?.error) msg = errJson.error;
        } catch {
          // Non-JSON error
        }
        throw new Error(msg);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Streaming response body unavailable.');
      }

      const decoder = new TextDecoder();
      let buffer = '';
      let completedData: { result: CompilationResult; durationMs: number } | null =
        null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const blocks = buffer.split('\n\n');
        buffer = blocks.pop() || '';

        for (const block of blocks) {
          const lines = block.split('\n');
          let eventName = 'message';
          let dataLine = '';
          for (const line of lines) {
            if (line.startsWith('event:')) {
              eventName = line.slice(6).trim();
            } else if (line.startsWith('data:')) {
              dataLine += line.slice(5).trim();
            }
          }
          if (!dataLine) continue;
          const payload = JSON.parse(dataLine);

          if (eventName === 'status') {
            setStreamStage(payload.stage || 'Reasoning...');
            if (typeof payload.chars === 'number') {
              setStreamChars(payload.chars);
            }
          } else if (eventName === 'complete') {
            completedData = payload;
          } else if (eventName === 'error') {
            throw new Error(payload.message || 'Reasoning engine error.');
          }
        }
      }

      if (!completedData?.result) {
        throw new Error('Incomplete compilation response received.');
      }

      const isNewThread = !activeSessionId || !activeSession;
      const threadId = activeSessionId || `thr_${Date.now()}`;
      const newTurnNumber = activeTurns.length + 1;
      const derivedTitle =
        activeSession?.title ||
        activePreset?.title ||
        completedData.result.inferredIntent.slice(0, 56).replace(/[.,;:]$/, '') ||
        'Untitled Context Thread';

      await saveThreadTurn({
        uid: user.uid,
        threadId,
        isNewThread,
        title: derivedTitle,
        turnNumber: newTurnNumber,
        durationMs: completedData.durationMs || 0,
        rawPrompt: trimmed,
        projectContext,
        targetAgent,
        outputFormat,
        reasoningDepth,
        result: completedData.result,
      });

      setActiveSessionId(threadId);
      setSelectedTurnIndex(newTurnNumber - 1);
      setRawPrompt('');
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
      setErrorMessage(
        err instanceof Error ? err.message : 'Unexpected compilation failure.'
      );
    } finally {
      setIsCompiling(false);
    }
  };

  if (!authReady || !user || !user.emailVerified) {
    return (
      <AuthGate
        authReady={authReady}
        authBusy={authBusy}
        authError={authError}
        needsVerification={Boolean(authReady && user && !user.emailVerified)}
        userEmail={user?.email}
        isDark={isDark}
        onToggleTheme={() => setIsDark((prev) => !prev)}
        onSignIn={signIn}
        onSignOut={handleSignOut}
      />
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <Header
        activeView={activeView}
        onSelectView={setActiveView}
        onNewThread={handleNewThread}
      />

      {activeView === 'compiler' && (
        <div className="flex flex-1 flex-col lg:flex-row lg:overflow-hidden">
          <Sidebar
            sessions={sessions}
            activeSessionId={activeSessionId}
            presets={MULTILINGUAL_PRESETS}
            userDisplayName={user.displayName || 'Account'}
            userEmail={user.email || ''}
            onSelectSession={handleSelectSession}
            onDeleteSession={handleDeleteSession}
            onLoadPreset={handleLoadPreset}
            onStartBlank={handleNewThread}
            onSignOut={handleSignOut}
          />

          <main className="flex min-w-0 flex-1 flex-col">
            <WorkspaceToolbar
              targetAgent={targetAgent}
              onChangeTargetAgent={setTargetAgent}
              outputFormat={outputFormat}
              onChangeOutputFormat={setOutputFormat}
              reasoningDepth={reasoningDepth}
              onChangeReasoningDepth={setReasoningDepth}
              isDark={isDark}
              onToggleTheme={() => setIsDark((prev) => !prev)}
            />

            <div className="grid flex-1 grid-cols-1 lg:grid-cols-2 lg:overflow-hidden">
              <SourceInputPane
                rawPrompt={rawPrompt}
                onChangeRawPrompt={setRawPrompt}
                sourceLanguageHint={sourceLanguageHint}
                onChangeSourceLanguageHint={setSourceLanguageHint}
                projectContext={projectContext}
                onChangeProjectContext={setProjectContext}
                activeTurns={activeTurns}
                suggestedFollowUp={activePreset?.followUpSuggestion}
                isCompiling={isCompiling}
                onCompile={handleCompile}
                onClearPrompt={() => setRawPrompt('')}
                onStartFreshThread={handleNewThread}
              />

              <OutputPane
                turns={activeTurns}
                selectedTurnIndex={selectedTurnIndex}
                onSelectTurnIndex={setSelectedTurnIndex}
                isCompiling={isCompiling}
                streamStage={streamStage}
                streamChars={streamChars}
                errorMessage={errorMessage}
                onRetry={handleCompile}
                onLoadSample={() => handleLoadPreset(MULTILINGUAL_PRESETS[0])}
                onPrefillClarification={(starter) => {
                  setRawPrompt((prev) =>
                    prev.trim() ? `${prev.trim()}\n${starter}` : starter
                  );
                }}
              />
            </div>
          </main>
        </div>
      )}

      {activeView === 'context-map' && (
        <main className="flex-1 overflow-y-auto">
          <ContextMapView
            turns={activeTurns}
            selectedTurnIndex={selectedTurnIndex}
            onSelectTurnIndex={setSelectedTurnIndex}
            onGoToCompiler={() => setActiveView('compiler')}
          />
        </main>
      )}

      {activeView === 'formats' && (
        <main className="flex-1 overflow-y-auto">
          <FormatGuideView
            selectedFormat={outputFormat}
            onSelectFormat={(fmt) => {
              setOutputFormat(fmt);
              setActiveView('compiler');
            }}
          />
        </main>
      )}

      {activeView === 'history' && (
        <main className="flex-1 overflow-y-auto">
          <HistoryView
            sessions={sessions}
            onOpenSession={handleSelectSession}
            onDeleteSession={handleDeleteSession}
            onGoToCompiler={() => setActiveView('compiler')}
          />
        </main>
      )}
    </div>
  );
}
