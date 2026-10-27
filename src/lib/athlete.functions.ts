import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { deduplicateActivities } from './provider-mapping';
export const getAthlete = createServerFn({method:'GET'}).middleware([requireSupabaseAuth]).handler(async({context})=>{
 const {supabase,userId}=context;
 const [profile,connection,activities,wellness]=await Promise.all([supabase.from('profiles').select('*').eq('id',userId).single(),supabase.from('garmin_connections').select('status,expires_at,last_sync_at').eq('user_id',userId).maybeSingle(),supabase.from('activities').select('*').eq('user_id',userId).order('started_at',{ascending:false}).limit(1000),supabase.from('wellness').select('*').eq('user_id',userId).order('day',{ascending:true}).limit(1000)]);
 for(const r of [profile,connection,activities,wellness]) if(r.error) throw new Error('Could not load your athlete data. Please try again.');
  const {supabaseAdmin}=await import('@/integrations/supabase/client.server');
  const strava=await supabaseAdmin.from('strava_connections').select('last_sync_at,status').eq('user_id',userId).maybeSingle();
  if(strava.error)throw new Error('Could not load your Strava connection.');
  return {profile:profile.data,connection:connection.data,activities:deduplicateActivities(activities.data??[]),wellness:wellness.data??[],strava:{configured:Boolean(process.env['STRAVA_CLIENT_ID']&&process.env['STRAVA_CLIENT_SECRET']),connection:strava.data}};
});
export const saveProfile=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator((data)=>z.object({display_name:z.string().trim().max(100),max_hr:z.number().int().min(80).max(240),resting_hr:z.number().int().min(25).max(120),ftp:z.number().int().min(50).max(600)}).parse(data)).handler(async({data,context})=>{ const {error}=await context.supabase.from('profiles').update(data).eq('id',context.userId);if(error)throw new Error('Could not save your profile.');return {ok:true}; });
export const saveGarminKey=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator((data)=>z.object({key:z.string().trim().min(10).max(8192),expires_at:z.string().datetime().nullable()}).parse(data)).handler(async({data,context})=>{
  const {cryptKey,exchangeKey}=await import('./garmin.server');
 const secret=process.env['GARMIN_ENCRYPTION_KEY']; if(!secret)throw new Error('Secure key storage is not ready.');
 await exchangeKey(data.key);
 const encrypted_key=await cryptKey(data.key,secret);
 // Authorization is established by requireSupabaseAuth; privileged storage is needed because key columns are never browser-readable.
 const {supabaseAdmin}=await import('@/integrations/supabase/client.server');
 const {error}=await supabaseAdmin.from('garmin_connections').upsert({user_id:context.userId,encrypted_key,expires_at:data.expires_at,status:'connected'});if(error)throw new Error('Could not securely save your Garmin connection.');return {ok:true};
});
export const syncGarmin=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).handler(async({context})=>{
  const {cryptKey,exchangeKey,garminGet,activitySchema}=await import('./garmin.server');
 const secret=process.env['GARMIN_ENCRYPTION_KEY'];if(!secret)throw new Error('Secure key storage is not ready.');
 const {supabaseAdmin}=await import('@/integrations/supabase/client.server');
 const {data:connection,error}=await supabaseAdmin.from('garmin_connections').select('encrypted_key').eq('user_id',context.userId).maybeSingle();if(error||!connection)throw new Error('Connect Garmin in Settings first.');
 const token=await exchangeKey(await cryptKey(connection.encrypted_key,secret,true));
 const end=new Date().toISOString().slice(0,10);const from=new Date();from.setUTCDate(from.getUTCDate()-90);const start=from.toISOString().slice(0,10);
 let count=0;
 for(let offset=0;offset<1000;offset+=100){
  const raw=await garminGet(token,`/activitylist-service/activities/search/activities?start=${offset}&limit=100&startDate=${start}&endDate=${end}`);
   const rows=z.array(activitySchema).parse(raw).map(a=>({id:String(a.activityId),source:'garmin',source_id:String(a.activityId),user_id:context.userId,name:a.activityName??'Untitled activity',sport:a.activityType?.typeKey??'other',started_at:a.startTimeGMT.includes('Z')?a.startTimeGMT:a.startTimeGMT.replace(' ','T')+'Z',distance_m:a.distance??0,duration_s:a.duration??0,avg_hr:a.averageHR??null,avg_power:a.averagePower??null,elevation_m:a.elevationGain??null,training_load:a.activityTrainingLoad??null}));
   if(rows.length){const {error}=await context.supabase.from('activities').upsert(rows,{onConflict:'user_id,source,source_id'});if(error)throw new Error('Activities could not be saved.');count+=rows.length;}if(rows.length<100)break;
 }
 let wellnessWarning=false;
 // Wellness is optional: missing device data must not block activity sync.
 try {
  const raw=await garminGet(token,`/usersummary-service/v2/dailysummaries?startDate=${start}&endDate=${end}`);
  const summary=z.object({data:z.array(z.object({calendarDate:z.string(),restingHeartRate:z.number().nullish(),averageStressLevel:z.number().nullish()}))}).parse(raw);
  const rows=summary.data.map(d=>({user_id:context.userId,day:d.calendarDate,resting_hr:d.restingHeartRate??null,stress:d.averageStressLevel??null}));if(rows.length){const r=await context.supabase.from('wellness').upsert(rows);if(r.error)wellnessWarning=true;}
 }catch{wellnessWarning=true;}
 const r=await supabaseAdmin.from('garmin_connections').update({last_sync_at:new Date().toISOString(),status:'connected'}).eq('user_id',context.userId);if(r.error)throw new Error('Data imported, but sync status could not be saved.');
 return {count,wellnessWarning};
});
