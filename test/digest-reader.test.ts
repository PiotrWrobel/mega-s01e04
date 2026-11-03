import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { readNight } from '../src/digest/reader.js';

describe('readNight', () => {
  const night = readNight(resolve('runs'), '2026-10-28');

  it('reads five jobs and counts the malformed line', () => {
    expect(night.rows).toHaveLength(5);
    expect(night.badLines).toBe(1);
    expect(night.rows.map((row) => row.job)).toEqual([
      'digest/render',
      'fixtures/refresh',
      'lane/sync',
      'notes/backup',
      'rig/rotate-logs',
    ]);
  });

  it('aggregates attempts, retries, status, errors, and timestamps per job', () => {
    expect(night.rows.find((row) => row.job === 'fixtures/refresh')).toEqual({
      job: 'fixtures/refresh',
      owner: 'rook',
      runs: 4,
      retries: 3,
      lastStatus: 'ok',
      lastError: 'upstream 503',
      firstAt: '2026-10-29T01:30:00+01:00',
      lastAt: '2026-10-29T01:37:00+01:00',
    });

    expect(night.rows.find((row) => row.job === 'digest/render')?.owner).toBeNull();
    expect(night.rows.find((row) => row.job === 'notes/backup')?.lastStatus).toBe('fail');
  });
});
