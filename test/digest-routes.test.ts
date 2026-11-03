import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import type { DigestJson } from '../src/digest/types.js';

const base = { adapter: 'shim', installed: '2026-10-29T14:06:00+01:00', beatEverySeconds: 60 };
const line = (job: string, status: string, owner: string | null, at = '2026-10-28T01:00:00+01:00') =>
  JSON.stringify({ at, job, status, owner });

let dir: string;
const appFor = (runsDir: string) => createApp({ ...base, runsDir });

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'rig-digest-'));
});
afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe('digest routes', () => {
  it('serves HTML and JSON with the same jobs in the same order', async () => {
    await writeFile(
      join(dir, '2026-10-28.jsonl'),
      [line('zeta/job', 'ok', 'rook'), line('alpha/job', 'fail', null), line('mid/job', 'ok', 'rook')].join('\n') + '\n',
    );
    const app = appFor(dir);
    const page = await app.request('/digest/2026-10-28');
    const api = await app.request('/api/digest/2026-10-28');
    expect(page.status).toBe(200);
    expect(api.status).toBe(200);
    const json = (await api.json()) as DigestJson;
    const html = await page.text();
    const jobs = json.rows.map((r) => r.job);
    expect(jobs).toEqual(['alpha/job', 'mid/job', 'zeta/job']);
    const positions = jobs.map((j) => html.indexOf(`<td>${j}</td>`));
    expect(positions.every((p) => p >= 0)).toBe(true);
    expect([...positions].sort((a, b) => a - b)).toEqual(positions);
    expect(html).toContain('—');
  });

  it('returns 404 for a night with no file', async () => {
    const app = appFor(dir);
    expect((await app.request('/digest/2026-10-30')).status).toBe(404);
    expect((await app.request('/api/digest/2026-10-30')).status).toBe(404);
  });

  it('renders an empty file as nothing ran', async () => {
    await writeFile(join(dir, '2026-10-28.jsonl'), '');
    const app = appFor(dir);
    const page = await app.request('/digest/2026-10-28');
    expect(page.status).toBe(200);
    expect(await page.text()).toContain('nothing ran');
    const json = (await (await app.request('/api/digest/2026-10-28')).json()) as DigestJson;
    expect(json.rows).toEqual([]);
    expect(json.badLines).toBe(0);
  });

  it('counts a malformed line and still renders the night', async () => {
    await writeFile(join(dir, '2026-10-28.jsonl'), [line('a/job', 'ok', 'rook'), '{not json'].join('\n') + '\n');
    const app = appFor(dir);
    const page = await app.request('/digest/2026-10-28');
    expect(page.status).toBe(200);
    expect(await page.text()).toContain('1 unreadable line(s) skipped');
    const json = (await (await app.request('/api/digest/2026-10-28')).json()) as DigestJson;
    expect(json.badLines).toBe(1);
    expect(json.rows.map((r) => r.job)).toEqual(['a/job']);
  });

  it('renders a digest for both fixture nights in runs/', async () => {
    const app = appFor('runs');
    for (const night of ['2026-10-27', '2026-10-28']) {
      const page = await app.request(`/digest/${night}`);
      expect(page.status).toBe(200);
      const html = await page.text();
      const json = (await (await app.request(`/api/digest/${night}`)).json()) as DigestJson;
      expect(json.rows.length).toBeGreaterThan(0);
      for (const r of json.rows) expect(html).toContain(`<td>${r.job}</td>`);
    }
  });
});
