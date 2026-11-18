import type { MultilingualPreset, OutputFormatId, TargetAgentId } from '../types/translator';

export const TARGET_AGENTS: Array<{
  id: TargetAgentId;
  label: string;
  shortLabel: string;
  description: string;
}> = [
  {
    id: 'universal',
    label: 'Universal Coding Agent',
    shortLabel: 'Universal',
    description: 'Balanced structure compatible with any autonomous or IDE coding agent.',
  },
  {
    id: 'claude-code',
    label: 'Claude Code / CLI Agent',
    shortLabel: 'Claude Code',
    description: 'Optimized for tool-using terminal agents with file verification and test commands.',
  },
  {
    id: 'cursor-composer',
    label: 'Cursor / Windsurf Composer',
    shortLabel: 'Cursor / IDE',
    description: 'Scoped around multi-file edits, strict TypeScript contracts, and diff clarity.',
  },
  {
    id: 'codex-copilot',
    label: 'Codex / GitHub Copilot',
    shortLabel: 'Codex / Copilot',
    description: 'Explicit acceptance criteria, edge-case constraints, and deterministic test specs.',
  },
];

export const OUTPUT_FORMATS: Array<{
  id: OutputFormatId;
  label: string;
  shortLabel: string;
  summary: string;
  bestFor: string;
  structurePreview: string;
}> = [
  {
    id: 'structured-markdown',
    label: 'Structured Markdown Spec',
    shortLabel: 'Markdown Spec',
    summary: 'Clear hierarchical Markdown with Objective, Context, Requirements, Edge Cases, and Verification.',
    bestFor: 'General feature builds, multi-step refactors, and cross-agent portability.',
    structurePreview: `## Objective\n...\n## Technical Requirements\n1. ...\n## Constraints & Edge Cases\n- ...\n## Verification\n- ...`,
  },
  {
    id: 'xml-agent',
    label: 'XML Agent Prompt',
    shortLabel: 'XML Prompt',
    summary: 'Semantic XML delimiters (<role>, <context>, <task>, <constraints>, <verification>) for high instruction adherence.',
    bestFor: 'Complex autonomous agent runs where separating context from instructions prevents prompt drift.',
    structurePreview: `<role>...</role>\n<context>...</context>\n<requirements>...</requirements>\n<constraints>...</constraints>\n<verification>...</verification>`,
  },
  {
    id: 'implementation-plan',
    label: 'Architectural Implementation Plan',
    shortLabel: 'Arch Plan',
    summary: 'Phased execution blueprint with module boundaries, data flow, failure modes, and ordered task steps.',
    bestFor: 'Greenfield subsystems, database schema changes, and multi-service integrations.',
    structurePreview: `### Phase 1: Data & Contracts\n### Phase 2: Core Logic\n### Phase 3: UI & Integration\n### Test Matrix`,
  },
  {
    id: 'issue-ticket',
    label: 'Engineering Issue Ticket',
    shortLabel: 'Issue Ticket',
    summary: 'Issue-tracker format with Problem Statement, Scope, Non-Goals, and Definition of Done.',
    bestFor: 'Assigning async coding agents to GitHub Issues or Linear tickets.',
    structurePreview: `### Summary\n### Current vs Expected Behavior\n### Acceptance Criteria\n- [ ] ...`,
  },
  {
    id: 'compact-inline',
    label: 'Compact Inline Instruction',
    shortLabel: 'Compact',
    summary: 'High-density, zero-fluff single-block directive tailored for fast inline IDE agent turns.',
    bestFor: 'Targeted bug fixes, single-component changes, and quick follow-up iterations.',
    structurePreview: `Implement [X] in [files]. Preserve [invariant]. Handle [edge cases]. Verify with [command].`,
  },
];

