const readRecoveryListeners=new Set();
export function onReadRecovered(listener){readRecoveryListeners.add(listener);return ()=>readRecoveryListeners.delete(listener);}
function requestError(message,path,method,code,status){return Object.assign(new Error(message),{requestPath:path,method,code,...(status?{status}:{})});}
const retryDelay=()=>new Promise(resolve=>setTimeout(resolve,350));
export async function api(path,options={}) {
 const method=String(options.method||'GET').toUpperCase(),read=method==='GET',attempts=read?2:1;
 for(let attempt=0;attempt<attempts;attempt++){
  let response;
  try{response=await fetch('/api'+path,{credentials:'same-origin',cache:'no-store',...options,method,headers:{'content-type':'application/json',...options.headers},...(options.body?{body:JSON.stringify(options.body)}:{})});}
  catch(error){
   if(read&&attempt===0&&!options.signal?.aborted){await retryDelay();continue;}
   if(read&&options.signal?.aborted)throw requestError('读取已取消',path,method,'CANCELLED');
   throw requestError(read?'暂时无法连接工作台，自动重试后仍未恢复。请检查网络后重试。':'连接中断，尚未确认操作结果。请先查看记录状态，再决定是否重试。',path,method,'NETWORK_ERROR');
  }
  if(read&&attempt===0&&[502,503,504].includes(response.status)){await retryDelay();continue;}
  let json;
  try{json=await response.json();}
  catch{
   if(read&&attempt===0&&!options.signal?.aborted){await retryDelay();continue;}
   throw requestError(read?'工作台返回了不完整的响应，请稍后重试。':'操作响应中断，尚未确认结果。请先查看记录状态，再决定是否重试。',path,method,read?'SERVICE_UNAVAILABLE':'NETWORK_ERROR',response.ok?undefined:response.status);
  }
  if(!response.ok)throw requestError(typeof json?.error==='string'?json.error:'服务暂时不可用，请稍后重试',path,method,response.status>=500?'SERVICE_UNAVAILABLE':'HTTP_ERROR',response.status);
  if(read)for(const listener of readRecoveryListeners)try{listener(path);}catch{}
  return json;
 }
}
export const sites=[{value:'',label:'全部网站'},{value:'apexcomponent.com',label:'ApexComponent'},{value:'globalwellpcb.com',label:'GlobalWellPCB'}];
export const labels={tasks:'待办',articles:'文章',inquiries:'邮件询盘',mic:'中国制造询盘',keywords:'关键词',backlinks:'外链',resources:'资料',notes:'笔记',prompts:'提示词',projects:'项目'};
export const statusLabels={todo:'未完成',done:'已完成',new:'待处理',draft:'草稿',writing:'编写中',published:'已发布',following:'跟进中',archived:'已归档'};
export const displayDate=value=>value?new Date(value).toLocaleString('zh-CN',{month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'}):'尚未收取';
export function safeLink(value){try{const u=new URL(value);return ['https:','http:'].includes(u.protocol)&&!u.username&&!u.password?u.href:'';}catch{return '';}}

export const feeStatusLabels={unknown:'待确认',free:'免费',paid:'需要费用'};

export const isUnreadMail=record=>record?.kind==='inquiries'&&!!record.sourceId&&record.status!=='archived'&&!record.readAt;
export function mailDate(value){
 if(!value)return '日期未知';
 const date=new Date(value);if(!Number.isFinite(date.getTime()))return '日期未知';
 return date.toLocaleString('zh-CN',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false});
}
