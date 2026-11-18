import React, { useMemo, useState } from 'react';
import { ArrowRight, GitBranch, Layers } from 'lucide-react';
import type {
  CompilationResult,
  KeywordCategory,
  KeywordNode,
} from '../types/translator';

interface ContextGraphInspectorProps {
  result: CompilationResult;
  turnNumber: number;
}

const CATEGORY_ORDER: KeywordCategory[] = [
  'Symptom',
  'Component',
  'Mechanism',
  'Constraint',
  'Outcome',
];

const CATEGORY_ACCENT: Record<KeywordCategory, string> = {
  Symptom: 'border-amber-300 bg-amber-50/70 text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200',
  Component: 'border-slate-300 bg-slate-50 text-slate-900 dark:border-slate-700 dark:bg-slate-800/70 dark:text-slate-100',
  Mechanism: 'border-blue-300 bg-blue-50/70 text-blue-900 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-200',
  Constraint: 'border-rose-300 bg-rose-50/70 text-rose-900 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-200',
  Outcome: 'border-emerald-300 bg-emerald-50/70 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200',
};

export const ContextGraphInspector: React.FC<ContextGraphInspectorProps> = ({
  result,
  turnNumber,
}) => {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  const nodeMap = useMemo(() => {
    const map = new Map<string, KeywordNode>();
    for (const n of result.keywordNodes || []) {
      map.set(n.id, n);
    }
    return map;
  }, [result.keywordNodes]);

  const groupedColumns = useMemo(() => {
    const groups = new Map<KeywordCategory, KeywordNode[]>();
    for (const cat of CATEGORY_ORDER) {
      groups.set(cat, []);
    }
    for (const node of result.keywordNodes || []) {
      const cat = CATEGORY_ORDER.includes(node.category)
        ? node.category
        : 'Component';
      groups.get(cat)!.push(node);
    }
    return CATEGORY_ORDER.map((cat) => ({
      category: cat,
      nodes: groups.get(cat) || [],
    })).filter((g) => g.nodes.length > 0);
  }, [result.keywordNodes]);

  const connectedNodeIds = useMemo(() => {
    if (!selectedNodeId) return null;
    const set = new Set<string>([selectedNodeId]);
    for (const rel of result.keywordRelations || []) {
      if (rel.fromId === selectedNodeId) set.add(rel.toId);
      if (rel.toId === selectedNodeId) set.add(rel.fromId);
    }
    return set;
  }, [selectedNodeId, result.keywordRelations]);

  const visibleRelations = useMemo(() => {
    const all = result.keywordRelations || [];
    if (!selectedNodeId) return all;
    return all.filter(
      (rel) => rel.fromId === selectedNodeId || rel.toId === selectedNodeId
    );
  }, [selectedNodeId, result.keywordRelations]);

  const selectedNode = selectedNodeId ? nodeMap.get(selectedNodeId) : null;

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-950/60">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
          <span>Core Intent Classification</span>
          <span className="font-mono tabular-nums">
            {result.intentCategory} · Turn {turnNumber}
          </span>
        </div>
        <p className="mt-2 text-sm font-medium leading-relaxed text-slate-900 dark:text-slate-100">
          {result.inferredIntent}
        </p>
        {result.secondaryIntents && result.secondaryIntents.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-slate-200 pt-2.5 text-xs text-slate-600 dark:border-slate-800 dark:text-slate-400">
            <span className="font-medium text-slate-700 dark:text-slate-300">
              Supporting goals:
            </span>
            {result.secondaryIntents.map((intent, idx) => (
              <React.Fragment key={intent}>
                {idx > 0 && <span aria-hidden="true">·</span>}
                <span>{intent}</span>
              </React.Fragment>
            ))}
          </div>
        )}
      </div>

      {result.contextDelta && (
        <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-3 flex items-center gap-2 text-xs font-semibold text-slate-900 dark:text-slate-100">
            <GitBranch className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" aria-hidden="true" />
            <span>Multi-Turn Context Continuity</span>
            <span className="font-normal text-slate-500 tabular-nums dark:text-slate-400">
              · Turn {result.contextDelta.turnNumber || turnNumber}
            </span>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <h4 className="text-[11px] font-semibold tracking-wide text-slate-500 dark:text-slate-400">
                Carried Over
              </h4>
              {result.contextDelta.carriedOver?.length > 0 ? (
                <ul className="mt-1.5 space-y-1 text-xs text-slate-700 dark:text-slate-300">
                  {result.contextDelta.carriedOver.map((item) => (
                    <li key={item} className="leading-snug">
                      — {item}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-1.5 text-xs text-slate-400 dark:text-slate-500">
                  Initial turn baseline
                </p>
              )}
            </div>

            <div>
              <h4 className="text-[11px] font-semibold tracking-wide text-slate-500 dark:text-slate-400">
                Newly Added
              </h4>
              {result.contextDelta.newlyAdded?.length > 0 ? (
                <ul className="mt-1.5 space-y-1 text-xs text-slate-700 dark:text-slate-300">
                  {result.contextDelta.newlyAdded.map((item) => (
                    <li key={item} className="leading-snug">
                      + {item}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-1.5 text-xs text-slate-400 dark:text-slate-500">
                  None
                </p>
              )}
            </div>

            <div>
              <h4 className="text-[11px] font-semibold tracking-wide text-slate-500 dark:text-slate-400">
                Updated Decisions
              </h4>
              {result.contextDelta.updatedDecisions?.length > 0 ? (
                <ul className="mt-1.5 space-y-1 text-xs text-slate-700 dark:text-slate-300">
                  {result.contextDelta.updatedDecisions.map((item) => (
                    <li key={item} className="leading-snug">
                      ~ {item}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-1.5 text-xs text-slate-400 dark:text-slate-500">
                  No overrides
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-900 dark:text-slate-100">
            <Layers className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" aria-hidden="true" />
            <span>Keyword & Phrase Semantic Matrix</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <span>
              {selectedNode
                ? `Filtering connections for "${selectedNode.normalizedConcept}"`
                : 'Click any phrase node to trace connections'}
            </span>
            {selectedNodeId && (
              <button
                type="button"
                onClick={() => setSelectedNodeId(null)}
                className="font-medium text-blue-600 hover:underline cursor-pointer dark:text-blue-400"
              >
                Show all
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {groupedColumns.map((col) => (
            <div
              key={col.category}
              className="rounded-md border border-slate-200 bg-slate-50/50 p-3 dark:border-slate-800 dark:bg-slate-950/50"
            >
              <div className="mb-2 flex items-center justify-between text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                <span>{col.category}</span>
                <span className="font-mono tabular-nums">{col.nodes.length}</span>
              </div>
              <div className="space-y-2">
                {col.nodes.map((node) => {
                  const isSelected = node.id === selectedNodeId;
                  const isDimmed =
                    connectedNodeIds !== null && !connectedNodeIds.has(node.id);
                  return (
                    <button
                      key={node.id}
                      type="button"
                      onClick={() =>
                        setSelectedNodeId((prev) =>
                          prev === node.id ? null : node.id
                        )
                      }
                      className={`w-full rounded-md border p-2 text-left transition-opacity cursor-pointer ${
                        CATEGORY_ACCENT[node.category] || CATEGORY_ACCENT.Component
                      } ${
                        isSelected
                          ? 'ring-2 ring-blue-600 ring-offset-1 dark:ring-blue-500 dark:ring-offset-slate-900'
                          : ''
                      } ${isDimmed ? 'opacity-35' : 'opacity-100'}`}
                    >
                      <div className="text-xs font-semibold leading-snug">
                        {node.normalizedConcept}
                      </div>
                      <div className="mt-0.5 text-[11px] opacity-80">
                        {node.phrase}
                      </div>
                      <div className="mt-1 flex items-center gap-1.5 text-[10px] opacity-70 tabular-nums">
                        <span>{node.language}</span>
                        <span aria-hidden="true">·</span>
                        <span>Turn {node.fromTurn}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-5 border-t border-slate-200 pt-4 dark:border-slate-800">
          <div className="mb-2.5 flex items-center justify-between">
            <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Typed Phrase Relationships
            </h4>
            <span className="font-mono text-xs text-slate-500 tabular-nums dark:text-slate-400">
              {visibleRelations.length} links
            </span>
          </div>

          {visibleRelations.length === 0 ? (
            <p className="text-xs text-slate-500 dark:text-slate-400">
              No direct links found for this selection.
            </p>
          ) : (
            <div className="divide-y divide-slate-200 border-t border-b border-slate-200 dark:divide-slate-800 dark:border-slate-800">
              {visibleRelations.map((rel, index) => {
                const from = nodeMap.get(rel.fromId);
                const to = nodeMap.get(rel.toId);
                if (!from || !to) return null;
                return (
                  <div
                    key={`${rel.fromId}-${rel.toId}-${rel.relation}-${index}`}
                    className="py-2.5 text-xs"
                  >
                    <div className="flex flex-wrap items-center gap-2 font-medium text-slate-900 dark:text-slate-100">
                      <span>{from.normalizedConcept}</span>
                      <span className="inline-flex items-center gap-1 font-mono text-[11px] font-semibold text-blue-600 dark:text-blue-400">
                        <ArrowRight className="h-3 w-3" aria-hidden="true" />
                        {rel.relation}
                        <ArrowRight className="h-3 w-3" aria-hidden="true" />
                      </span>
                      <span>{to.normalizedConcept}</span>
                    </div>
                    <p className="mt-1 text-slate-600 dark:text-slate-400">
                      {rel.rationale}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
