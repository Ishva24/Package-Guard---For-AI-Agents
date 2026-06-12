import { randomUUID } from 'crypto';
import { checkRegistry } from './registry/checker.js';
import { checkSimilarity } from './similarity/detector.js';
import { scoreReputation } from './reputation/scorer.js';
import { getPolicy } from './policy/engine.js';
import { logAudit } from './audit/logger.js';
// ─── Risk Score → Level Mapping ───────────────────────────────────────────────
function toRiskLevel(score) {
    if (score >= 90)
        return 'CRITICAL';
    if (score >= 70)
        return 'HIGH';
    if (score >= 50)
        return 'MEDIUM';
    if (score >= 25)
        return 'LOW';
    return 'SAFE';
}
// ─── Core Inspection Pipeline ─────────────────────────────────────────────────
export async function inspectPackage(req) {
    const start = performance.now();
    const reqId = randomUUID().slice(0, 8);
    const policy = getPolicy();
    const { ecosystem, packageName, version, requestedBy } = req;
    const reasons = [];
    let riskScore = 0;
    // ── Gate: Ecosystem enabled? ──────────────────────────────────────────────
    if (!policy.ecosystems.includes(ecosystem)) {
        const latencyMs = performance.now() - start;
        return {
            packageName, ecosystem, decision: 'ALLOW', riskLevel: 'SAFE',
            riskScore: 0, reasons: [`Ecosystem "${ecosystem}" not monitored by policy`],
            registry: { exists: true }, similarity: { isTyposquat: false },
            reputation: { score: 100, signals: [] }, latencyMs, timestamp: new Date().toISOString(), requestId: reqId,
        };
    }
    // ── Gate: Trusted allowlist ───────────────────────────────────────────────
    if (policy.trustedPackages.includes(packageName)) {
        const latencyMs = performance.now() - start;
        return {
            packageName, ecosystem, decision: 'ALLOW', riskLevel: 'SAFE',
            riskScore: 0, reasons: ['Package is in the trusted allowlist'],
            registry: { exists: true }, similarity: { isTyposquat: false },
            reputation: { score: 100, signals: [] }, latencyMs, timestamp: new Date().toISOString(), requestId: reqId,
        };
    }
    // ── Gate: Hard denylist ───────────────────────────────────────────────────
    if (policy.blockedPackages.includes(packageName)) {
        riskScore = 100;
        reasons.push(`Package "${packageName}" is in the blocked denylist`);
        const latencyMs = performance.now() - start;
        const result = {
            packageName, ecosystem, decision: 'BLOCK', riskLevel: 'CRITICAL',
            riskScore, reasons, registry: { exists: false }, similarity: { isTyposquat: false },
            reputation: { score: 0, signals: [] }, latencyMs, timestamp: new Date().toISOString(), requestId: reqId,
        };
        logAudit({ ...result, requestedBy });
        return result;
    }
    // ── Layer 1: Registry Existence ───────────────────────────────────────────
    const registry = await checkRegistry(ecosystem, packageName);
    if (!registry.exists) {
        riskScore = 95;
        reasons.push(registry.error
            ? `Registry lookup failed (${registry.error}) — treating as non-existent`
            : `Package "${packageName}" does not exist on ${ecosystem === 'npm' ? 'npm' : 'PyPI'} — likely hallucinated by AI agent`);
        const latencyMs = performance.now() - start;
        const result = {
            packageName, ecosystem, decision: 'BLOCK', riskLevel: 'CRITICAL',
            riskScore, reasons, registry, similarity: { isTyposquat: false },
            reputation: { score: 0, signals: [] }, latencyMs, timestamp: new Date().toISOString(), requestId: reqId,
        };
        logAudit({ ...result, requestedBy });
        return result;
    }
    // ── Layer 2: Typosquatting / Similarity ───────────────────────────────────
    const similarity = checkSimilarity(packageName, ecosystem);
    if (similarity.isTyposquat && (similarity.similarityPct ?? 0) >= policy.typosquatThreshold) {
        riskScore = Math.max(riskScore, 85);
        reasons.push(`Possible typosquat of "${similarity.closestMatch}" ` +
            `(${similarity.similarityPct}% similar, edit distance ${similarity.distance})`);
    }
    else if (similarity.isTyposquat) {
        riskScore = Math.max(riskScore, 55);
        reasons.push(`Similar to popular package "${similarity.closestMatch}" ` +
            `(${similarity.similarityPct}% similar)`);
    }
    // ── Layer 3: Age Check ────────────────────────────────────────────────────
    const age = registry.ageInDays ?? 0;
    if (policy.blockNewPackages && age < policy.minAgeDays) {
        riskScore = Math.max(riskScore, 80);
        reasons.push(`Package is only ${age} day(s) old (minimum: ${policy.minAgeDays} days)`);
    }
    // ── Layer 4: Download Count ───────────────────────────────────────────────
    const dl = registry.weeklyDownloads ?? 0;
    if (ecosystem === 'npm' && dl < policy.minWeeklyDownloads && dl > 0) {
        riskScore = Math.max(riskScore, 60);
        reasons.push(`Very low weekly downloads: ${dl} (minimum: ${policy.minWeeklyDownloads})`);
    }
    if (ecosystem === 'npm' && dl === 0) {
        riskScore = Math.max(riskScore, 75);
        reasons.push('Zero weekly downloads — package may be abandoned or newly created as bait');
    }
    // ── Layer 5: Reputation Score ─────────────────────────────────────────────
    const reputation = scoreReputation(registry);
    // Low reputation raises risk score
    if (reputation.score < 30) {
        riskScore = Math.max(riskScore, 70);
        reasons.push(`Low reputation score: ${reputation.score}/100`);
    }
    else if (reputation.score < 50) {
        riskScore = Math.max(riskScore, 50);
        reasons.push(`Below-average reputation score: ${reputation.score}/100`);
    }
    if (reasons.length === 0) {
        reasons.push(`Package passed all checks — age: ${age}d, downloads: ${dl}/wk, reputation: ${reputation.score}/100`);
    }
    // ── Decision ──────────────────────────────────────────────────────────────
    let decision;
    if (riskScore >= 70 || (policy.blockNonExistent && !registry.exists)) {
        decision = 'BLOCK';
    }
    else if (riskScore >= 40) {
        decision = 'WARN';
    }
    else {
        decision = 'ALLOW';
    }
    const latencyMs = performance.now() - start;
    const riskLevel = toRiskLevel(riskScore);
    const result = {
        packageName, ecosystem, decision, riskLevel, riskScore, reasons,
        registry, similarity, reputation, latencyMs,
        timestamp: new Date().toISOString(), requestId: reqId,
    };
    logAudit({ ...result, requestedBy });
    return result;
}
//# sourceMappingURL=inspector.js.map