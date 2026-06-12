// ─── Shared Types for PackageGuard ───────────────────────────────────────────

export type Ecosystem = 'npm' | 'pypi';

export type RiskLevel = 'SAFE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type Decision  = 'ALLOW' | 'WARN' | 'BLOCK';

// ── Registry ──────────────────────────────────────────────────────────────────
export interface RegistryResult {
  exists:        boolean;
  name?:         string;
  version?:      string;
  publishedAt?:  string;       // ISO date of first publish
  ageInDays?:    number;
  weeklyDownloads?: number;
  maintainers?:  string[];
  maintainerAccountAgeDays?: number;
  description?:  string;
  error?:        string;
}

// ── Similarity ────────────────────────────────────────────────────────────────
export interface SimilarityResult {
  isTyposquat:     boolean;
  closestMatch?:   string;      // Real package it resembles
  distance?:       number;      // Edit distance (0 = identical)
  similarityPct?:  number;      // 0–100
}

// ── Reputation ────────────────────────────────────────────────────────────────
export interface ReputationResult {
  score:      number;           // 0–100 (100 = most trusted)
  signals:    ReputationSignal[];
}

export interface ReputationSignal {
  name:    string;
  value:   string | number | boolean;
  impact:  'positive' | 'negative' | 'neutral';
  weight:  number;              // Contribution to final score
}

// ── Inspection Pipeline ───────────────────────────────────────────────────────
export interface InspectionRequest {
  ecosystem:   Ecosystem;
  packageName: string;
  version?:    string;          // Optional version constraint
  requestedBy?: string;         // Agent ID or user
}

export interface InspectionResult {
  packageName:  string;
  ecosystem:    Ecosystem;
  decision:     Decision;
  riskLevel:    RiskLevel;
  riskScore:    number;         // 0–100 (100 = most dangerous)
  reasons:      string[];       // Human-readable explanation list
  registry:     RegistryResult;
  similarity:   SimilarityResult;
  reputation:   ReputationResult;
  latencyMs:    number;
  timestamp:    string;
  requestId:    string;
}

// ── Policy ────────────────────────────────────────────────────────────────────
export interface PolicyConfig {
  version:                  string;
  blockNonExistent:         boolean; // Block packages not on registry
  blockNewPackages:         boolean; // Block packages < minAgeDays old
  minAgeDays:               number;
  minWeeklyDownloads:       number;
  typosquatThreshold:       number;  // Max similarity% before blocking (e.g. 80)
  warnSimilarityThreshold:  number;  // Warn above this (e.g. 60)
  trustedPackages:          string[]; // Allowlist — never blocked
  blockedPackages:          string[]; // Denylist — always blocked
  ecosystems:               Ecosystem[];
}

// ── Audit ─────────────────────────────────────────────────────────────────────
export interface AuditEvent {
  requestId:    string;
  timestamp:    string;
  ecosystem:    Ecosystem;
  packageName:  string;
  decision:     Decision;
  riskLevel:    RiskLevel;
  riskScore:    number;
  reasons:      string[];
  requestedBy?: string;
  latencyMs:    number;
}
