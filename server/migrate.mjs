import {readFile} from 'node:fs/promises';
import {pool,transaction} from './db.mjs';
import {seedUsers} from './seed.mjs';
await transaction(async c=>{await c.query('SELECT pg_advisory_xact_lock(740031)');await c.query(await readFile(new URL('./schema.sql',import.meta.url),'utf8'));await seedUsers(c);});
console.log('Database schema and public demo users ready.');await pool.end();
