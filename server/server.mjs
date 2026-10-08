import http from 'node:http';
import {networkInterfaces} from 'node:os';
import {readFileSync,writeFileSync,mkdirSync,appendFileSync,existsSync,statSync,createReadStream,unlinkSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {GET,POST} from './api.mjs';
import {initialize} from './db.mjs';
import {backup,sqlite} from './sqlite.mjs';
import {initializeAuth,session,requireUser,authAction,publicUser,audit} from './auth.mjs';
import {initializeCog,dataFor,adminData,mutateCog} from './cog.mjs';
import {keysData,mutateKeys} from './keys.mjs';
import {createReadingQuery} from './reading-query.mjs';
import {startMail} from './mail.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const queryReadings=createReadingQuery(sqlite);
const config=JSON.parse(readFileSync(path.join(root,'rede.json'),'utf8').replace(/^\uFEFF/,''));
const publicDir=path.join(root,'public');const logs=path.join(root,'logs');mkdirSync(logs,{recursive:true});
function log(message){appendFileSync(path.join(logs,'servidor.log'),`${new Date().toISOString()} ${message}\n`)}
function ipNumber(ip){if(!/^\d{1,3}(\.\d{1,3}){3}$/.test(ip))return null;const parts=ip.split('.').map(Number);if(parts.some(p=>p>255))return null;return parts.reduce((n,p)=>(n*256+p)>>>0,0)}
function inSubnet(ip){const n=ipNumber(ip),network=ipNumber(config.network),mask=ipNumber(config.netmask);return n!==null&&network!==null&&mask!==null&&((n&mask)>>>0)===((network&mask)>>>0)}
function lanAddress(){return Object.values(networkInterfaces()).flat().find(n=>n&&n.family==='IPv4'&&!n.internal&&n.mac.toLowerCase()===config.adapterMac.toLowerCase()&&n.netmask===config.netmask&&inSubnet(n.address))?.address;}
if(!Number.isInteger(config.port)||config.port<1024||config.port>65535)throw new Error('Porta inválida.');
const address=lanAddress();if(!address)throw new Error('A rede Ethernet configurada não está conectada. Conecte o computador à rede 192.168.0.x e tente novamente.');
const url=`http://${address}:${config.port}`;
const hosts=new Set([`${address}:${config.port}`,`127.0.0.1:${config.port}`,`localhost:${config.port}`]);
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.ico':'image/x-icon','.woff':'font/woff','.woff2':'font/woff2','.json':'application/json'};
let servers=[],closing=false;
function deny(res,status,message){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify({error:message}));}
async function handler(req,res){try{
 const remote=(req.socket.remoteAddress||'').replace(/^::ffff:/,'');if(remote!=='127.0.0.1'&&!inSubnet(remote))return deny(res,403,'Acesso permitido somente pela rede local.');
 const host=req.headers.host?.toLowerCase();if(!hosts.has(host))return deny(res,403,'Endereço do servidor inválido.');
 const origin=`http://${host}`;if(req.headers.origin&&req.headers.origin!==origin)return deny(res,403,'Origem não permitida.');
 if(!req.url?.startsWith('/')||req.url.startsWith('//')||req.url.includes('\\'))return deny(res,400,'Endereço inválido.');
 const target=new URL(req.url,origin);let pathname;try{pathname=decodeURIComponent(target.pathname)}catch{return deny(res,400,'Endereço inválido.')}
 if(pathname.includes('\\')||pathname.includes('\0')||pathname.split('/').some(p=>p==='..'||p.startsWith('.')))return deny(res,400,'Endereço inválido.');
 if(pathname==='/__volts/health'&&req.method==='GET'){res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'});return res.end(JSON.stringify({application:'volts-cog-lan',version:'2.3.0',url,network:config.network,pid:process.pid}))}
 if(pathname.startsWith('/api/')){
  if(!['GET','POST'].includes(req.method))return deny(res,405,'Método não permitido.');
  if(req.method==='POST'&&(req.headers.origin!==origin||!req.headers['content-type']?.includes('application/json')))return deny(res,403,'Origem ou formato não permitido.');
  const chunks=[];let length=0;for await(const chunk of req){length+=chunk.length;if(length>32768)return deny(res,413,'Conteúdo muito longo.');chunks.push(chunk)}
  const body=Buffer.concat(chunks);const headers=new Headers();for(const [key,value] of Object.entries(req.headers)){if(/^(connection|transfer-encoding|content-length|host|forwarded|x-forwarded-|mf-|oai-authenticated-)/i.test(key))continue;if(value)headers.set(key,Array.isArray(value)?value.join(','):value)}
  let b={};if(req.method==='POST'){try{b=JSON.parse(body.toString('utf8'));if(!b||typeof b!=='object'||Array.isArray(b))throw Error()}catch{return deny(res,400,'Dados inválidos.')}}
  let result,cookie;
  if(pathname==='/api/auth/session'&&req.method==='GET'){const user=session(req);result=user?{user:publicUser(user),csrf:user.csrf}:{user:null};}
  else if(pathname==='/api/auth'&&req.method==='POST'){const auth=await authAction(req,b);result=auth.data;cookie=auth.cookie;}
  else if(pathname==='/api/cog'&&req.method==='GET')result=dataFor(requireUser(req));
  else if(pathname==='/api/readings'&&req.method==='GET'){requireUser(req);result=queryReadings(target.searchParams);}
  else if(pathname==='/api/cog'&&req.method==='POST')result=await mutateCog(req,b);
  else if(pathname==='/api/keys'&&req.method==='GET'){requireUser(req);result=keysData();}
  else if(pathname==='/api/keys'&&req.method==='POST')result=mutateKeys(req,b);
  else if(pathname==='/api/admin'&&req.method==='GET'){requireUser(req,{admin:true});result=adminData();}
  else if(pathname==='/api/fleet'){
   const user=requireUser(req);const request=new Request(origin+pathname+target.search,{method:req.method,headers,...(req.method==='POST'?{body}:{})});
   const response=await(req.method==='GET'?GET():POST(request));if(response.ok&&req.method==='POST')audit(user,'fleet.'+String(b.action),String(b.id||'new'));
   const outgoing=Object.fromEntries(response.headers);outgoing['X-Content-Type-Options']='nosniff';res.writeHead(response.status,outgoing);return res.end(Buffer.from(await response.arrayBuffer()));
  }else return deny(res,404,'Não encontrado.');
  res.writeHead(200,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...(cookie?{'Set-Cookie':cookie}:{})});return res.end(JSON.stringify(result));
 }
 if(!['GET','HEAD'].includes(req.method))return deny(res,405,'Método não permitido.');
 if(pathname!=='/'&&pathname!=='/favicon.svg'&&!pathname.startsWith('/assets/'))return deny(res,404,'Não encontrado.');
 const file=path.resolve(publicDir,pathname==='/'?'index.html':'.'+pathname);if(!file.startsWith(publicDir+path.sep)||!existsSync(file)||!statSync(file).isFile())return deny(res,404,'Não encontrado.');
 res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Content-Length':statSync(file).size,'Cache-Control':pathname.startsWith('/assets/')?'public, max-age=31536000, immutable':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'same-origin','X-Frame-Options':'SAMEORIGIN'});
 if(req.method==='HEAD')return res.end();createReadStream(file).on('error',()=>res.destroy()).pipe(res);
 }catch(error){const unique=String(error.message).includes('UNIQUE constraint');if(!res.headersSent)deny(res,error.status||(unique?409:500),error.status?error.message:unique?'Este cadastro ou leitura já existe. Confira os dados.':'Não foi possível concluir a operação.');else res.destroy();if(!error.status&&!unique)log('Falha interna em operação da aplicação.')}}
