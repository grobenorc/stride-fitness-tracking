export type Activity = { id: string; name: string; sport: string; started_at: string; distance_m: number; duration_s: number; avg_hr: number | null; avg_power: number | null; elevation_m: number | null; training_load: number | null; source?:string; source_id?:string|null };
export type Wellness = { day: string; sleep_seconds: number | null; resting_hr: number | null; hrv: number | null; stress: number | null };
export function sportName(value: string) { return /cycl|bik/.test(value.toLowerCase()) ? 'Cycling' : /run/.test(value.toLowerCase()) ? 'Running' : /ski/.test(value.toLowerCase()) ? 'Skiing' : 'Other'; }
export function keyStatus(expiry: string | null, now: number = Date.now()) { if (!expiry) return 'unknown'; const days = (new Date(expiry).getTime() - now) / 86400000; return days <= 0 ? 'expired' : days <= 14 ? 'expiring' : 'active'; }
export function trainingTrend(activities: Activity[], end: string, days = 84) {
 let fitness = 0, fatigue = 0;
 const finish = new Date(end + 'T12:00:00Z');
 return Array.from({length: days}, (_, i) => {
  const date = new Date(finish); date.setUTCDate(date.getUTCDate() - days + 1 + i); const day = date.toISOString().slice(0,10);
  const load = activities.filter(a => a.started_at.slice(0,10) === day).reduce((sum,a) => sum + (a.training_load ?? 0), 0);
  fitness += (load - fitness) * (1 - Math.exp(-1/42)); fatigue += (load - fatigue) * (1 - Math.exp(-1/7));
  return { day, label: date.toLocaleDateString('en-GB',{day:'numeric',month:'short',timeZone:'UTC'}), fitness: Math.round(fitness), fatigue: Math.round(fatigue), form: Math.round(fitness-fatigue), load };
 });
}
export function csvActivities(activities: Activity[]) { const escape = (v: unknown) => '"' + String(v ?? '').replace(/^[=+@-]/,'\'$&').replaceAll('"','""') + '"'; return ['id,name,sport,started_at,distance_m,duration_s,avg_hr,avg_power,elevation_m,training_load', ...activities.map(a => [a.id,a.name,a.sport,a.started_at,a.distance_m,a.duration_s,a.avg_hr,a.avg_power,a.elevation_m,a.training_load].map(escape).join(','))].join('\n'); }
export function demoActivities(): Activity[] { return Array.from({length:68},(_,i)=> { const date=new Date('2026-10-24T08:00:00Z'); date.setUTCDate(date.getUTCDate()-Math.floor(i*1.2)); const cycling=i%3!==1; return {id:'demo-'+i,name:i%7===6?'Classic ski · endurance':cycling ? (['Lake loop · endurance','Morning tempo ride','Forest roads'][i%3] ?? 'Lake loop · endurance') : 'Easy run · Stockholm',sport:i%7===6?'cross_country_skiing':cycling?(i%4===0?'indoor_cycling':'road_biking'):'trail_running',started_at:date.toISOString(),distance_m:cycling?42000+(i%5)*8200:7000+(i%4)*1200,duration_s:cycling?5400+(i%5)*900:2400+(i%4)*300,avg_hr:132+i%18,avg_power:cycling?175+i%40:null,elevation_m:cycling?280+i%150:65,training_load:65+i%90}; }); }
export function demoWellness(): Wellness[] { return Array.from({length:28},(_,i)=>{const d=new Date('2026-10-24T12:00:00Z');d.setUTCDate(d.getUTCDate()-27+i); return {day:d.toISOString().slice(0,10),sleep_seconds:25000+i%5*1300,resting_hr:46+i%4,hrv:61+i%7*3,stress:22+i%9};}); }

export function periodActivities(activities: Activity[], end: string, days: number) {
 const finish = new Date(end + 'T23:59:59.999Z').getTime();
 const start = new Date(end + 'T00:00:00Z').getTime() - (days-1)*86400000;
 return activities.filter(a => {const t=new Date(a.started_at).getTime();return t>=start && t<=finish;});
}
export function activityDays(activities: Activity[], end: string, days: number) {
 return Array.from({length:days},(_,i)=>{const date=new Date(end+'T12:00:00Z');date.setUTCDate(date.getUTCDate()-days+1+i);const day=date.toISOString().slice(0,10);const rows=activities.filter(a=>a.started_at.slice(0,10)===day);return {day,hours:rows.reduce((s,a)=>s+a.duration_s,0)/3600,cycling:rows.filter(a=>sportName(a.sport)==='Cycling').reduce((s,a)=>s+a.duration_s,0)/3600,running:rows.filter(a=>sportName(a.sport)==='Running').reduce((s,a)=>s+a.duration_s,0)/3600,other:rows.filter(a=>!['Cycling','Running'].includes(sportName(a.sport))).reduce((s,a)=>s+a.duration_s,0)/3600,distance:rows.reduce((s,a)=>s+a.distance_m,0)/1000};});
}
export function sportStatistics(activities: Activity[]) {
 const distance=activities.reduce((s,a)=>s+a.distance_m,0);const duration=activities.reduce((s,a)=>s+a.duration_s,0);
 const weighted=(key:'avg_hr'|'avg_power')=>{const rows=activities.filter(a=>a[key]!==null&&a.duration_s>0);const seconds=rows.reduce((s,a)=>s+a.duration_s,0);return seconds?rows.reduce((s,a)=>s+(a[key]??0)*a.duration_s,0)/seconds:null;};
 return {count:activities.length,distance:distance/1000,hours:duration/3600,elevation:activities.reduce((s,a)=>s+(a.elevation_m??0),0),heartRate:weighted('avg_hr'),power:weighted('avg_power'),pace:distance>0?duration/(distance/1000):null,speed:duration>0?distance/1000/(duration/3600):null,longest:activities.length?Math.max(...activities.map(a=>a.distance_m))/1000:0};
}
