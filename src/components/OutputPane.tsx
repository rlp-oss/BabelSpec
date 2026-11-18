import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  Check,
  Copy,
  Download,
  Loader2,
  MessageSquareReply,
  RotateCw,
} from 'lucide-react';
import { TARGET_AGENTS } from '../data/presets';
import type { SessionTurn } from '../types/translator';
import { ContextGraphInspector } from './ContextGraphInspector';

type OutputTab = 'prompt' | 'graph' | 'reasoning' | 'checklist';

interface OutputPaneProps {
  turns: SessionTurn[];
  selectedTurnIndex: number;
  onSelectTurnIndex: (idx: number) => void;
  isCompiling: boolean;
  streamStage: string;
  streamChars: number;
  errorMessage: string | null;
  onRetry: () => void;
  onLoadSample: () => void;
  onPrefillClarification: (starter: string) => void;
}

async function copyTextSafely(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Fallback below
  }
  try {
    const el = document.createElement('textarea');
    el.value = text;
    el.setAttribute('readonly', '');
    el.style.position = 'fixed';
    el.style.opacity = '0';
    document.body.appendChild(el);
    el.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(el);
    return ok;
  } catch {
    return false;
  }
}

export const OutputPane: React.FC<OutputPaneProps> = ({
  turns,
  selectedTurnIndex,
  onSelectTurnIndex,
  isCompiling,
  streamStage,
  streamChars,
  errorMessage,
  onRetry,
  onLoadSample,
  onPrefillClarification,
}) => {
  const [activeTab, setActiveTab] = useState<OutputTab>('prompt');
  const [copiedMode, setCopiedMode] = useState<'none' | 'instructions' | 'prompt'>('none');
  const [checkedIds, setCheckedIds] = useState<Record<string, boolean>>({});

  const activeTurn = turns[selectedTurnIndex] || turns[turns.length - 1] || null;
  const result = activeTurn?.result || null;

  const targetAgentLabel =
    TARGET_AGENTS.find((a) => a.id === activeTurn?.targetAgent)?.shortLabel ||
    'Coding Agent';

  useEffect(() => {
    setCopiedMode('none');
  }, [activeTurn?.id]);

  const handleCopyCompiled = async (mode: 'instructions' | 'prompt') => {
    if (!result?.compiledPrompt) return;
    const ok = await copyTextSafely(result.compiledPrompt);
    if (ok) {
      setCopiedMode(mode);
      setTimeout(() => setCopiedMode('none'), 2200);
    }
  };

  const handleDownload = () => {
    if (!result?.compiledPrompt) return;
    const blob = new Blob([result.compiledPrompt], {
      type: 'text/markdown;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `babelspec-turn-${activeTurn?.turnNumber || 1}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const toggleCheck = (id: string) => {
    setCheckedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <section
      aria-label="Compiled prompt and contextual reasoning output"
      className="flex min-h-0 flex-1 flex-col bg-slate-50/50 dark:bg-slate-950"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-5 py-2.5 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-1 overflow-x-auto rounded-lg bg-slate-100 p-1 dark:bg-slate-950">
          {(
            [
              { id: 'prompt', label: 'Compiled Prompt' },
              { id: 'graph', label: 'Context Graph' },
              { id: 'reasoning', label: 'Reasoning & Bridges' },
              { id: 'checklist', label: 'Checklist' },
            ] as Array<{ id: OutputTab; label: string }>
          ).map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  active
                    ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-800 dark:text-white'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {turns.length > 1 && (
            <div className="flex items-center gap-1 border-r border-slate-200 pr-2 dark:border-slate-800">
              {turns.map((turn, idx) => (
                <button
                  key={turn.id}
                  type="button"
                  onClick={() => onSelectTurnIndex(idx)}
                  className={`rounded px-2 py-1 font-mono text-xs tabular-nums transition-colors cursor-pointer ${
                    idx === selectedTurnIndex
                      ? 'bg-slate-900 text-white dark:bg-blue-600'
                      : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
                  }`}
                >
                  T{turn.turnNumber}
                </button>
              ))}
            </div>
          )}

          {result && (
            <>
              <button
                type="button"
                onClick={() => handleCopyCompiled('instructions')}
                className="inline-flex items-center gap-1.5 rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-slate-800 whitespace-nowrap shrink-0 cursor-pointer dark:bg-blue-600 dark:hover:bg-blue-500"
              >
                {copiedMode === 'instructions' ? (
                  <>
                    <Check className="h-3.5 w-3.5" aria-hidden="true" />
                    Copied for {targetAgentLabel}
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                    Copy Instructions
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={handleDownload}
                aria-label="Download compiled instructions as Markdown"
                className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-900 whitespace-nowrap shrink-0 cursor-pointer dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                <Download className="h-3.5 w-3.5" aria-hidden="true" />
                .md
              </button>
            </>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-5">
        {isCompiling && (
          <div className="space-y-4 rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2.5 text-xs font-medium text-slate-900 dark:text-slate-100">
                <Loader2 className="h-4 w-4 animate-spin text-blue-600 dark:text-blue-400" aria-hidden="true" />
                <span>{streamStage || 'Analyzing multilingual context...'}</span>
              </div>
              <span className="font-mono text-xs text-slate-500 tabular-nums dark:text-slate-400">
                {streamChars} chars streamed
              </span>
            </div>
            <div className="space-y-2.5 pt-2">
              <div className="h-3.5 w-3/4 rounded bg-slate-100 dark:bg-slate-800" />
              <div className="h-3.5 w-full rounded bg-slate-100 dark:bg-slate-800" />
              <div className="h-3.5 w-5/6 rounded bg-slate-100 dark:bg-slate-800" />
              <div className="h-3.5 w-2/3 rounded bg-slate-100 dark:bg-slate-800" />
            </div>
          </div>
        )}

        {!isCompiling && errorMessage && (
          <div
            role="alert"
            className="rounded-lg border border-red-200 bg-red-50/80 p-4 dark:border-red-900/60 dark:bg-red-950/30"
          >
            <div className="flex items-start gap-3">
              <AlertCircle
                className="mt-0.5 h-4 w-4 shrink-0 text-red-600 dark:text-red-400"
                aria-hidden="true"
              />
              <div className="min-w-0 flex-1">
                <h3 className="text-xs font-semibold text-red-900 dark:text-red-200">
                  Compilation Error
                </h3>
                <p className="mt-1 text-xs leading-relaxed text-red-800 dark:text-red-300">
                  {errorMessage}
                </p>
                <button
                  type="button"
                  onClick={onRetry}
                  className="mt-3 inline-flex items-center gap-1.5 rounded-md border border-red-300 bg-white px-3 py-1.5 text-xs font-medium text-red-800 hover:bg-red-50 cursor-pointer dark:border-red-800 dark:bg-slate-900 dark:text-red-200"
                >
                  <RotateCw className="h-3 w-3" aria-hidden="true" />
                  Retry Compilation
                </button>
              </div>
            </div>
          </div>
        )}

        {!isCompiling && !errorMessage && !result && (
          <div className="flex h-full min-h-[320px] flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center dark:border-slate-800 dark:bg-slate-900/60">
            <h3 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
              Cross-Language Contextual Prompt Compiler
            </h3>
            <p className="mt-2 max-w-md text-sm leading-relaxed text-slate-600 dark:text-slate-400">
              Write your idea in any language or mix technical English terms naturally. The reasoning engine detects core intent, maps keyword relationships, carries context across follow-up turns, and compiles copy-ready instructions for your coding agent.
            </p>
            <button
              type="button"
              onClick={onLoadSample}
              className="mt-5 rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-900 transition-colors hover:bg-slate-100 cursor-pointer dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
            >
              Load Multilingual Example
            </button>
          </div>
        )}

        {!isCompiling && result && activeTurn && (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium text-slate-900 dark:text-slate-200">
                  {result.detectedLanguages
                    .map((l) => `${l.language} (${l.code})`)
                    .join(' + ')}
                </span>
                <span aria-hidden="true">·</span>
                <span>{result.intentCategory}</span>
                <span aria-hidden="true">·</span>
                <span className="tabular-nums">Turn {activeTurn.turnNumber}</span>
              </div>
              <span className="font-mono tabular-nums">
                {(activeTurn.durationMs / 1000).toFixed(2)}s
              </span>
            </div>

            {activeTab === 'prompt' && (
              <div className="space-y-5">
                <div className="rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-4 py-2.5 dark:border-slate-800">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        Generated Coding Agent Instructions
                      </span>
                      <span className="text-slate-400" aria-hidden="true">
                        ·
                      </span>
                      <span className="font-mono text-[11px] text-slate-500 tabular-nums dark:text-slate-400">
                        {result.compiledPrompt.length} chars
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleCopyCompiled('prompt')}
                      className="inline-flex items-center gap-1.5 rounded border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-900 whitespace-nowrap shrink-0 cursor-pointer dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                    >
                      {copiedMode === 'prompt' ? (
                        <>
                          <Check
                            className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400"
                            aria-hidden="true"
                          />
                          Copied to clipboard
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                          Copy to paste in {targetAgentLabel}
                        </>
                      )}
                    </button>
                  </div>
                  <pre className="max-h-[460px] overflow-auto p-4 font-mono text-[13px] leading-relaxed whitespace-pre-wrap text-slate-900 select-all dark:text-slate-100">
                    {result.compiledPrompt}
                  </pre>
                </div>

                {result.backTranslation && (
                  <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                      <span className="font-semibold text-slate-900 dark:text-slate-100">
                        Intent Verification ({result.backTranslation.languageName})
                      </span>
                      <span className="text-slate-500 dark:text-slate-400">
                        Confirm meaning before pasting into coding agent
                      </span>
                    </div>
                    <p
                      dir="auto"
                      className="mt-2 text-sm leading-relaxed text-slate-700 dark:text-slate-300"
                    >
                      {result.backTranslation.summary}
                    </p>
                    {result.backTranslation.keyPoints?.length > 0 && (
                      <ul
                        dir="auto"
                        className="mt-3 space-y-1.5 border-t border-slate-200 pt-3 text-xs text-slate-600 dark:border-slate-800 dark:text-slate-400"
                      >
                        {result.backTranslation.keyPoints.map((pt, i) => (
                          <li key={i} className="leading-relaxed">
                            • {pt}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'graph' && (
              <ContextGraphInspector
                result={result}
                turnNumber={activeTurn.turnNumber}
              />
            )}

            {activeTab === 'reasoning' && (
              <div className="space-y-5">
                {result.contextBridges?.length > 0 && (
                  <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                    <h3 className="mb-3 text-xs font-semibold text-slate-900 dark:text-slate-100">
                      Cross-Linguistic Context Bridges
                    </h3>
                    <div className="divide-y divide-slate-200 border-t border-slate-200 dark:divide-slate-800 dark:border-slate-800">
                      {result.contextBridges.map((bridge, idx) => (
                        <div key={idx} className="py-3 text-xs">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              dir="auto"
                              className="font-medium text-slate-900 dark:text-slate-100"
                            >
                              “{bridge.sourcePhrase}”
                            </span>
                            <span className="text-slate-400" aria-hidden="true">
                              ·
                            </span>
                            <span className="text-slate-500 dark:text-slate-400">
                              {bridge.sourceLanguage}
                            </span>
                          </div>
                          <p className="mt-1 text-slate-700 dark:text-slate-300">
                            <span className="font-medium">Meaning:</span>{' '}
                            {bridge.interpretedMeaning}
                          </p>
                          <p className="mt-0.5 text-slate-600 dark:text-slate-400">
                            <span className="font-medium">Spec Mapping:</span>{' '}
                            {bridge.architecturalDecision}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                  <h3 className="mb-3 text-xs font-semibold text-slate-900 dark:text-slate-100">
                    Reasoning Trace
                  </h3>
                  <div className="space-y-3">
                    {result.reasoningSteps.map((step, i) => (
                      <div
                        key={i}
                        className="border-t border-slate-200 pt-3 first:border-t-0 first:pt-0 dark:border-slate-800"
                      >
                        <div className="text-xs font-semibold text-slate-900 tabular-nums dark:text-slate-100">
                          0{i + 1}. {step.phase}
                        </div>
                        <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                          {step.analysis}
                        </p>
                        <p className="mt-1 text-xs font-medium text-slate-800 dark:text-slate-200">
                          Decision: {step.outcome}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {result.ambiguities?.length > 0 && (
                  <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                    <h3 className="mb-3 text-xs font-semibold text-slate-900 dark:text-slate-100">
                      Resolved Ambiguities & Open Clarifications
                    </h3>
                    <div className="space-y-3">
                      {result.ambiguities.map((amb, idx) => (
                        <div
                          key={idx}
                          className="rounded-md border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-950/60"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                              {amb.topic}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                onPrefillClarification(`[${amb.topic}] `)
                              }
                              className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-600 hover:underline whitespace-nowrap shrink-0 cursor-pointer dark:text-blue-400"
                            >
                              <MessageSquareReply className="h-3 w-3" aria-hidden="true" />
                              Answer in next turn
                            </button>
                          </div>
                          <p
                            dir="auto"
                            className="mt-1 text-xs text-slate-700 dark:text-slate-300"
                          >
                            {amb.questionInSourceLang}
                          </p>
                          {amb.questionInEnglish !== amb.questionInSourceLang && (
                            <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                              EN: {amb.questionInEnglish}
                            </p>
                          )}
                          <p className="mt-1.5 text-xs text-slate-600 dark:text-slate-400">
                            <span className="font-medium text-slate-800 dark:text-slate-200">
                              Default applied:
                            </span>{' '}
                            {amb.defaultAssumption}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'checklist' && (
              <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                    Acceptance & Verification Checklist
                  </h3>
                  <span className="font-mono text-xs text-slate-500 tabular-nums dark:text-slate-400">
                    {
                      result.checklist.filter((item) => checkedIds[item.id])
                        .length
                    }{' '}
                    / {result.checklist.length}
                  </span>
                </div>
                <div className="divide-y divide-slate-200 border-t border-slate-200 dark:divide-slate-800 dark:border-slate-800">
                  {result.checklist.map((item) => {
                    const checked = Boolean(checkedIds[item.id]);
                    return (
                      <label
                        key={item.id}
                        className="flex cursor-pointer items-start gap-3 py-3"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleCheck(item.id)}
                          className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-600 dark:border-slate-700 dark:bg-slate-950"
                        />
                        <div className="min-w-0 flex-1">
                          <div
                            className={`text-xs font-medium ${
                              checked
                                ? 'text-slate-400 line-through dark:text-slate-500'
                                : 'text-slate-900 dark:text-slate-100'
                            }`}
                          >
                            {item.requirement}
                          </div>
                          <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                            <span>{item.category}</span>
                            <span aria-hidden="true">·</span>
                            <span>{item.verificationHint}</span>
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
};
