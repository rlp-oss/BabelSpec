import React from 'react';

export type ActiveView = 'compiler' | 'context-map' | 'formats' | 'history';

interface HeaderProps {
  activeView: ActiveView;
  onSelectView: (view: ActiveView) => void;
  onNewThread: () => void;
}

const NAV_ITEMS: Array<{ id: ActiveView; label: string }> = [
  { id: 'compiler', label: 'Compiler' },
  { id: 'context-map', label: 'Context Map' },
  { id: 'formats', label: 'Formats' },
  { id: 'history', label: 'History' },
];

export const Header: React.FC<HeaderProps> = ({
  activeView,
  onSelectView,
  onNewThread,
}) => {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-8 border-b border-slate-200 bg-white px-4 sm:px-6 dark:border-slate-800 dark:bg-slate-900">
      <button
        type="button"
        onClick={() => onSelectView('compiler')}
        className="font-display text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0 cursor-pointer dark:text-slate-100"
      >
        BabelSpec
      </button>

      <nav
        aria-label="Primary navigation"
        className="flex items-center gap-5 sm:gap-7 overflow-x-auto"
      >
        {NAV_ITEMS.map((item) => {
          const isActive = activeView === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectView(item.id)}
              className={`relative py-1 text-sm font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                isActive
                  ? 'text-slate-900 dark:text-white'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
              }`}
            >
              {item.label}
              {isActive && (
                <span
                  aria-hidden="true"
                  className="absolute inset-x-0 -bottom-0.5 h-0.5 bg-blue-600 dark:bg-blue-500"
                />
              )}
            </button>
          );
        })}
      </nav>

      <button
        type="button"
        onClick={onNewThread}
        className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-slate-800 whitespace-nowrap shrink-0 cursor-pointer dark:bg-blue-600 dark:hover:bg-blue-500"
      >
        New Thread
      </button>
    </header>
  );
};
