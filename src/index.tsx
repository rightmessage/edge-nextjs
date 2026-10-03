'use client';

import { createElement, useLayoutEffect, useRef, type ComponentPropsWithoutRef, type ElementType, type ReactNode } from 'react';
import Script from 'next/script.js';
import { usePathname, useSearchParams } from 'next/navigation.js';
import { loaderBootstrap } from './bootstrap.js';

export interface RightMessageScriptProps { teamPid: string; nonce?: string }
export function RightMessageScript({ teamPid, nonce }: RightMessageScriptProps) {
  return <Script id="rightmessage-loader" strategy="beforeInteractive" nonce={nonce}>{loaderBootstrap(teamPid)}</Script>;
}

type TagWindow = Window & { RM?: { push(command: ['personalize']): unknown } };

export function RightMessageProvider({ children }: { children?: ReactNode }) {
  const pathname = usePathname();
  const search = useSearchParams()?.toString() ?? '';
  const committedRoute = useRef<string | null>(null);
  useLayoutEffect(() => {
    const route = pathname === null ? null : pathname + '?' + search;
    if (route === null || committedRoute.current === route) return;
    const first = committedRoute.current === null;
    committedRoute.current = route;
    if (!first) queueMicrotask(() => (window as TagWindow).RM?.push(['personalize']));
  }, [pathname, search]);
  useHydrationWarnings(pathname, search);
  return children ?? null;
}

function useHydrationWarnings(pathname: string | null, search: string) {
  useLayoutEffect(() => {
    if (process.env.NODE_ENV === 'production') return;
    for (const target of document.querySelectorAll('[data-rm-edge-target][data-rm-personalized="true"]')) {
      if (!target.hasAttribute('data-rm-hydration-safe')) {
        console.warn('[RightMessage] Edge-personalized target lacks <Personalizable>. Wrap the exact target to suppress hydration mismatches.', target);
      }
    }
  }, [pathname, search]);
}

export type PersonalizableProps<T extends ElementType = 'span'> = { as?: T } & Omit<ComponentPropsWithoutRef<T>, 'as' | 'suppressHydrationWarning'>;
export function Personalizable<T extends ElementType = 'span'>({ as, ...props }: PersonalizableProps<T>) {
  return createElement(as ?? 'span', { ...props, suppressHydrationWarning: true, 'data-rm-hydration-safe': '' });
}
