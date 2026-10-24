import { z } from 'zod';
const BASE='https://personal.connectapi.garmin.com';
export async function exchangeKey(key: string) {
 const response = await fetch(BASE+'/personalapitoken-service/personal-api/personal-api-key/token',{method:'POST',headers:{Authorization:`ApiKey ${key}`,Accept:'*/*'},signal:AbortSignal.timeout(30000)});
 if(!response.ok) throw new Error(response.status===401 || response.status===403 ? 'Garmin rejected this key. Check it or create a new one.' : 'Garmin is unavailable. Please try again later.');
 const token=(await response.text()).trim(); if(!token) throw new Error('Garmin did not return a connection token.'); return token;
}
export async function garminGet(token:string,path:string) { const r=await fetch(BASE+path,{headers:{Authorization:`Bearer ${token}`,Accept:'application/json'},signal:AbortSignal.timeout(30000)}); if(!r.ok) throw new Error(r.status===401?'Your Garmin connection has expired. Replace your key in Settings.':'Garmin could not return this data. Try syncing again later.'); return r.json() as Promise<unknown>; }
export async function cryptKey(value: string, secret: string, decrypt=false) {
 const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(secret)); const key=await crypto.subtle.importKey('raw',digest,'AES-GCM',false,['encrypt','decrypt']);
 if(decrypt) { const packed=Uint8Array.from(atob(value),c=>c.charCodeAt(0)); const bytes=await crypto.subtle.decrypt({name:'AES-GCM',iv:packed.slice(0,12)},key,packed.slice(12)); return new TextDecoder().decode(bytes); }
 const iv=crypto.getRandomValues(new Uint8Array(12));const bytes=new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv},key,new TextEncoder().encode(value))); const packed=new Uint8Array(12+bytes.length);packed.set(iv);packed.set(bytes,12);return btoa(String.fromCharCode(...packed));
}
export const activitySchema=z.object({activityId:z.union([z.number(),z.string()]),activityName:z.string().optional(),activityType:z.object({typeKey:z.string()}).optional(),startTimeGMT:z.string(),distance:z.number().optional(),duration:z.number().optional(),averageHR:z.number().nullish(),averagePower:z.number().nullish(),elevationGain:z.number().nullish(),activityTrainingLoad:z.number().nullish()});
