import { createWriteStream } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';
import type { AuditEvent } from '../types.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const LOG_PATH = join(__dirname, '../../packageguard-audit.log');
const logStream = createWriteStream(LOG_PATH, { flags: 'a' });

// ── SSE Broadcast Bus ──────────────────────────────────────────────────────────
type SseWriter = (data: string) => void;
const sseClients = new Map<string, SseWriter>();

export function registerSseClient(id: string, write: SseWriter): () => void {
  sseClients.set(id, write);
  return () => sseClients.delete(id);
}

function broadcastSse(event: AuditEvent) {
  const payload = `data: ${JSON.stringify(event)}\n\n`;
  for (const [id, write] of sseClients) {
    try { write(payload); } catch { sseClients.delete(id); }
  }
}

// ── Colors ────────────────────────────────────────────────────────────────────
const C = { R: '\x1b[0m', GR: '\x1b[32m', YL: '\x1b[33m', RD: '\x1b[31m', MG: '\x1b[35m\x1b[1m', DM: '\x1b[2m' };
const DECISION_COLOR: Record<string, string> = {
  ALLOW: C.GR, WARN: C.YL, BLOCK: C.RD,
};
const ICON: Record<string, string> = { ALLOW: '✅', WARN: '⚠️ ', BLOCK: '🚫' };

// ── Public Logger ──────────────────────────────────────────────────────────────
export function logAudit(event: Omit<AuditEvent, 'requestId' | 'timestamp'>): AuditEvent {
  const full: AuditEvent = {
    ...event,
    requestId: randomUUID().slice(0, 8),
    timestamp: new Date().toISOString(),
  };

  logStream.write(JSON.stringify(full) + '\n');
  broadcastSse(full);

  const col = DECISION_COLOR[full.decision] ?? C.R;
  const icon = ICON[full.decision] ?? '?';
  console.log(
    `${col}${icon} [PACKAGEGUARD] ${full.decision}${C.R} ` +
    `${C.DM}${full.timestamp}${C.R} ` +
    `${full.ecosystem}:${full.packageName} ` +
    `risk=${full.riskScore}/100 ` +
    `${full.reasons[0] ? `→ ${full.reasons[0]}` : ''} ` +
    `${C.DM}${full.latencyMs.toFixed(1)}ms${C.R}`
  );

  return full;
}
