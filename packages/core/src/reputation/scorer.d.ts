import type { RegistryResult, ReputationResult } from '../types.js';
/**
 * Scores a package's reputation 0–100 (100 = fully trusted).
 * Combines age, download count, maintainer count and other signals.
 */
export declare function scoreReputation(registry: RegistryResult): ReputationResult;
//# sourceMappingURL=scorer.d.ts.map