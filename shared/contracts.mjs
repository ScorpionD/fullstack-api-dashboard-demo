import {z} from 'zod';
export const customerSchema=z.object({name:z.string().trim().min(2).max(80),email:z.email().max(160).transform(v=>v.toLowerCase()),company:z.string().trim().min(2).max(100),status:z.enum(['active','inactive'])}).strict();
export const orderSchema=z.object({customerId:z.uuid(),description:z.string().trim().min(2).max(120),amountCents:z.coerce.number(),status:z.enum(['pending','processing','completed','cancelled'])}).strict();
export const loginSchema=z.object({email:z.email().max(160),password:z.string().min(1).max(128)}).strict();
export const listSchema=z.object({page:z.coerce.number().int().min(1).max(10000).default(1),pageSize:z.coerce.number().int().min(1).max(50).default(8),search:z.string().trim().max(100).default(''),status:z.string().max(20).default('all')}).strict();
export function mapOrder(row){return{id:row.id,customerId:row.customer_id,customerName:row.customer_name,company:row.company,reference:row.reference,description:row.description,amountCents:row.amount_cents,status:row.status,createdAt:row.created_at};}
export function mapCustomer(row){return{id:row.id,name:row.name,email:row.email,company:row.company,status:row.status,createdAt:row.created_at};}
export function escapeLike(input){return input.replace(/[\\%_]/g,'\\$&');}
export function pageMeta(total,page,pageSize){const pages=Math.max(1,Math.ceil(total/pageSize));return{total,page:Math.min(page,pages),pageSize,pages};}
