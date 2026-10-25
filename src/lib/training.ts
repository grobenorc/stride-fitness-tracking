export type Activity = { id: string; name: string; sport: string; started_at: string; distance_m: number; duration_s: number; avg_hr: number | null; avg_power: number | null; elevation_m: number | null; training_load: number | null };
export type Wellness = { day: string; sleep_seconds: number | null; resting_hr: number | null; hrv: number | null; stress: number | null };
export function sportName(value: string) { return /cycl|bik/.test(value) ? 'Cycling' : /run/.test(value) ? 'Running' : /ski/.test(value) ? 'Skiing' : 'Other'; }
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
export function demoActivities(): Activity[] { return Array.from({length:68},(_,i)=> { const date=new Date('2026-10-24T08:00:00Z'); date.setUTCDate(date.getUTCDate()-Math.floor(i*1.2)); const cycling=i%3!==1; return {id:'demo-'+i,name:cycling ? (['Lake loop · endurance','Morning tempo ride','Forest roads'][i%3] ?? 'Lake loop · endurance') : 'Easy run · Stockholm',sport:cycling?'cycling':'running',started_at:date.toISOString(),distance_m:cycling?42000+(i%5)*8200:7000+(i%4)*1200,duration_s:cycling?5400+(i%5)*900:2400+(i%4)*300,avg_hr:132+i%18,avg_power:cycling?175+i%40:null,elevation_m:cycling?280+i%150:65,training_load:65+i%90}; }); }
export function demoWellness(): Wellness[] { return Array.from({length:28},(_,i)=>{const d=new Date('2026-10-24T12:00:00Z');d.setUTCDate(d.getUTCDate()-27+i); return {day:d.toISOString().slice(0,10),sleep_seconds:25000+i%5*1300,resting_hr:46+i%4,hrv:61+i%7*3,stress:22+i%9};}); }
