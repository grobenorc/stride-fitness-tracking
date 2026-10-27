import { describe,it,expect } from 'vitest';
import { deduplicateActivities,mapStravaActivity } from '@/lib/provider-mapping';
const raw={id:42,name:'Ride',sport_type:'VirtualRide',start_date:'2026-10-26T08:00:00Z',distance:40000,elapsed_time:3600,average_watts:200,device_watts:true};
describe('training provider import',()=>{
 it('keeps provider identity and measured power',()=>{const row=mapStravaActivity(raw,'athlete-a');expect(row.id).toBe('strava:42');expect(row.source_id).toBe('42');expect(row.user_id).toBe('athlete-a');expect(row.avg_power).toBe(200);expect(row.sport).toBe('indoor_cycling');});
 it('does not use estimated Strava power as measured power',()=>{expect(mapStravaActivity({...raw,device_watts:false},'a').avg_power).toBeNull();});
 it('prefers Garmin for matching sessions without double-counting',()=>{const strava=mapStravaActivity(raw,'a');const garmin={...strava,id:'42',source:'garmin'};expect(deduplicateActivities([strava,garmin])).toEqual([garmin]);});
 it('preserves separate same-provider sessions and different sports',()=>{const row=mapStravaActivity(raw,'a');expect(deduplicateActivities([row,{...row,id:'strava:43'}])).toHaveLength(2);expect(deduplicateActivities([row,{...row,id:'44',source:'garmin',sport:'running'}])).toHaveLength(2);});
 it('preserves sessions with different durations even at similar start times',()=>{const row=mapStravaActivity(raw,'a');expect(deduplicateActivities([row,{...row,id:'44',source:'garmin',duration_s:7200}])).toHaveLength(2);});
});