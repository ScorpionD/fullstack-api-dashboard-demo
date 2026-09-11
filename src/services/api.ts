let csrfToken='';
export function setCsrf(token:string){csrfToken=token;}
export class ApiError extends Error {status:number;code:string;fields?:Record<string,string>;requestId?:string;constructor(message:string,status:number,code:string,fields?:Record<string,string>,requestId?:string){super(message);this.status=status;this.code=code;this.fields=fields;this.requestId=requestId;}}
export async function api<T>(path:string,options:RequestInit={}):Promise<T>{
 const timeout=AbortSignal.timeout(12000);const signal=options.signal?AbortSignal.any([options.signal,timeout]):timeout;
 const res=await fetch('/api'+path,{...options,credentials:'same-origin',signal,headers:{'Content-Type':'application/json',...(csrfToken?{'X-CSRF-Token':csrfToken}:{}),...options.headers}});
 if(res.status===204)return undefined as T;
 let body;try{body=await res.json();}catch{throw new ApiError('The service returned an unreadable response. Please retry.',502,'INVALID_RESPONSE');}
 if(!res.ok){const e=body.error||{};if(res.status===401&&path!=='/auth/login'&&path!=='/auth/session')window.dispatchEvent(new Event('atlas-session-expired'));throw new ApiError(e.message||'Something went wrong. Please retry.',res.status,e.code||'REQUEST_FAILED',e.fields,e.requestId);}
 return body as T;
}
export function moneyToCents(value:string){if(!/^\d+(\.\d{1,2})?$/.test(value))throw new Error('Enter a positive amount with up to two decimal places.');const cents=Math.round(Number(value)*100);if(!Number.isSafeInteger(cents)||cents<1||cents>100000000)throw new Error('Amount must be between €0.01 and €1,000,000.');return cents;}
