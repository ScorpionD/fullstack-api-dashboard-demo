import {randomBytes,scrypt as scryptCallback,timingSafeEqual,createHash} from 'node:crypto';
import {promisify} from 'node:util';
const scrypt=promisify(scryptCallback);
export const hashToken=t=>createHash('sha256').update(t).digest('hex');
export const token=()=>randomBytes(32).toString('hex');
export async function passwordHash(password){const salt=randomBytes(16).toString('hex');return salt+':'+(await scrypt(password,salt,64)).toString('hex');}
export async function passwordMatches(password,hash){const [salt,key]=hash.split(':');const derived=await scrypt(password,salt,64);return timingSafeEqual(Buffer.from(key,'hex'),derived);}
export function secretEqual(a,b){return typeof a==='string'&&typeof b==='string'&&a.length===b.length&&timingSafeEqual(Buffer.from(a),Buffer.from(b));}
export function validSession(session,now=Date.now()){return !!session&&new Date(session.expires_at).getTime()>now;}
