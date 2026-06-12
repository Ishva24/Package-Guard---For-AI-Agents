import { readFileSync, watch, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
const __dirname = dirname(fileURLToPath(import.meta.url));
const POLICY_PATH = process.env.POLICY_PATH ?? join(__dirname, '../../policy.json');
const DEFAULT_POLICY = {
    version: '1.0',
    blockNonExistent: true,
    blockNewPackages: true,
    minAgeDays: 7,
    minWeeklyDownloads: 50,
    typosquatThreshold: 80,
    warnSimilarityThreshold: 60,
    trustedPackages: [],
    blockedPackages: [],
    ecosystems: ['npm', 'pypi'],
};
let current = DEFAULT_POLICY;
let watchStarted = false;
function load() {
    if (!existsSync(POLICY_PATH)) {
        console.warn(`[POLICY] policy.json not found at ${POLICY_PATH} — using defaults`);
        return DEFAULT_POLICY;
    }
    const raw = readFileSync(POLICY_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    console.log(`[POLICY] Loaded v${parsed.version}`);
    return parsed;
}
function startWatcher() {
    if (watchStarted || !existsSync(POLICY_PATH))
        return;
    watchStarted = true;
    watch(POLICY_PATH, () => {
        try {
            current = load();
            console.log('[POLICY] ♻️  Hot-reloaded');
        }
        catch (e) {
            console.error('[POLICY] Reload failed:', e);
        }
    });
}
export function getPolicy() {
    if (current === DEFAULT_POLICY) {
        current = load();
        startWatcher();
    }
    return current;
}
//# sourceMappingURL=engine.js.map