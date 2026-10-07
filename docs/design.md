# MiMo 精简工作台

用户已授权完整替换 gqy1468241928-web/mimo-studio 的旧页面与功能，部署目标为 Hostinger，域名 mimo-studio.top。旧 Sites 工作台保持独立。

## 功能
首页只有待办创建、未完成/已完成列表。内容管理包含文章、邮件询盘、中国制造询盘、关键词，按 apexcomponent.com / globalwellpcb.com 筛选。资源库统一容纳 SEO、学习、笔记和提示词。Agent 可连接兼容 Chat Completions 的 API，提供邮件整理、关键词整理、项目计划，写入建议由用户确认。设置管理多个邮箱/API 来源，密钥只在服务器加密保存。后台每10分钟同步，归档后的内容保留历史且重复获取不复活。

## 界面
五个导航：待办、内容管理、资源库、Agent、设置。白色主区、灰绿色导航，绿色操作 #246c57，正文 #27332e，边线 #e3e8e1。正文使用系统中文无衬线字体，品牌采用 Georgia，数据使用等宽字体。首页主区单列宽760px，内容页使用一行一条记录，复杂字段在编辑对话框中。无演示项目、虚构询盘或统计。

## 技术
Vue + Vite 前端，Express Node22服务，Hostinger MySQL持久保存；本地测试仅使用SQLite。构建输出dist/public与dist/server.mjs；Hostinger使用Express预设。登录使用HttpOnly签名会话，管理员密码在托管环境中设置。服务器定时扫描具备数据库租约，API/邮箱单个失败不阻塞其他来源。
