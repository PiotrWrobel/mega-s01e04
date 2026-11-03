import type { DigestNight } from '../digest/types.js';

const dash = '—';

export function DigestPage({ night, digest }: { night: string; digest: DigestNight }) {
  return (
    <>
      <h1>digest {night}</h1>
      {digest.badLines > 0 && <p class="mute">{digest.badLines} unreadable line(s) skipped</p>}
      {digest.rows.length === 0 ? (
        <p class="mute">nothing ran</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>job</th><th>owner</th><th>runs</th><th>retries</th><th>status</th>
              <th>error</th><th>first</th><th>last</th>
            </tr>
          </thead>
          <tbody>
            {digest.rows.map((r) => (
              <tr class={r.lastStatus === 'fail' ? 'warn' : undefined}>
                <td>{r.job}</td>
                <td>{r.owner ?? dash}</td>
                <td>{r.runs}</td>
                <td class={r.retries >= 3 ? 'warn' : undefined}>
                  {r.retries}{r.retries >= 3 ? ' ⚠ many retries' : ''}
                </td>
                <td>{r.lastStatus === 'fail' ? '✗ fail' : r.lastStatus}</td>
                <td>{r.lastError ?? dash}</td>
                <td>{r.firstAt}</td>
                <td>{r.lastAt}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
