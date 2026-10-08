import {DatabaseSync} from 'node:sqlite';
import {mkdirSync,readFileSync,readdirSync,existsSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const dir=path.join(root,'data');mkdirSync(dir,{recursive:true});
export const sqlite=new DatabaseSync(path.join(dir,'frota.sqlite'));
sqlite.exec('PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;');
sqlite.exec('CREATE TABLE IF NOT EXISTS _volts_migrations (name TEXT PRIMARY KEY, applied_at TEXT NOT NULL)');
const migrationNames=readdirSync(path.join(root,'server','migrations')).filter(f=>/^\d+_.+\.sql$/.test(f)).sort();
if(migrationNames.some(name=>!sqlite.prepare('SELECT name FROM _volts_migrations WHERE name=?').get(name))){const before=path.join(root,'backups');mkdirSync(before,{recursive:true});sqlite.prepare('VACUUM INTO ?').run(path.join(before,`antes-migracao-${Date.now()}.sqlite`));}
for(const name of readdirSync(path.join(root,'server','migrations')).filter(f=>/^\d+_.+\.sql$/.test(f)).sort()){
 if(sqlite.prepare('SELECT name FROM _volts_migrations WHERE name=?').get(name))continue;
 sqlite.exec('BEGIN IMMEDIATE');try{sqlite.exec(readFileSync(path.join(root,'server','migrations',name),'utf8'));sqlite.prepare('INSERT INTO _volts_migrations (name,applied_at) VALUES (?,?)').run(name,new Date().toISOString());sqlite.exec('COMMIT')}catch(error){sqlite.exec('ROLLBACK');throw error}
}
class Statement{
 constructor(query,params=[]){this.query=query;this.params=params}
 bind(...params){return new Statement(this.query,params)}
 async first(column){const row=sqlite.prepare(this.query).get(...this.params);return column?row?.[column]??null:row??null}
 execute(){const statement=sqlite.prepare(this.query);if(statement.columns().length)return {success:true,results:statement.all(...this.params),meta:{changes:0}};const result=statement.run(...this.params);return {success:true,results:[],meta:{changes:Number(result.changes)}}}
}
export const binding={prepare(query){return new Statement(query)},async batch(statements){sqlite.exec('BEGIN IMMEDIATE');try{const results=statements.map(statement=>statement.execute());sqlite.exec('COMMIT');return results}catch(error){sqlite.exec('ROLLBACK');throw error}}};
export function backup(){const backups=path.join(root,'backups');mkdirSync(backups,{recursive:true});const file=path.join(backups,`frota-${new Date().toISOString().slice(0,10)}.sqlite`);if(!existsSync(file))sqlite.prepare('VACUUM INTO ?').run(file);return file;}
