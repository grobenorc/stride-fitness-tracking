import { useState, type FormEvent } from 'react';
import { Link } from '@tanstack/react-router';
import { useServerFn } from '@tanstack/react-start';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowRight, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { saveProfile, type getAthlete } from '@/lib/athlete.functions';
import { TrainingConnections } from './training-connections';
type AthleteData = Awaited<ReturnType<typeof getAthlete>>;
export function SettingsView({data}:{data?:AthleteData | undefined}){
 const [name,setName]=useState(data?.profile?.display_name??'');const [hr,setHr]=useState(data?.profile?.max_hr??190);const [rest,setRest]=useState(data?.profile?.resting_hr??50);const [ftp,setFtp]=useState(data?.profile?.ftp??250);const [busy,setBusy]=useState(false);const query=useQueryClient();const save=useServerFn(saveProfile);
 async function submitProfile(e:FormEvent){e.preventDefault();if(!data)return;setBusy(true);try{await save({data:{display_name:name,max_hr:hr,resting_hr:rest,ftp}});await query.invalidateQueries();toast.success('Profile saved.');}catch(e){toast.error(e instanceof Error?e.message:'Could not save.');}finally{setBusy(false);}}
 return <><div className="page-heading"><div><div className="eyebrow">MAKE IT YOURS</div><h1>Athlete settings</h1><p>Your profile, your zones, your connection.</p></div></div>{!data&&<div className="connect-strip"><ShieldCheck/><strong>Sign in to save settings and connect Garmin.</strong><Button asChild><Link to="/auth">Sign in<ArrowRight/></Link></Button></div>}<div className="settings-layout"><section className="settings-section"><h2>Athlete profile</h2><form onSubmit={submitProfile}><label>Display name<Input value={name} onChange={e=>setName(e.target.value)} maxLength={100}/></label><div className="form-pair"><label>Maximum heart rate · bpm<Input type="number" min={80} max={240} value={hr} onChange={e=>setHr(Number(e.target.value))}/></label><label>Resting heart rate · bpm<Input type="number" min={25} max={120} value={rest} onChange={e=>setRest(Number(e.target.value))}/></label></div><label>Cycling FTP · watts<Input type="number" min={50} max={600} value={ftp} onChange={e=>setFtp(Number(e.target.value))}/></label><Button disabled={!data||busy}>Save profile</Button></form><div className="zone-list"><h3>Heart-rate zones · % maximum</h3>{([[50,60],[60,70],[70,80],[80,90],[90,100]] as const).map(([low,high],i)=><div key={low}><span>Zone {i+1}</span><progress max={100} value={high}/><strong>{Math.round(hr*low/100)}–{Math.round(hr*high/100)} bpm</strong></div>)}</div></section><TrainingConnections data={data}/></div></>;
}
