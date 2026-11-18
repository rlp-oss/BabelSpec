import React, { useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  ClipboardPaste,
  CornerDownLeft,
  Eraser,
  Loader2,
  RotateCcw,
} from 'lucide-react';
import type { ProjectContext, SessionTurn } from '../types/translator';

interface SourceInputPaneProps {
  rawPrompt: string;
  onChangeRawPrompt: (val: string) => void;
  sourceLanguageHint: string;
  onChangeSourceLanguageHint: (val: string) => void;
  projectContext: ProjectContext;
  onChangeProjectContext: (ctx: ProjectContext) => void;
  activeTurns: SessionTurn[];
  suggestedFollowUp?: string;
  isCompiling: boolean;
  onCompile: () => void;
  onClearPrompt: () => void;
  onStartFreshThread: () => void;
}

const LANGUAGE_HINTS = [
  { value: 'auto', label: 'Auto-detect (Multilingual / Mixed)' },
  { value: 'Japanese', label: 'Japanese (日本語)' },
  { value: 'Spanish', label: 'Spanish (Español)' },
  { value: 'Mandarin Chinese', label: 'Chinese (中文)' },
  { value: 'Korean', label: 'Korean (한국어)' },
  { value: 'French', label: 'French (Français)' },
  { value: 'German', label: 'German (Deutsch)' },
  { value: 'Portuguese', label: 'Portuguese (Português)' },
  { value: 'Arabic', label: 'Arabic (العربية)' },
  { value: 'Hindi', label: 'Hindi (हिन्दी)' },
  { value: 'English', label: 'English' },
];

