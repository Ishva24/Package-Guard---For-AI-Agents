import type { SimilarityResult } from '../types.js';

export const POPULAR_CARGO: string[] = [
  'tokio', 'serde', 'serde_json', 'rand', 'syn', 'quote', 'clap', 'anyhow',
  'regex', 'thiserror', 'log', 'reqwest', 'itertools', 'chrono', 'futures',
  'bytes', 'tracing', 'async-trait', 'hyper', 'time', 'pin-project', 'lazy_static',
  'crossbeam', 'uuid', 'env_logger', 'tempfile', 'indexmap', 'bitflags', 'walkdir',
];

export const POPULAR_GO: string[] = [
  'github.com/gin-gonic/gin', 'github.com/stretchr/testify', 'golang.org/x/sync',
  'google.golang.org/grpc', 'github.com/spf13/cobra', 'github.com/sirupsen/logrus',
  'github.com/google/uuid', 'go.uber.org/zap', 'github.com/gorilla/mux',
  'golang.org/x/crypto', 'github.com/jinzhu/gorm', 'github.com/joho/godotenv',
];

export interface DynamicIndexOptions {
  ttlMs?: number;
  customList?: string[];
}

export class DynamicTargetIndex {
  private cache: Map<string, { timestamp: number; packages: string[] }> = new Map();
  private ttlMs: number;

  constructor(options: DynamicIndexOptions = {}) {
    this.ttlMs = options.ttlMs ?? 3600000;
  }

  public getKnownPackages(ecosystem: string): string[] {
    const cached = this.cache.get(ecosystem);
    const now = Date.now();
    if (cached && now - cached.timestamp < this.ttlMs) {
      return cached.packages;
    }

    let defaults: string[] = [];
    if (ecosystem === 'cargo') {
      defaults = [...POPULAR_CARGO];
    } else if (ecosystem === 'go') {
      defaults = [...POPULAR_GO];
    }

    this.cache.set(ecosystem, { timestamp: now, packages: defaults });
    return defaults;
  }

  public registerPackages(ecosystem: string, packages: string[]): void {
    const existing = this.getKnownPackages(ecosystem);
    const set = new Set([...existing, ...packages]);
    this.cache.set(ecosystem, { timestamp: Date.now(), packages: Array.from(set) });
  }

  public findSimilar(target: string, ecosystem: string, maxDistance: number = 2): SimilarityResult {
    const known = this.getKnownPackages(ecosystem);
    let minDistance = Infinity;
    let closestTarget: string | undefined;

    for (const pkg of known) {
      if (pkg.toLowerCase() === target.toLowerCase()) {
        return { isTyposquat: false, minDistance: 0 };
      }
      const dist = this.levenshtein(target.toLowerCase(), pkg.toLowerCase());
      if (dist < minDistance) {
        minDistance = dist;
        closestTarget = pkg;
      }
    }

    const isTyposquat = minDistance <= maxDistance && minDistance > 0;
    return {
      isTyposquat,
      targetPackage: isTyposquat ? closestTarget : undefined,
      distance: minDistance < Infinity ? minDistance : undefined,
    };
  }

  private levenshtein(a: string, b: string): number {
    const m = a.length;
    const n = b.length;
    const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;

    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (a[i - 1] === b[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1];
        } else {
          dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
        }
      }
    }
    return dp[m][n];
  }
}

export const globalDynamicIndex = new DynamicTargetIndex();
