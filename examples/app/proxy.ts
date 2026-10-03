import { createRightMessageProxy } from '@rightmessage/next/server';
export const proxy = createRightMessageProxy({ teamPid: '1213277114' });
export const config = { matcher: ['/((?!_next|favicon.ico).*)'] };
