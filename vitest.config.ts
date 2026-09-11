import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
export default defineConfig({plugins:[react()],test:{environment:'node',fileParallelism:false,testTimeout:20000,hookTimeout:60000}});
