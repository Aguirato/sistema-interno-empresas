import {schemaForReading} from './reading-profiles.mjs';

const day=24*60*60*1000;
const reportLimit=5000;
const fold=value=>String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR');
function reject(message,status=400){throw Object.assign(new Error(message),{status});}
function timestamp(value){
 const match=/^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?(Z|[+-]\d{2}:\d{2})$/.exec(value);
 if(!match)reject('Informe início e fim válidos, com data, hora e fuso horário.');
 const calendar=new Date(match[1]+'T00:00:00Z');
 const offset=match[6]==='Z'?0:Number(match[6].slice(1,3))*60+Number(match[6].slice(4,6));
 if(!Number.isFinite(calendar.getTime())||calendar.toISOString().slice(0,10)!==match[1]||Number(match[2])>23||Number(match[3])>59||Number(match[4]||0)>59||offset>14*60||match[6]!=='Z'&&Number(match[6].slice(4,6))>59)reject('Informe uma data e hora válidas para a consulta.');
 const date=new Date(value);
 if(!Number.isFinite(date.getTime()))reject('Informe uma data e hora válidas para a consulta.');
 return date.toISOString();
}
function integer(value,fallback,max,label){
 if(value===null)return fallback;
 if(!/^[1-9]\d*$/.test(value)||!Number.isSafeInteger(Number(value))||Number(value)>max)reject(`${label} inválida.`);
 return Number(value);
}
export function parseReadingQuery(params,now=Date.now()){
 const allowed=new Set(['from','to','plant_id','unit_id','person','search','page','limit','mode']);
 for(const key of params.keys())if(!allowed.has(key)||params.getAll(key).length!==1)reject('Parâmetros de consulta inválidos.');
 const mode=params.get('mode')||'list';
 if(!['list','report'].includes(mode))reject('Tipo de consulta inválido.');
 const rawFrom=params.get('from'),rawTo=params.get('to');
 if((rawFrom===null)!==(rawTo===null))reject('Informe o início e o fim do período.');
 if(mode==='report'&&rawFrom===null)reject('Selecione um período para gerar o relatório.');
 const from=rawFrom===null?new Date(now-day).toISOString():timestamp(rawFrom);
 const to=rawTo===null?new Date(now).toISOString():timestamp(rawTo);
 if(from>=to)reject('O fim do período deve ser posterior ao início.');
 const page=integer(params.get('page'),1,1000000,'Página');
 const limit=integer(params.get('limit'),30,100,'Quantidade por página');
 const text=(key,max)=>{const value=(params.get(key)||'').trim();if(value.length>max||/[\u0000-\u001f]/.test(value))reject('Filtro de consulta inválido.');return value;};
 return {from,to,page,limit,mode,plant_id:text('plant_id',80),unit_id:text('unit_id',80),person:text('person',120),search:text('search',4000)};
}

// Query only the requested period/page before decoding measurement and schema JSON.
// The injected database keeps this module testable without opening installation data.
export function createReadingQuery(database){
 database.function('volts_fold',{deterministic:true},fold);
 return function queryReadings(params,now=Date.now()){
  const query=parseReadingQuery(params,now);
  const where=['r.archived_at IS NULL','r.occurred_at>=?','r.occurred_at<?'];
  const values=[query.from,query.to];
  for(const key of ['plant_id','unit_id'])if(query[key]){where.push(`r.${key}=?`);values.push(query[key]);}
  if(query.person){where.push('instr(volts_fold(r.author_name),?)>0');values.push(fold(query.person));}
  if(query.search){where.push('instr(volts_fold(r.notes),?)>0');values.push(fold(query.search));}
  const clause=where.join(' AND ');
  const total=Number(database.prepare(`SELECT count(*) AS total FROM cog_readings r WHERE ${clause}`).get(...values).total);
  if(query.mode==='report'&&total>reportLimit)reject(`A consulta encontrou ${total} leituras. Para gerar o relatório e os gráficos, reduza o período ou selecione uma usina/UG (máximo de ${reportLimit} leituras).`,413);
  const page=query.mode==='report'?1:query.page,pageSize=query.mode==='report'?reportLimit:query.limit;
  const rows=database.prepare(`SELECT r.*,p.name AS query_plant_name,u.name AS query_unit_name FROM cog_readings r LEFT JOIN cog_plants p ON p.id=r.plant_id LEFT JOIN cog_units u ON u.id=r.unit_id WHERE ${clause} ORDER BY r.occurred_at DESC,r.id DESC LIMIT ? OFFSET ?`).all(...values,pageSize,(page-1)*pageSize);
  const readings=rows.map(row=>{
   const {values_json,schema_json,query_plant_name,query_unit_name,...reading}=row;
   const values=JSON.parse(values_json);
   return {...reading,values,schema:schemaForReading(row,values,{name:query_plant_name},{name:query_unit_name})};
  });
  return {readings,total,page,page_size:pageSize,from:query.from,to:query.to};
 };
}
