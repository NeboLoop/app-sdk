/**
 * nebo.decide — typed decisions through the bot: choose one of named
 * options, place on ordered levels, or judge a statement, each answer with
 * probabilities and a confidence, in one fast call. Nothing is generated.
 * Billed to the bot owner's NeboAI account, like nebo.janus.
 */

import { getAppId, getBaseUrl } from './config';
import type { DecideRequest, Decision } from './types';

export async function decide(request: DecideRequest): Promise<Decision> {
  const resp = await fetch(`${getBaseUrl()}/api/v1/apps/${getAppId()}/janus/decide`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request)
  });
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    throw new Error(data.error || `decide failed (${resp.status})`);
  }
  return data as Decision;
}
