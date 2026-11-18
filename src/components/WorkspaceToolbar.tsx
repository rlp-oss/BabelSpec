import React from 'react';
import { Moon, Sun } from 'lucide-react';
import { OUTPUT_FORMATS, TARGET_AGENTS } from '../data/presets';
import type {
  OutputFormatId,
  ReasoningDepth,
  TargetAgentId,
} from '../types/translator';

interface WorkspaceToolbarProps {
  targetAgent: TargetAgentId;
  onChangeTargetAgent: (agent: TargetAgentId) => void;
  outputFormat: OutputFormatId;
  onChangeOutputFormat: (format: OutputFormatId) => void;
  reasoningDepth: ReasoningDepth;
  onChangeReasoningDepth: (depth: ReasoningDepth) => void;
  isDark: boolean;
  onToggleTheme: () => void;
}

export const WorkspaceToolbar: React.FC<WorkspaceToolbarProps> = ({
  targetAgent,
  onChangeTargetAgent,
  outputFormat,
  onChangeOutputFormat,
  reasoningDepth,
  onChangeReasoningDepth,
  isDark,
  onToggleTheme,
}) => {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-2.5 sm:px-6 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <label
            htmlFor="target-agent-select"
            className="text-xs font-medium text-slate-500 whitespace-nowrap shrink-0 dark:text-slate-400"
          >
            Target Agent
          </label>
          <select
            id="target-agent-select"
            value={targetAgent}
            onChange={(e) => onChangeTargetAgent(e.target.value as TargetAgentId)}
            className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-900 focus:border-blue-600 focus:outline-none cursor-pointer dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
          >
            {TARGET_AGENTS.map((agent) => (
              <option key={agent.id} value={agent.id}>
                {agent.label}
              </option>
            ))}
          </select>
        </div>

        <div className="hidden h-4 w-px bg-slate-200 sm:block dark:bg-slate-800" />

        <div className="flex items-center gap-1 overflow-x-auto rounded-lg bg-slate-100 p-1 dark:bg-slate-950">
          {OUTPUT_FORMATS.map((fmt) => {
            const active = outputFormat === fmt.id;
            return (
              <button
                key={fmt.id}
                type="button"
                onClick={() => onChangeOutputFormat(fmt.id)}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  active
                    ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-800 dark:text-white'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
                }`}
              >
                {fmt.shortLabel}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <div
          role="group"
          aria-label="Reasoning depth"
          className="flex items-center gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-950"
        >
          <button
            type="button"
            onClick={() => onChangeReasoningDepth('balanced')}
            className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              reasoningDepth === 'balanced'
                ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-800 dark:text-white'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
            }`}
          >
            Balanced
          </button>
          <button
            type="button"
            onClick={() => onChangeReasoningDepth('deep')}
            className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              reasoningDepth === 'deep'
                ? 'bg-white text-blue-600 shadow-xs dark:bg-slate-800 dark:text-blue-400'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
            }`}
          >
            Deep XHIGH
          </button>
        </div>

        <button
          type="button"
          onClick={onToggleTheme}
          aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          className="flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900 cursor-pointer dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-white"
        >
          {isDark ? (
            <Sun className="h-4 w-4" aria-hidden="true" />
          ) : (
            <Moon className="h-4 w-4" aria-hidden="true" />
          )}
        </button>
      </div>
    </div>
  );
};
