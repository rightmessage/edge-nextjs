# @rightmessage/next

Hydration-safe RightMessage personalization for Next.js 16 (App Router first), with request-time campaign decisions powered by [@rightmessage/edge](https://github.com/rightmessage/edge).

## Install

Requires Node.js 20+, Next.js 15–16 and React 19.

```sh
# Before the first npm release:
npm install github:rightmessage/edge-nextjs#main
# After npm publishing is enabled:
npm install @rightmessage/next
```

The client entry point does not import the core engine. Server helpers live at `@rightmessage/next/server`.

## App Router quick start

Put the script in the root layout. Mount the provider once inside Suspense because it reads search parameters. It can either wrap children or render without children.

```tsx
// app/layout.tsx
import { Suspense } from 'react';
import { RightMessageScript, RightMessageProvider } from '@rightmessage/next';

export default function Layout({ children }) {
  return <html lang="en"><body>
    <RightMessageScript teamPid="1213277114" />
    <Suspense fallback={null}><RightMessageProvider /></Suspense>
    {children}
  </body></html>;
}
```

`RightMessageScript` uses Next's `beforeInteractive` strategy and the ordinary public loader. When Cloudflare supplies an edge receipt and a valid public revision pin, it uses that revision's loader instead. A failed loader reveals cloaked generic content. Do not add another cloak or personalization observer. An optional `nonce` prop supports nonce-based CSP; allow `https://t.rightmessage.com` in script policy and the tag's required network destinations.

For analytics-free development, set `window.RightMessage = { disableAnalytics: true }` in an earlier `beforeInteractive` Script. The example does this on every load. The SDK does not change consent policy or enable analytics itself.

### Hydration-safe targets

```tsx
import { Personalizable } from '@rightmessage/next';

<Personalizable as="h1" className="rmcloak">Your generic headline</Personalizable>
```

This puts `suppressHydrationWarning` on the **exact target** plus a diagnostic marker. React adopts edge-rewritten text without resetting the page. Suppression is only one level deep: wrap the actual nested text target, not an ancestor. Do not use React state to simultaneously own text that campaigns modify. Arbitrary structural HTML changes, nested replacements, and React-controlled attributes are not made universally hydration-safe by this wrapper. Custom `as` components must forward the supplied props to their DOM target.

In development the provider warns about already edge-stamped targets lacking the wrapper marker at route commit. Detection is best effort: React does not expose arbitrary DOM nodes' `suppressHydrationWarning` prop, unstamped editor targets are invisible to it, and a manually protected target can produce a warning. No production observer or campaign inspection is installed.

### Soft navigation

Next link, back/forward, pathname and query changes commit new generic DOM without a full page load. A layout effect queues `RM.push(['personalize'])` as a microtask: Next can finish updating the URL, then the tag synchronously processes its route lifecycle before paint. The first render is skipped so the tag owns initial startup and edge-receipt adoption. Repeated renders of the same route do nothing; an absent tag is harmless. Use the current RightMessage tag, whose route lifecycle deduplicates work already handled by its own navigation listener. The provider does not independently evaluate campaigns or emit analytics.

## Server decisions

Next/Vercel proxy and middleware **cannot rewrite response HTML**. This API supplies decisions to components you render yourself; it does not apply editor selectors. For flicker-free selector-based campaigns, put [@rightmessage/cloudflare](https://github.com/rightmessage/edge-cloudflare) in front of the site. Without it, editor-built selector campaigns apply in the browser.

```ts
// proxy.ts (Next 16)
import { createRightMessageProxy } from '@rightmessage/next/server';
export const proxy = createRightMessageProxy({ teamPid: '1213277114' });
export const config = { matcher: ['/((?!_next|favicon.ico).*)'] };
```

For Next 15, export that function as `middleware` from `middleware.ts`. `tagOrigin` can override the HTTPS tag origin, and `enabled: false` disables loading. Match every route consuming decisions; incoming decision headers are always removed before trusted values are forwarded.

```tsx
// app/page.tsx
import { getRightMessage } from '@rightmessage/next/server';
export default async function Page() {
  const decisions = await getRightMessage();
  const chosen = decisions.find(d => d.campaignId === 'YOUR_CAMPAIGN_ID');
  return <h1>{chosen?.variantId === 'YOUR_VARIANT_ID' ? 'Specific copy' : 'Generic copy'}</h1>;
}
```

Route handlers may call `getRightMessage(request)` explicitly. Results are `Decision[]`: `{campaignId, variantId, actionIds: string[]}`. This compact projection of core's decisions forwards IDs, not full selector/modification definitions, to keep request headers bounded. Use stable IDs to map variants to your own components. Decisions are personalization hints, **never authorization or trusted identity**: query strings and visitor cookies are user-controlled.

The proxy evaluates document and RSC requests with the same core evaluator and touch codec. The `__Host-rm_touch` cookie retains only plan-allowlisted first/last query values and first referrer. It is bounded to 1 KiB, Secure, SameSite=Lax, Path=/, with no Domain or HttpOnly. Deploy over HTTPS. Preview/editor and non-GET requests bypass without touching the cookie. Missing browser-only facts remain unknown, not guessed false.

### Caching and static sites

`getRightMessage()` calls Next's `headers()`, opting Server Components into dynamic request-time rendering. Personalized responses and cookie updates get private/no-store browser and CDN headers. Do not remove those headers or publicly cache visitor-specific HTML. Forwarded decision data is capped at 8 KiB; oversized decisions fall back to generic content.

For fully static pages, pre-render a **finite set of variant paths**, such as `/variants/saas` and `/variants/default`. In your own proxy use core's `decide()` and a fixed variant-ID-to-path allowlist to `NextResponse.rewrite` to one of those paths. Keep `getRightMessage()` out of those pages: each destination must render only path-defined public content. Preserve touch-cookie behavior and keep the visitor-specific routing response private; only cache the underlying static variant asset by its distinct path. Do not rewrite from unchecked user input, put cookies in cache keys, or cache all variants under the original URL. This package's default proxy is the dynamic decision-header implementation, not a static variant router.

## What runs where

| Layer | Responsibility |
| --- | --- |
| Core in proxy | Release/plan cache, query/cookie decisions, touch history |
| Server Components | Your explicit variant-to-component mapping |
| Cloudflare (optional) | One-pass selector HTML rewrites and edge receipt |
| Client script | Official tag, browser-only rules, receipt adoption, analytics under your consent policy |
| Client provider | Before-paint route notification; no rule engine |

## Failure and limits

The core shares a 300 ms plan deadline, caches release pointers fresh for 20 seconds, and refreshes stale plans in the background. A cold timeout, unavailable/invalid plan, unsupported schema, or decision error forwards no decisions so generic content renders. Cookie observation that already succeeded can survive later decision failure. `x-rm-edge` is `decided` (not HTML-applied) or `bypass:<reason>`. Unknown rules and unsupported operations remain browser-owned. Geographic facts require trustworthy request metadata; Vercel requests do not automatically have Cloudflare's `request.cf`.

The Pages Router can use the script in `pages/_document`, the provider in `pages/_app`, and the same middleware. Compatibility hooks may initially return null and are ignored until ready. Server helpers target App Router Server Components and route handlers; Pages data functions can read the forwarded header through a Web Request passed to `getRightMessage`. The full production browser suite targets App Router.

## Example and verification

```sh
npm ci
npm ci --prefix examples/app
npx playwright install chromium
npm run typecheck && npm run lint && npm test && npm run build
npm run test:e2e
# Or inspect interactively (analytics disabled):
npm run build --prefix examples/app
npm run start --prefix examples/app
```

The Next 16 example uses the real public plan for project 1213277114. Playwright runs a production build and server, replaces only the browser tag with a recording stub, proves same-animation-frame link/back/forward changes using a rAF counter and MutationObserver, and checks pre-rewritten HTML hydration. Its live-plan test asserts the public SaaS variant for `?biz=saas`; a future campaign edit can require updating that assertion. No test records analytics.

Report bugs and feature requests in [GitHub issues](https://github.com/rightmessage/edge-nextjs/issues). See [CONTRIBUTING](CONTRIBUTING.md) and [SECURITY](SECURITY.md).
