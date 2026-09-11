import pg from 'pg';
export const pool = new pg.Pool({connectionString:process.env.DATABASE_URL,max:8,connectionTimeoutMillis:5000,idleTimeoutMillis:30000,statement_timeout:8000});
export async function transaction(fn, db=pool) { const c=await db.connect(); try{await c.query('BEGIN');const result=await fn(c);await c.query('COMMIT');return result;}catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();} }
