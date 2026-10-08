import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
export default defineConfig({root:path.resolve('lan'),plugins:[react()],resolve:{alias:{'@':path.resolve('.')}},publicDir:path.resolve('public'),build:{outDir:path.resolve(process.env.VOLTS_BUILD_DIR||'../public'),emptyOutDir:false}});
