import React, { useMemo, useState } from 'react';
import { ArrowUpRight, Search, Trash2 } from 'lucide-react';
import type { ContextSession } from '../types/translator';

interface HistoryViewProps {
  sessions: ContextSession[];
  onOpenSession: (sessionId: string) => void;
  onDeleteSession: (sessionId: string) => void;
  onGoToCompiler: () => void;
}

export const HistoryView: React.FC<HistoryViewProps> = ({
  sessions,
  onOpenSession,
  onDeleteSession,
  onGoToCompiler,
}) => {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return sessions;
    return sessions.filter((s) => {
      const latest = s.turns[s.turns.length - 1];
      const intent =
        s.latestIntentCategory || latest?.result.intentCategory || '';
      const lang =
        s.latestLanguageCode || latest?.result.primaryLanguageName || '';
      return (
        s.title.toLowerCase().includes(q) ||
        intent.toLowerCase().includes(q) ||
        lang.toLowerCase().includes(q)
      );
    });
  }, [sessions, search]);

  return (
    <div className="mx-auto max-w-6xl space-y-5 p-6">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-200 pb-4 dark:border-slate-800">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Private Thread Archive
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Confidential multi-turn translation threads stored exclusively in your verified account.
          </p>
        </div>

        <div className="relative w-full sm:w-64">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-slate-400"
            aria-hidden="true"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search archive..."
            aria-label="Search private thread archive"
            className="w-full rounded-md border border-slate-200 bg-white py-1.5 pr-3 pl-8 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white p-10 text-center dark:border-slate-800 dark:bg-slate-900">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {sessions.length === 0
              ? 'No compiled context threads saved in your account yet.'
              : 'No threads matched your filter.'}
          </p>
          <button
            type="button"
            onClick={onGoToCompiler}
            className="mt-4 rounded-lg bg-slate-900 px-4 py-2 text-xs font-medium text-white hover:bg-slate-800 cursor-pointer dark:bg-blue-600 dark:hover:bg-blue-500"
          >
            Open Compiler
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 dark:border-slate-800 dark:text-slate-400">
                <th className="px-4 py-3 font-medium">Thread</th>
                <th className="px-4 py-3 font-medium">Intent</th>
                <th className="px-4 py-3 font-medium">Languages</th>
                <th className="px-4 py-3 text-right font-medium">Turns</th>
                <th className="px-4 py-3 text-right font-medium">Updated</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {filtered.map((session) => {
                const latest = session.turns[session.turns.length - 1];
                const intentLabel =
                  session.latestIntentCategory ||
                  latest?.result.intentCategory ||
                  'Compiled Spec';
                const langCode =
                  session.latestLanguageCode ||
                  latest?.result.primaryLanguageCode ||
                  'AUTO';
                const count = session.turnCount ?? session.turns.length;

                return (
                  <tr
                    key={session.id}
                    className="transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50"
                  >
                    <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">
                      {session.title}
                    </td>
                    <td className="max-w-xs truncate px-4 py-3 text-slate-600 dark:text-slate-400">
                      {intentLabel}
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                      {langCode} → EN
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums text-slate-700 dark:text-slate-300">
                      {count}
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums text-slate-500 dark:text-slate-400">
                      {new Date(session.updatedAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => onOpenSession(session.id)}
                          className="inline-flex items-center gap-1 font-medium text-blue-600 hover:underline cursor-pointer dark:text-blue-400"
                        >
                          Open
                          <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteSession(session.id)}
                          aria-label={`Delete ${session.title}`}
                          className="rounded p-1 text-slate-400 hover:text-red-600 cursor-pointer dark:hover:text-red-400"
                        >
                          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