await initialize();initializeAuth();initializeCog();backup();
async function listen(ip){return new Promise((resolve,reject)=>{const server=http.createServer({requestTimeout:15000,headersTimeout:10000,maxHeaderSize:16384},handler);server.on('error',reject);server.listen(config.port,ip,()=>{servers.push(server);resolve()})})}
try{await listen(address);await listen('127.0.0.1')}catch(error){for(const server of servers)server.close();throw error}
startMail();
writeFileSync(path.join(root,'servidor.json'),JSON.stringify({pid:process.pid,url,address,network:config.network,startedAt:new Date().toISOString()},null,2));
writeFileSync(path.join(root,'ABRIR.url'),'[InternetShortcut]\r\nURL='+url+'\r\n');
log(`Servidor iniciado em ${url}; apenas ${config.network}/24 e acesso local. PID ${process.pid}`);console.log(url);
function close(code=0){if(closing)return;closing=true;clearInterval(checkNetwork);for(const server of servers)server.close();try{sqlite.exec('PRAGMA wal_checkpoint(TRUNCATE)');sqlite.close()}catch{}try{const state=JSON.parse(readFileSync(path.join(root,'servidor.json'),'utf8'));if(state.pid===process.pid)unlinkSync(path.join(root,'servidor.json'))}catch{}log('Servidor encerrado.');process.exit(code)}
const checkNetwork=setInterval(()=>{if(lanAddress()!==address){log('A interface mudou. Encerrando para preservar a restrição à rede configurada.');close(10)}},30000);checkNetwork.unref();
process.on('SIGINT',()=>close());process.on('SIGTERM',()=>close());
