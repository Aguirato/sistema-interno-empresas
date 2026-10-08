export type ReadingField={key:string;label:string;unit:string;type?:'number'};
export type ReadingProfile={id:string;plant_id:string;unit_id:string;name:string;revision:number;fields:ReadingField[];source?:string;source_note?:string;plant_name?:string;unit_name?:string};
export type ReadingRecord={id:string;plant_id:string;unit_id:string;occurred_at:string;author_name:string;notes?:string;values:Record<string,unknown>;schema?:ReadingProfile};
export type ReadingGroup={key:string;plantName:string;unitName:string;profileName:string;sourceNote:string;fields:ReadingField[];readings:ReadingRecord[]};
export type ReadingNames={plant:(id:string)=>string;unit:(id:string)=>string};

const hasValue=(value:unknown)=>value!==undefined&&value!==null&&value!=='';
export const readingCount=(reading:ReadingRecord)=>Object.values(reading.values||{}).filter(hasValue).length;
export const readingProfileName=(reading:ReadingRecord)=>reading.schema?.name||'Modelo anterior (histórico preservado)';
export const readingNames=(reading:ReadingRecord,names:ReadingNames)=>({plant:reading.schema?.plant_name||names.plant(reading.plant_id),unit:reading.schema?.unit_name||names.unit(reading.unit_id)});
export function readingFields(reading:ReadingRecord,fallback:string[][]=[]):ReadingField[]{
 const supplied=reading.schema?.fields||fallback.map(([key,label,unit])=>({key,label,unit}));
 const fields:ReadingField[]=[],seen=new Set<string>();
 for(const field of supplied){if(field.key&&!seen.has(field.key)){fields.push({...field,unit:field.unit||''});seen.add(field.key)}}
 // Keep every historical measurement visible, even when its metadata is unavailable.
 for(const key of Object.keys(reading.values||{}).sort())if(!seen.has(key))fields.push({key,label:`Campo registrado: ${key}`,unit:''});
 return fields;
}
export function readingValue(value:unknown,empty='—'):string{
 if(!hasValue(value))return empty;
 if(typeof value==='number')return String(value).replace('.',',');
 return typeof value==='object'?JSON.stringify(value):String(value);
}
export function groupReadings(readings:ReadingRecord[],names:ReadingNames,fallback:string[][]=[]):ReadingGroup[]{
 const groups=new Map<string,ReadingGroup>();
 for(const reading of readings){
  const fields=readingFields(reading,fallback),label=readingNames(reading,names);
  const key=JSON.stringify([reading.plant_id,reading.unit_id,label.plant,label.unit,reading.schema?.id||'historical',reading.schema?.revision||0,fields.map(f=>[f.key,f.label,f.unit])]);
  let group=groups.get(key);
  if(!group){group={key,plantName:label.plant,unitName:label.unit,profileName:readingProfileName(reading),sourceNote:reading.schema?.source_note||'',fields,readings:[]};groups.set(key,group)}
  group.readings.push(reading);
 }
 return [...groups.values()].sort((a,b)=>a.plantName.localeCompare(b.plantName,'pt-BR')||a.unitName.localeCompare(b.unitName,'pt-BR',{numeric:true})||a.profileName.localeCompare(b.profileName,'pt-BR')).map(group=>({...group,readings:group.readings.sort((a,b)=>a.occurred_at.localeCompare(b.occurred_at)||a.id.localeCompare(b.id))}));
}
export function readingBatches(readings:ReadingRecord[],size=4):ReadingRecord[][]{
 if(!Number.isInteger(size)||size<1)throw new Error('O tamanho do grupo deve ser um inteiro positivo.');
 const batches:ReadingRecord[][]=[];for(let i=0;i<readings.length;i+=size)batches.push(readings.slice(i,i+size));return batches;
}
export function readingWideCSV(group:ReadingGroup,date:(value:string)=>string):(string|number)[][]{
 return [['Data e hora','Usina','UG','Registrado por','Modelo de leitura',...group.fields.map(f=>f.label+(f.unit?` (${f.unit})`:'')),'Observações'],...group.readings.map(reading=>[date(reading.occurred_at),group.plantName,group.unitName,reading.author_name,readingProfileName(reading),...group.fields.map(f=>readingValue(reading.values?.[f.key],'')),reading.notes||''])];
}
export function readingLongCSV(groups:ReadingGroup[],date:(value:string)=>string):(string|number)[][]{
 return [['Data e hora','Usina','UG','Registrado por','Modelo de leitura','Medição','Valor','Unidade','Observações'],...groups.flatMap(group=>group.readings.flatMap(reading=>{
  const present=group.fields.filter(f=>hasValue(reading.values?.[f.key]));
  // Retain a record's date, author and notes even if no measurements were stored.
  return (present.length?present:[null]).map(field=>[date(reading.occurred_at),group.plantName,group.unitName,reading.author_name,readingProfileName(reading),field?.label||'',field?readingValue(reading.values?.[field.key],''):'',field?.unit||'',reading.notes||'']);
 }))];
}