export const MULTILINGUAL_PRESETS: MultilingualPreset[] = [
  {
    id: 'ja-en-checkout',
    title: 'Checkout Idempotency & Retry Fix',
    languageLabel: 'Japanese + English',
    languagePair: 'JA+EN → EN',
    domain: 'Payments Backend',
    targetAgent: 'claude-code',
    outputFormat: 'xml-agent',
    rawPrompt:
      '決済画面でユーザーが連打したときに二重課金（double charge）が起きないようにしたい。Stripeのwebhookが遅延しても整合性が取れるように、Idempotency-KeyとDBのtransactionを使って排他制御を入れて。あとフロント側もローディング中はボタンを完全にdisabledにして、エラー時は分かりやすい再試行UIを出してほしい。',
    projectContext: {
      techStack: 'Node.js, TypeScript, Express, PostgreSQL, React',
      targetFiles: 'src/routes/checkout.ts, src/components/PaymentButton.tsx',
      constraints: 'Must not break existing webhook signature verification; return HTTP 409 on duplicate active attempts.',
    },
    followUpSuggestion:
      '追加で、Idempotency-Keyの有効期限を24時間にして、期限切れ後は新しい決済試行として扱えるようにして。あとテストケースもVitestで書いて。',
  },
  {
    id: 'es-en-realtime-table',
    title: 'Virtualized Log Stream Table',
    languageLabel: 'Spanish + English',
    languagePair: 'ES+EN → EN',
    domain: 'Frontend Performance',
    targetAgent: 'cursor-composer',
    outputFormat: 'structured-markdown',
    rawPrompt:
      'Necesitamos optimizar la tabla de logs en tiempo real porque cuando entran más de 5,000 filas por WebSocket el navegador se congela. Hay que meter virtual scrolling, mantener el auto-scroll solo si el usuario está abajo del todo (si hace scroll hacia arriba, pausar y mostrar un botón de "Ir al final"), y permitir filtrar por severity y texto sin perder rendimiento.',
    projectContext: {
      techStack: 'React 19, TypeScript, Tailwind CSS',
      targetFiles: 'src/components/LogViewer.tsx, src/hooks/useLogStream.ts',
      constraints: 'Keep memory bounded to last 20,000 log lines in ring buffer.',
    },
    followUpSuggestion:
      'También queremos exportar los logs filtrados actuales en formato JSONL con un botón en la barra superior, sin bloquear el hilo principal.',
  },
  {
    id: 'zh-en-rag-cache',
    title: 'Multi-Tenant Document Indexing Queue',
    languageLabel: 'Mandarin + English',
    languagePair: 'ZH+EN → EN',
    domain: 'Distributed Systems',
    targetAgent: 'universal',
    outputFormat: 'implementation-plan',
    rawPrompt:
      '我们要给知识库上传加上异步处理队列，不能让用户上传大PDF的时候HTTP请求超时。需要支持按tenant_id做公平调度（fair queuing），避免某一个大客户把所有worker占满。另外如果解析失败要有exponential backoff重试，最多3次，失败后标记状态并记录具体错误原因。',
    projectContext: {
      techStack: 'Python 3.12, FastAPI, Redis, ARQ, PostgreSQL',
      targetFiles: 'app/workers/ingest.py, app/api/documents.py',
      constraints: 'Preserve tenant isolation on storage paths and status polling endpoints.',
    },
    followUpSuggestion:
      '另外，对于超过 50MB 的 PDF 应该在上传前直接返回 413 错误，并在 worker 里加入 dead-letter queue 以便人工排查。',
  },
  {
    id: 'fr-rbac-audit',
    title: 'Role Permission Audit & Guard',
    languageLabel: 'French',
    languagePair: 'FR → EN',
    domain: 'Auth & Security',
    targetAgent: 'codex-copilot',
    outputFormat: 'issue-ticket',
    rawPrompt:
      'Je veux ajouter un middleware d’autorisation strict sur nos routes d’administration. Actuellement on vérifie seulement si l’utilisateur est connecté, mais un rôle "editor" peut appeler les endpoints de facturation en devinant l’URL. Il faut centraliser une matrice de permissions par rôle, renvoyer 403 proprement sans fuiter d’informations internes, et écrire des tests unitaires pour chaque rôle.',
    projectContext: {
      techStack: 'TypeScript, Express, Vitest',
      targetFiles: 'src/middleware/auth.ts, src/routes/admin.ts',
      constraints: 'Existing JWT payload already includes role and orgId claims.',
    },
    followUpSuggestion:
      'Ajoute aussi un journal d’audit structuré (audit log) à chaque refus 403 avec userId, route et timestamp, sans logger le token JWT.',
  },
  {
    id: 'ko-en-i18n-form',
    title: 'Multi-Step Onboarding Draft Sync',
    languageLabel: 'Korean + English',
    languagePair: 'KO+EN → EN',
    domain: 'Full-Stack UX',
    targetAgent: 'cursor-composer',
    outputFormat: 'compact-inline',
    rawPrompt:
      '온보딩 폼이 4단계인데 중간에 새로고침하거나 탭을 닫으면 입력한 내용이 다 날아가는 문제가 있음. 각 step 이동할 때마다 debounce 걸어서 localStorage랑 서버 draft API에 자동 저장되게 해줘. 단, 민감한 개인정보(주민번호나 계좌번호 같은 필드)는 localStorage에 절대 평문 저장하면 안 됨.',
    projectContext: {
      techStack: 'Next.js App Router, TypeScript, Zod',
      targetFiles: 'app/onboarding/OnboardingWizard.tsx',
      constraints: 'Must show subtle saved timestamp and handle offline fallback cleanly.',
    },
    followUpSuggestion:
      '마지막으로 사용자가 온보딩을 최종 제출하면 localStorage와 서버의 임시 draft 데이터를 모두 안전하게 삭제해 줘.',
  },
];
