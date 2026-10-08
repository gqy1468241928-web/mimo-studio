// Go catalog verified against the public Go API and Models.dev on 2026-10-08.
export const openCodeGo={
  "id": "opencode-go",
  "name": "OpenCode Go",
  "endpoint": "https://opencode.ai/zen/go/v1",
  "defaultModel": "glm-5.3-flash",
  "models": [
    {
      "id": "glm-5.3-flash",
      "name": "GLM-5.3-Flash（默认）",
      "protocol": "chat",
      "group": "glm"
    },
    {
      "id": "qwen3.6-plus",
      "name": "Qwen3.6 Plus",
      "protocol": "chat",
      "group": "qwen3.6"
    },
    {
      "id": "qwen3.7-max",
      "name": "Qwen3.7 Max",
      "protocol": "chat",
      "group": "qwen3.7"
    },
    {
      "id": "qwen3.7-plus",
      "name": "Qwen3.7 Plus",
      "protocol": "messages",
      "group": "qwen3.7"
    },
    {
      "id": "qwen3.8-flash",
      "name": "Qwen3.8 Flash",
      "protocol": "messages",
      "group": "qwen3.8"
    },
    {
      "id": "qwen3.8-max",
      "name": "Qwen3.8 Max",
      "protocol": "messages",
      "group": "qwen3.8"
    },
    {
      "id": "glm-5.2",
      "name": "GLM-5.2",
      "protocol": "chat",
      "group": "glm"
    },
    {
      "id": "glm-5.3",
      "name": "GLM-5.3",
      "protocol": "chat",
      "group": "glm"
    },
    {
      "id": "kimi-k2.6",
      "name": "Kimi K2.6",
      "protocol": "chat",
      "group": "kimi"
    },
    {
      "id": "kimi-k2.7-code",
      "name": "Kimi K2.7 Code",
      "protocol": "chat",
      "group": "kimi"
    },
    {
      "id": "kimi-k3",
      "name": "Kimi K3",
      "protocol": "chat",
      "group": "kimi"
    },
    {
      "id": "deepseek-v4-flash",
      "name": "DeepSeek V4 Flash",
      "protocol": "chat",
      "group": "deepseek"
    },
    {
      "id": "deepseek-v4-flash-vision-exp",
      "name": "DeepSeek V4 Flash Vision Exp",
      "protocol": "chat",
      "group": "deepseek"
    },
    {
      "id": "deepseek-v4-pro",
      "name": "DeepSeek V4 Pro (New)",
      "protocol": "chat",
      "group": "deepseek"
    },
    {
      "id": "deepseek-v4.1-flash",
      "name": "DeepSeek V4.1 Flash",
      "protocol": "chat",
      "group": "deepseek"
    },
    {
      "id": "mimo-v2.5",
      "name": "MiMo V2.5",
      "protocol": "chat",
      "group": "mimo"
    },
    {
      "id": "mimo-v2.5-pro",
      "name": "MiMo V2.5 Pro",
      "protocol": "chat",
      "group": "mimo"
    },
    {
      "id": "mimo-v2.6-flash",
      "name": "MiMo-V2.6-Flash",
      "protocol": "chat",
      "group": "mimo"
    },
    {
      "id": "mimo-v2.6-pro",
      "name": "MiMo-V2.6-Pro",
      "protocol": "chat",
      "group": "mimo"
    },
    {
      "id": "minimax-m2.7",
      "name": "MiniMax-M2.7",
      "protocol": "messages",
      "group": "minimax"
    },
    {
      "id": "minimax-m3",
      "name": "MiniMax-M3",
      "protocol": "messages",
      "group": "minimax"
    },
    {
      "id": "gpt-5.6-luna",
      "name": "GPT-5.6 Luna",
      "protocol": "responses",
      "group": "gpt"
    },
    {
      "id": "gpt-6-luna",
      "name": "GPT-6 Luna",
      "protocol": "responses",
      "group": "gpt"
    },
    {
      "id": "grok-4.5",
      "name": "Grok 4.5",
      "protocol": "responses",
      "group": "grok"
    },
    {
      "id": "grok-4.6",
      "name": "Grok 4.6",
      "protocol": "responses",
      "group": "grok"
    },
    {
      "id": "grok-4.7",
      "name": "Grok 4.7",
      "protocol": "responses",
      "group": "grok"
    },
    {
      "id": "muse-spark-1.2-contributor",
      "name": "Muse Spark 1.2 Contributor",
      "protocol": "responses",
      "group": "muse"
    },
    {
      "id": "muse-spark-1.3-contributor",
      "name": "Muse Spark 1.3 Contributor",
      "protocol": "responses",
      "group": "muse"
    },
    {
      "id": "longcat-2.5-preview-free",
      "name": "LongCat 2.5 Preview Free",
      "protocol": "chat",
      "group": "longcat"
    },
    {
      "id": "longcat-2.0",
      "name": "LongCat-2.0",
      "protocol": "chat",
      "group": "longcat"
    },
    {
      "id": "hy3",
      "name": "Hy3",
      "protocol": "chat",
      "group": "Hy"
    },
    {
      "id": "hy4-preview",
      "name": "Hy4 preview",
      "protocol": "chat",
      "group": "Hy"
    },
    {
      "id": "space-bunny",
      "name": "Space Bunny",
      "protocol": "chat",
      "group": "space"
    }
  ]
};
export function isOpenCodeGo(endpoint){
 try{const url=new URL(String(endpoint||''));return url.origin==='https://opencode.ai'&&/^\/zen\/go\/v1(?:\/chat\/completions)?\/?$/.test(url.pathname)&&!url.search&&!url.hash;}catch{return false;}
}
