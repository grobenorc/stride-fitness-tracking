import { createFileRoute } from '@tanstack/react-router';
import { queryOptions, useSuspenseQuery } from '@tanstack/react-query';
import { getAthlete } from '@/lib/athlete.functions';
import { TrainingDashboard } from '@/components/training-dashboard';
const athleteQuery=queryOptions({queryKey:['athlete'],queryFn:()=>getAthlete()});
export const Route=createFileRoute('/_authenticated/dashboard')({head:()=>({meta:[{title:'Your training | Stride'},{name:'description',content:'Your private Garmin training, recovery and activity insights.'},{property:'og:title',content:'Your training | Stride'},{property:'og:description',content:'Private endurance training insights.'},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary_large_image'}]}),loader:({context})=>context.queryClient.ensureQueryData(athleteQuery),component:Dashboard});
function Dashboard(){const {data}=useSuspenseQuery(athleteQuery);return <TrainingDashboard data={data}/>;}