export const SourceInputPane: React.FC<SourceInputPaneProps> = ({
  rawPrompt,
  onChangeRawPrompt,
  sourceLanguageHint,
  onChangeSourceLanguageHint,
  projectContext,
  onChangeProjectContext,
  activeTurns,
  suggestedFollowUp,
  isCompiling,
  onCompile,
  onClearPrompt,
  onStartFreshThread,
}) => {
  const [contextOpen, setContextOpen] = useState(
    Boolean(
      projectContext.techStack ||
        projectContext.targetFiles ||
        projectContext.constraints
    )
  );
  const [pasteStatus, setPasteStatus] = useState<'idle' | 'pasted' | 'denied'>('idle');

  const nextTurnNumber = activeTurns.length + 1;
  const charCount = rawPrompt.length;
  const estTokens = Math.max(0, Math.ceil(charCount / 3.2));

  const hasContext = Boolean(
    projectContext.techStack.trim() ||
      projectContext.targetFiles.trim() ||
      projectContext.constraints.trim()
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      if (!isCompiling && rawPrompt.trim()) {
        onCompile();
      }
    }
  };

  const handlePasteClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        onChangeRawPrompt(rawPrompt.trim() ? `${rawPrompt.trim()}\n\n${text}` : text);
        setPasteStatus('pasted');
        setTimeout(() => setPasteStatus('idle'), 1800);
      }
    } catch {
      setPasteStatus('denied');
      setTimeout(() => setPasteStatus('idle'), 2200);
    }
  };

  return (
    <section
      aria-label="Source prompt editor"
      className="flex min-h-0 flex-col border-b border-slate-200 bg-white lg:border-r lg:border-b-0 dark:border-slate-800 dark:bg-slate-900"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-5 py-3 dark:border-slate-800">
        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <span className="font-display font-semibold text-slate-900 dark:text-slate-100">
            {nextTurnNumber === 1 ? 'Source Idea' : `Turn ${nextTurnNumber} Follow-Up`}
          </span>
          <span aria-hidden="true">·</span>
          <span>
            {nextTurnNumber === 1
              ? 'Write in any language or mixed script'
              : `Carrying context from ${activeTurns.length} prior ${
                  activeTurns.length === 1 ? 'turn' : 'turns'
                }`}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <select
            aria-label="Source language hint"
            value={sourceLanguageHint}
            onChange={(e) => onChangeSourceLanguageHint(e.target.value)}
            className="rounded border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-700 focus:border-blue-600 focus:outline-none cursor-pointer dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300"
          >
            {LANGUAGE_HINTS.map((lang) => (
              <option key={lang.value} value={lang.value}>
                {lang.label}
              </option>
            ))}
          </select>

          {activeTurns.length > 0 && (
            <button
              type="button"
              onClick={onStartFreshThread}
              title="Reset context thread to Turn 1"
              className="inline-flex items-center gap-1 rounded border border-slate-200 px-2 py-1 text-xs text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900 whitespace-nowrap shrink-0 cursor-pointer dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <RotateCcw className="h-3 w-3" aria-hidden="true" />
              Reset Thread
            </button>
          )}
        </div>
      </div>

      {activeTurns.length > 0 && (
        <div className="border-b border-slate-200 bg-slate-50/80 px-5 py-2.5 dark:border-slate-800 dark:bg-slate-950/60">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="min-w-0 flex-1 text-slate-600 dark:text-slate-300">
              <span className="font-medium text-slate-900 dark:text-slate-100">
                Active Thread Intent:
              </span>{' '}
              <span className="truncate">
                {activeTurns[activeTurns.length - 1].result.inferredIntent}
              </span>
            </div>
            {suggestedFollowUp && !rawPrompt.trim() && (
              <button
                type="button"
                onClick={() => onChangeRawPrompt(suggestedFollowUp)}
                className="text-xs font-medium text-blue-600 hover:underline whitespace-nowrap shrink-0 cursor-pointer dark:text-blue-400"
              >
                Try multilingual follow-up
              </button>
            )}
          </div>
        </div>
      )}

      <div className="flex flex-1 flex-col p-5">
        <textarea
          dir="auto"
          value={rawPrompt}
          onChange={(e) => onChangeRawPrompt(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            nextTurnNumber === 1
              ? 'Describe what you want a coding agent to build, fix, or refactor in any language (Japanese, Spanish, Chinese, Korean, French, Arabic, mixed English technical terms, etc.)...'
              : 'Add a refinement, paste coding agent output/errors, or answer an ambiguity in any language. Prior context remains active...'
          }
          aria-label="Multilingual source prompt"
          className="min-h-[220px] w-full flex-1 resize-none rounded-lg border border-slate-200 bg-slate-50/50 p-4 text-[15px] leading-relaxed text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:bg-white focus:outline-none dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-blue-500 dark:focus:bg-slate-950"
        />

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 tabular-nums dark:text-slate-400">
          <div className="flex items-center gap-2">
            <span>{charCount} chars</span>
            <span aria-hidden="true">·</span>
            <span>~{estTokens} tokens</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handlePasteClipboard}
              className="inline-flex items-center gap-1 text-slate-600 hover:text-slate-900 cursor-pointer dark:text-slate-300 dark:hover:text-white"
            >
              <ClipboardPaste className="h-3.5 w-3.5" aria-hidden="true" />
              {pasteStatus === 'pasted'
                ? 'Pasted'
                : pasteStatus === 'denied'
                  ? 'Use Ctrl/Cmd+V'
                  : 'Paste from clipboard'}
            </button>
            {rawPrompt.length > 0 && (
              <button
                type="button"
                onClick={onClearPrompt}
                className="inline-flex items-center gap-1 text-slate-500 hover:text-slate-900 cursor-pointer dark:text-slate-400 dark:hover:text-slate-100"
              >
                <Eraser className="h-3.5 w-3.5" aria-hidden="true" />
                Clear
              </button>
            )}
          </div>
        </div>

        <div className="mt-4 border-t border-slate-200 pt-3 dark:border-slate-800">
          <button
            type="button"
            onClick={() => setContextOpen((prev) => !prev)}
            aria-expanded={contextOpen}
            className="flex w-full items-center justify-between py-1 text-left text-xs font-medium text-slate-700 hover:text-slate-900 cursor-pointer dark:text-slate-300 dark:hover:text-white"
          >
            <span className="flex items-center gap-1.5">
              {contextOpen ? (
                <ChevronDown className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
              )}
              Project & Stack Context
            </span>
            <span className="text-[11px] font-normal text-slate-500 dark:text-slate-400">
              {hasContext ? 'Configured' : 'Optional'}
            </span>
          </button>

          {contextOpen && (
            <div className="mt-3 space-y-3">
              <div>
                <label
                  htmlFor="ctx-stack"
                  className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400"
                >
                  Tech Stack & Runtime
                </label>
                <input
                  id="ctx-stack"
                  type="text"
                  value={projectContext.techStack}
                  onChange={(e) =>
                    onChangeProjectContext({
                      ...projectContext,
                      techStack: e.target.value,
                    })
                  }
                  placeholder="e.g., React 19, TypeScript, Express, PostgreSQL"
                  className="w-full rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                />
              </div>
              <div>
                <label
                  htmlFor="ctx-files"
                  className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400"
                >
                  Target Files or Modules
                </label>
                <input
                  id="ctx-files"
                  type="text"
                  value={projectContext.targetFiles}
                  onChange={(e) =>
                    onChangeProjectContext({
                      ...projectContext,
                      targetFiles: e.target.value,
                    })
                  }
                  placeholder="e.g., src/routes/checkout.ts, src/hooks/useAuth.ts"
                  className="w-full rounded-md border border-slate-200 bg-white px-3 py-1.5 font-mono text-xs text-slate-900 placeholder:font-sans placeholder:text-slate-400 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                />
              </div>
              <div>
                <label
                  htmlFor="ctx-constraints"
                  className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400"
                >
                  Hard Constraints & Invariants
                </label>
                <input
                  id="ctx-constraints"
                  type="text"
                  value={projectContext.constraints}
                  onChange={(e) =>
                    onChangeProjectContext({
                      ...projectContext,
                      constraints: e.target.value,
                    })
                  }
                  placeholder="e.g., No new external dependencies; preserve REST v1 response schema"
                  className="w-full rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 border-t border-slate-200 bg-slate-50/70 px-5 py-3 dark:border-slate-800 dark:bg-slate-900/60">
        <span className="text-xs text-slate-500 dark:text-slate-400">
          Shortcut: Cmd/Ctrl + Enter
        </span>
        <button
          type="button"
          disabled={isCompiling || !rawPrompt.trim()}
          onClick={onCompile}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 whitespace-nowrap shrink-0 cursor-pointer dark:bg-blue-600 dark:hover:bg-blue-500"
        >
          {isCompiling ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
              Reasoning...
            </>
          ) : (
            <>
              <CornerDownLeft className="h-3.5 w-3.5" aria-hidden="true" />
              {nextTurnNumber === 1
                ? 'Translate & Compile'
                : `Compile Turn ${nextTurnNumber}`}
            </>
          )}
        </button>
      </div>
    </section>
  );
};
