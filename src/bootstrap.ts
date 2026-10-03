export function loaderBootstrap(teamPid: string): string {
  if (!/^[a-zA-Z0-9_-]+$/.test(teamPid)) throw new Error('Invalid RightMessage teamPid');
  return `(function(p,n,o,b){
    var root=n.documentElement,cloak=n.createElement('style'),revealed=false,observer;
    cloak.id='rmcloak';
    cloak.textContent='.rmcloak:not([data-rm-edge-target][data-rm-personalized="true"]):not(:has([data-rm-edge-target][data-rm-personalized="true"])){visibility:hidden!important}';
    n.head.appendChild(cloak);
    function reveal(){if(revealed)return;revealed=true;observer.disconnect();cloak.remove();root.classList.remove('rm-loading');}
    observer=new MutationObserver(function(){if(!n.getElementById('rmcloak'))reveal();});
    observer.observe(n.head,{childList:true});
    window.RM=window.RM||[];o=n.createElement('script');o.type='text/javascript';o.async=true;
    var pin=n.querySelector('meta[name="rm-edge-loader"]');
    var source=pin&&pin.content;
    var prefix='https://t.rightmessage.com/'+p+'.js?revision=';
    o.src=source&&source.indexOf(prefix)===0&&/^[a-f0-9]{64}$/.test(source.slice(prefix.length))?source:'https://t.rightmessage.com/'+p+'.js';
    o.onerror=reveal;b=n.getElementsByTagName('script')[0];b.parentNode.insertBefore(o,b);
  })('${teamPid}',document);`;
}
