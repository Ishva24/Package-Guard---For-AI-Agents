import { describe, it, expect, vi, beforeEach } from 'vitest';
import { checkCargo } from '../src/registry/cargo.js';
import { checkGo } from '../src/registry/go.js';
import { DynamicTargetIndex, POPULAR_CARGO, POPULAR_GO } from '../src/similarity/dynamicIndex.js';

describe('Cargo Registry Checker', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('handles empty package names', async () => {
    const res = await checkCargo('');
    expect(res.exists).toBe(false);
  });

  it('correctly maps crates.io JSON response', async () => {
    const mockCrate = {
      crate: {
        name: 'tokio',
        max_version: '1.38.0',
        created_at: '2016-01-01T00:00:00Z',
        updated_at: '2024-05-01T00:00:00Z',
        downloads: 150000000,
        recent_downloads: 1200000,
        homepage: 'https://tokio.rs',
        repository: 'https://github.com/tokio-rs/tokio',
        description: 'An event-driven, non-blocking I/O platform.',
      },
    };

    vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => mockCrate,
    } as any);

    const res = await checkCargo('tokio');
    expect(res.exists).toBe(true);
    expect(res.name).toBe('tokio');
    expect(res.version).toBe('1.38.0');
    expect(res.downloads).toBe(150000000);
    expect(res.weeklyDownloads).toBe(1200000);
    expect(res.homepage).toBe('https://tokio.rs');
  });

  it('returns exists=false on 404', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: async () => ({}),
    } as any);

    const res = await checkCargo('non-existent-crate-xyz-99');
    expect(res.exists).toBe(false);
  });
});

describe('Go Registry Checker', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('rejects invalid module paths lacking slashes', async () => {
    const res = await checkGo('invalidmod');
    expect(res.exists).toBe(false);
  });

  it('correctly parses Go proxy response', async () => {
    const mockGoResp = {
      Version: 'v1.10.0',
      Time: '2024-03-01T12:00:00Z',
    };

    vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => mockGoResp,
    } as any);

    const res = await checkGo('github.com/gin-gonic/gin');
    expect(res.exists).toBe(true);
    expect(res.name).toBe('github.com/gin-gonic/gin');
    expect(res.version).toBe('v1.10.0');
    expect(res.repository).toBe('https://github.com/gin-gonic/gin');
  });
});

describe('Dynamic Target Index', () => {
  it('detects typosquatting against popular Cargo targets', () => {
    const index = new DynamicTargetIndex();
    const result = index.findSimilar('tokioo', 'cargo');
    expect(result.isTyposquat).toBe(true);
    expect(result.targetPackage).toBe('tokio');
    expect(result.distance).toBe(1);
  });

  it('returns isTyposquat=false on exact popular matches', () => {
    const index = new DynamicTargetIndex();
    const result = index.findSimilar('serde', 'cargo');
    expect(result.isTyposquat).toBe(false);
  });

  it('allows registering custom dynamic targets', () => {
    const index = new DynamicTargetIndex();
    index.registerPackages('cargo', ['my-internal-crate']);
    const result = index.findSimilar('my-internal-crat', 'cargo');
    expect(result.isTyposquat).toBe(true);
    expect(result.targetPackage).toBe('my-internal-crate');
  });
});
