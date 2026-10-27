import { z } from 'zod';
import { cryptKey } from './garmin.server';

export const tokenSchema=z.object({access_token:z.string(),refresh_token:z.string(),expires_at:z.number(),athlete:z.object({id:z.number()}).optional()});
export function stravaConfig(){
 const clientId=process.env['STRAVA_CLIENT_ID'];const clientSecret=process.env['STRAVA_CLIENT_SECRET'];const encryption=process.env['GARMIN_ENCRYPTION_KEY'];
 if(!clientId||!clientSecret||!encryption)throw new Error('Strava setup is pending. The app owner must configure the Strava application credentials.');
 return {clientId,clientSecret,encryption};
}
export async function stravaRequest(path:string,init:RequestInit){
 const response=await fetch('https://www.strava.com'+path,{...init,signal:AbortSignal.timeout(30000)});
 if(!response.ok){const body=await response.text();console.error(`Strava request failed [${response.status}]: ${body}`);throw new Error(response.status===429?'Strava’s request limit was reached. Try again later.':response.status===401?'Strava access has expired. Reconnect Strava.':`Strava request failed (${response.status}). Please try again.`);}
 return response;
}
export async function exchangeStrava(fields:Record<string,string>){
 const {clientId,clientSecret}=stravaConfig();
 const response=await stravaRequest('/oauth/token',{method:'POST',body:new URLSearchParams({client_id:clientId,client_secret:clientSecret,...fields})});
 return tokenSchema.parse(await response.json());
}
export async function stravaToken(userId:string){
 const {supabaseAdmin}=await import('@/integrations/supabase/client.server');
 const {data,error}=await supabaseAdmin.from('strava_connections').select('*').eq('user_id',userId).maybeSingle();
 if(error)throw new Error('Could not read your Strava connection.');if(!data)throw new Error('Connect Strava in Settings first.');
 const {encryption}=stravaConfig();let tokens=tokenSchema.parse(JSON.parse(await cryptKey(data.encrypted_tokens,encryption,true)));
 if(tokens.expires_at*1000<=Date.now()+60000){
  tokens=await exchangeStrava({grant_type:'refresh_token',refresh_token:tokens.refresh_token});
  const saved=await supabaseAdmin.from('strava_connections').update({encrypted_tokens:await cryptKey(JSON.stringify(tokens),encryption),expires_at:new Date(tokens.expires_at*1000).toISOString()}).eq('user_id',userId);
  if(saved.error)throw new Error('Could not renew your Strava connection.');
 }
 return tokens.access_token;
}
export async function hashState(state:string){const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(state));return Array.from(new Uint8Array(bytes),v=>v.toString(16).padStart(2,'0')).join('');}