export const statuses={unknown:"Não informada",ok:"Em dia",pending:"Manutenção pendente",in_progress:"Em manutenção"} as const;
export type Status=keyof typeof statuses;
export type Vehicle={id:string;model:string;plate:string;person:string;maintenance:Status;due_date:string;maintenance_notes:string;notes:string;created_at:string;updated_at:string;deleted_at:string|null;revision:number};
export type History={id:string;vehicle_id:string;model:string;plate:string;person:string;maintenance:Status;due_date:string;maintenance_notes:string;notes:string;started_at:string;ended_at:string|null;event:string};
export type Fleet={vehicles:Vehicle[];history:History[]};
export const clean=(s:string)=>s.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLocaleLowerCase("pt-BR");
export const day=(s:string)=>s?new Intl.DateTimeFormat("sv-SE",{timeZone:"America/Sao_Paulo",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date(s)):"";
export const dateLabel=(s:string)=>s?new Intl.DateTimeFormat("pt-BR",{timeZone:"America/Sao_Paulo",day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit"}).format(new Date(s)):"Atual";
export const shortDate=(s:string)=>s?s.split("-").reverse().join("/"):"Sem previsão";
export function inPeriod(row:History,from:string,to:string){return (!to||day(row.started_at)<=to)&&(!from||!row.ended_at||day(row.ended_at)>=from);}
export function csvCell(v:unknown){let s=String(v??"");if(/^[\s]*[=+@-]/.test(s))s="'"+s;return '"'+s.replace(/"/g,'""')+'"';}
