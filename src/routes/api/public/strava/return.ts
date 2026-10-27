import { createFileRoute } from '@tanstack/react-router';

export const Route=createFileRoute('/api/public/strava/return')({server:{handlers:{GET:async({request})=>{
 const url=new URL(request.url);
 // No credentials or writes here. The signed-in opener verifies and consumes the state.
 const result={type:'stride-strava-complete',code:(url.searchParams.get('code')??'').slice(0,2048),state:(url.searchParams.get('state')??'').slice(0,256),scope:(url.searchParams.get('scope')??'').slice(0,512),error:Boolean(url.searchParams.get('error'))};
 const json=JSON.stringify(result).replace(/</g,'\\u003c');
 return new Response(`<!doctype html><html><head><title>Strava connection | Stride</title></head><body><p>Return to Stride to finish your connection.</p><script>if(window.opener){window.opener.postMessage(${json},window.location.origin);window.close();}</script></body></html>`,{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','Referrer-Policy':'no-referrer'}});
}}}});