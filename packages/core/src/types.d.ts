export type Ecosystem = 'npm' | 'pypi';
export type RiskLevel = 'SAFE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type Decision = 'ALLOW' | 'WARN' | 'BLOCK';
export interface RegistryResult {
    exists: boolean;
    name?: string;
    version?: string;
    publishedAt?: string;
    ageInDays?: number;
    weeklyDownloads?: number;
    maintainers?: string[];
    maintainerAccountAgeDays?: number;
    description?: string;
    error?: string;
}
export interface SimilarityResult {
    isTyposquat: boolean;
    closestMatch?: string;
    distance?: number;
    similarityPct?: number;
}
export interface ReputationResult {
    score: number;
    signals: ReputationSignal[];
}
export interface ReputationSignal {
    name: string;
    value: string | number | boolean;
    impact: 'positive' | 'negative' | 'neutral';
    weight: number;
}
export interface InspectionRequest {
    ecosystem: Ecosystem;
    packageName: string;
    version?: string;
    requestedBy?: string;
}
export interface InspectionResult {
    packageName: string;
    ecosystem: Ecosystem;
    decision: Decision;
    riskLevel: RiskLevel;
    riskScore: number;
    reasons: string[];
    registry: RegistryResult;
    similarity: SimilarityResult;
    reputation: ReputationResult;
    latencyMs: number;
    timestamp: string;
    requestId: string;
}
export interface PolicyConfig {
    version: string;
    blockNonExistent: boolean;
    blockNewPackages: boolean;
    minAgeDays: number;
    minWeeklyDownloads: number;
    typosquatThreshold: number;
    warnSimilarityThreshold: number;
    trustedPackages: string[];
    blockedPackages: string[];
    ecosystems: Ecosystem[];
}
export interface AuditEvent {
    requestId: string;
    timestamp: string;
    ecosystem: Ecosystem;
    packageName: string;
    decision: Decision;
    riskLevel: RiskLevel;
    riskScore: number;
    reasons: string[];
    requestedBy?: string;
    latencyMs: number;
}
//# sourceMappingURL=types.d.ts.map