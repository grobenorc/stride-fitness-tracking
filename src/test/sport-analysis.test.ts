import { describe, expect, it } from 'vitest';
import { bestCurve, environment, filterSport, recordingMetrics, zoneDistribution, type Recording } from '@/lib/sport-analysis';
import { demoActivities } from '@/lib/training';
import { readFit } from '@/lib/fit-import';
function recording():Recording {const activity=demoActivities()[0];if(!activity)throw new Error('Missing fixture');return {activity,samples:Array.from({length:60},(_,second)=>({second,power:200,hr:140,speed:3,cadence:80}))};}
describe('Deep sport analysis',()=>{
 it('filters indoor and outdoor cycling by explicit subtype, not activity name',()=>{const a=recording().activity;const rows=[{...a,id:'a',sport:'indoor_cycling'},{...a,id:'b',sport:'road_biking'},{...a,id:'c',sport:'cycling',name:'Indoor ride'}];expect(filterSport(rows,'Cycling','Indoor').map(r=>r.id)).toEqual(['a']);expect(filterSport(rows,'Cycling','Outdoor').map(r=>r.id)).toEqual(['b']);expect(environment(rows[2]??a)).toBe('Unknown');});
 it('includes skiing as a separate sport',()=>{expect(filterSport([{...recording().activity,sport:'cross_country_skiing'}],'Skiing','All')).toHaveLength(1);});
 it('computes observed power curves and excludes durations longer than recorded data',()=>{const curve=bestCurve([recording()],'power');expect(curve.find(p=>p.duration===60)?.value).toBe(200);expect(curve.find(p=>p.duration===180)?.value).toBeNull();});
 it('never bridges gaps or missing measurements in best effort windows',()=>{const r=recording();r.samples=r.samples.map(s=>({...s,second:s.second<30?s.second:s.second+10}));expect(bestCurve([r],'power').find(p=>p.duration===60)?.value).toBeNull();r.samples[2]={second:2,power:null,hr:null,speed:null,cadence:null};expect(bestCurve([r],'power').find(p=>p.duration===30)?.value).toBe(200);});
 it('calculates power zone time from samples and FTP, not average power',()=>{const result=zoneDistribution([recording()],'power',250);expect(result.measured).toBe(60);expect(result.zones.find(z=>z.zone==='Z3')?.seconds).toBe(60);expect(zoneDistribution([recording()],'power',null).measured).toBe(0);});
 it('calculates HR zone time from maximum HR and excludes missing HR',()=>{const r=recording();const first=r.samples[0];if(first)first.hr=null;const z=zoneDistribution([r],'hr',200);expect(z.measured).toBe(59);expect(z.zones.find(v=>v.zone==='Z3')?.seconds).toBe(59);});
 it('calculates normalized power, intensity, variability and work from constant power',()=>{const m=recordingMetrics(recording(),250);expect(m.np).toBeCloseTo(200);expect(m.intensity).toBeCloseTo(0.8);expect(m.variability).toBeCloseTo(1);expect(m.work).toBeCloseTo(12);});
 it('rejects non-FIT uploads',async()=>{await expect(readFit(new ArrayBuffer(100),'invalid.fit')).rejects.toThrow();});
 it('reads measured power, HR and indoor classification from a Garmin FIT recording',async()=>{
  const {Encoder}=await import('@garmin/fitsdk');const encoder=new Encoder();const start=new Date('2026-10-24T15:00:00Z');
  encoder.onMesg(0,{type:'activity',manufacturer:'garmin',product:1,serialNumber:123,timeCreated:start});
  for(let i=0;i<60;i++)encoder.onMesg(20,{timestamp:new Date(start.getTime()+i*1000),power:200,heartRate:140,speed:8,cadence:85,distance:i*8});
  encoder.onMesg(18,{timestamp:new Date(start.getTime()+60000),startTime:start,sport:'cycling',subSport:'indoorCycling',totalTimerTime:60,totalDistance:480,avgPower:200,avgHeartRate:140});
  const bytes=encoder.close();const buffer=new ArrayBuffer(bytes.length);new Uint8Array(buffer).set(bytes);const r=await readFit(buffer,'test.fit');
  expect(environment(r.activity)).toBe('Indoor');expect(r.activity.started_at).toBe('2026-10-24T15:00:00.000Z');expect(r.samples).toHaveLength(60);expect(r.samples[0]?.power).toBe(200);expect(r.samples[0]?.hr).toBe(140);expect(bestCurve([r],'power').find(p=>p.duration===60)?.value).toBe(200);expect(zoneDistribution([r],'power',250).zones[2]?.seconds).toBe(60);
 });
 it('integrates recorded work over sample intervals without bridging long gaps',()=>{const r=recording();r.samples=[{second:0,power:200,hr:140,speed:3,cadence:80},{second:5,power:200,hr:140,speed:3,cadence:80},{second:25,power:200,hr:140,speed:3,cadence:80}];expect(recordingMetrics(r,250).work).toBeCloseTo(1.2);});
});