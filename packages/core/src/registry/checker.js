const NPM_API = 'https://registry.npmjs.org';
const PYPI_API = 'https://pypi.org/pypi';
// ─── npm Registry ─────────────────────────────────────────────────────────────
async function checkNpm(name) {
    try {
        const res = await fetch(`${NPM_API}/${encodeURIComponent(name)}`, {
            headers: { 'Accept': 'application/json' },
            signal: AbortSignal.timeout(8000),
        });
        if (res.status === 404)
            return { exists: false };
        if (!res.ok)
            return { exists: false, error: `npm registry error: ${res.status}` };
        const data = await res.json();
        const times = data['time'];
        const distTags = data['dist-tags'];
        const latest = distTags?.['latest'] ?? '';
        const versions = data['versions'];
        const maintainers = data['maintainers']
            ?.map(m => m.name) ?? [];
        const createdAt = times?.['created'] ?? '';
        const ageInDays = createdAt
            ? Math.floor((Date.now() - new Date(createdAt).getTime()) / 86_400_000)
            : undefined;
        // Fetch weekly downloads from the downloads API
        let weeklyDownloads;
        try {
            const dlRes = await fetch(`https://api.npmjs.org/downloads/point/last-week/${encodeURIComponent(name)}`, {
                signal: AbortSignal.timeout(5000),
            });
            if (dlRes.ok) {
                const dl = await dlRes.json();
                weeklyDownloads = dl.downloads;
            }
        }
        catch { /* non-fatal */ }
        return {
            exists: true,
            name: data['name'],
            version: latest,
            publishedAt: createdAt,
            ageInDays,
            weeklyDownloads,
            maintainers,
            description: data['description'],
        };
    }
    catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return { exists: false, error: `npm lookup failed: ${msg}` };
    }
}
// ─── PyPI Registry ────────────────────────────────────────────────────────────
async function checkPypi(name) {
    try {
        const res = await fetch(`${PYPI_API}/${encodeURIComponent(name)}/json`, {
            signal: AbortSignal.timeout(8000),
        });
        if (res.status === 404)
            return { exists: false };
        if (!res.ok)
            return { exists: false, error: `PyPI registry error: ${res.status}` };
        const data = await res.json();
        const info = data.info;
        const releases = data.releases;
        // Find the earliest release date
        let earliest;
        for (const files of Object.values(releases)) {
            for (const f of files) {
                const d = new Date(f.upload_time);
                if (!earliest || d < earliest)
                    earliest = d;
            }
        }
        const ageInDays = earliest
            ? Math.floor((Date.now() - earliest.getTime()) / 86_400_000)
            : undefined;
        const maintainers = [info.author, info.maintainer].filter(Boolean);
        return {
            exists: true,
            name: info.name,
            version: info.version,
            publishedAt: earliest?.toISOString(),
            ageInDays,
            maintainers,
            description: info.summary,
        };
    }
    catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return { exists: false, error: `PyPI lookup failed: ${msg}` };
    }
}
// ─── Public API ───────────────────────────────────────────────────────────────
export async function checkRegistry(ecosystem, packageName) {
    const name = packageName.trim().toLowerCase();
    return ecosystem === 'npm' ? checkNpm(name) : checkPypi(name);
}
//# sourceMappingURL=checker.js.map