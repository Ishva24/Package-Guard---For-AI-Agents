import Fastify from 'fastify';
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';
import { inspectPackage } from './inspector.js';
import { registerSseClient } from './audit/logger.js';
import type { Ecosystem } from './types.js';

const __dirname  = dirname(fileURLToPath(import.meta.url));
const PORT       = parseInt(process.env.PORT ?? '7171', 10);
const DASH_PATH  = join(__dirname, '../../../dashboard/index.html');

const app = Fastify({ logger: false });

app.addHook('onRequest', async (_req, reply) => {
  reply.header('Access-Control-Allow-Origin', '*');
  reply.header('Access-Control-Allow-Headers', 'Content-Type');
});
app.options('*', async (_req, reply) => reply.status(200).send());

// ── Dashboard ─────────────────────────────────────────────────────────────────
app.get('/', async (_req, reply) => {
  if (existsSync(DASH_PATH)) {
    return reply.type('text/html').send(readFileSync(DASH_PATH, 'utf8'));
  }
  return reply.type('text/plain').send('Dashboard not found.');
});

// ── Health ────────────────────────────────────────────────────────────────────
app.get('/health', async (_req, reply) => {
  reply.send({ status: 'ok', service: 'packageguard', version: '1.0.0' });
});

// ── SSE Live Feed ─────────────────────────────────────────────────────────────
app.get('/events', async (request, reply) => {
  const id = randomUUID();
  reply.raw.writeHead(200, {
    'Content-Type':  'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection':    'keep-alive',
    'Access-Control-Allow-Origin': '*',
  });
  reply.raw.write(`data: ${JSON.stringify({ type: 'connected', clientId: id })}\n\n`);

  const unregister = registerSseClient(id, d => reply.raw.write(d));
  const hb = setInterval(() => reply.raw.write(': heartbeat\n\n'), 20_000);
  request.raw.on('close', () => { clearInterval(hb); unregister(); });
  await new Promise<void>(resolve => request.raw.on('close', resolve));
});

// ── Single Package Check ──────────────────────────────────────────────────────
app.post<{
  Body: { ecosystem: Ecosystem; package: string; version?: string; requestedBy?: string }
}>('/check', async (request, reply) => {
  const { ecosystem, package: pkg, version, requestedBy } = request.body ?? {};
  if (!ecosystem || !pkg) {
    return reply.status(400).send({ error: '"ecosystem" and "package" are required' });
  }
  const result = await inspectPackage({ ecosystem, packageName: pkg, version, requestedBy });
  reply.status(result.decision === 'BLOCK' ? 403 : result.decision === 'WARN' ? 200 : 200).send(result);
});

// ── Batch Check ───────────────────────────────────────────────────────────────
app.post<{
  Body: { ecosystem: Ecosystem; packages: string[]; requestedBy?: string }
}>('/check/batch', async (request, reply) => {
  const { ecosystem, packages, requestedBy } = request.body ?? {};
  if (!ecosystem || !Array.isArray(packages) || packages.length === 0) {
    return reply.status(400).send({ error: '"ecosystem" and "packages[]" are required' });
  }
  const results = await Promise.all(
    packages.map(pkg => inspectPackage({ ecosystem, packageName: pkg, requestedBy }))
  );
  const blocked = results.filter(r => r.decision === 'BLOCK');
  const warned  = results.filter(r => r.decision === 'WARN');
  reply.send({ results, summary: { total: results.length, blocked: blocked.length, warned: warned.length, allowed: results.length - blocked.length - warned.length } });
});

// ── Start ─────────────────────────────────────────────────────────────────────
await app.listen({ port: PORT, host: '0.0.0.0' });

console.log('\n');
console.log('  ╔══════════════════════════════════════════════╗');
console.log('  ║     📦 PackageGuard API — Active             ║');
console.log('  ╠══════════════════════════════════════════════╣');
console.log(`  ║  Dashboard : http://localhost:${PORT}            ║`);
console.log(`  ║  API       : http://localhost:${PORT}/check      ║`);
console.log(`  ║  Live Feed : http://localhost:${PORT}/events     ║`);
console.log('  ╚══════════════════════════════════════════════╝');
console.log('\n  Endpoints:');
console.log('    GET  /           → Real-time dashboard');
console.log('    GET  /events     → SSE live event stream');
console.log('    POST /check      → Inspect a single package');
console.log('    POST /check/batch → Inspect multiple packages\n');
