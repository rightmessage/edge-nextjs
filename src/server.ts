import { headers } from 'next/headers.js';
import { NextResponse, type NextRequest, type NextFetchEvent } from 'next/server.js';
import { createPlanCache, startPlanLoad, observeTouchCookie, decide, SUPPORTED_PLAN_VERSIONS } from '@rightmessage/edge';

const DECISIONS_HEADER = 'x-rightmessage-decisions';
const MAX_HEADER_BYTES = 8192;
export interface Decision { campaignId: string; variantId: string; actionIds: string[] }
export interface RightMessageProxyOptions { teamPid: string; tagOrigin?: string; enabled?: boolean }

/** Use in proxy.ts (Next 16) or middleware.ts (Next 15). Never use decisions for authorization. */
export function createRightMessageProxy(options: RightMessageProxyOptions) {
  const planCache = createPlanCache();
  return async function rightMessageProxy(request: NextRequest, event?: NextFetchEvent) {
    const forwarded = new Headers(request.headers);
    forwarded.delete(DECISIONS_HEADER);
    let cookie: string | undefined;
    let reason = 'plan-unavailable';
    let personalized = false;
    try {
      const load = startPlanLoad(request, { ...options, allowRsc: true }, { planCache }, event);
      const result = await load.promise;
      if (result.loaded) {
        const { plan } = result.loaded;
        if (!(SUPPORTED_PLAN_VERSIONS as readonly number[]).includes(plan.version)) reason = 'unsupported-plan-version';
        else {
          const touch = observeTouchCookie(request.headers.get('cookie') ?? '', plan.queryNames, request.url, request.headers.get('referer') ?? '');
          if (touch.changed) cookie = touch.cookie;
          const decisions: Decision[] = decide(plan, request, touch.state).map(({ campaignId, variantId, actions }) => ({
            campaignId, variantId, actionIds: actions.map(action => action.actionId),
          }));
          const encoded = encodeURIComponent(JSON.stringify(decisions));
          if (encoded.length > MAX_HEADER_BYTES) reason = 'decisions-too-large';
          else {
            forwarded.set(DECISIONS_HEADER, encoded);
            personalized = decisions.length > 0;
            reason = personalized ? 'decided' : 'no-decisions';
          }
        }
      } else reason = result.reason ?? 'plan-unavailable';
    } catch { reason = 'decision-failed'; }
    const response = NextResponse.next({ request: { headers: forwarded } });
    response.headers.set('x-rm-edge', personalized ? 'decided' : 'bypass:' + reason);
    if (personalized || cookie) {
      response.headers.set('cache-control', 'private, no-store');
      response.headers.set('cdn-cache-control', 'no-store');
      response.headers.set('cloudflare-cdn-cache-control', 'no-store');
    }
    if (cookie) response.headers.append('set-cookie', cookie);
    return response;
  };
}

/** Calling this in a Server Component opts the route into request-time rendering. */
export async function getRightMessage(request?: Request): Promise<Decision[]> {
  const incoming = request?.headers ?? await headers();
  const value = incoming.get(DECISIONS_HEADER);
  if (!value || value.length > MAX_HEADER_BYTES) return [];
  try {
    const parsed: unknown = JSON.parse(decodeURIComponent(value));
    if (!Array.isArray(parsed) || !parsed.every(item => item && typeof item.campaignId === 'string' && typeof item.variantId === 'string' && Array.isArray(item.actionIds) && item.actionIds.every((id: unknown) => typeof id === 'string'))) return [];
    return parsed as Decision[];
  } catch { return []; }
}
