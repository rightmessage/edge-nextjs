import { Personalizable } from '@rightmessage/next';
import { getRightMessage } from '@rightmessage/next/server';
export default async function Page() {
 const decisions = await getRightMessage();
 return <main><Personalizable as="h1" id="headline" data-page="about">Generic about heading</Personalizable><h2>Server decisions</h2><pre id="decisions">{JSON.stringify(decisions, null, 2)}</pre></main>;
}
