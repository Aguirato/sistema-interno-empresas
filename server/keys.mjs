import {randomUUID} from 'node:crypto';
import {sqlite} from './sqlite.mjs';
import {fail,tx,now,audit,requireUser} from './auth.mjs';

const get=(query,...params)=>sqlite.prepare(query).get(...params);
const run=(query,...params)=>sqlite.prepare(query).run(...params);
const categories=['work','plant','lodging','other'];

function text(value,label,max,required=false){
 if(value===undefined&&!required)return '';
 if(typeof value!=='string'||value.trim().length>max||(required&&!value.trim())||/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value))fail(`Preencha ${label} corretamente (até ${max} caracteres).`);
 return value.trim();
}
function calendarDate(value,label){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(value))fail(`${label}: informe uma data válida.`);
 const date=new Date(value+'T00:00:00Z');
 if(Number.isNaN(date.getTime())||date.toISOString().slice(0,10)!==value)fail(`${label}: informe uma data válida.`);
 return value;
}
function occurred(value,label){
 const local=text(value,label,16,true);
 if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(local))fail(`${label}: informe data e hora válidas.`);
 calendarDate(local.slice(0,10),label);
 if(Number(local.slice(11,13))>23||Number(local.slice(14,16))>59)fail(`${label}: informe data e hora válidas.`);
 const date=new Date(local+'-03:00');
 if(Number.isNaN(date.getTime())||date.getTime()>Date.now()+300000)fail(`${label}: a data não pode estar no futuro.`);
 return {iso:date.toISOString(),day:local.slice(0,10)};
}
function metadata(body){
 const name=text(body.name,'o nome da chave',120,true),code=text(body.code,'o código da chave',40).toLocaleUpperCase('pt-BR'),location=text(body.location,'o local',160,true),notes=text(body.notes,'as observações',4000);
 if(code.length>40)fail('O código da chave deve ter até 40 caracteres.');
 if(!categories.includes(body.category))fail('Selecione uma categoria válida para a chave.');
 return {name,code,location,notes,category:body.category};
}
function checkoutData(body){
 if(!body||typeof body!=='object'||Array.isArray(body))fail('Preencha os dados da retirada.');
 const holder=text(body.holder,'quem está retirando a chave',120,true),date=occurred(body.checked_out_at,'Saída'),expected=text(body.expected_return,'a previsão de devolução',10),notes=text(body.notes,'as observações da saída',4000);
 if(expected){calendarDate(expected,'Previsão de devolução');if(expected<date.day)fail('A previsão de devolução não pode ser anterior ao dia da saída.');}
 return {holder,date:date.iso,expected,notes};
}
function currentKey(body){
 const id=text(body.id,'a chave',80,true);
 if(!Number.isSafeInteger(body.revision)||body.revision<1)fail('Revisão inválida. Atualize a lista de chaves.',409);
 const key=get('SELECT * FROM cog_keys WHERE id=?',id);
 if(!key)fail('Chave não encontrada.',404);
 if(key.revision!==body.revision)fail('Esta chave foi alterada por outra pessoa. Atualize a lista e tente novamente.',409);
 return key;
}
function requireActive(key){if(key.archived_at)fail('Esta chave está arquivada. Restaure o cadastro antes de continuar.',409);}
function uniqueCode(code,id=''){
 if(code&&get('SELECT id FROM cog_keys WHERE code=? COLLATE NOCASE AND id<>?',code,id))fail('Já existe uma chave com este código, inclusive entre as arquivadas.',409);
}
function addLoan(key,details,user,stamp){
 requireActive(key);
 if(get('SELECT id FROM cog_key_loans WHERE key_id=? AND returned_at IS NULL',key.id))fail('Esta chave já está retirada. Registre a devolução antes de uma nova saída.',409);
 const previous=get('SELECT returned_at FROM cog_key_loans WHERE key_id=? AND returned_at IS NOT NULL ORDER BY returned_at DESC LIMIT 1',key.id);
 if(previous&&details.date<previous.returned_at)fail('A saída não pode ser anterior à última devolução registrada.');
 const loanId=randomUUID();
 run('INSERT INTO cog_key_loans(id,key_id,key_code,key_name,key_location,key_category,holder,checked_out_at,expected_return,checkout_notes,checkout_author_id,checkout_author_name,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)',loanId,key.id,key.code,key.name,key.location,key.category,details.holder,details.date,details.expected,details.notes,user.id,user.name,stamp);
 return loanId;
}

