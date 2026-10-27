import { useState, type FormEvent } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowRight, RefreshCw, ShieldCheck, Unplug } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { saveGarminKey, syncGarmin, type getAthlete } from '@/lib/athlete.functions';
import { startStravaConnect, completeStravaConnect, syncStrava, disconnectTrainingProvider } from '@/lib/strava.functions';
import { keyStatus } from '@/lib/training';

type AthleteData=Awaited<ReturnType<typeof getAthlete>>;
function waitForStrava(popup:Window){
 return new Promise<{code:string;state:string;scope:string}>((resolve,reject)=>{
  const cleanup=()=>{window.removeEventListener('message',receive);window.clearInterval(poll);window.clearTimeout(timeout);};
  const receive=(event:MessageEvent)=>{
   if(event.origin!==window.location.origin||event.source!==popup||event.data?.type!=='stride-strava-complete')return;
   cleanup();
   if(event.data.error||typeof event.data.code!=='string'||typeof event.data.state!=='string'||typeof event.data.scope!=='string'){reject(new Error('Strava authorization was cancelled.'));return;}
   resolve({code:event.data.code,state:event.data.state,scope:event.data.scope});
  };
  window.addEventListener('message',receive);
  const poll=window.setInterval(()=>{if(popup.closed){cleanup();reject(new Error('Strava window closed before authorization finished.'));}},750);
  const timeout=window.setTimeout(()=>{cleanup();popup.close();reject(new Error('Strava authorization timed out. Try again.'));},600000);
 });
}
export function TrainingConnections({data}:{data?:AthleteData|undefined}){
 const [key,setKey]=useState('');const [expiry,setExpiry]=useState('');const [busy,setBusy]=useState<string|null>(null);
 const query=useQueryClient();const saveKey=useServerFn(saveGarminKey);const garminSync=useServerFn(syncGarmin);const stravaSync=useServerFn(syncStrava);const start=useServerFn(startStravaConnect);const complete=useServerFn(completeStravaConnect);const disconnect=useServerFn(disconnectTrainingProvider);
 const status=keyStatus(data?.connection?.expires_at??null);const connected=Boolean(data?.connection);const stravaConnected=Boolean(data?.strava.connection);
 async function run(label:string,action:()=>Promise<unknown>){setBusy(label);try{await action();}catch(error){toast.error(error instanceof Error?error.message:'Connection failed.');}finally{await query.invalidateQueries();setBusy(null);}}
 async function connectGarmin(event:FormEvent){event.preventDefault();if(!data)return;await run('garmin',async()=>{try{await saveKey({data:{key,expires_at:expiry?new Date(expiry+'T23:59:59Z').toISOString():null}});}finally{setKey('');}toast.success('Garmin connection saved.');const result=await garminSync();toast.success(`${result.count} Garmin activities imported${result.wellnessWarning?' · some recovery data unavailable':''}.`);});}
 async function connectStrava(){
  if(!data)return;
  const popup=window.open('','stride-strava','width=600,height=720');if(!popup){toast.error('Allow popups to connect Strava.');return;}
  await run('strava',async()=>{try{
   const result=await start({data:{origin:window.location.origin as 'http://localhost:8080'|'https://stride-fitness-tracking.lovable.app'|'https://id-preview--1d22abe0-f38f-451f-8210-d1e0cdc6421c.lovable.app'}});
   const completion=waitForStrava(popup);popup.location.href=result.authorizationUrl;
   await complete({data:await completion});toast.success(stravaConnected?'Strava reconnected.':'Strava connected.');
   const imported=await stravaSync();toast.success(`${imported.count} Strava activities imported.`);
  }finally{popup.close();}});
 }
 async function remove(provider:'garmin'|'strava'){
  if(!window.confirm(`Disconnect ${provider==='garmin'?'Garmin':'Strava'}? Imported activities will remain in your workspace.`))return;
  await run(provider,async()=>{await disconnect({data:provider});toast.success(`${provider==='garmin'?'Garmin':'Strava'} disconnected.`);});
 }
 const lastSync=(date:string|null|undefined)=>date?new Date(date).toLocaleString('en-GB'):'Never synced';
 return <div className="provider-connections"><section className="settings-section"><div className="section-heading"><h2>Garmin</h2><ShieldCheck className="text-primary"/></div>
  <div className="connection-state"><span className={`status-dot ${connected&&status!=='expired'?'connected':''}`}/>{connected?(status==='expired'?'Key expired':'Connected'):'Not connected'}</div>
  {connected&&<p className="provider-note">Last sync: {lastSync(data?.connection?.last_sync_at)}{data?.connection?.expires_at&&<> · Key expires {new Date(data.connection.expires_at).toLocaleDateString('en-GB')}</>}</p>}
  <form onSubmit={connectGarmin}><label>{connected?'Replacement personal API key':'Personal API key'}<Input aria-label="Garmin Personal API key" type="password" autoComplete="off" value={key} onChange={event=>setKey(event.target.value)} minLength={10} maxLength={8192} required placeholder="Paste your Garmin key" disabled={!data||Boolean(busy)}/></label><label>Key expiry date (optional)<Input type="date" value={expiry} onChange={event=>setExpiry(event.target.value)} disabled={!data||Boolean(busy)}/></label><Button disabled={!data||Boolean(busy)}>{busy==='garmin'?'Please wait…':connected?'Replace key & sync':'Connect Garmin'}<ArrowRight/></Button></form>
  {connected&&<div className="provider-actions"><Button variant="outline" disabled={Boolean(busy)} onClick={()=>run('garmin',async()=>{const result=await garminSync();toast.success(`${result.count} activities synced${result.wellnessWarning?' · some recovery data unavailable':''}.`);})}><RefreshCw/>Sync Garmin</Button><Button variant="ghost" disabled={Boolean(busy)} onClick={()=>remove('garmin')}><Unplug/>Disconnect</Button></div>}
  <p className="security-note"><ShieldCheck size={16}/>Your key is encrypted and never displayed again.</p><a className="external-link" href="https://developer.garmin.com/gc-developer-program/personal/personal-api/" target="_blank" rel="noreferrer">Get a Garmin Personal API key ↗</a>
 </section><section className="settings-section"><div className="section-heading"><h2>Strava</h2><ArrowRight className="text-primary"/></div>
  <div className="connection-state"><span className={`status-dot ${stravaConnected?'connected':''}`}/>{stravaConnected?'Connected':data&&!data.strava.configured?'Setup pending':'Not connected'}</div>
  {stravaConnected&&<p className="provider-note">Last sync: {lastSync(data?.strava.connection?.last_sync_at)}</p>}
  {data&&!data.strava.configured&&<p className="provider-note">The app owner needs to configure the Strava application before athletes can connect.</p>}
  <Button onClick={connectStrava} disabled={!data||!data.strava.configured||Boolean(busy)}>{busy==='strava'?'Please wait…':stravaConnected?'Reconnect Strava':'Connect with Strava'}<ArrowRight/></Button>
  {stravaConnected&&<div className="provider-actions"><Button variant="outline" disabled={Boolean(busy)} onClick={()=>run('strava',async()=>{const result=await stravaSync();toast.success(`${result.count} Strava activities synced.`);})}><RefreshCw/>Sync Strava</Button><Button variant="ghost" disabled={Boolean(busy)} onClick={()=>remove('strava')}><Unplug/>Disconnect</Button></div>}
  <p className="security-note"><ShieldCheck size={16}/>Read-only access · authorization renews automatically.</p>
 </section></div>;
}