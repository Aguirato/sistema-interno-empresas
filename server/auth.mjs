import {randomBytes,randomUUID,scryptSync,timingSafeEqual,createHash,scrypt} from 'node:crypto';
import {promisify} from 'node:util';
import {writeFileSync,existsSync,unlinkSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {sqlite} from './sqlite.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const derive=promisify(scrypt);const sha=s=>createHash('sha256').update(s).digest('hex');
export const now=()=>new Date().toISOString();
export function fail(message,status=400){throw Object.assign(new Error(message),{status})}
export function tx(fn){sqlite.exec('BEGIN IMMEDIATE');try{const out=fn();sqlite.exec('COMMIT');return out}catch(e){sqlite.exec('ROLLBACK');throw e}}
export function audit(user,action,id){sqlite.prepare('INSERT INTO cog_audit VALUES(?,?,?,?,?)').run(randomUUID(),user.id,action,id,now())}
export function publicUser(u){return {id:u.id,name:u.name,username:u.username,kind:u.kind,is_admin:!!u.is_admin,active:!!u.active,must_change:!!u.must_change,revision:u.revision}}
export function validPassword(p){if(typeof p!=='string'||p.length<10||p.length>128)fail('A senha deve ter de 10 a 128 caracteres.');return p}
export async function hashPassword(p){validPassword(p);const salt=randomBytes(16).toString('hex');return salt+':'+Buffer.from(await derive(p,salt,64)).toString('hex')}
async function checkPassword(p,hash){if(typeof p!=='string'||p.length>128)return false;const [salt,value]=hash.split(':');const buf=Buffer.from(await derive(p,salt,64));const known=Buffer.from(value,'hex');return buf.length===known.length&&timingSafeEqual(buf,known)}
const dummy='00000000000000000000000000000000:'+scryptSync('invalid-password','00000000000000000000000000000000',64).toString('hex');
export function initializeAuth(){if(sqlite.prepare('SELECT count(*) n FROM cog_users').get().n)return;const p='Volts!'+randomBytes(12).toString('base64url');const salt=randomBytes(16).toString('hex');const hash=salt+':'+scryptSync(p,salt,64).toString('hex');sqlite.prepare('INSERT INTO cog_users(id,name,username,kind,is_admin,password_hash,created_at) VALUES(?,?,?,?,?,?,?)').run(randomUUID(),'Administrador VOLTS','admin','partner',1,hash,now());writeFileSync(path.join(root,'PRIMEIRO-ACESSO.txt'),`VOLTS COG — primeiro acesso\n\nUsuário: admin\nSenha temporária: ${p}\n\nA troca da senha é obrigatória ao entrar. Este arquivo é removido após a troca.\n`,{mode:0o600});}
export function session(req){const match=(req.headers.cookie||'').match(/(?:^|;\s*)volts_session=([a-f0-9]{64})(?:;|$)/);if(!match)return null;return sqlite.prepare('SELECT u.*,s.csrf,s.token_hash,s.expires_at FROM cog_sessions s JOIN cog_users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at>? AND u.active=1').get(sha(match[1]),now())||null}
export function requireUser(req,{admin=false,change=false}={}){const u=session(req);if(!u)fail('Sua sessão expirou. Entre novamente.',401);if(u.must_change&&!change)fail('Troque sua senha para continuar.',428);if(admin&&!u.is_admin)fail('Apenas administradores podem realizar esta ação.',403);if(req.method!=='GET'&&req.headers['x-csrf-token']!==u.csrf)fail('Atualize a página e tente novamente.',403);return u}
function cookie(token){return `volts_session=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=28800`}
export async function authAction(req,body){
 if(body.action==='login'){
  const username=typeof body.username==='string'?body.username.trim().toLowerCase().slice(0,64):'';const ip=req.socket.remoteAddress;const keys=['ip:'+ip,'account:'+username];const t=Date.now();sqlite.prepare('DELETE FROM cog_login_attempts WHERE expires<?').run(t);
  for(const k of keys){const row=sqlite.prepare('SELECT * FROM cog_login_attempts WHERE key=?').get(k);if(row&&row.count>=(k.startsWith('ip:')?40:10))fail('Muitas tentativas. Aguarde 15 minutos.',429)}
  const u=sqlite.prepare('SELECT * FROM cog_users WHERE username=? COLLATE NOCASE').get(username);const valid=await checkPassword(body.password,u?.password_hash||dummy);
  if(!valid||!u?.active){for(const k of keys)sqlite.prepare('INSERT INTO cog_login_attempts VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1').run(k,t+900000);fail('Usuário ou senha inválidos.',401)}
  const fresh=sqlite.prepare('SELECT * FROM cog_users WHERE id=? AND active=1 AND password_hash=?').get(u.id,u.password_hash);if(!fresh)fail('Usuário ou senha inválidos.',401);
  sqlite.prepare('DELETE FROM cog_login_attempts WHERE key=?').run('account:'+username);sqlite.prepare('DELETE FROM cog_sessions WHERE expires_at<?').run(now());
  const token=randomBytes(32).toString('hex'),csrf=randomBytes(24).toString('hex');sqlite.prepare('INSERT INTO cog_sessions VALUES(?,?,?,?)').run(sha(token),u.id,csrf,new Date(t+28800000).toISOString());return {data:{user:publicUser(fresh),csrf},cookie:cookie(token)};
 }
 const u=requireUser(req,{change:true});
 if(body.action==='logout'){sqlite.prepare('DELETE FROM cog_sessions WHERE token_hash=?').run(u.token_hash);return {data:{ok:true},cookie:'volts_session=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0'}}
 if(body.action==='password'){
  if(!await checkPassword(body.current_password,u.password_hash))fail('Senha atual incorreta.');if(body.password===body.current_password)fail('Escolha uma senha diferente da atual.');const hash=await hashPassword(body.password);
  tx(()=>{const result=sqlite.prepare('UPDATE cog_users SET password_hash=?,must_change=0,revision=revision+1 WHERE id=? AND password_hash=? AND active=1').run(hash,u.id,u.password_hash);if(!result.changes)fail('A conta foi alterada. Entre novamente.',409);sqlite.prepare('DELETE FROM cog_sessions WHERE user_id=?').run(u.id);audit(u,'password.change',u.id)});
  if(u.username==='admin'&&existsSync(path.join(root,'PRIMEIRO-ACESSO.txt')))unlinkSync(path.join(root,'PRIMEIRO-ACESSO.txt'));return {data:{ok:true},cookie:'volts_session=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0'};
 }
 fail('Ação inválida.');
}
