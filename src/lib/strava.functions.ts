import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { mapStravaActivity, stravaActivitySchema } from './provider-mapping';

export const getStravaConnection=createServerFn({method:'GET'}).middleware([requireSupabaseAuth]).handler(async({context})=>{
 const {supabaseAdmin}=await import('@/integrations/supabase/client.server');
 const {data,error}=await supabaseAdmin.from('strava_connections').select('last_sync_at,status').eq('user_id',context.userId).maybeSingle();
 if(error)throw new Error('Could not load your Strava connection.');
 return {configured:Boolean(process.env['STRAVA_CLIENT_ID']&&process.env['STRAVA_CLIENT_SECRET']),connection:data};
});
export const startStravaConnect=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator((input)=>z.object({origin:z.enum(['http://localhost:8080','https://stride-fitness-tracking.lovable.app','https://id-preview--1d22abe0-f38f-451f-8210-d1e0cdc6421c.lovable.app'])}).parse(input)).handler(async({data,context})=>{
 const {stravaConfig,hashState}=await import('./strava.server');const {clientId}=stravaConfig();
 const state=crypto.randomUUID()+crypto.randomUUID();const redirectUri=data.origin+'/api/public/strava/return';
 const {supabaseAdmin}=await import('@/integrations/supabase/client.server');
 const saved=await supabaseAdmin.from('training_oauth_states').insert({state_hash:await hashState(state),user_id:context.userId,expires_at:new Date(Date.now()+600000).toISOString(),redirect_uri:redirectUri});
 if(saved.error)throw new Error('Could not start Strava authorization.');
 const params=new URLSearchParams({client_id:clientId,redirect_uri:redirectUri,response_type:'code',approval_prompt:'force',scope:'read,activity:read_all',state});
 return {authorizationUrl:'https://www.strava.com/oauth/authorize?'+params};
});
export const completeStravaConnect=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator((input)=>z.object({code:z.string().min(1).max(2048),state:z.string().min(32).max(256),scope:z.string().max(512)}).parse(input)).handler(async({data,context})=>{
 const {hashState,exchangeStrava,stravaConfig}=await import('./strava.server');const {cryptKey}=await import('./garmin.server');
 const {supabaseAdmin}=await import('@/integrations/supabase/client.server');
 const consumed=await supabaseAdmin.from('training_oauth_states').delete().eq('state_hash',await hashState(data.state)).eq('user_id',context.userId).gt('expires_at',new Date().toISOString()).select('user_id').maybeSingle();
 if(consumed.error||!consumed.data)throw new Error('Authorization expired or was already used. Connect Strava again.');
 if(!data.scope.split(',').includes('activity:read_all'))throw new Error('Allow activity access in Strava to import your training.');
 const tokens=await exchangeStrava({grant_type:'authorization_code',code:data.code});
 if(!tokens.athlete)throw new Error('Strava did not identify the connected athlete.');
 const saved=await supabaseAdmin.from('strava_connections').upsert({user_id:context.userId,athlete_id:String(tokens.athlete.id),encrypted_tokens:await cryptKey(JSON.stringify(tokens),stravaConfig().encryption),expires_at:new Date(tokens.expires_at*1000).toISOString(),status:'connected'});
 if(saved.error)throw new Error('Could not securely save your Strava connection.');return {ok:true};
});
export const syncStrava=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).handler(async({context})=>{
 const {stravaToken,stravaRequest}=await import('./strava.server');const token=await stravaToken(context.userId);
 const after=Math.floor(Date.now()/1000)-90*86400;let count=0;
 for(let page=1;page<=10;page++){
  const response=await stravaRequest(`/api/v3/athlete/activities?after=${after}&per_page=100&page=${page}`,{headers:{Authorization:`Bearer ${token}`}});
  const activities=z.array(stravaActivitySchema).parse(await response.json());
  if(activities.length){const saved=await context.supabase.from('activities').upsert(activities.map(a=>mapStravaActivity(a,context.userId)),{onConflict:'user_id,source,source_id'});if(saved.error)throw new Error('Strava activities could not be saved.');count+=activities.length;}
  if(activities.length<100)break;
 }
 const {supabaseAdmin}=await import('@/integrations/supabase/client.server');const saved=await supabaseAdmin.from('strava_connections').update({last_sync_at:new Date().toISOString()}).eq('user_id',context.userId);
 if(saved.error)throw new Error('Activities imported, but sync status could not be saved.');return {count};
});
export const disconnectTrainingProvider=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator((input)=>z.enum(['garmin','strava']).parse(input)).handler(async({data,context})=>{
 if(data==='strava'){const {stravaToken,stravaRequest}=await import('./strava.server');const token=await stravaToken(context.userId);await stravaRequest('/oauth/deauthorize',{method:'POST',headers:{Authorization:`Bearer ${token}`}});}
 const {supabaseAdmin}=await import('@/integrations/supabase/client.server');const result=await supabaseAdmin.from(data==='strava'?'strava_connections':'garmin_connections').delete().eq('user_id',context.userId);
 if(result.error)throw new Error('Could not disconnect this account.');return {ok:true};
});