import {createHash} from 'node:crypto';
import {requestJSON} from './network.mjs';
export const websitePresets=[
 {id:'64955b20-7239-4786-bfd4-536b4c7f2a71',name:'ApexComponent · 网站文章',site:'apexcomponent.com',origin:'https://apexcomponent.com'},
 {id:'f76d41b2-4d1d-44e6-abee-8fdf117e429d',name:'GlobalWellPCB · 网站文章',site:'globalwellpcb.com',origin:'https://globalwellpcb.com'}
];
export function validateWordPressSource(source){
 const preset=websitePresets.find(p=>p.site===source.site&&p.origin===source.config?.origin);
 if(!preset)throw new Error('请为文章来源选择对应的网站');
 return preset;
}
export function plainArticleHtml(value){
 if(typeof value!=='string')return '';
 return value.replace(/<!--[\s\S]*?-->/g,'').replace(/<(script|style|iframe|template|svg|noscript)\b[^>]*>[\s\S]*?<\/\1\s*>/gi,'')
 .replace(/<br\s*\/?\s*>|<\/(?:p|div|li|h[1-6]|tr|section)>/gi,'\n').replace(/<[^>]*>/g,'')
 .replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos|nbsp|ndash|mdash);/gi,(whole,token)=>{
  const map={amp:'&',lt:'<',gt:'>',quot:'"',apos:"'",nbsp:' ',ndash:'–',mdash:'—'};
  if(token[0]!=='#')return map[token.toLowerCase()]||whole;
  const n=/^#x/i.test(token)?parseInt(token.slice(2),16):Number(token.slice(1));return n>0&&n<=0x10ffff&&!(n>=0xd800&&n<=0xdfff)?String.fromCodePoint(n):whole;
 }).replace(/[ \t]+/g,' ').replace(/ *\n */g,'\n').replace(/\n{3,}/g,'\n\n').trim();
}
const iso=v=>{if(typeof v!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(v))return '';const date=new Date(v+'Z');return Number.isFinite(date.getTime())?date.toISOString():'';};
export function mapWordPressPost(source,post){
 const preset=validateWordPressSource(source);
 if(!Number.isSafeInteger(Number(post?.id))||Number(post.id)<=0||post.status!=='publish'||post.type!=='post')throw new Error('文章接口返回了无效或未发布的记录');
 const url=new URL(post.link);if(url.protocol!=='https:'||url.hostname.replace(/^www\./,'')!==preset.site||url.username||url.password)throw new Error('文章来源链接不属于所选网站');url.hostname=preset.site;
 const title=plainArticleHtml(post.title?.rendered),text=plainArticleHtml(post.content?.rendered);if(!title)throw new Error('文章缺少标题');
 const raw=post.meta?.rank_math_focus_keyword??post.meta?._yoast_wpseo_focuskw??post.meta?.focus_keyword??'';
 const keywords=typeof raw==='string'?raw.split(/[,，;；\n]/).map(v=>v.trim()).filter(Boolean):[];
 const terms=Array.isArray(post._embedded?.['wp:term'])?post._embedded['wp:term'].flat():[];
 return {id:'src_'+createHash('sha256').update(source.id+':post:'+post.id).digest('hex').slice(0,48),sourceId:source.id,externalId:'post:'+post.id,kind:'articles',site:preset.site,status:'published',
 title:title.slice(0,300),url:url.href,content:text.slice(0,200000),truncated:text.length>200000,publishedAt:iso(post.date_gmt),modifiedAt:iso(post.modified_gmt),
 keyword:keywords[0]||'',tags:terms.filter(t=>t?.taxonomy==='post_tag').map(t=>plainArticleHtml(t.name)).filter(Boolean).join(', ').slice(0,500)};
}
export async function readWordPressSource(source,{request=requestJSON,budgetMs=90000}={}){
 const started=Date.now(),preset=validateWordPressSource(source),records=[],seen=new Set();let totalCandidates=null,totalPages=null,lastPage=1,partialError='';
 async function read(page){
  const url=new URL(preset.origin+'/wp-json/wp/v2/posts');url.search=new URLSearchParams({per_page:'10',page:String(page),status:'publish',orderby:'modified',order:'desc',_fields:'id,type,status,link,title,content,excerpt,date_gmt,modified_gmt,meta,categories,tags'}).toString();
  const response=await request(url.href,{metadata:true,maxBytes:4194304,retryAddresses:true,connectTimeout:5000}),data=response.json;
  if(!Array.isArray(data)||data.length>10)throw new Error('文章接口没有返回有效列表');
  const number=key=>{const raw=String(response.headers?.[key]??'');return /^\d{1,8}$/.test(raw)?Number(raw):null;};
  totalCandidates=number('x-wp-total')??totalCandidates;totalPages=number('x-wp-totalpages')??totalPages;
  for(const row of data){const article=mapWordPressPost(source,row);if(!seen.has(article.id)){seen.add(article.id);records.push(article);}}
  lastPage=page;return data.length===10;
 }
 let more=await read(1),page=source.state?.hasMore?Number(source.state.nextPage)||2:2;
 if(totalPages!==null&&page>totalPages)page=2;
 for(let n=1;n<20&&more&&(totalPages===null||page<=totalPages);n++){
  if(Date.now()-started>=budgetMs)break;
  try{more=await read(page);}catch(e){if(e.code!=='NETWORK_ERROR')throw e;partialError=e.message;break;}
  page++;
 }
 const hasMore=totalPages!==null?page<=totalPages:more;
 return {records,state:{...source.state,totalCandidates,totalPages,lastPage,hasMore,partialError,nextPage:hasMore?page:2}};
}
export async function ensureWebsiteSources(store){
 if(await store.getSetting('website-sources-restored-v1'))return;
 const existing=await store.listSources();
 for(const preset of websitePresets){
  if(existing.some(s=>s.id===preset.id||s.type==='wordpress'&&s.config?.origin===preset.origin))continue;
  await store.saveSource({id:preset.id,name:preset.name,type:'wordpress',site:preset.site,enabled:true,secret:'',config:{origin:preset.origin},state:{},nextRun:0});
 }
 await store.setSetting('website-sources-restored-v1',{restoredAt:Date.now()});
}
