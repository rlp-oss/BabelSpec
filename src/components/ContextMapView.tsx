import React from 'react';
import type { SessionTurn } from '../types/translator';
import { ContextGraphInspector } from './ContextGraphInspector';

interface ContextMapViewProps {
  turns: SessionTurn[];
  selectedTurnIndex: number;
  onSelectTurnIndex: (idx: number) => void;
  onGoToCompiler: () => void;
}

export const ContextMapView: React.FC<ContextMapViewProps> = ({
  turns,
  selectedTurnIndex,
  onSelectTurnIndex,
  onGoToCompiler,
}) => {
  const activeTurn = turns[selectedTurnIndex] || turns[turns.length - 1] || null;

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-200 pb-4 dark:border-slate-800">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Semantic Context & Intent Map
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Inspect how keywords, cross-language phrases, and multi-turn decisions connect across your active prompt thread.
          </p>
        </div>

        {turns.length > 0 && (
          <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-900">
            {turns.map((t, idx) => (
              <button
                key={t.id}
                type="button"
                onClick={() => onSelectTurnIndex(idx)}
                className={`rounded-md px-3 py-1 font-mono text-xs font-medium tabular-nums transition-colors cursor-pointer ${
                  idx === selectedTurnIndex
                    ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-800 dark:text-white'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                }`}
              >
                Turn {t.turnNumber}
              </button>
            ))}
          </div>
        )}
      </div>

      {!activeTurn ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white p-10 text-center dark:border-slate-800 dark:bg-slate-900">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Compile a prompt in the Compiler view to generate an interactive intent and keyword relationship graph.
          </p>
          <button
            type="button"
            onClick={onGoToCompiler}
            className="mt-4 rounded-lg bg-slate-900 px-4 py-2 text-xs font-medium text-white hover:bg-slate-800 cursor-pointer dark:bg-blue-600 dark:hover:bg-blue-500"
          >
            Go to Compiler
          </button>
        </div>
      ) : (
        <ContextGraphInspector
          result={activeTurn.result}
          turnNumber={activeTurn.turnNumber}
        />
      )}
    </div>
  );
};
