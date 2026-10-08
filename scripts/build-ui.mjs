import {spawnSync} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const frontend=path.join(root,'frontend');
const result=spawnSync(process.execPath,[path.join(frontend,'node_modules/vite/bin/vite.js'),'build','--config','vite.config.lan.ts'],{cwd:frontend,env:{...process.env,VOLTS_BUILD_DIR:path.join(root,'public')},stdio:'inherit'});
if(result.error)throw result.error;
process.exit(result.status??1);
