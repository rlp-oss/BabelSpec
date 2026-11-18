import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';

export interface EngineProjectContext {
  techStack?: string;
  targetFiles?: string;
  constraints?: string;
}

export interface PriorTurnSummary {
  turnNumber: number;
  rawPrompt: string;
  primaryLanguageName: string;
  intentCategory: string;
  inferredIntent: string;
  compiledPrompt: string;
  keyEntities: string[];
  projectContext?: EngineProjectContext;
}

export interface EngineCompileInput {
  rawPrompt: string;
  projectContext?: EngineProjectContext;
  targetAgent: string;
  outputFormat: string;
  reasoningDepth: 'balanced' | 'deep';
  sourceLanguageHint?: string;
  priorTurns?: PriorTurnSummary[];
}

export const CONTEXT_REASONING_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    detectedLanguages: {
      type: Type.ARRAY,
      description: 'All languages, scripts, or technical dialects detected in the source input.',
      items: {
        type: Type.OBJECT,
        properties: {
          language: { type: Type.STRING },
          code: { type: Type.STRING },
          role: { type: Type.STRING },
        },
        required: ['language', 'code', 'role'],
      },
    },
    primaryLanguageCode: {
      type: Type.STRING,
      description: 'Primary ISO 639-1 uppercase code of the current turn input (e.g. JA, ES, ZH, EN).',
    },
    primaryLanguageName: {
      type: Type.STRING,
      description: 'Primary language name of the current turn input.',
    },
    intentCategory: {
      type: Type.STRING,
      description:
        'Must be one of: Feature Build, Bug Fix, Architecture Refactor, Performance, Security & Auth, API & Data, Testing & QA.',
    },
    inferredIntent: {
      type: Type.STRING,
      description: 'Sharp 1-2 sentence English statement of the unified core engineering goal across this turn and any prior turns.',
    },
    secondaryIntents: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: 'Supporting goals or cross-cutting concerns implied by the prompt (e.g., UX feedback, idempotency, test coverage).',
    },
    keywordNodes: {
      type: Type.ARRAY,
      description: '6-10 key terms, phrases, or domain entities extracted from the prompt (and carried forward from prior turns if still active).',
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING, description: 'Short stable slug identifier such as k1, k2, k3.' },
          phrase: { type: Type.STRING, description: 'Original term or phrase from user input.' },
          normalizedConcept: { type: Type.STRING, description: 'Canonical English engineering concept.' },
          language: { type: Type.STRING, description: 'Source language of the phrase.' },
          category: {
            type: Type.STRING,
            description: 'One of: Symptom, Component, Mechanism, Constraint, Outcome.',
          },
          fromTurn: {
            type: Type.INTEGER,
            description: '1-based turn number where this entity first entered context.',
          },
        },
        required: ['id', 'phrase', 'normalizedConcept', 'language', 'category', 'fromTurn'],
      },
    },
    keywordRelations: {
      type: Type.ARRAY,
      description: 'Directed semantic relationships linking keywordNodes together to model cause, mitigation, dependency, and constraint.',
      items: {
        type: Type.OBJECT,
        properties: {
          fromId: { type: Type.STRING, description: 'Source node id from keywordNodes.' },
          toId: { type: Type.STRING, description: 'Target node id from keywordNodes.' },
          relation: {
            type: Type.STRING,
            description: 'One of: CAUSES, MITIGATES, REQUIRES, CONSTRAINS, MODIFIES, DEPENDS_ON.',
          },
          rationale: { type: Type.STRING, description: 'Concise explanation of why these concepts are linked.' },
        },
        required: ['fromId', 'toId', 'relation', 'rationale'],
      },
    },
    contextDelta: {
      type: Type.OBJECT,
      description: 'Tracks how context evolved across turns in the current session.',
      properties: {
        turnNumber: { type: Type.INTEGER },
        carriedOver: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: 'Constraints, targets, or decisions retained from prior turns (empty on turn 1).',
        },
        newlyAdded: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: 'New requirements or concepts introduced in this turn.',
        },
        updatedDecisions: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: 'Prior assumptions or requirements modified or overridden by this turn.',
        },
      },
      required: ['turnNumber', 'carriedOver', 'newlyAdded', 'updatedDecisions'],
    },
    contextBridges: {
      type: Type.ARRAY,
      description: 'Cross-linguistic phrases, idioms, or code-switched expressions resolved into concrete engineering decisions.',
      items: {
        type: Type.OBJECT,
        properties: {
          sourcePhrase: { type: Type.STRING },
          sourceLanguage: { type: Type.STRING },
          interpretedMeaning: { type: Type.STRING },
          architecturalDecision: { type: Type.STRING },
        },
        required: ['sourcePhrase', 'sourceLanguage', 'interpretedMeaning', 'architecturalDecision'],
      },
    },
    reasoningSteps: {
      type: Type.ARRAY,
      description: 'Ordered cognitive trace of intent detection, semantic graph resolution, multi-turn reconciliation, and prompt compilation.',
      items: {
        type: Type.OBJECT,
        properties: {
          phase: { type: Type.STRING },
          analysis: { type: Type.STRING },
          outcome: { type: Type.STRING },
        },
        required: ['phase', 'analysis', 'outcome'],
      },
    },
    ambiguities: {
      type: Type.ARRAY,
      description: 'Underspecified details with sensible engineering defaults and clarifying questions in both source language and English.',
      items: {
        type: Type.OBJECT,
        properties: {
          topic: { type: Type.STRING },
          questionInSourceLang: { type: Type.STRING },
          questionInEnglish: { type: Type.STRING },
          defaultAssumption: { type: Type.STRING },
        },
        required: ['topic', 'questionInSourceLang', 'questionInEnglish', 'defaultAssumption'],
      },
    },
    compiledPrompt: {
      type: Type.STRING,
      description: 'Complete, unified, copy-ready English specification for the coding agent incorporating all active multi-turn context.',
    },
    backTranslation: {
      type: Type.OBJECT,
      description: 'Verification summary translated back into the user primary source language.',
      properties: {
        languageName: { type: Type.STRING },
        summary: { type: Type.STRING },
        keyPoints: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
        },
      },
      required: ['languageName', 'summary', 'keyPoints'],
    },
    checklist: {
      type: Type.ARRAY,
      description: 'Concrete testable implementation requirements and verification checks.',
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          category: { type: Type.STRING },
          requirement: { type: Type.STRING },
          verificationHint: { type: Type.STRING },
        },
        required: ['id', 'category', 'requirement', 'verificationHint'],
      },
    },
  },
  required: [
    'detectedLanguages',
    'primaryLanguageCode',
    'primaryLanguageName',
    'intentCategory',
    'inferredIntent',
    'secondaryIntents',
    'keywordNodes',
    'keywordRelations',
    'contextDelta',
    'contextBridges',
    'reasoningSteps',
    'ambiguities',
    'compiledPrompt',
    'backTranslation',
    'checklist',
  ],
};

