import type { RegistryResult } from '../types.js';

const CRATES_API = 'https://crates.io/api/v1/crates';
const USER_AGENT = 'PackageGuard-SecurityAgent/1.0.0 (security-audit@packageguard.dev)';

export async function checkCargo(name: string): Promise<RegistryResult> {
  const sanitized = encodeURIComponent(name.trim().toLowerCase());
  if (!sanitized) {
    return { exists: false };
  }

  try {
    const res = await fetch(`${CRATES_API}/${sanitized}`, {
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'application/json',
      },
    });

    if (res.status === 404) {
      return { exists: false };
    }

    if (!res.ok) {
      return { exists: false };
    }

    const data = await res.json() as any;
    const crate = data?.crate;
    if (!crate) {
      return { exists: false };
    }

    const versions = data?.versions || [];
    const latestVersion = crate.max_version ?? versions[0]?.num;
    const createdAt = crate.created_at ? new Date(crate.created_at) : undefined;
    const updatedAt = crate.updated_at ? new Date(crate.updated_at) : undefined;

    return {
      exists: true,
      name: crate.name ?? name,
      version: latestVersion,
      createdAt,
      updatedAt,
      downloads: crate.downloads ?? 0,
      weeklyDownloads: crate.recent_downloads ?? Math.round((crate.downloads ?? 0) / 52),
      authorCount: (data?.categories?.length ?? 0) + (data?.keywords?.length ?? 0) > 0 ? 1 : 1,
      homepage: crate.homepage ?? undefined,
      repository: crate.repository ?? undefined,
      description: crate.description ?? undefined,
      raw: {
        max_stable_version: crate.max_stable_version,
        exact_match: crate.exact_match,
      },
    };
  } catch {
    return { exists: false };
  }
}
