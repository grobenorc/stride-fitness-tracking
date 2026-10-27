import { z } from 'zod';
import { sportName, type Activity } from './training';

export const stravaActivitySchema = z.object({
 id:z.number().int(), name:z.string(), sport_type:z.string().optional(), type:z.string().optional(),
 start_date:z.string().datetime(), distance:z.number(), elapsed_time:z.number(),
 total_elevation_gain:z.number().nullish(), average_heartrate:z.number().nullish(),
 average_watts:z.number().nullish(), device_watts:z.boolean().optional(), trainer:z.boolean().optional(),
});
export function mapStravaActivity(a:z.infer<typeof stravaActivitySchema>,userId:string){
 const type=a.sport_type??a.type??'other';
 const sport=/ride/i.test(type)?(a.trainer||type==='VirtualRide'?'indoor_cycling':'cycling'):/run/i.test(type)?(type==='VirtualRun'?'treadmill_running':'running'):type==='NordicSki'?'cross_country_skiing':type.toLowerCase();
 return {id:`strava:${a.id}`,source:'strava',source_id:String(a.id),user_id:userId,name:a.name,sport,started_at:a.start_date,distance_m:a.distance,duration_s:a.elapsed_time,avg_hr:a.average_heartrate??null,avg_power:a.device_watts?a.average_watts??null:null,elevation_m:a.total_elevation_gain??null,training_load:null};
}
// Preserve originals in storage; prefer Garmin when both providers report the same session.
export function deduplicateActivities<T extends Activity & {source?:string}>(rows:T[]):T[]{
 const ordered=[...rows].sort((a,b)=>(a.source==='garmin'?0:1)-(b.source==='garmin'?0:1));
 const kept:T[]=[];
 for(const row of ordered){
  const duplicate=kept.some(a=>a.source&&row.source&&a.source!==row.source&&sportName(a.sport)===sportName(row.sport)&&Math.abs(Date.parse(a.started_at)-Date.parse(row.started_at))<=60000&&Math.abs(a.duration_s-row.duration_s)<=Math.max(60,a.duration_s*.05)&&Math.abs(a.distance_m-row.distance_m)<=Math.max(100,a.distance_m*.02));
  if(!duplicate)kept.push(row);
 }
 return kept.sort((a,b)=>Date.parse(b.started_at)-Date.parse(a.started_at));
}