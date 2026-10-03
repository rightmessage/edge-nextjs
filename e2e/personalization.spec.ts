import { test, expect } from '@playwright/test';

test('link, back and forward personalization commits in the insertion animation frame', async ({ page }) => {
  await page.addInitScript(() => {
    const state = { frame: 0, calls: [] as { path: string; frame: number }[], insertions: [] as { page: string; frame: number }[], changes: [] as { page: string; frame: number }[] };
    Object.assign(window, { proof: state });
    const tick = () => { state.frame++; requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
    new MutationObserver(records => {
      for (const record of records) {
        for (const node of record.addedNodes) {
          if (!(node instanceof Element)) continue;
          const heading = node.matches('#headline') ? node : node.querySelector('#headline');
          if (heading) state.insertions.push({ page: heading.getAttribute('data-page')!, frame: state.frame });
        }
        const target = record.target instanceof Element ? record.target : record.target.parentElement;
        if (target?.closest('#headline')?.textContent?.startsWith('Personalized')) state.changes.push({ page: target.closest('#headline')!.getAttribute('data-page')!, frame: state.frame });
      }
    }).observe(document, { subtree: true, childList: true, characterData: true });
  });
  await page.route('https://t.rightmessage.com/**', route => route.fulfill({ contentType: 'application/javascript', body: `window.RM={push(command){if(command[0]!=='personalize')return;window.proof.calls.push({path:location.pathname,frame:window.proof.frame});const h=document.querySelector('#headline');if(h)h.textContent='Personalized '+h.dataset.page;}};` }));
  await page.goto('/');
  await expect(page.locator('#headline')).toHaveText('Generic home heading');
  await page.waitForFunction(() => !Array.isArray((window as unknown as { RM: unknown }).RM));
  expect(await page.evaluate(() => (window as unknown as { proof: { calls: unknown[] } }).proof.calls)).toEqual([]);
  for (const [action, target] of [['link', 'about'], ['back', 'home'], ['forward', 'about']] as const) {
    await page.evaluate(() => { const p = (window as unknown as { proof: { calls: unknown[]; insertions: unknown[]; changes: unknown[] } }).proof; p.calls=[]; p.insertions=[]; p.changes=[]; });
    if (action === 'link') await page.getByRole('link', { name: 'About', exact: true }).click();
    else if (action === 'back') await page.goBack();
    else await page.goForward();
    await expect(page.locator('#headline')).toHaveText('Personalized ' + target);
    const proof = await page.evaluate(() => (window as unknown as { proof: { calls: { frame: number }[]; insertions: { page: string; frame: number }[]; changes: { page: string; frame: number }[] } }).proof);
    expect(proof.calls).toHaveLength(1);
    expect(proof.insertions.find(item => item.page === target)?.frame).toBe(proof.calls[0].frame);
    expect(proof.changes.find(item => item.page === target)?.frame).toBe(proof.calls[0].frame);
    console.log(action, JSON.stringify(proof));
  }
});

test('pre-rewritten HTML hydrates without recovery or restoring generic text', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('pageerror', error => errors.push(error.message));
  await page.route('https://t.rightmessage.com/**', route => route.fulfill({ contentType: 'application/javascript', body: 'window.RM={push(){}};' }));
  await page.route('http://127.0.0.1:3210/', async route => {
    const response = await route.fetch();
    const body = (await response.text()).replace('Generic home heading</h1>', 'Edge personalized heading</h1>');
    expect(body).toContain('Edge personalized heading</h1>');
    await route.fulfill({ response, body });
  });
  await page.goto('/');
  await expect(page.locator('#headline')).toHaveText('Edge personalized heading');
  await page.getByRole('link', { name: 'About', exact: true }).click();
  await expect(page.locator('#headline')).toHaveAttribute('data-page', 'about');
  expect(errors).toEqual([]);
});

test('real public plan decisions and touch cookie reach a Server Component', async ({ page, request }) => {
  // Warm the bounded shared cache; a cold public fetch may exceed its 300 ms deadline.
  await request.get('/?biz=saas');
  await page.route('https://t.rightmessage.com/**', route => route.fulfill({ contentType: 'application/javascript', body: 'window.RM={push(){}};' }));
  await expect(async () => {
    const response = await page.goto('/?biz=saas');
    const decisions = JSON.parse(await page.locator('#decisions').innerText());
    expect(decisions).toContainEqual(expect.objectContaining({ campaignId: 'cpn_uGIoPzFO', variantId: 'var_cs7xxK2U' }));
    expect(response?.headers()['cache-control']).toContain('no-store');
  }).toPass({ timeout: 15000 });
  const cookies = await page.context().cookies();
  expect(cookies.find(cookie => cookie.name === '__Host-rm_touch')?.secure).toBe(true);
});
