import {randomUUID} from 'node:crypto';
import {existsSync,readFileSync} from 'node:fs';
import {sqlite} from './sqlite.mjs';
import {fail,tx,now,audit,publicUser,hashPassword,requireUser} from './auth.mjs';
import {mailSettings,saveMail,verifyMail,recipient} from './mail.mjs';
import {historicalReadingFields as readingFields,readingProfileFor,availableReadingProfiles,readingValues} from './reading-profiles.mjs';
const all=(q,...p)=>sqlite.prepare(q).all(...p),get=(q,...p)=>sqlite.prepare(q).get(...p),run=(q,...p)=>sqlite.prepare(q).run(...p);
function str(v,label,max=4000,required=true){if(typeof v!=='string'||v.trim().length>max||(required&&!v.trim()))fail(`Preencha ${label} corretamente (até ${max} caracteres).`);return v.trim()}
function member(v,list,label){if(!list.includes(v))fail(`${label} inválido.`);return v}
function boolean(v){if(typeof v!=='boolean')fail('Opção inválida.');return v?1:0}
function plant(id){const p=get('SELECT * FROM cog_plants WHERE id=? AND active=1',str(id,'a usina',80));if(!p)fail('Selecione uma usina ativa.');return p}
function occurred(v){const s=str(v,'a data e hora',40);if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?$/.test(s))fail('Data ou hora inválida.');const date=s.slice(0,10);if(Number.isNaN(Date.parse(date+'T00:00:00Z'))||new Date(date+'T00:00:00Z').toISOString().slice(0,10)!==date||+s.slice(11,13)>23||+s.slice(14,16)>59)fail('Data ou hora inválida.');const out=new Date(s+'-03:00');if(Number.isNaN(out.getTime())||out.getTime()>Date.now()+300000)fail('Informe uma data válida que não esteja no futuro.');return out.toISOString()}
export {readingFields};
export function initializeCog(){
 if(get("SELECT value FROM settings WHERE key='cog_initialized'"))return;
 const examples=JSON.parse(readFileSync(new URL('./reading-profile-templates.json',import.meta.url),'utf8'));
 tx(()=>{
  const plants=new Map();
  for(const example of examples){
   let id=plants.get(example.plant);
   if(!id){id=randomUUID();plants.set(example.plant,id);run('INSERT INTO cog_plants(id,name) VALUES(?,?)',id,example.plant);}
   run('INSERT INTO cog_units(id,plant_id,name) VALUES(?,?,?)',randomUUID(),id,example.unit);
  }
  run("INSERT INTO settings VALUES('cog_initialized',?)",now());
 });
}
export function dataFor(u){
 const plants=all('SELECT * FROM cog_plants ORDER BY name'),units=all('SELECT * FROM cog_units ORDER BY name');
 const readings=[];
 return {user:publicUser(u),plants,units,users:all('SELECT id,name,kind,is_admin,active FROM cog_users ORDER BY name'),diary:all('SELECT * FROM cog_diary WHERE archived_at IS NULL ORDER BY occurred_at DESC'),readings,reading_profiles:availableReadingProfiles(plants,units),tickets:all('SELECT * FROM cog_tickets ORDER BY number DESC').map(t=>({...t,assignees:all('SELECT user_id FROM cog_ticket_users WHERE ticket_id=?',t.id).map(a=>a.user_id)})),movements:all('SELECT * FROM cog_movements ORDER BY created_at DESC'),messages:all('SELECT * FROM cog_messages WHERE archived_at IS NULL ORDER BY created_at DESC'),mail:all('SELECT id,ticket_id,status,sent_at,error,attempts FROM cog_outbox'),mail_enabled:mailSettings().enabled,mail_recipient:recipient,reading_fields:readingFields,import_summary:get("SELECT value FROM settings WHERE key='cog_import_september'")?.value||''};
}
export function adminData(){return {users:all('SELECT * FROM cog_users ORDER BY name').map(publicUser),mail:mailSettings(),audit:all('SELECT a.*,u.name author_name FROM cog_audit a LEFT JOIN cog_users u ON u.id=a.user_id ORDER BY a.created_at DESC LIMIT 100')}}
export async function mutateCog(req,b){let u=requireUser(req);const action=str(b.action,'a ação',60),id=randomUUID(),stamp=now();
 if(action.startsWith('user.')||action.startsWith('plant.')||action.startsWith('mail.')||action.endsWith('.archive'))u=requireUser(req,{admin:true});
 if(action==='user.save'){
  const name=str(b.name,'o nome',120),username=str(b.username,'o usuário',40).toLowerCase();if(!/^[a-z0-9._-]{3,40}$/.test(username))fail('Use de 3 a 40 letras, números, ponto, hífen ou sublinhado no usuário.');const kind=member(b.kind,['operator','partner'],'Tipo'),admin=boolean(b.is_admin),active=boolean(b.active);let hash;if(!b.id||b.password)hash=await hashPassword(b.password);u=requireUser(req,{admin:true});
  tx(()=>{if(b.id){const old=get('SELECT * FROM cog_users WHERE id=?',str(b.id,'o usuário',80));if(!old)fail('Usuário não encontrado.',404);if(old.revision!==b.revision)fail('Usuário alterado por outra pessoa. Atualize a página.',409);if(old.is_admin&&old.active&&(!admin||!active)&&get('SELECT count(*) n FROM cog_users WHERE is_admin=1 AND active=1').n<=1)fail('Mantenha ao menos um administrador ativo.');run('UPDATE cog_users SET name=?,username=?,kind=?,is_admin=?,active=?,password_hash=?,must_change=?,revision=revision+1 WHERE id=?',name,username,kind,admin,active,hash||old.password_hash,hash?1:old.must_change,old.id);if(hash||!active||old.is_admin!==admin)run('DELETE FROM cog_sessions WHERE user_id=?',old.id);audit(u,'user.update',old.id)}else{run('INSERT INTO cog_users(id,name,username,kind,is_admin,active,password_hash,created_at) VALUES(?,?,?,?,?,?,?,?)',id,name,username,kind,admin,active,hash,stamp);audit(u,'user.create',id)}});return {ok:true};
 }
 if(action==='plant.save'){
  const name=str(b.name,'o nome da usina',120),city=str(b.city,'a cidade',120,false),active=boolean(b.active);if(!Array.isArray(b.units)||b.units.length>30)fail('Informe até 30 unidades geradoras.');const units=b.units.map(x=>({id:x.id,name:str(x.name,'a unidade',40),active:boolean(x.active)}));if(new Set(units.map(x=>x.name.toUpperCase())).size!==units.length)fail('Os nomes das unidades devem ser únicos.');
  tx(()=>{const pid=b.id||id;if(b.id){const old=get('SELECT * FROM cog_plants WHERE id=?',b.id);if(!old||old.revision!==b.revision)fail('Usina alterada. Atualize a página.',409);run('UPDATE cog_plants SET name=?,city=?,active=?,revision=revision+1 WHERE id=?',name,city,active,pid)}else run('INSERT INTO cog_plants(id,name,city,active) VALUES(?,?,?,?)',pid,name,city,active);for(const unit of units){if(unit.id){const old=get('SELECT * FROM cog_units WHERE id=? AND plant_id=?',unit.id,pid);if(!old)fail('Unidade geradora inválida.');run('UPDATE cog_units SET name=?,active=? WHERE id=?',unit.name,unit.active,unit.id)}else run('INSERT INTO cog_units(id,plant_id,name,active) VALUES(?,?,?,?)',randomUUID(),pid,unit.name,unit.active)}audit(u,'plant.save',pid)});return {ok:true};
 }
 if(action==='diary.create'){const p=plant(b.plant_id),kind=member(b.kind,['routine','abnormal'],'Tipo de registro'),text=str(b.text,'o registro'),date=occurred(b.occurred_at);tx(()=>{run('INSERT INTO cog_diary(id,plant_id,kind,text,occurred_at,author_id,author_name,created_at) VALUES(?,?,?,?,?,?,?,?)',id,p.id,kind,text,date,u.id,u.name,stamp);audit(u,action,id)});return {ok:true,id}}
 if(action==='reading.create'){
  const p=plant(b.plant_id),unit=get('SELECT * FROM cog_units WHERE id=? AND plant_id=? AND active=1',str(b.unit_id,'a unidade',80),p.id);
  if(!unit)fail('Selecione uma unidade geradora ativa desta usina.');
  const profile=readingProfileFor(p,unit);
  if(!profile)fail('O modelo de leitura desta usina e UG ainda não foi confirmado. Não é possível cadastrar uma leitura com campos de outra unidade.');
  if(b.profile_id!==profile.id||b.profile_revision!==profile.revision)fail('O modelo de leitura foi alterado. Atualize a página e reabra o formulário.',409);
  const date=occurred(b.occurred_at),notes=str(b.notes,'as observações',4000,false),values=readingValues(profile,b.values,fail);
  tx(()=>{run('INSERT INTO cog_readings(id,plant_id,unit_id,occurred_at,values_json,schema_json,notes,author_id,author_name,created_at) VALUES(?,?,?,?,?,?,?,?,?,?)',id,p.id,unit.id,date,JSON.stringify(values),JSON.stringify(profile),notes,u.id,u.name,stamp);audit(u,action,id)});
  return {ok:true,id};
 }
 if(action==='ticket.create'){const p=plant(b.plant_id),kind=member(b.kind,['verification','maintenance','inspection'],'Tipo'),description=str(b.description,'a descrição');if(!Array.isArray(b.assignees)||b.assignees.length>100)fail('Responsáveis inválidos.');const assignees=[...new Set(b.assignees)];for(const uid of assignees)if(!get('SELECT id FROM cog_users WHERE id=? AND active=1',uid))fail('Responsável inválido.');
  let number;tx(()=>{number=get('SELECT coalesce(max(number),0)+1 n FROM cog_tickets').n;run('INSERT INTO cog_tickets(id,number,plant_id,kind,description,status,author_id,author_name,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?)',id,number,p.id,kind,description,'open',u.id,u.name,stamp,stamp);for(const uid of assignees)run('INSERT INTO cog_ticket_users VALUES(?,?)',id,uid);run('INSERT INTO cog_movements(id,ticket_id,text,status,author_id,author_name,created_at) VALUES(?,?,?,?,?,?,?)',randomUUID(),id,'Solicitação aberta.','open',u.id,u.name,stamp);const kindName={verification:'Verificação',maintenance:'Manutenção',inspection:'Inspeção'}[kind];const names=assignees.map(uid=>get('SELECT name FROM cog_users WHERE id=?',uid).name).join(', ')||'Não definidos';run('INSERT INTO cog_outbox(id,ticket_id,recipient,subject,body,next_attempt) VALUES(?,?,?,?,?,?)',randomUUID(),id,recipient,`[VOLTS COG] Solicitação #${number} — ${p.name}`,`Nova solicitação de suporte técnico\n\nNúmero: ${number}\nUsina: ${p.name}\nTipo: ${kindName}\nSolicitante: ${u.name}\nData: ${new Date(stamp).toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo'})}\nResponsáveis: ${names}\n\nDescrição:\n${description}\n\nAcesse o sistema VOLTS COG na rede local para acompanhar.`,stamp);audit(u,action,id)});return {ok:true,id,number,email_pending:true};
 }
 if(action==='ticket.move'){const status=member(b.status,['open','in_progress','closed'],'Situação'),text=str(b.text,'a atualização');tx(()=>{const t=get('SELECT * FROM cog_tickets WHERE id=?',str(b.id,'o chamado',80));if(!t)fail('Solicitação não encontrada.',404);if(t.revision!==b.revision)fail('A solicitação foi atualizada. Reabra os detalhes.',409);run('UPDATE cog_tickets SET status=?,updated_at=?,revision=revision+1 WHERE id=?',status,stamp,t.id);run('INSERT INTO cog_movements(id,ticket_id,text,status,author_id,author_name,created_at) VALUES(?,?,?,?,?,?,?)',id,t.id,text,status,u.id,u.name,stamp);audit(u,action,t.id)});return {ok:true}}
 if(action==='message.create'){const text=str(b.text,'o recado',2000);tx(()=>{run('INSERT INTO cog_messages(id,text,author_id,author_name,created_at) VALUES(?,?,?,?,?)',id,text,u.id,u.name,stamp);audit(u,action,id)});return {ok:true}}
 if(['diary.archive','reading.archive','message.archive'].includes(action)){const table={ 'diary.archive':'cog_diary','reading.archive':'cog_readings','message.archive':'cog_messages'}[action];tx(()=>{const result=run(`UPDATE ${table} SET archived_at=? WHERE id=? AND archived_at IS NULL`,stamp,str(b.id,'o registro',80));if(!result.changes)fail('Registro não encontrado.',404);audit(u,action,b.id)});return {ok:true}}
 if(action==='mail.save'){const result=saveMail(b);audit(u,action,'smtp');return {ok:true,mail:result}}
 if(action==='mail.verify')return await verifyMail();
 if(action==='mail.retry'){const m=get('SELECT * FROM cog_outbox WHERE id=?',str(b.id,'o envio',80));if(!m||m.status==='sent'||m.status==='sending')fail('Este envio não pode ser repetido.');run("UPDATE cog_outbox SET status='pending',attempts=0,next_attempt=?,error='' WHERE id=?",stamp,m.id);audit(u,action,m.id);return {ok:true}}
 fail('Ação inválida.');
}
