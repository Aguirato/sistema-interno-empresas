import type {ReadingField,ReadingGroup} from './reading-utils';

export const CHART_POINT_LIMIT=500;
export type TemperatureField=ReadingField&{confirmedUnit:boolean};
export type ReadingChartPoint={id:string;time:number;power:number|null;temperatures:Record<string,number|null>};
export type ReadingCorrelationPoint={id:string;time:number;power:number;temperature:number};

export function chartNumber(value:unknown):number|null{
 if(typeof value==='number')return Number.isFinite(value)?value:null;
 if(typeof value!=='string'||!/^[-+]?(?:\d+(?:[.,]\d*)?|[.,]\d+)$/.test(value.trim()))return null;
 const number=Number(value.trim().replace(',','.'));
 return Number.isFinite(number)?number:null;
}

export function temperatureFields(fields:ReadingField[]):TemperatureField[]{
 return fields.flatMap(field=>{
  const unit=field.unit.replace(/\s/g,'').toLowerCase();
  const confirmedUnit=/^[°º]c$/.test(unit);
  // A label alone never establishes a Celsius unit. Preserve that distinction.
  return confirmedUnit||(!unit&&/\btemp(?:eratura)?\b/i.test(field.label))?[{...field,confirmedUnit}]:[];
 });
}

export function activePowerField(fields:ReadingField[]):ReadingField|undefined{
 return fields.find(field=>field.key==='active_power'&&field.unit.trim().toLowerCase()==='kw');
}

export function readingChartData(group:ReadingGroup){
 const powerField=activePowerField(group.fields),temperatures=temperatureFields(group.fields);
 let invalidDates=0;
 const points:ReadingChartPoint[]=[];
 for(const reading of group.readings){
  const value=reading.occurred_at;
  const time=Date.parse(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?$/.test(value)?value+'-03:00':value);
  if(!Number.isFinite(time)){invalidDates++;continue;}
  points.push({id:reading.id,time,power:powerField?chartNumber(reading.values?.[powerField.key]):null,
   temperatures:Object.fromEntries(temperatures.map(field=>[field.key,chartNumber(reading.values?.[field.key])]))});
 }
 points.sort((a,b)=>a.time-b.time||a.id.localeCompare(b.id));
 return {points,temperatures,powerField,invalidDates};
}

// Select actual observations, never averages. Endpoints and measurement extremes
// take priority; the rest is evenly distributed across the requested interval.
export function sampleChartPoints(points:ReadingChartPoint[],limit=CHART_POINT_LIMIT,temperatureKeys:string[]=[]):ReadingChartPoint[]{
 if(!Number.isInteger(limit)||limit<2)throw new Error('O limite deve ser um inteiro maior ou igual a 2.');
 if(points.length<=limit)return points;
 const selected=new Set<number>([0,points.length-1]);
 const series=[(point:ReadingChartPoint)=>point.power,...temperatureKeys.map(key=>(point:ReadingChartPoint)=>point.temperatures[key])];
 for(const get of series){
  let low=-1,high=-1;
  for(let i=0;i<points.length;i++){
   const value=get(points[i]);if(value===null||value===undefined)continue;
   if(low<0||value<get(points[low])!)low=i;
   if(high<0||value>get(points[high])!)high=i;
  }
  for(const index of [low,high])if(index>=0&&selected.size<limit)selected.add(index);
 }
 for(let i=0;i<limit&&selected.size<limit;i++)selected.add(Math.round(i*(points.length-1)/(limit-1)));
 for(let i=0;i<points.length&&selected.size<limit;i++)selected.add(i);
 return [...selected].sort((a,b)=>a-b).map(index=>points[index]);
}

export function correlationPoints(points:ReadingChartPoint[],fieldKey:string):ReadingCorrelationPoint[]{
 return points.flatMap(point=>{
  const temperature=point.temperatures[fieldKey];
  return point.power===null||temperature===null||temperature===undefined?[]:[{id:point.id,time:point.time,power:point.power,temperature}];
 });
}

export function chartDate(time:number,full=false):string{
 return new Intl.DateTimeFormat('pt-BR',{timeZone:'America/Sao_Paulo',day:'2-digit',month:'2-digit',...(full?{year:'numeric' as const}:{}),hour:'2-digit',minute:'2-digit'}).format(time);
}

export const chartValue=(value:number)=>new Intl.NumberFormat('pt-BR',{maximumFractionDigits:3}).format(value);