export function keysData(){
 return {keys:sqlite.prepare('SELECT * FROM cog_keys ORDER BY name COLLATE NOCASE,code COLLATE NOCASE').all(),loans:sqlite.prepare('SELECT * FROM cog_key_loans ORDER BY checked_out_at DESC,created_at DESC').all()};
}

export function mutateKeys(req,body){
 let user=requireUser(req);
 const action=text(body.action,'a ação',40,true),stamp=now();
 if(action==='key.archive'||action==='key.restore')user=requireUser(req,{admin:true});
 if(action==='key.create'){
  const fields=metadata(body),checkout=body.checkout===undefined?null:checkoutData(body.checkout),id=randomUUID();
  return tx(()=>{
   uniqueCode(fields.code);
   run('INSERT INTO cog_keys(id,code,name,location,category,notes,created_at,created_by) VALUES(?,?,?,?,?,?,?,?)',id,fields.code,fields.name,fields.location,fields.category,fields.notes,stamp,user.id);
   const loanId=checkout?addLoan({...fields,id,archived_at:null},checkout,user,stamp):undefined;
   audit(user,action,id);if(loanId)audit(user,'key.checkout',loanId);
   return {ok:true,id,...(loanId?{loan_id:loanId}:{})};
  });
 }
 if(action==='key.update'){
  const fields=metadata(body);
  return tx(()=>{
   const key=currentKey(body);requireActive(key);uniqueCode(fields.code,key.id);
   run('UPDATE cog_keys SET code=?,name=?,location=?,category=?,notes=?,revision=revision+1 WHERE id=?',fields.code,fields.name,fields.location,fields.category,fields.notes,key.id);
   audit(user,action,key.id);return {ok:true,id:key.id};
  });
 }
 if(action==='key.archive'||action==='key.restore'){
  return tx(()=>{
   const key=currentKey(body);
   if(action==='key.archive'){
    requireActive(key);
    if(get('SELECT id FROM cog_key_loans WHERE key_id=? AND returned_at IS NULL',key.id))fail('Registre a devolução antes de arquivar esta chave.',409);
   }else if(!key.archived_at)fail('Esta chave já está ativa.',409);
   run('UPDATE cog_keys SET archived_at=?,revision=revision+1 WHERE id=?',action==='key.archive'?stamp:null,key.id);
   audit(user,action,key.id);return {ok:true,id:key.id};
  });
 }
 if(action==='key.checkout'){
  const details=checkoutData(body);
  return tx(()=>{
   const key=currentKey(body),loanId=addLoan(key,details,user,stamp);
   run('UPDATE cog_keys SET revision=revision+1 WHERE id=?',key.id);
   audit(user,action,loanId);return {ok:true,id:key.id,loan_id:loanId};
  });
 }
 if(action==='key.return'){
  const date=occurred(body.returned_at,'Devolução'),notes=text(body.notes,'as observações da devolução',4000),loanId=text(body.loan_id,'a retirada',80,true);
  return tx(()=>{
   const key=currentKey(body);requireActive(key);
   const loan=get('SELECT * FROM cog_key_loans WHERE id=? AND key_id=?',loanId,key.id);
   if(!loan)fail('Retirada não encontrada para esta chave.',404);
   if(loan.returned_at)fail('Esta retirada já teve a devolução registrada. Atualize a lista.',409);
   if(date.iso<loan.checked_out_at)fail('A devolução não pode ser anterior à saída.');
   run('UPDATE cog_key_loans SET returned_at=?,return_notes=?,return_author_id=?,return_author_name=? WHERE id=?',date.iso,notes,user.id,user.name,loan.id);
   run('UPDATE cog_keys SET revision=revision+1 WHERE id=?',key.id);
   audit(user,action,loan.id);return {ok:true,id:key.id,loan_id:loan.id};
  });
 }
 fail('Ação de chaves inválida.');
}
