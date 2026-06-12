import type { Ecosystem, RegistryResult } from '../types.js';

const NPM_API   = 'https://registry.npmjs.org';
const PYPI_API  = 'https://pypi.org/pypi';

// ─── npm Registry ─────────────────────────────────────────────────────────────
async function checkNpm(name: string): Promise<RegistryResult> {
  try {
    const res  = await fetch(`${NPM_API}/${encodeURIComponent(name)}`, {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(8000),
    });

    if (res.status === 404) return { exists: false };
    if (!res.ok) return { exists: false, error: `npm registry error: ${res.status}` };

    const data = await res.json() as Record<string, unknown>;
    const times   = data['time'] as Record<string, string> | undefined;
    const distTags = data['dist-tags'] as Record<string, string> | undefined;
    const latest  = distTags?.['latest'] ?? '';
    const versions = data['versions'] as Record<string, unknown> | undefined;
    const maintainers = (data['maintainers'] as Array<{ name: string }> | undefined)
      ?.map(m => m.name) ?? [];

    const createdAt  = times?.['created'] ?? '';
    const ageInDays  = createdAt
      ? Math.floor((Date.now() - new Date(createdAt).getTime()) / 86_400_000)
      : undefined;

    // Fetch weekly downloads from the downloads API
    let weeklyDownloads: number | undefined;
    try {
      const dlRes  = await fetch(`https://api.npmjs.org/downloads/point/last-week/${encodeURIComponent(name)}`, {
        signal: AbortSignal.timeout(5000),
      });
      if (dlRes.ok) {
        const dl = await dlRes.json() as { downloads?: number };
        weeklyDownloads = dl.downloads;
      }
    } catch { /* non-fatal */ }

    return {
      exists:          true,
      name:            data['name'] as string,
      version:         latest,
      publishedAt:     createdAt,
      ageInDays,
      weeklyDownloads,
      maintainers,
      description:     data['description'] as string | undefined,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { exists: false, error: `npm lookup failed: ${msg}` };
  }
}

// ─── PyPI Registry ────────────────────────────────────────────────────────────
async function checkPypi(name: string): Promise<RegistryResult> {
  try {
    const res = await fetch(`${PYPI_API}/${encodeURIComponent(name)}/json`, {
      signal: AbortSignal.timeout(8000),
    });

    if (res.status === 404) return { exists: false };
    if (!res.ok) return { exists: false, error: `PyPI registry error: ${res.status}` };

    const data = await res.json() as {
      info: {
        name: string;
        version: string;
        summary: string;
        author: string;
        maintainer: string | null;
      };
      releases: Record<string, Array<{ upload_time: string }>>;
      urls: Array<{ upload_time: string }>;
    };

    const info     = data.info;
    const releases = data.releases;

    // Find the earliest release date
    let earliest: Date | undefined;
    for (const files of Object.values(releases)) {
      for (const f of files) {
        const d = new Date(f.upload_time);
        if (!earliest || d < earliest) earliest = d;
      }
    }

    const ageInDays = earliest
      ? Math.floor((Date.now() - earliest.getTime()) / 86_400_000)
      : undefined;

    const maintainers = [info.author, info.maintainer].filter(Boolean) as string[];

    return {
      exists:      true,
      name:        info.name,
      version:     info.version,
      publishedAt: earliest?.toISOString(),
      ageInDays,
      maintainers,
      description: info.summary,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { exists: false, error: `PyPI lookup failed: ${msg}` };
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────
export async function checkRegistry(
  ecosystem: Ecosystem,
  packageName: string
): Promise<RegistryResult> {
  const name = packageName.trim().toLowerCase();
  return ecosystem === 'npm' ? checkNpm(name) : checkPypi(name);
}
