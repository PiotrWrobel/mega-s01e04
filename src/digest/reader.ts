import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { DigestNight, DigestRow, DigestStatus, ReadNight } from './types.js';

type RunEntry = {
  at: string;
  job: string;
  status: DigestStatus;
  owner: string | null;
  error?: string;
};

function isRunEntry(value: unknown): value is RunEntry {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;

  const entry = value as Record<string, unknown>;
  return (
    typeof entry.at === 'string' &&
    typeof entry.job === 'string' &&
    entry.job.length > 0 &&
    (entry.status === 'ok' || entry.status === 'retry' || entry.status === 'fail') &&
    (entry.owner === null || typeof entry.owner === 'string') &&
    (entry.error === undefined || typeof entry.error === 'string')
  );
}

export const readNight: ReadNight = (runsDir, night): DigestNight => {
  const contents = readFileSync(join(runsDir, `${night}.jsonl`), 'utf8');
  const lines = contents.split(/\r?\n/);
  if (lines.at(-1) === '') lines.pop();

  const jobs = new Map<string, DigestRow>();
  let badLines = 0;

  for (const line of lines) {
    let value: unknown;
    try {
      value = JSON.parse(line);
    } catch {
      badLines += 1;
      continue;
    }

    if (!isRunEntry(value)) {
      badLines += 1;
      continue;
    }

    const previous = jobs.get(value.job);
    if (previous) {
      previous.owner = value.owner;
      previous.runs += 1;
      previous.retries += Number(value.status === 'retry');
      previous.lastStatus = value.status;
      previous.lastError = value.error ?? previous.lastError;
      previous.lastAt = value.at;
      continue;
    }

    jobs.set(value.job, {
      job: value.job,
      owner: value.owner,
      runs: 1,
      retries: Number(value.status === 'retry'),
      lastStatus: value.status,
      lastError: value.error ?? null,
      firstAt: value.at,
      lastAt: value.at,
    });
  }

  return {
    rows: [...jobs.values()].sort((a, b) => a.job.localeCompare(b.job)),
    badLines,
  };
};
