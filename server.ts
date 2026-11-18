import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { verifyFirebaseBearerToken } from './src/server/firebaseAuth.ts';
import {
  runContextualReasoningStream,
  type EngineCompileInput,
  type PriorTurnSummary,
} from './src/server/reasoningEngine.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json({ limit: '2mb' }));

const PORT = Number(process.env.PORT) || 3000;

function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    const err = new Error(
      'GEMINI_API_KEY is not configured. Please verify it in Settings > Secrets.'
    );
    (err as Error & { statusCode?: number }).statusCode = 400;
    throw err;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function extractHttpStatus(err: unknown): number {
  if (typeof err === 'object' && err !== null) {
    const record = err as Record<string, unknown>;
    if (typeof record.statusCode === 'number') return record.statusCode;
    if (typeof record.status === 'number') return record.status;
  }
  const msg = err instanceof Error ? err.message : String(err);
  if (msg.includes('API_KEY_INVALID') || msg.includes('400')) return 400;
  if (msg.includes('PERMISSION_DENIED') || msg.includes('403')) return 403;
  if (msg.includes('NOT_FOUND') || msg.includes('404')) return 404;
  if (msg.includes('RESOURCE_EXHAUSTED') || msg.includes('429')) return 429;
  return 500;
}

function formatFriendlyError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  if (msg.includes('PERMISSION_DENIED') || msg.includes('API_KEY_INVALID')) {
    return 'The Gemini API key appears invalid or lacks permission. Please verify it in the Settings > Secrets panel.';
  }
  if (msg.includes('RESOURCE_EXHAUSTED')) {
    return 'API quota exceeded (429). Wait a moment and retry, or check your billing quota in Settings > Secrets.';
  }
  if (msg.includes('NOT_FOUND')) {
    return 'Requested Gemini model was not found. Please verify model configuration.';
  }
  return msg || 'Translation request failed.';
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

interface TranslateHttpBody {
  rawPrompt?: string;
  projectContext?: {
    techStack?: string;
    targetFiles?: string;
    constraints?: string;
  };
  targetAgent?: string;
  outputFormat?: string;
  reasoningDepth?: 'balanced' | 'deep';
  sourceLanguageHint?: string;
  priorTurns?: PriorTurnSummary[];
}

app.post('/api/translate', async (req, res) => {
  try {
    await verifyFirebaseBearerToken(req.headers.authorization);
  } catch (authErr) {
    const status = extractHttpStatus(authErr);
    res.status(status).json({
      error: authErr instanceof Error ? authErr.message : 'Unauthorized',
    });
    return;
  }

  const body = (req.body || {}) as TranslateHttpBody;
  if (!body.rawPrompt || !body.rawPrompt.trim()) {
    res.status(400).json({ error: 'Please enter a prompt or idea to translate.' });
    return;
  }

  let ai: GoogleGenAI;
  try {
    ai = getGeminiClient();
  } catch (err) {
    res.status(extractHttpStatus(err)).json({ error: formatFriendlyError(err) });
    return;
  }

  const engineInput: EngineCompileInput = {
    rawPrompt: body.rawPrompt,
    projectContext: body.projectContext,
    targetAgent: body.targetAgent || 'universal',
    outputFormat: body.outputFormat || 'structured-markdown',
    reasoningDepth: body.reasoningDepth === 'deep' ? 'deep' : 'balanced',
    sourceLanguageHint: body.sourceLanguageHint,
    priorTurns: Array.isArray(body.priorTurns) ? body.priorTurns.slice(-6) : [],
  };

  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  const sendEvent = (event: string, data: unknown) => {
    if (res.writableEnded) return;
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  let closed = false;
  req.on('close', () => {
    closed = true;
  });

  const startedAt = Date.now();
  const maxAttempts = 2;

  try {
    let result: unknown = null;
    let lastError: unknown = null;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        result = await runContextualReasoningStream(
          ai,
          engineInput,
          (stage, chars) => sendEvent('status', { stage, chars }),
          () => closed
        );
        lastError = null;
        break;
      } catch (err) {
        lastError = err;
        const status = extractHttpStatus(err);
        if (attempt < maxAttempts && (status >= 500 || status === 429)) {
          await sleep(800 * attempt);
          continue;
        }
        throw err;
      }
    }

    if (lastError) {
      throw lastError;
    }

    if (!result || closed) {
      res.end();
      return;
    }

    const durationMs = Date.now() - startedAt;
    sendEvent('complete', {
      result,
      durationMs,
      model: 'gemini-4-hydrogen',
    });
    res.end();
  } catch (err) {
    const status = extractHttpStatus(err);
    sendEvent('error', {
      status,
      message: formatFriendlyError(err),
    });
    res.end();
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      const indexFile = path.join(distDir, 'index.html');
      if (fs.existsSync(indexFile)) {
        res.sendFile(indexFile);
      } else {
        res.status(404).send('Build output not found. Run npm run build first.');
      }
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`BabelSpec server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
