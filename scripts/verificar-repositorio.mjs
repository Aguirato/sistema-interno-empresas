import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const failures=[];
const required=['README.md','LICENSE','AUTHORS.md','.gitignore','rede.exemplo.json',
  'server/server.mjs','server/initial-data.mjs','frontend/package.json',
  'frontend/package-lock.json','public/index.html','docs/PUBLICAR-NO-GITHUB.md',
  'docs/INSTALACAO.md','docs/BACKUP-E-TRANSFERENCIA.md','docs/THIRD-PARTY-NOTICES.md'];
for(const file of required) if(!fs.existsSync(path.join(root,file))) failures.push('Arquivo necessário ausente: '+file);

function walk(dir){
  const found=[];
  for(const item of fs.readdirSync(dir,{withFileTypes:true})){
    if(['node_modules','.git'].includes(item.name))continue;
    const absolute=path.join(dir,item.name);
    if(item.isSymbolicLink()){failures.push('Link simbólico deve ser revisado: '+path.relative(root,absolute));continue;}
    if(item.isDirectory())found.push(...walk(absolute));
    else found.push(path.relative(root,absolute).replaceAll('\\','/'));
  }
  return found;
}
let files;
if(fs.existsSync(path.join(root,'.git'))){
  const result=spawnSync('git',['ls-files','--cached','--others','--exclude-standard','-z'],{cwd:root,encoding:'utf8',maxBuffer:10*1024*1024});
  if(result.status!==0)throw Error('Não foi possível consultar os arquivos do Git. Instale o Git ou verifique o repositório.');
  files=[...new Set(result.stdout.split('\0').filter(Boolean))];
}else files=walk(root);

const privatePath=/(^|\/)(data|backups|logs|runtime|uploads|node_modules)\/|(^|\/)(rede\.json|servidor\.json|ABRIR\.url|PRIMEIRO-ACESSO\.txt|credentials[^/]*\.json|secrets[^/]*\.json)$|\.(sqlite(?:-[\w-]+)?|db(?:-[\w-]+)?|bak|key|pem|p12|pfx|log|zip|7z|rar|csv|xlsx|pdf)$/i;
const envPath=/(^|\/)\.env(?:\.|$)/;
const tokenPattern=/gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{50,}|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/;
for(const file of files){
  if(privatePath.test(file)||(envPath.test(file)&&!file.endsWith('.env.example')&&!file.endsWith('.env.exemplo')))failures.push('Arquivo privado ou operacional entre os candidatos ao Git: '+file);
  const absolute=path.resolve(root,file);
  if(!absolute.startsWith(root+path.sep)){failures.push('Caminho fora do repositório: '+file);continue;}
  if(!fs.existsSync(absolute))continue;
  if(/\.(md|txt|json|mjs|js|ts|tsx|ps1|cmd|sql|html|css)$/.test(file)&&tokenPattern.test(fs.readFileSync(absolute,'utf8')))failures.push('Possível segredo em '+file+'; revise antes de publicar.');
}

for(const file of files.filter(f=>f.startsWith('server/')&&!f.includes('/vendor/')&&f.endsWith('.mjs'))){
  const checked=spawnSync(process.execPath,['--check',path.join(root,file)],{encoding:'utf8'});
  if(checked.status!==0)failures.push('Erro de sintaxe em '+file+': '+checked.stderr);
}
if(fs.existsSync(path.join(root,'public/index.html'))){
  const html=fs.readFileSync(path.join(root,'public/index.html'),'utf8');
  const assets=[...html.matchAll(/(?:src|href)=["'](\/assets\/[^"']+)["']/g)].map(m=>m[1]);
  if(!assets.some(f=>f.endsWith('.js')))failures.push('A interface não possui entrada JavaScript compilada.');
  for(const asset of assets)if(!fs.existsSync(path.join(root,'public',asset)))failures.push('Asset ausente: '+asset);
  const folder=path.join(root,'public/assets');
  if(fs.existsSync(folder))for(const file of fs.readdirSync(folder).filter(f=>f.endsWith('.js'))){
    const contents=fs.readFileSync(path.join(folder,file),'utf8');
    for(const match of contents.matchAll(/["'`]\.\/([^"'`]+\.(?:js|css))["'`]/g)){
      if(!fs.existsSync(path.join(folder,match[1])))failures.push('Dependência compilada ausente em '+file+': '+match[1]);
    }
    for(const match of contents.matchAll(/["'`](\/?assets\/[^"'`]+\.(?:js|css))["'`]/g)){
      if(!fs.existsSync(path.join(root,'public',match[1])))failures.push('Dependência compilada ausente em '+file+': '+match[1]);
    }
  }
}
for(const name of ['package.json','frontend/package.json']){
  const pkg=JSON.parse(fs.readFileSync(path.join(root,name),'utf8'));
  if(pkg.private!==true||pkg.license!=='UNLICENSED')failures.push('Rever metadados proprietários em '+name);
}
if(failures.length){console.error(failures.join('\n'));process.exitCode=1;}
else console.log(`Verificação concluída: ${files.length} arquivos candidatos ao Git, sintaxe do servidor e assets presentes. Revise também o conteúdo do diff antes de publicar.`);