function buildSystemInstruction(targetAgent: string, outputFormat: string, turnNumber: number): string {
  const agentGuidance: Record<string, string> = {
    universal:
      'Target Agent: Universal Autonomous & IDE Coding Agents. Produce explicit file scopes, deterministic requirements, state transitions, and concrete verification steps.',
    'claude-code':
      'Target Agent: Claude Code / CLI Agent. Emphasize repository inspection boundaries, modular file edits, strict TypeScript/runtime contracts, and exact shell test/build verification.',
    'cursor-composer':
      'Target Agent: Cursor / Windsurf Composer. Emphasize multi-file edit boundaries, interface signatures, UI state completeness (loading/empty/error), and existing pattern preservation.',
    'codex-copilot':
      'Target Agent: Codex / GitHub Copilot Workspace. Emphasize deterministic input/output contracts, HTTP/error boundary behavior, and explicit unit/integration test expectations.',
  };

  const formatGuidance: Record<string, string> = {
    'structured-markdown':
      'Output Format: Structured Markdown Spec. Format compiledPrompt using clean sections: ## Objective, ## Context & Scope, ## Technical Requirements, ## Edge Cases & Constraints, and ## Verification.',
    'xml-agent':
      'Output Format: XML Agent Prompt. Format compiledPrompt using balanced semantic XML tags: <role>, <context>, <objective>, <requirements>, <constraints>, <edge_cases>, and <verification>.',
    'implementation-plan':
      'Output Format: Architectural Implementation Plan. Format compiledPrompt as phased steps: ## Architecture Overview, ## Phased Execution Plan, ## Data & Interface Contracts, ## Failure Modes, and ## Test Matrix.',
    'issue-ticket':
      'Output Format: Engineering Issue Ticket. Format compiledPrompt with ## Summary, ## Scope & Non-Goals, ## Technical Specification, and ## Definition of Done (- [ ] checkboxes).',
    'compact-inline':
      'Output Format: Compact Inline Instruction. Keep compiledPrompt crisp, dense, and single-block (under 250 words) without ceremony while retaining every active constraint and file path.',
  };

  return `You are the BabelSpec Contextual Reasoning Engine, a principal software architect and cross-linguistic semantic compiler.

Your task for Turn ${turnNumber}:
1. Identify Core Intent: Classify the primary engineering intent (intentCategory) and synthesize a sharp unified objective (inferredIntent) plus supporting concerns (secondaryIntents).
2. Extract Keyword & Phrase Relationships: Identify 6-10 key phrases/entities across whatever languages appear in the prompt (including code-switched identifiers) as keywordNodes, and map explicit directed relationships between them in keywordRelations using CAUSES, MITIGATES, REQUIRES, CONSTRAINS, MODIFIES, or DEPENDS_ON. Every fromId and toId MUST reference an existing id in keywordNodes.
3. Maintain Multi-Turn Continuity: When priorTurns are provided, preserve all active constraints, target files, and architectural decisions from earlier turns unless the user explicitly modifies or overrides them in the current turn. Document what was carriedOver, newlyAdded, and updatedDecisions in contextDelta (with turnNumber = ${turnNumber}). Your compiledPrompt must ALWAYS be a complete, self-contained specification reflecting the cumulative state of the conversation—never emit a partial diff that drops earlier requirements!
4. Seamless Multilingual Comprehension: Understand idioms, colloquial bug reports, and mixed-language technical jargon across any language or script without literal translation artifacts. Record key semantic mappings in contextBridges.
5. Native Back-Translation Verification: Always write backTranslation in the user's primary language for this turn so they can verify that the compiled English prompt accurately reflects their cumulative intent.

${agentGuidance[targetAgent] || agentGuidance.universal}
${formatGuidance[outputFormat] || formatGuidance['structured-markdown']}`;
}

