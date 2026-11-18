import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CERTS_URL =
  'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com';

interface CertCache {
  certs: Record<string, string>;
  expiresAt: number;
}

let certCache: CertCache | null = null;

function getFirebaseProjectId(): string {
  const configPath = path.resolve(__dirname, '../../firebase-applet-config.json');
  const raw = fs.readFileSync(configPath, 'utf-8');
  const parsed = JSON.parse(raw) as { projectId?: string };
  if (!parsed.projectId) {
    throw new Error('Firebase projectId is missing in firebase-applet-config.json');
  }
  return parsed.projectId;
}

async function getGooglePublicCerts(): Promise<Record<string, string>> {
  const now = Date.now();
  if (certCache && now < certCache.expiresAt) {
    return certCache.certs;
  }

  const res = await fetch(CERTS_URL);
  if (!res.ok) {
    throw new Error(`Failed to fetch Firebase public certificates (${res.status})`);
  }

  const cacheControl = res.headers.get('cache-control') || '';
  const maxAgeMatch = cacheControl.match(/max-age=(\d+)/);
  const maxAgeMs = maxAgeMatch ? Number(maxAgeMatch[1]) * 1000 : 3600_000;

  const certs = (await res.json()) as Record<string, string>;
  certCache = {
    certs,
    expiresAt: now + maxAgeMs,
  };
  return certs;
}

function base64UrlDecode(input: string): Buffer {
  const normalized = input.replace(/-/g, '+').replace(/_/g, '/');
  const pad = normalized.length % 4;
  const padded = pad ? normalized + '='.repeat(4 - pad) : normalized;
  return Buffer.from(padded, 'base64');
}

export interface VerifiedFirebaseToken {
  uid: string;
  email?: string;
  emailVerified: boolean;
}

export async function verifyFirebaseBearerToken(
  authHeader: string | undefined
): Promise<VerifiedFirebaseToken> {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    const err = new Error('Authentication required. Please sign in to continue.');
    (err as Error & { statusCode?: number }).statusCode = 401;
    throw err;
  }

  const token = authHeader.slice(7).trim();
  const segments = token.split('.');
  if (segments.length !== 3) {
    const err = new Error('Invalid authentication token format.');
    (err as Error & { statusCode?: number }).statusCode = 401;
    throw err;
  }

  const [headerB64, payloadB64, signatureB64] = segments;
  let header: { alg?: string; kid?: string };
  let payload: {
    aud?: string;
    iss?: string;
    sub?: string;
    exp?: number;
    iat?: number;
    email?: string;
    email_verified?: boolean;
  };

  try {
    header = JSON.parse(base64UrlDecode(headerB64).toString('utf-8'));
    payload = JSON.parse(base64UrlDecode(payloadB64).toString('utf-8'));
  } catch {
    const err = new Error('Malformed authentication token.');
    (err as Error & { statusCode?: number }).statusCode = 401;
    throw err;
  }

  if (header.alg !== 'RS256' || !header.kid) {
    const err = new Error('Unsupported token algorithm.');
    (err as Error & { statusCode?: number }).statusCode = 401;
    throw err;
  }

  const certs = await getGooglePublicCerts();
  const certPem = certs[header.kid];
  if (!certPem) {
    const err = new Error('Unknown signing key ID.');
    (err as Error & { statusCode?: number }).statusCode = 401;
    throw err;
  }

  const verifier = crypto.createVerify('RSA-SHA256');
  verifier.update(`${headerB64}.${payloadB64}`);
  verifier.end();

  const signatureValid = verifier.verify(certPem, base64UrlDecode(signatureB64));
  if (!signatureValid) {
    const err = new Error('Invalid token signature.');
    (err as Error & { statusCode?: number }).statusCode = 401;
    throw err;
  }

  const projectId = getFirebaseProjectId();
  const nowSec = Math.floor(Date.now() / 1000);

  if (payload.aud !== projectId) {
    const err = new Error('Token audience mismatch.');
    (err as Error & { statusCode?: number }).statusCode = 401;
    throw err;
  }
  if (payload.iss !== `https://securetoken.google.com/${projectId}`) {
    const err = new Error('Token issuer mismatch.');
    (err as Error & { statusCode?: number }).statusCode = 401;
    throw err;
  }
  if (!payload.sub || typeof payload.sub !== 'string') {
    const err = new Error('Token subject missing.');
    (err as Error & { statusCode?: number }).statusCode = 401;
    throw err;
  }
  if (typeof payload.exp !== 'number' || payload.exp <= nowSec) {
    const err = new Error('Session expired. Please sign in again.');
    (err as Error & { statusCode?: number }).statusCode = 401;
    throw err;
  }
  if (typeof payload.iat !== 'number' || payload.iat > nowSec + 300) {
    const err = new Error('Token issued-at timestamp invalid.');
    (err as Error & { statusCode?: number }).statusCode = 401;
    throw err;
  }
  if (payload.email_verified !== true) {
    const err = new Error('Verified email address required.');
    (err as Error & { statusCode?: number }).statusCode = 403;
    throw err;
  }

  return {
    uid: payload.sub,
    email: payload.email,
    emailVerified: true,
  };
}
