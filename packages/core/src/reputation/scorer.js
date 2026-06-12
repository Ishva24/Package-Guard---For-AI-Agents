/**
 * Scores a package's reputation 0–100 (100 = fully trusted).
 * Combines age, download count, maintainer count and other signals.
 */
export function scoreReputation(registry) {
    if (!registry.exists) {
        return {
            score: 0,
            signals: [{
                    name: 'package_nonexistent',
                    value: true,
                    impact: 'negative',
                    weight: 100,
                }],
        };
    }
    const signals = [];
    let score = 60; // Start neutral
    // ── Signal 1: Package Age ──────────────────────────────────────────────────
    const age = registry.ageInDays ?? 0;
    if (age < 1) {
        signals.push({ name: 'age_hours', value: `${age} days`, impact: 'negative', weight: 40 });
        score -= 40;
    }
    else if (age < 7) {
        signals.push({ name: 'age_days', value: `${age} days`, impact: 'negative', weight: 30 });
        score -= 30;
    }
    else if (age < 30) {
        signals.push({ name: 'age_weeks', value: `${age} days`, impact: 'negative', weight: 15 });
        score -= 15;
    }
    else if (age >= 365) {
        signals.push({ name: 'age_mature', value: `${age} days`, impact: 'positive', weight: 20 });
        score += 20;
    }
    else {
        signals.push({ name: 'age_ok', value: `${age} days`, impact: 'neutral', weight: 0 });
    }
    // ── Signal 2: Weekly Downloads ────────────────────────────────────────────
    const dl = registry.weeklyDownloads ?? 0;
    if (dl === 0) {
        signals.push({ name: 'downloads_zero', value: dl, impact: 'negative', weight: 25 });
        score -= 25;
    }
    else if (dl < 100) {
        signals.push({ name: 'downloads_very_low', value: dl, impact: 'negative', weight: 20 });
        score -= 20;
    }
    else if (dl < 1_000) {
        signals.push({ name: 'downloads_low', value: dl, impact: 'negative', weight: 10 });
        score -= 10;
    }
    else if (dl >= 100_000) {
        signals.push({ name: 'downloads_high', value: dl, impact: 'positive', weight: 15 });
        score += 15;
    }
    else {
        signals.push({ name: 'downloads_moderate', value: dl, impact: 'neutral', weight: 0 });
    }
    // ── Signal 3: Maintainer Count ────────────────────────────────────────────
    const maintainerCount = registry.maintainers?.length ?? 0;
    if (maintainerCount === 0) {
        signals.push({ name: 'no_maintainers', value: 0, impact: 'negative', weight: 10 });
        score -= 10;
    }
    else if (maintainerCount >= 3) {
        signals.push({ name: 'multiple_maintainers', value: maintainerCount, impact: 'positive', weight: 5 });
        score += 5;
    }
    else {
        signals.push({ name: 'single_maintainer', value: maintainerCount, impact: 'neutral', weight: 0 });
    }
    // ── Signal 4: Suspicious Name Patterns ────────────────────────────────────
    const name = registry.name ?? '';
    const suspiciousPatterns = [
        /v\d+$/, /-(v\d+|beta|alpha|test|dev|prod|safe|secure|real|true|official)$/i,
        /^(the-|get-|use-|my-)/i,
    ];
    if (suspiciousPatterns.some(p => p.test(name))) {
        signals.push({ name: 'suspicious_name_pattern', value: name, impact: 'negative', weight: 10 });
        score -= 10;
    }
    // Clamp 0–100
    return { score: Math.max(0, Math.min(100, score)), signals };
}
//# sourceMappingURL=scorer.js.map