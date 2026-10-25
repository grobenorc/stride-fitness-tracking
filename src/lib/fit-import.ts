import type { Recording, Sample } from './sport-analysis';

export async function readFit(buffer: ArrayBuffer, name: string): Promise<Recording> {
 const { Decoder, Stream } = await import('@garmin/fitsdk');
 const decoder=new Decoder(Stream.fromArrayBuffer(buffer));
 if(!decoder.isFIT() || !decoder.checkIntegrity()) throw new Error('This is not a valid, intact FIT recording.');
 const {messages,errors}=decoder.read();
 if(errors.length) throw new Error('The recording could not be fully decoded.');
 const session=messages.sessionMesgs?.[0];
 if(!session || (messages.sessionMesgs?.length??0)>1) throw new Error('Choose a single-sport activity FIT file.');
 const timestamp=(v:unknown)=>v instanceof Date?v.getTime():typeof v==='number'?(v+631065600)*1000:NaN;
 const records=(messages.recordMesgs??[]).filter(r=>Number.isFinite(timestamp(r.timestamp)));
 const origin=timestamp(session.startTime??records[0]?.timestamp);
 if(!Number.isFinite(origin)||!records.length)throw new Error('No timestamped activity measurements in this file.');
 const number=(v:unknown):number|null=>typeof v==='number'&&Number.isFinite(v)&&v>=0?v:null;
 const samples:Sample[]=records.map(r=>({second:Math.round((timestamp(r.timestamp)-origin)/1000),power:number(r.power),hr:number(r.heartRate),speed:number(r.enhancedSpeed??r.speed),cadence:number(r.cadence)})).sort((a,b)=>a.second-b.second);
 const sport=String(session.sport);const sub=String(session.subSport);
 const base=/cycling|^2$/.test(sport)?'cycling':/running|^1$/.test(sport)?'running':/crossCountrySkiing|^12$/.test(sport)?'cross_country_skiing':'';
 if(!base)throw new Error('Choose a cycling, running or cross-country skiing recording.');
 const subtype=/indoorCycling|treadmill|virtualActivity|^6$|^1$|^58$/.test(sub)?'indoor':/road|mountain|gravel|trail/.test(sub)?'outdoor':'';
 return {samples,activity:{id:`fit-${origin}-${name}`,name:name.replace(/\.fit$/i,''),sport:`${base}${subtype?'_'+subtype:''}`,started_at:new Date(origin).toISOString(),distance_m:number(session.totalDistance)??0,duration_s:number(session.totalTimerTime)??0,avg_hr:number(session.avgHeartRate),avg_power:number(session.avgPower),elevation_m:number(session.totalAscent),training_load:null}};
}