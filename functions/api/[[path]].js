export async function onRequest({request,env}){
 if(!env.DASHBOARD_API)return Response.json({error:{code:'SERVICE_UNAVAILABLE',message:'The API is not configured yet.'}},{status:503});
 try{return await env.DASHBOARD_API.fetch(request);}catch{return Response.json({error:{code:'SERVICE_UNAVAILABLE',message:'The service is temporarily unavailable. Please retry.'}},{status:503,headers:{'Cache-Control':'no-store'}});}
}
