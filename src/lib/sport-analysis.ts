import { sportName, sportStatistics, type Activity } from './training';

export type Environment = 'All' | 'Outdoor' | 'Indoor' | 'Unknown';
export type Sample = { second: number; power: number | null; hr: number | null; speed: number | null; cadence: number | null };
export type Recording = { activity: Activity; samples: Sample[] };
export const curveDurations = [5, 15, 30, 60, 180, 300, 600, 1200, 1800, 3600] as const;
export function environment(activity: Activity): Exclude<Environment, 'All'> {
 const type = activity.sport.toLowerCase();
 if (/indoor|virtual|treadmill|stationary/.test(type)) return 'Indoor';
 if (/road|mountain|gravel|trail|cross_country|outdoor/.test(type)) return 'Outdoor';
 return 'Unknown';
}
export function filterSport(rows: Activity[], sport: string, setting: Environment) {
 return rows.filter(a => sportName(a.sport) === sport && (setting === 'All' || environment(a) === setting));
}
export function effortProgression(rows: Activity[], sport: string) {
 return [...rows].sort((a,b) => a.started_at.localeCompare(b.started_at)).map(a => ({
  day:a.started_at.slice(0,10), name:a.name, hr:a.avg_hr, power:a.avg_power,
  speed:a.duration_s>0 && a.distance_m>0 ? a.distance_m/a.duration_s*3.6:null,
  efficiency:a.avg_hr && a.avg_hr>0 ? sport==='Cycling' ? (a.avg_power!==null?a.avg_power/a.avg_hr:null) : (a.duration_s>0&&a.distance_m>0?a.distance_m/a.duration_s*3.6/a.avg_hr:null) : null,
  load:a.training_load, setting:environment(a),
 }));
}
// Only contiguous, measured one-second windows qualify. Missing data is never zero-filled.
export function bestCurve(recordings: Recording[], metric: 'power'|'speed') {
 return curveDurations.map(duration => {
  let best: number|null = null; let activity = '';
  for (const recording of recordings) {
   let sum=0, start=0;
   const samples=recording.samples;
   for (let i=0;i<samples.length;i++) {
    const sample=samples[i]; if (!sample) continue;
    const value=sample[metric]; const previous=samples[i-1];
    if (value===null || !Number.isFinite(value) || value<0 || (previous && sample.second-previous.second!==1)) {sum=0;start=i;if(value===null || !Number.isFinite(value) || value<0){start=i+1;continue;}}
    sum+=value;
    if(i-start+1>duration){sum-=samples[start]?.[metric]??0;start++;}
    if(i-start+1===duration && (best===null || sum/duration>best)){best=sum/duration;activity=recording.activity.name;}
   }
  }
  return {duration,label:duration<60?`${duration}s`:`${duration/60}m`,value:best===null?null:metric==='speed'?best*3.6:best,activity};
 });
}
export function zoneDistribution(recordings: Recording[], metric:'power'|'hr', threshold:number|null) {
 const boundaries = metric==='power' ? [0.55,0.75,0.9,1.05,1.2,1.5] : [0.6,0.7,0.8,0.9];
 const zones=Array.from({length:boundaries.length+1},(_,i)=>({zone:`Z${i+1}`,seconds:0,low:i===0?0:(boundaries[i-1]??0),high:boundaries[i]??null}));
 if(threshold===null || threshold<=0) return {zones,measured:0,missing:0};
 let missing=0;
 for(const recording of recordings) for(let i=0;i<recording.samples.length;i++) {
  const sample=recording.samples[i]; if(!sample) continue;
  const next=recording.samples[i+1];const seconds=next?next.second-sample.second:1;
  if(seconds<=0 || seconds>10){missing+=Math.max(0,seconds);continue;}
  const value=sample[metric];if(value===null || value<0 || !Number.isFinite(value)){missing+=seconds;continue;}
  const index=boundaries.findIndex(b=>value/threshold<b);const zone=zones[index===-1?zones.length-1:index];if(zone)zone.seconds+=seconds;
 }
 return {zones,measured:zones.reduce((s,z)=>s+z.seconds,0),missing};
}
export function compareEnvironments(rows: Activity[]) {
 return (['Outdoor','Indoor','Unknown'] as const).map(setting=>({setting,...sportStatistics(rows.filter(a=>environment(a)===setting))}));
}
export function recordingMetrics(recording: Recording, ftp:number|null) {
 const samples=recording.samples;
 const powers=samples.map(s=>s.power).filter((p):p is number=>p!==null&&Number.isFinite(p)&&p>=0);
 const mean=powers.length?powers.reduce((a,b)=>a+b,0)/powers.length:null;
 let fourth=0,count=0,sum=0,start=0;
 for(let i=0;i<samples.length;i++){
  const s=samples[i];if(!s)continue;const prev=samples[i-1];
  if(s.power===null || !Number.isFinite(s.power) || s.power<0 || (prev && s.second-prev.second!==1)){sum=0;start=i;if(s.power===null||!Number.isFinite(s.power)||s.power<0){start=i+1;continue;}}
  sum+=s.power;
  if(i-start+1>30){sum-=samples[start]?.power??0;start++;}
  if(i-start+1===30){fourth+=(sum/30)**4;count++;}
 }
 const np=count?(fourth/count)**0.25:null;
 const midpoint=((samples[0]?.second??0)+(samples.at(-1)?.second??0))/2;
 const ratio=(secondHalf:boolean)=>{const paired=samples.filter(s=>(s.second>=midpoint)===secondHalf&&s.power!==null&&s.hr!==null&&(s.hr??0)>0);const hr=paired.reduce((v,s)=>v+(s.hr??0),0);return hr&&paired.length?paired.reduce((v,s)=>v+(s.power??0),0)/hr:null;};
 const first=ratio(false),last=ratio(true);
 const work=samples.reduce((total,s,i)=>{const next=samples[i+1];const seconds=next?next.second-s.second:1;return s.power!==null&&Number.isFinite(s.power)&&s.power>=0&&seconds>0&&seconds<=10?total+s.power*seconds:total;},0);
 return {mean,np,intensity:np!==null&&ftp&&ftp>0?np/ftp:null,variability:np!==null&&mean&&mean>0?np/mean:null,drift:first&&last!==null?(1-last/first)*100:null,work:powers.length?work/1000:null};
}
export function demoRecording(activity: Activity): Recording {
 const length=Math.min(7200,Math.floor(activity.duration_s));
 return {activity,samples:Array.from({length},(_,second)=>{
  const interval=second%900>600?1.3:0.91;const wave=Math.sin(second/35)*0.08;
  return {second,power:activity.avg_power===null?null:Math.round(activity.avg_power*(interval+wave)),hr:Math.round((activity.avg_hr??140)+(interval-1)*25+second/length*6+Math.sin(second/90)*3),speed:activity.distance_m/activity.duration_s*(interval+wave),cadence:Math.round((sportName(activity.sport)==='Cycling'?85:82)+wave*30)};
 })};
}