function buildConversationContents(input: EngineCompileInput) {
  const turns = input.priorTurns || [];
  const historyContents: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = [];

  for (const turn of turns) {
    const priorCtx = [
      turn.projectContext?.techStack ? `Tech Stack: ${turn.projectContext.techStack}` : '',
      turn.projectContext?.targetFiles ? `Target Files: ${turn.projectContext.targetFiles}` : '',
      turn.projectContext?.constraints ? `Constraints: ${turn.projectContext.constraints}` : '',
    ]
      .filter(Boolean)
      .join('\n');

    historyContents.push({
      role: 'user',
      parts: [
        {
          text: `[Turn ${turn.turnNumber} User Prompt (${turn.primaryLanguageName})]\n${turn.rawPrompt}${
            priorCtx ? `\n\n[Turn ${turn.turnNumber} Context]\n${priorCtx}` : ''
          }`,
        },
      ],
    });

    historyContents.push({
      role: 'model',
      parts: [
        {
          text: JSON.stringify({
            turnNumber: turn.turnNumber,
            intentCategory: turn.intentCategory,
            inferredIntent: turn.inferredIntent,
            activeConcepts: turn.keyEntities,
            compiledPrompt: turn.compiledPrompt,
          }),
        },
      ],
    });
  }

  const currentParts: string[] = [];
  const currentTurnNumber = turns.length + 1;
  currentParts.push(`[Turn ${currentTurnNumber} User Prompt]\n${input.rawPrompt.trim()}`);

  if (input.sourceLanguageHint && input.sourceLanguageHint !== 'auto') {
    currentParts.push(`[Language Hint]: ${input.sourceLanguageHint}`);
  }

  const ctx = input.projectContext;
  if (ctx && (ctx.techStack?.trim() || ctx.targetFiles?.trim() || ctx.constraints?.trim())) {
    const lines: string[] = [];
    if (ctx.techStack?.trim()) lines.push(`- Tech Stack: ${ctx.techStack.trim()}`);
    if (ctx.targetFiles?.trim()) lines.push(`- Target Files: ${ctx.targetFiles.trim()}`);
    if (ctx.constraints?.trim()) lines.push(`- Constraints: ${ctx.constraints.trim()}`);
    currentParts.push(`[Active Project Context]\n${lines.join('\n')}`);
  }

  if (turns.length > 0) {
    currentParts.push(
      `[Context Continuity Directive]\nThis is Turn ${currentTurnNumber} of an ongoing contextual thread. Reconcile the new prompt with Turns 1-${turns.length}, carry forward all unchanged requirements, update anything overridden, and produce a complete unified compiledPrompt.`
    );
  }

  historyContents.push({
    role: 'user',
    parts: [{ text: currentParts.join('\n\n') }],
  });

  return historyContents;
}

