export const openCodeGo={
 id:'opencode-go',name:'OpenCode Go',endpoint:'https://opencode.ai/zen/go/v1',defaultModel:'glm-5.3-flash',
 models:[
  {id:'glm-5.3-flash',name:'GLM-5.3-Flash（默认）'},
  {id:'glm-5.2',name:'GLM-5.2'},
  {id:'glm-5.3',name:'GLM-5.3'},
  {id:'kimi-k2.7-code',name:'Kimi K2.7 Code'},
  {id:'kimi-k2.6',name:'Kimi K2.6'},
  {id:'deepseek-v4.1-flash',name:'DeepSeek V4.1 Flash'},
  {id:'mimo-v2.6-flash',name:'MiMo-V2.6-Flash'},
  {id:'mimo-v2.5',name:'MiMo-V2.5'}
 ]
};
export function isOpenCodeGo(endpoint){
 try{const url=new URL(String(endpoint||''));return url.origin==='https://opencode.ai'&&/^\/zen\/go\/v1(?:\/chat\/completions)?\/?$/.test(url.pathname)&&!url.search&&!url.hash;}catch{return false;}
}
