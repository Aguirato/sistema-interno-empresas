import {readFileSync} from 'node:fs';

// Modelos de exemplo anonimizados para a publicação do código.
const templates=JSON.parse(readFileSync(new URL('./reading-profile-templates.json',import.meta.url),'utf8'));
const normalizePlant=value=>String(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const normalizeUnit=value=>String(value).toUpperCase().replace(/\s+/g,'').replace(/^UG0*(\d+)$/,'UG$1');
const templateKey=(plant,unit)=>`${normalizePlant(plant)}|${normalizeUnit(unit)}`;
const templateMap=new Map();
for(const template of templates){
 const key=templateKey(template.plant,template.unit);
 if(templateMap.has(key)||!template.fields.length||new Set(template.fields.map(f=>f.key)).size!==template.fields.length)throw Error('Perfil de leitura duplicado ou vazio.');
 if(template.fields.some(f=>!/^[a-z][a-z0-9_]*$/.test(f.key)||!f.label||typeof f.unit!=='string'||f.type!=='number'))throw Error('Campo de perfil de leitura inválido.');
 templateMap.set(key,template);
}

// Keep the original meanings for records entered before plant-specific profiles existed.
export const historicalReadingFields=[['temp_uhrv','Temp. UHRV','°C'],['temp_uhlm','Temp. UHLM','°C'],['active_power','Potência ativa','kW'],['reactive_power','Potência reativa','kVar'],['apparent_power','Potência aparente','kVA'],['dist_la','Distribuidor LA','%'],['dist_na','Distribuidor NA','%'],['requested_power','Potência ativa solicitada','%'],['voltage_r','Tensão R','V'],['voltage_s','Tensão S','V'],['voltage_t','Tensão T','V'],['current_r','Corrente R','A'],['current_s','Corrente S','A'],['current_t','Corrente T','A'],['temp_r','Temperatura fase R','°C'],['temp_s','Temperatura fase S','°C'],['temp_t','Temperatura fase T','°C'],['bearing_turbine','Mancal da turbina','°C'],['bearing_la','Mancal LA','°C'],['bearing_na','Mancal NA','°C'],['exciter_temp','Temperatura da excitatriz','°C'],['gland_na','Gaxeteiro NA','°C'],['gland_la','Gaxeteiro LA','°C']];

export function readingProfileFor(plant,unit){
 if(!plant||!unit||!plant.active||!unit.active||unit.plant_id!==plant.id)return null;
 const template=templateMap.get(templateKey(plant.name,unit.name));
 if(!template)return null;
 const originalUnits=template.fields.filter(f=>f.key==='apparent_power'&&f.unit.toLowerCase()==='kvar'||f.key==='reactive_power'&&f.unit.toLowerCase()==='kva').map(f=>`${f.label}: ${f.unit}`).join('; ');
 const source_note='Modelo de exemplo para demonstração. Configure e valide os campos e unidades antes do uso operacional.'+(originalUnits?` Unidades mantidas conforme exibidas na origem: ${originalUnits}. Nenhuma conversão foi aplicada.`:'');
 return {id:`${template.id}:${unit.id}`,plant_id:plant.id,unit_id:unit.id,name:`${plant.name} · ${unit.name}`,revision:template.revision,fields:template.fields.map(f=>({...f})),source:'example',source_note,plant_name:plant.name,unit_name:unit.name};
}

export function availableReadingProfiles(plants,units){
 const byId=new Map(plants.map(p=>[p.id,p]));
 return units.map(u=>readingProfileFor(byId.get(u.plant_id),u)).filter(Boolean);
}

export function schemaForReading(reading,values,plant,unit){
 if(reading.schema_json)return JSON.parse(reading.schema_json);
 const fields=historicalReadingFields.map(([key,label,unit])=>({key,label,unit,type:'number'}));
 const known=new Set(fields.map(f=>f.key));
 for(const key of Object.keys(values))if(!known.has(key))fields.push({key,label:key,unit:'',type:'number'});
 return {id:'historical-generic-v1',plant_id:reading.plant_id,unit_id:reading.unit_id,name:'Modelo geral anterior (histórico preservado)',revision:1,fields,source:'historical-generic',source_note:'Campos e unidades usados no cadastro original do VOLTS COG, preservados sem conversão.',plant_name:plant?.name||'Usina não encontrada',unit_name:unit?.name||'UG não encontrada'};
}

export function readingValues(profile,input,reject){
 if(!input||typeof input!=='object'||Array.isArray(input))reject('Preencha as medições.');
 const allowed=new Set(profile.fields.map(f=>f.key));
 for(const key of Object.keys(input))if(!allowed.has(key))reject('A leitura contém um campo que não pertence a esta usina e UG. Reabra o formulário.');
 const values=Object.create(null);
 for(const field of profile.fields){
  const raw=input[field.key];
  if(raw===undefined||raw===null||typeof raw==='string'&&!raw.trim())continue;
  if(typeof raw!=='number'&&typeof raw!=='string')reject(`${field.label}: informe um número válido.`);
  if(typeof raw==='string'&&!/^[+-]?(?:\d+(?:[.,]\d*)?|[.,]\d+)(?:[eE][+-]?\d+)?$/.test(raw.trim()))reject(`${field.label}: informe um número válido.`);
  const value=typeof raw==='number'?raw:Number(raw.trim().replace(',','.'));
  if(!Number.isFinite(value)||Math.abs(value)>1e9)reject(`${field.label}: valor inválido.`);
  if(field.unit==='%'&&(value<0||value>100))reject(`${field.label}: use de 0 a 100%.`);
  if((field.key.startsWith('voltage_')||field.key.startsWith('current_')||['excitation_voltage','excitation_current','apparent_power'].includes(field.key))&&value<0)reject(`${field.label}: use um valor maior ou igual a zero.`);
  values[field.key]=value;
 }
 if(!Object.keys(values).length)reject('Preencha ao menos uma medição.');
 return values;
}