export async function runContextualReasoningStream(
  ai: GoogleGenAI,
  input: EngineCompileInput,
  onProgress: (stage: string, chars: number) => void,
  isClosed: () => boolean
) {
  const turnNumber = (input.priorTurns?.length || 0) + 1;
  const thinkingLevel =
    input.reasoningDepth === 'deep' ? ThinkingLevel.XHIGH : ThinkingLevel.HIGH;

  onProgress(
    turnNumber > 1
      ? `Reconciling Turn ${turnNumber} with prior context...`
      : input.reasoningDepth === 'deep'
        ? 'Running deep cross-language reasoning...'
        : 'Analyzing intent and phrase relationships...',
    0
  );

  const stream = await ai.models.generateContentStream({
    model: 'gemini-4-hydrogen',
    contents: buildConversationContents(input),
    config: {
      systemInstruction: buildSystemInstruction(
        input.targetAgent,
        input.outputFormat,
        turnNumber
      ),
      responseMimeType: 'application/json',
      responseSchema: CONTEXT_REASONING_SCHEMA,
      thinkingConfig: {
        thinkingLevel,
      },
    },
  });

  let fullJsonText = '';
  let chunkCount = 0;

  for await (const chunk of stream) {
    if (isClosed()) return null;
    const delta = chunk.text || '';
    if (delta) {
      fullJsonText += delta;
      chunkCount++;
      if (chunkCount % 3 === 0 || fullJsonText.length < 220) {
        let stage = 'Identifying core intent & multilingual context...';
        if (fullJsonText.includes('"compiledPrompt"')) {
          stage = 'Compiling target coding agent specification...';
        } else if (fullJsonText.includes('"contextDelta"')) {
          stage = 'Evaluating multi-turn context continuity...';
        } else if (fullJsonText.includes('"keywordRelations"')) {
          stage = 'Mapping keyword & phrase relationships...';
        }
        onProgress(stage, fullJsonText.length);
      }
    }
  }

  return JSON.parse(fullJsonText.trim());
}
