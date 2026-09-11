import {pool} from './db.mjs';
import {createApp} from './app.mjs';
const app=createApp({db:pool});const server=app.listen(Number(process.env.PORT||4100),'0.0.0.0',()=>console.log('Atlas API listening'));
const cleanup=setInterval(()=>pool.query('DELETE FROM workspaces WHERE expires_at<now()').catch(()=>console.error('Workspace cleanup failed')),3600000);cleanup.unref();
async function shutdown(){clearInterval(cleanup);server.close(async()=>{await pool.end();process.exit(0);});setTimeout(()=>process.exit(1),10000).unref();}
process.on('SIGTERM',shutdown);process.on('SIGINT',shutdown);
