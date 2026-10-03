import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
const route = vi.hoisted(() => ({ path: '/', search: '' }));
vi.mock('next/navigation.js', () => ({ usePathname: () => route.path, useSearchParams: () => new URLSearchParams(route.search) }));
vi.mock('next/script.js', () => ({ default: () => null }));
import { Personalizable, RightMessageProvider } from '../src/index.js';
import { loaderBootstrap } from '../src/bootstrap.js';
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
let root: Root | undefined;
afterEach(async () => { await act(async () => root?.unmount()); document.body.innerHTML=''; route.path='/'; route.search=''; vi.restoreAllMocks(); });
describe('navigation', () => {
 it('skips first commit and queues one personalization per changed route', async () => {
  const push = vi.fn(); Object.assign(window, { RM: { push } });
  const host = document.createElement('div'); document.body.append(host); root=createRoot(host);
  await act(async () => root!.render(<RightMessageProvider />)); expect(push).not.toHaveBeenCalled();
  route.path='/next'; await act(async () => root!.render(<RightMessageProvider />)); expect(push).toHaveBeenCalledExactlyOnceWith(['personalize']);
  await act(async () => root!.render(<RightMessageProvider />)); expect(push).toHaveBeenCalledTimes(1);
  route.search='biz=saas'; await act(async () => root!.render(<RightMessageProvider />)); expect(push).toHaveBeenCalledTimes(2);
 });
 it('warns only for detectable unprotected edge targets', async () => {
  const warn=vi.spyOn(console,'warn').mockImplementation(() => {});
  document.body.innerHTML='<h1 data-rm-edge-target="t" data-rm-personalized="true">Edge</h1>';
  const host=document.createElement('div'); document.body.append(host); root=createRoot(host);
  await act(async () => root!.render(<><Personalizable as="h2" data-rm-edge-target="safe" data-rm-personalized="true">Safe</Personalizable><RightMessageProvider /></>));
  expect(warn).toHaveBeenCalledTimes(1); expect(warn.mock.calls[0][1]).toBe(document.querySelector('h1'));
 });
});
it('rejects loader script injection through project identifiers', () => { expect(() => loaderBootstrap("x'</script>")).toThrow('Invalid'); });
