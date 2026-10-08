import {createHash} from 'node:crypto';
export function readCSV(input) {
 const rows=[];let row=[],field='',quoted=false;
 const text=input.replace(/^\uFEFF/,'');
 for(let i=0;i<text.length;i++){
 const char=text[i];
 if(char==='"'){if(quoted&&text[i+1]==='"'){field+='"';i++;}else if(quoted)quoted=false;else if(!field)quoted=true;else throw new Error('CSV 引号格式有误');}
 else if(!quoted&&(char===','||char==='\n'||char==='\r')){
 row.push(field);field='';if(char!==','){if(row.some(Boolean))rows.push(row);row=[];if(char==='\r'&&text[i+1]==='\n')i++;}
 }else field+=char;
 }
 if(quoted)throw new Error('CSV 引号没有闭合');
 row.push(field);if(row.some(Boolean))rows.push(row);return rows;
}
function yesNo(value,label){
 if(value===undefined||value===null||value==='')return false;
 if(typeof value==='boolean')return value;
 const text=String(value).trim().toLowerCase();
 if(['true','yes','1','是','已发送','已完成'].includes(text))return true;
 if(['false','no','0','否','未发送','未完成'].includes(text))return false;
 throw new Error(label+'请填写 true/false 或是/否');
}
function fee(value){
 const text=String(value??'').trim().toLowerCase();
 if(['','unknown','待确认','未知'].includes(text))return 'unknown';
 if(['free','false','no','0','否','免费','不需要费用'].includes(text))return 'free';
 if(['paid','true','yes','1','是','收费','付费','需要费用'].includes(text))return 'paid';
 throw new Error('外链费用请填写待确认、免费或收费');
}
export function parseImport({text,kind,site='',format='csv',category=''}) {
 if(Buffer.byteLength(text,'utf8')>2097152)throw new Error('文件超过 2MB，请分批导入');
 let rows,preserveIds=false;
 if(format==='json'){let parsed;try{parsed=JSON.parse(text);}catch{throw new Error('JSON 文件格式有误');}preserveIds=parsed.format==='mimo-backup-v1';rows=Array.isArray(parsed)?parsed:parsed.records||parsed.items;}
 else {const data=readCSV(text),header=data.shift()||[];rows=data.map(cells=>Object.fromEntries(header.map((h,i)=>[h.trim(),cells[i]||''])));}
 if(!Array.isArray(rows)||rows.length>500)throw new Error('每次最多导入 500 条记录');
 return rows.map(row=>{
 const title=String(row.title||row.keyword||row['标题']||row['关键词']||row['外链网站']||'').trim();
 if(!title)throw new Error('每一条记录都需要 title（标题）或 keyword（关键词）');
 const fingerprint=row.id||JSON.stringify(row);
 const id=preserveIds&&row.id?String(row.id):'imp_'+createHash('sha256').update((kind||row.kind)+':'+(site||row.site||'')+':'+fingerprint).digest('hex').slice(0,48);
 const value={...row,category:row.category||category||((kind||row.kind)==='resources'?'seo':''),id,kind:kind||row.kind,site:site||row.site||'',title,content:String(row.content||row['内容']||''),sender:String(row.sender||row['邮箱']||''),company:String(row.company||row['公司']||''),country:String(row.country||row['国家']||''),status:row.status||((kind||row.kind)==='tasks'?'todo':'new')};
 if(value.kind==='backlinks'){
 value.contact=String(row.contact||row['外链联系人']||'');
 value.url=String(row.url||row['网站地址']||row['外链网站地址']||'');
 value.outreachSent=yesNo(row.outreachSent??row['是否发送请求']??row['是否发送请求外链信息'],'是否发送请求');
 value.feeStatus=fee(row.feeStatus??row['是否需要费用']);
 value.content=String(row.content||row['发送信息内容']||row['内容']||'');
 if(!row.status)value.status=yesNo(row.completed??row['是否完成'],'是否完成')?'done':'new';
 }
 return value;
 });
}
