/**
 * nebo.plugins — run a plugin installed on the bot directly, with no AI in
 * the middle. The call is the one the app's employee makes with its
 * `plugin__<slug>` tool (a command and its flags), run by Nebo the same way
 * (the same installed version, account and billing), and its result comes
 * straight back.
 *
 * The app's manifest grants the plugin: `plugin:<slug>` for every command,
 * `plugin:<slug>:<command>` for one. An app installed from the marketplace
 * also needs the owner's OK. A call the app may not make is refused.
 */

import { getAppId, getBaseUrl } from './config';

/** What a plugin command came to. */
export interface PluginResult {
  /** The plugin succeeded. */
  ok: boolean;
  /** What it printed: the text the employee's tool gets back. */
  output: string;
  /** The files it reported making (its `Result:` lines). */
  files: string[];
}

export interface PluginRunOptions {
  /** Seconds the command may take (default 120, at most 600). */
  timeout?: number;
  /**
   * For long work: called with each line the plugin writes, as it writes
   * it. The command then runs as a job on the bot, and `run` resolves when
   * the job ends.
   */
  onProgress?: (line: string) => void;
}

function pluginsUrl(path: string): string {
  return `${getBaseUrl()}/api/v1/apps/${encodeURIComponent(getAppId())}/plugins/${path}`;
}

async function refused(resp: Response): Promise<Error> {
  const text = await resp.text().catch(() => '');
  return new Error(text || `plugin call failed (${resp.status})`);
}

/** Read a job's event stream to its `result`, handing on each `progress` line. */
async function follow(job: string, onProgress: (line: string) => void): Promise<PluginResult> {
  const resp = await fetch(pluginsUrl(`jobs/${encodeURIComponent(job)}`), {
    headers: { Accept: 'text/event-stream' }
  });
  if (!resp.ok || !resp.body) throw await refused(resp);
  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let event = '';
  let data: string[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';
    for (const raw of lines) {
      const line = raw.replace(/\r$/, '');
      if (line === '') {
        if (event === 'result') return JSON.parse(data.join('\n')) as PluginResult;
        if (event === 'progress') onProgress(data.join('\n'));
        event = '';
        data = [];
      } else if (line.startsWith('event:')) {
        event = line.slice(6).trim();
      } else if (line.startsWith('data:')) {
        data.push(line.slice(5).replace(/^ /, ''));
      }
    }
  }
  throw new Error('the plugin job ended without a result');
}

export const plugins = {
  /**
   * Run `command` on the installed plugin `slug`, with `args` as its flags
   * (each key becomes `--key`; objects and lists go as JSON).
   */
  async run(
    slug: string,
    command: string,
    args: Record<string, unknown> = {},
    options: PluginRunOptions = {}
  ): Promise<PluginResult> {
    const background = typeof options.onProgress === 'function';
    const resp = await fetch(pluginsUrl(`${encodeURIComponent(slug)}/run`), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ command, args, timeout: options.timeout, background })
    });
    if (!resp.ok) throw await refused(resp);
    const data = await resp.json();
    if (!background) return data as PluginResult;
    return follow(data.job, options.onProgress as (line: string) => void);
  }
};
