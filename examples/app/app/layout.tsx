import { Suspense, type ReactNode } from 'react';
import Script from 'next/script';
import Link from 'next/link';
import { RightMessageProvider, RightMessageScript } from '@rightmessage/next';
export default function Layout({ children }: { children: ReactNode }) {
 return <html lang="en"><body>
  <Script id="analytics-off" strategy="beforeInteractive">{'window.RightMessage = { disableAnalytics: true };'}</Script>
  <RightMessageScript teamPid="1213277114" />
  <nav><Link prefetch={false} href="/">Home</Link>{' | '}<Link prefetch={false} href="/about?biz=saas">About</Link>{' | '}<Link prefetch={false} href="/?biz=saas">SaaS</Link></nav>
  <Suspense fallback={null}><RightMessageProvider /></Suspense>
  {children}
 </body></html>;
}
