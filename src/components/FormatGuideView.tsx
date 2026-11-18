import React from 'react';
import { OUTPUT_FORMATS } from '../data/presets';
import type { OutputFormatId } from '../types/translator';

interface FormatGuideViewProps {
  selectedFormat: OutputFormatId;
  onSelectFormat: (format: OutputFormatId) => void;
}

export const FormatGuideView: React.FC<FormatGuideViewProps> = ({
  selectedFormat,
  onSelectFormat,
}) => {
  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <div className="border-b border-slate-200 pb-4 dark:border-slate-800">
        <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Coding Agent Output Formats
        </h1>
        <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-slate-600 dark:text-slate-400">
          Choose how the reasoning engine structures your compiled specification based on the coding agent and workflow complexity.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {OUTPUT_FORMATS.map((fmt) => {
          const isActive = fmt.id === selectedFormat;
          return (
            <div
              key={fmt.id}
              className={`flex flex-col justify-between rounded-lg border bg-white p-5 dark:bg-slate-900 ${
                isActive
                  ? 'border-blue-600 dark:border-blue-500'
                  : 'border-slate-200 dark:border-slate-800'
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <h2 className="font-display text-base font-semibold text-slate-900 dark:text-white">
                    {fmt.label}
                  </h2>
                  {isActive && (
                    <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                      Active
                    </span>
                  )}
                </div>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                  {fmt.summary}
                </p>
                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                  <span className="font-medium text-slate-700 dark:text-slate-300">
                    Best for:
                  </span>{' '}
                  {fmt.bestFor}
                </p>
                <pre className="mt-3 overflow-x-auto rounded-md border border-slate-200 bg-slate-50 p-3 font-mono text-xs text-slate-800 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">
                  {fmt.structurePreview}
                </pre>
              </div>

              <div className="mt-4 pt-2">
                <button
                  type="button"
                  onClick={() => onSelectFormat(fmt.id)}
                  className="rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-medium text-white transition-colors hover:bg-slate-800 cursor-pointer dark:bg-blue-600 dark:hover:bg-blue-500"
                >
                  Use {fmt.shortLabel} in Compiler
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
