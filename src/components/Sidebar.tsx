import React, { useMemo, useState } from 'react';
import {
  ArrowUpRight,
  LogOut,
  MessageSquarePlus,
  Search,
  Trash2,
} from 'lucide-react';
import type { ContextSession, MultilingualPreset } from '../types/translator';

interface SidebarProps {
  sessions: ContextSession[];
  activeSessionId: string | null;
  presets: MultilingualPreset[];
  userDisplayName: string;
  userEmail: string;
  onSelectSession: (sessionId: string) => void;
  onDeleteSession: (sessionId: string) => void;
  onLoadPreset: (preset: MultilingualPreset) => void;
  onStartBlank: () => void;
  onSignOut: () => void;
}

function formatShortTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

export const Sidebar: React.FC<SidebarProps> = ({
  sessions,
  activeSessionId,
  presets,
  userDisplayName,
  userEmail,
  onSelectSession,
  onDeleteSession,
  onLoadPreset,
  onStartBlank,
  onSignOut,
}) => {
  const [query, setQuery] = useState('');

  const filteredSessions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sessions;
    return sessions.filter((s) => {
      const latestTurn = s.turns[s.turns.length - 1];
      const lang =
        s.latestLanguageCode || latestTurn?.result.primaryLanguageName || '';
      const intent =
        s.latestIntentCategory || latestTurn?.result.intentCategory || '';
      return (
        s.title.toLowerCase().includes(q) ||
        lang.toLowerCase().includes(q) ||
        intent.toLowerCase().includes(q)
      );
    });
  }, [sessions, query]);

  return (
    <aside className="flex w-full shrink-0 flex-col border-b border-slate-200 bg-white lg:w-[264px] lg:border-r lg:border-b-0 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-col border-b border-slate-200 p-4 dark:border-slate-800">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-xs font-semibold tracking-wide text-slate-500 dark:text-slate-400">
            Private Threads
          </h2>
          <span className="font-mono text-xs text-slate-500 tabular-nums dark:text-slate-400">
            {sessions.length}
          </span>
        </div>

        <div className="relative mb-3">
          <Search
            className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-slate-400"
            aria-hidden="true"
          />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter threads..."
            aria-label="Filter private context threads"
            className="w-full rounded-md border border-slate-200 bg-slate-50 py-1.5 pr-2.5 pl-8 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-blue-500 dark:focus:bg-slate-900"
          />
        </div>

        {filteredSessions.length === 0 ? (
          <div className="rounded-md border border-dashed border-slate-200 p-3 text-center dark:border-slate-800">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {sessions.length === 0
                ? 'No private threads yet. Compile a prompt or try a preset.'
                : 'No threads match your search.'}
            </p>
            {sessions.length === 0 && (
              <button
                type="button"
                onClick={onStartBlank}
                className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-700 cursor-pointer dark:text-blue-400"
              >
                <MessageSquarePlus className="h-3.5 w-3.5" aria-hidden="true" />
                Start blank prompt
              </button>
            )}
          </div>
        ) : (
          <ul className="max-h-56 space-y-1 overflow-y-auto pr-0.5 lg:max-h-64">
            {filteredSessions.map((session) => {
              const latest = session.turns[session.turns.length - 1];
              const count = session.turnCount ?? session.turns.length;
              const langCode =
                session.latestLanguageCode ||
                latest?.result.primaryLanguageCode ||
                'AUTO';
              const isSelected = session.id === activeSessionId;
              return (
                <li key={session.id} className="group flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => onSelectSession(session.id)}
                    className={`flex min-w-0 flex-1 flex-col rounded-md px-2.5 py-2 text-left transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-white'
                        : 'text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800/60'
                    }`}
                  >
                    <span className="truncate text-xs font-medium">
                      {session.title}
                    </span>
                    <span className="mt-0.5 flex items-center gap-1.5 text-[11px] text-slate-500 tabular-nums dark:text-slate-400">
                      <span>{langCode} → EN</span>
                      <span aria-hidden="true">·</span>
                      <span>
                        {count} {count === 1 ? 'turn' : 'turns'}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>{formatShortTime(session.updatedAt)}</span>
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeleteSession(session.id)}
                    aria-label={`Delete thread ${session.title}`}
                    className="rounded p-1.5 text-slate-400 opacity-0 transition-opacity hover:bg-slate-100 hover:text-red-600 group-hover:opacity-100 focus-visible:opacity-100 cursor-pointer dark:hover:bg-slate-800 dark:hover:text-red-400"
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-xs font-semibold tracking-wide text-slate-500 dark:text-slate-400">
            Multilingual Presets
          </h2>
          <span className="text-[11px] text-slate-400 dark:text-slate-500">
            Click to load
          </span>
        </div>

        <div className="space-y-2">
          {presets.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => onLoadPreset(preset)}
              className="group flex w-full flex-col rounded-md border border-slate-200 bg-slate-50/70 p-2.5 text-left transition-colors hover:border-slate-300 hover:bg-white cursor-pointer dark:border-slate-800 dark:bg-slate-950/60 dark:hover:border-slate-700 dark:hover:bg-slate-800/70"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="text-xs font-medium text-slate-900 dark:text-slate-100">
                  {preset.title}
                </span>
                <ArrowUpRight
                  className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-blue-600 dark:group-hover:text-blue-400"
                  aria-hidden="true"
                />
              </div>
              <div className="mt-1 flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                <span>{preset.languagePair}</span>
                <span aria-hidden="true">·</span>
                <span className="truncate">{preset.domain}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-slate-200 px-4 py-3 dark:border-slate-800">
        <div className="min-w-0 flex-1">
          <div className="truncate text-xs font-medium text-slate-900 dark:text-slate-100">
            {userDisplayName}
          </div>
          <div className="truncate text-[11px] text-slate-500 dark:text-slate-400">
            {userEmail}
          </div>
        </div>
        <button
          type="button"
          onClick={onSignOut}
          aria-label="Sign out"
          title="Sign out"
          className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-900 whitespace-nowrap shrink-0 cursor-pointer dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
        >
          <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
          Sign Out
        </button>
      </div>
    </aside>
  );
};
