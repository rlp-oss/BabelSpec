export type TargetAgentId =
  | 'universal'
  | 'claude-code'
  | 'cursor-composer'
  | 'codex-copilot';

export type OutputFormatId =
  | 'structured-markdown'
  | 'xml-agent'
  | 'implementation-plan'
  | 'issue-ticket'
  | 'compact-inline';

export type ReasoningDepth = 'balanced' | 'deep';

export type IntentCategory =
  | 'Feature Build'
  | 'Bug Fix'
  | 'Architecture Refactor'
  | 'Performance'
  | 'Security & Auth'
  | 'API & Data'
  | 'Testing & QA';

export type KeywordCategory =
  | 'Symptom'
  | 'Component'
  | 'Mechanism'
  | 'Constraint'
  | 'Outcome';

export type RelationType =
  | 'CAUSES'
  | 'MITIGATES'
  | 'REQUIRES'
  | 'CONSTRAINS'
  | 'MODIFIES'
  | 'DEPENDS_ON';

export interface ProjectContext {
  techStack: string;
  targetFiles: string;
  constraints: string;
}

export interface DetectedLanguage {
  language: string;
  code: string;
  role: string;
}

export interface KeywordNode {
  id: string;
  phrase: string;
  normalizedConcept: string;
  language: string;
  category: KeywordCategory;
  fromTurn: number;
}

export interface KeywordRelation {
  fromId: string;
  toId: string;
  relation: RelationType;
  rationale: string;
}

export interface ContextBridge {
  sourcePhrase: string;
  sourceLanguage: string;
  interpretedMeaning: string;
  architecturalDecision: string;
}

export interface ReasoningStep {
  phase: string;
  analysis: string;
  outcome: string;
}

export interface AmbiguityItem {
  topic: string;
  questionInSourceLang: string;
  questionInEnglish: string;
  defaultAssumption: string;
}

export interface ChecklistItem {
  id: string;
  category: string;
  requirement: string;
  verificationHint: string;
}

export interface BackTranslation {
  languageName: string;
  summary: string;
  keyPoints: string[];
}

export interface ContextDelta {
  turnNumber: number;
  carriedOver: string[];
  newlyAdded: string[];
  updatedDecisions: string[];
}

export interface CompilationResult {
  detectedLanguages: DetectedLanguage[];
  primaryLanguageCode: string;
  primaryLanguageName: string;
  intentCategory: IntentCategory;
  inferredIntent: string;
  secondaryIntents: string[];
  keywordNodes: KeywordNode[];
  keywordRelations: KeywordRelation[];
  contextDelta: ContextDelta;
  contextBridges: ContextBridge[];
  reasoningSteps: ReasoningStep[];
  ambiguities: AmbiguityItem[];
  compiledPrompt: string;
  backTranslation: BackTranslation;
  checklist: ChecklistItem[];
}

export interface SessionTurn {
  id: string;
  turnNumber: number;
  createdAt: string;
  durationMs: number;
  rawPrompt: string;
  projectContext: ProjectContext;
  targetAgent: TargetAgentId;
  outputFormat: OutputFormatId;
  reasoningDepth: ReasoningDepth;
  result: CompilationResult;
}

export interface ContextSession {
  id: string;
  title: string;
  updatedAt: string;
  turnCount?: number;
  latestLanguageCode?: string;
  latestIntentCategory?: string;
  turns: SessionTurn[];
}

export interface MultilingualPreset {
  id: string;
  title: string;
  languageLabel: string;
  languagePair: string;
  domain: string;
  targetAgent: TargetAgentId;
  outputFormat: OutputFormatId;
  rawPrompt: string;
  projectContext: ProjectContext;
  followUpSuggestion?: string;
}
