import {csvCell,day} from '@/lib/fleet';

export type KeyRecord={id:string;code:string;name:string;location:string;category:string;notes:string;revision:number;created_at:string;archived_at:string|null};
export type KeyLoan={id:string;key_id:string;key_code:string;key_name:string;key_location:string;key_category:string;holder:string;checked_out_at:string;expected_return:string;checkout_notes:string;checkout_author_name:string;returned_at:string|null;return_notes:string;return_author_name:string};
export const keyCategories:Record<string,string>={work:'Obra',plant:'Usina',lodging:'Apartamento / alojamento',other:'Outro'};
export const loanStatuses:Record<string,string>={out:'Retirada',overdue:'Atrasada',returned:'Devolvida'};
export const searchText=(value:string)=>value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR').trim();
export const containsText=(value:string,search:string)=>searchText(value).includes(searchText(search));
export function loanStatus(loan:KeyLoan,today=day(new Date().toISOString())){return loan.returned_at?'returned':loan.expected_return&&loan.expected_return<today?'overdue':'out';}
export function overlapsPeriod(loan:KeyLoan,from:string,to:string,today=day(new Date().toISOString())){const end=to&&to<today?to:today;return (!from||from<=today)&&day(loan.checked_out_at)<=end&&(!from||(loan.returned_at?day(loan.returned_at):today)>=from);}
export function filterKeyLoans(loans:KeyLoan[],filters:{from:string;to:string;person:string;location:string;keyId:string;status:string},today=day(new Date().toISOString())){
 if(filters.from&&filters.to&&filters.from>filters.to)return [];
 return loans.filter(loan=>overlapsPeriod(loan,filters.from,filters.to,today)&&containsText(loan.holder,filters.person)&&containsText(loan.key_location,filters.location)&&(filters.keyId==='all'||loan.key_id===filters.keyId)&&(filters.status==='all'||loanStatus(loan,today)===filters.status));
}
export function keysCSV(rows:(string|number)[][]){return '\uFEFF'+rows.map(row=>row.map(csvCell).join(';')).join('\r\n');}
export function localKeyTime(){return new Intl.DateTimeFormat('sv-SE',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date()).replace(' ','T');}
export function dateOnlyLabel(value:string){return value?value.split('-').reverse().join('/'):'Não informada';}
