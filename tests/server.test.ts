// @vitest-environment node
import { afterEach, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server.js';
import { createRightMessageProxy, getRightMessage } from '../src/server.js';
const revision = 'a'.repeat(64);
const plan = { version: 1, teamPid: 'test', queryNames: ['biz'], dimensions: [], campaigns: [{ id: 'campaign', is_active: true, variants: [{ id: 'variant', rules: true, actions: [{ actionId: 'action', campaignId: 'campaign', variantId: 'variant', selector: 'h1', page: [{ domain: '*', path: '*' }], modifications: { text: 'Hello 世界' }, edge: { supported: true, operations: ['text'], deferredOperations: [] } }] }] }] };
function serve(value: unknown = plan) {
 vi.stubGlobal('fetch', vi.fn(async (request: Request) => Response.json(request.url.endsWith('/release.json') ? { version: 1, teamPid: 'test', revision, planUrl: `https://t.rightmessage.com/test/revisions/${revision}/plan.json`, loaderUrl: `https://t.rightmessage.com/test.js?revision=${revision}` } : value)));
}
afterEach(() => vi.unstubAllGlobals());
function forwarded(response: Response) { return new Request('https://example.com', { headers: { 'x-rightmessage-decisions': response.headers.get('x-middleware-request-x-rightmessage-decisions') ?? '' } }); }
it('removes forged decisions on fail-open and preview paths without touching cookies', async () => {
 vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('offline'))));
 const proxy = createRightMessageProxy({ teamPid: 'test' });
 for (const query of ['', '?preview']) {
  const response = await proxy(new NextRequest('https://example.com/' + query, { headers: { 'x-rightmessage-decisions': encodeURIComponent('[{"campaignId":"forged","variantId":"forged","actionIds":[]}]') } }));
  expect(await getRightMessage(forwarded(response))).toEqual([]);
  expect(response.headers.get('set-cookie')).toBeNull();
 }
});
it('decides RSC requests with compact IDs instead of oversized action definitions', async () => {
 const large = structuredClone(plan); large.campaigns[0].variants[0].actions[0].modifications.text = '世界'.repeat(9000); serve(large);
 const response = await createRightMessageProxy({ teamPid: 'test' })(new NextRequest('https://example.com/?biz=saas', { headers: { rsc: '1' } }));
 const decisions = await getRightMessage(forwarded(response));
 expect(decisions).toEqual([{ campaignId: 'campaign', variantId: 'variant', actionIds: ['action'] }]);
 expect(response.headers.get('set-cookie')).toContain('Secure; Path=/; SameSite=Lax');
 expect(response.headers.get('cache-control')).toBe('private, no-store');
});
it('unknown plan versions fail open without observing touch history', async () => {
 serve({ ...plan, version: 999 });
 const response = await createRightMessageProxy({ teamPid: 'test' })(new NextRequest('https://example.com/?biz=saas'));
 expect(await getRightMessage(forwarded(response))).toEqual([]);
 expect(response.headers.get('set-cookie')).toBeNull();
});
it('oversized decisions fall back while retaining an independently successful observation', async () => {
 const large = structuredClone(plan); const action = large.campaigns[0].variants[0].actions[0];
 large.campaigns[0].variants[0].actions = Array.from({ length: 1000 }, (_, i) => ({ ...action, actionId: 'action-' + i })); serve(large);
 const response = await createRightMessageProxy({ teamPid: 'test' })(new NextRequest('https://example.com/?biz=saas'));
 expect(await getRightMessage(forwarded(response))).toEqual([]);
 expect(response.headers.get('x-rm-edge')).toBe('bypass:decisions-too-large');
 expect(response.headers.get('set-cookie')).toContain('__Host-rm_touch=');
 expect(response.headers.get('cache-control')).toBe('private, no-store');
});
it('malformed request metadata is generic content, not a render failure', async () => {
 expect(await getRightMessage(new Request('https://example.com', { headers: { 'x-rightmessage-decisions': '%zz' } }))).toEqual([]);
 expect(await getRightMessage(new Request('https://example.com', { headers: { 'x-rightmessage-decisions': encodeURIComponent('{"actions":[]}') } }))).toEqual([]);
});
