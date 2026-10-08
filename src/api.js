export async function api(path,options={}) {
 const response=await fetch('/api'+path,{credentials:'same-origin',...options,headers:{'content-type':'application/json',...options.headers},...(options.body?{body:JSON.stringify(options.body)}:{})});
 const json=await response.json().catch(()=>({error:'服务暂时不可用'}));
 if(!response.ok){const error=new Error(json.error||'操作失败');error.status=response.status;throw error;}
 return json;
}
export const sites=[{value:'',label:'全部网站'},{value:'apexcomponent.com',label:'ApexComponent'},{value:'globalwellpcb.com',label:'GlobalWellPCB'}];
export const labels={tasks:'待办',articles:'文章',inquiries:'邮件询盘',mic:'中国制造询盘',keywords:'关键词',backlinks:'外链',resources:'资料',notes:'笔记',prompts:'提示词',projects:'项目'};
export const statusLabels={todo:'未完成',done:'已完成',new:'待处理',draft:'草稿',writing:'编写中',published:'已发布',following:'跟进中',archived:'已归档'};
export const displayDate=value=>value?new Date(value).toLocaleString('zh-CN',{month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'}):'尚未收取';
export function safeLink(value){try{const u=new URL(value);return ['https:','http:'].includes(u.protocol)&&!u.username&&!u.password?u.href:'';}catch{return '';}}

export const feeStatusLabels={unknown:'待确认',free:'免费',paid:'需要费用'};
