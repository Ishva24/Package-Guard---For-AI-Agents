import { describe, it, expect } from 'vitest';
import { checkSimilarity } from '../src/similarity/detector.js';
import { scoreReputation } from '../src/reputation/scorer.js';
import type { RegistryResult } from '../src/types.js';

// ─── Similarity / Typosquatting Tests ─────────────────────────────────────────
describe('Similarity Detector', () => {
  it('exact popular package → not a typosquat', () => {
    const r = checkSimilarity('react', 'npm');
    expect(r.isTyposquat).toBe(false);
    expect(r.similarityPct).toBe(100);
  });

  it('detects classic typosquat: "lodahs" → lodash', () => {
    const r = checkSimilarity('lodahs', 'npm');
    expect(r.isTyposquat).toBe(true);
    expect(r.closestMatch).toBe('lodash');
    expect(r.similarityPct).toBeGreaterThan(60);
  });

  it('detects "expres" → express', () => {
    const r = checkSimilarity('expres', 'npm');
    expect(r.isTyposquat).toBe(true);
    expect(r.closestMatch).toBe('express');
  });

  it('detects "reqeusts" → requests on pypi', () => {
    const r = checkSimilarity('reqeusts', 'pypi');
    expect(r.isTyposquat).toBe(true);
    expect(r.closestMatch).toBe('requests');
  });

  it('completely unrelated package → not flagged', () => {
    const r = checkSimilarity('zzz-totally-different-xyz', 'npm');
    expect(r.isTyposquat).toBe(false);
  });

  it('detects "langchain-openai-utils-v2" similarity to langchain', () => {
    const r = checkSimilarity('langchain-openai-utils-v2', 'npm');
    // Should find some similarity to langchain
    expect(r.closestMatch).toBeDefined();
  });
});

// ─── Reputation Scorer Tests ──────────────────────────────────────────────────
describe('Reputation Scorer', () => {
  it('non-existent package → score 0', () => {
    const reg: RegistryResult = { exists: false };
    const r = scoreReputation(reg);
    expect(r.score).toBe(0);
    expect(r.signals[0].name).toBe('package_nonexistent');
  });

  it('brand new package (0 days) → very low score', () => {
    const reg: RegistryResult = { exists: true, ageInDays: 0, weeklyDownloads: 0, maintainers: ['anon'] };
    const r = scoreReputation(reg);
    expect(r.score).toBeLessThan(30);
  });

  it('mature popular package → high score', () => {
    const reg: RegistryResult = { exists: true, ageInDays: 1500, weeklyDownloads: 5_000_000, maintainers: ['alice', 'bob', 'carol'] };
    const r = scoreReputation(reg);
    expect(r.score).toBeGreaterThan(70);
  });

  it('1 day old, 3 downloads → high risk', () => {
    const reg: RegistryResult = { exists: true, ageInDays: 1, weeklyDownloads: 3, maintainers: ['unknown_user'] };
    const r = scoreReputation(reg);
    expect(r.score).toBeLessThan(20);
  });

  it('suspicious name pattern reduces score', () => {
    const regNormal: RegistryResult = { exists: true, ageInDays: 200, weeklyDownloads: 1000, maintainers: ['dev'], name: 'mylib' };
    const regSusp:   RegistryResult = { exists: true, ageInDays: 200, weeklyDownloads: 1000, maintainers: ['dev'], name: 'my-lodash' };
    const rN = scoreReputation(regNormal);
    const rS = scoreReputation(regSusp);
    expect(rS.score).toBeLessThanOrEqual(rN.score);
  });
});
