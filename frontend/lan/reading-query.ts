export type ReadingFilters={from:string;to:string;plant_id:string;unit_id:string;person:string;search:string};
export function brasiliaInput(date:Date){return new Intl.DateTimeFormat('sv-SE',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false}).format(date).replace(' ','T')}
export function last24Hours(now=new Date()):ReadingFilters{return {from:brasiliaInput(new Date(now.getTime()-86400000)),to:brasiliaInput(now),plant_id:'',unit_id:'',person:'',search:''}}
export function readingQuery(filters:ReadingFilters,page=1,report=false){
 const {from,to}=filters;
 if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/.test(from)||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/.test(to))throw Error('Informe o início e o fim da consulta.');
 const start=new Date(from+'-03:00'),end=new Date(to+'-03:00');
 if(!Number.isFinite(start.getTime())||!Number.isFinite(end.getTime())||start>=end)throw Error('O início deve ser anterior ao fim da consulta.');
 const query=new URLSearchParams({from:start.toISOString(),to:end.toISOString(),page:String(page),limit:'30'});
 for(const key of ['plant_id','unit_id','person','search'] as const)if(filters[key].trim())query.set(key,filters[key].trim());
 if(report)query.set('mode','report');
 return query;
}
