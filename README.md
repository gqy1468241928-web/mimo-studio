# MiMo · 我的工作台

私人内容工作台。首页只保留待办创建和列表，内容围绕 apexcomponent.com / globalwellpcb.com 整理。

## 五个入口

- **待办**：创建、完成、恢复、日期/备注、关联项目。完成事项保留。
- **内容管理**：网站文章（草稿/编写中/已发布）、邮件询盘、中国制造询盘、关键词；站点筛选、查找、CSV/JSON 导入。这里管理内容记录，暂不直接发布到 WordPress。
- **资源库**：SEO 资料、学习资料、随手笔记、提示词模板。支持链接、文本、标签和模板复制。
- **Agent**：兼容 Chat Completions 的 API；整理询盘、关键词和项目计划。建议经用户确认后加入待办，不自动发送邮件、报价或删除记录。项目保留在此入口。
- **设置**：多个邮箱/API 来源、Agent API、私人密码、备份恢复。

## 真实数据与自动收取

生产数据库使用 Hostinger MySQL；浏览器只保存 HttpOnly 会话 cookie，业务数据不依赖本地存储。来源密钥在服务器以 AES-GCM 加密保存，API 只返回是否已配置。

后台每 30 秒扫描到期来源，每个来源的收取间隔为 10 分钟。Hostinger cron 每 10 分钟独立执行同步脚本，浏览器关闭时仍可收取。数据库租约避免同时重复收取；个别来源失败不影响其他来源，错误保留在设置里。

邮件第一次读取最近指定天数中的最新 50 封，后续按邮箱 UID 保存进度，每次最多 50 封。原邮箱为只读；审核归档只改变工作台状态，不改邮箱。归档消息保留原文，重复读取不会恢复到待处理。长邮件读取前 256KB，附件和 HTML 邮件的完整正文需在原邮箱查看。

通用 API 收取每次最多 100 条，接口应返回新到旧的 JSON 数组，提供稳定的唯一 ID；嵌套字段用点号路径。得到大脑使用官方 note_id、data.notes 和 cursor，每轮读取最新页及最多四页历史。笔记详情可在资源库打开后获取。

Hostinger 邮箱支持已保存的 Agentic Mail API 令牌，按所选邮箱每 10 分钟读取最新 50 封元数据；在详情中读取正文会将该封邮件标记为已读。已读取正文和审核历史不会被重复同步覆盖。其它邮箱支持 IMAP + 授权码/应用密码、TLS 993。需要 OAuth 的邮箱暂不提供授权登录和 Token 自动续期，可使用自己的 HTTPS 邮件 API；短期 API Token 到期需更新。中国制造目前支持人工记录、CSV/JSON 或已有 API，不模拟平台登录抓取。

Agent 只使用已有的待处理资料；每类最多 30 条，正文限制 4000 字符。界面保留最近 30 次整理结果。不是全量邮件自动决策系统。

## 本地运行

需要 Node.js 24、npm。首次安装：
    npm ci
    npm run build

开发 API（本地 SQLite，开发密码为 local-workbench）：
    npm run dev

另开终端运行前端：
    npx vite

或者构建后运行：
    npm run build
    node server.mjs

生产必须设置环境变量，缺少 MySQL/会话/加密配置时拒绝启动，不使用临时内存数据库。
不要在公开网站运行默认的开发模式。

## Hostinger 部署

此应用包含后端，使用 **Express** 框架预设。

| 项目 | 设置 |
| --- | --- |
| 仓库 | gqy1468241928-web/mimo-studio |
| 分支 | main |
| Node.js | 24.x |
| 包管理器 | npm |
| 根目录 | . |
| 构建脚本 | build |
| 输出目录 | dist |
| 入口文件 | server.mjs（相对项目根目录） |

构建将前端放在 dist/public，后端放在 server.mjs。运行时使用平台提供的 PORT 并监听 0.0.0.0。部署后先检查 /api/health，再检查登录、数据保存和访问限制。平台入口具体路径以实际部署日志和线上验收为准。

环境变量：
- NODE_ENV=production
- APP_URL=https://mimo-studio.top
- DB_HOST=127.0.0.1、DB_PORT=3306
- DB_NAME、DB_USER、DB_PASSWORD：该应用专用的 Hostinger MySQL
- SESSION_SECRET：随机 32 字节或更长
- CONFIG_ENCRYPTION_KEY：随机 32 字节，64 个十六进制字符
- CRON_SECRET：随机 32 字节或更长
- INITIAL_PASSWORD_HASH：scrypt 生成的 salt:hash（用于首次建库初始化）

第一次密码初始化保存在数据库；修改后不会被环境变量里的旧初始化密码覆盖。更换 CONFIG_ENCRYPTION_KEY 会使已保存连接密钥无法解密；更换 SESSION_SECRET 会使会话失效。

cron：*/10 * * * *，运行 /home/u888237670/domains/mimo-studio.top/hbuilds/current/nodejs/sync.mjs。数据库与加密密钥从 Hostinger 已保存的私有应用环境读取，不依赖域名、网页打开状态或 HTTP 请求。该脚本与网站后台共用数据库租约，重复触发不会重复读取。/api/sync 仍保留给登录用户和带 X-Cron-Secret 的托管触发器。

业务备份不包含连接密码。设置中的导出/恢复支持最多 500 条、2MB 的单次恢复；更多记录请分批导入或使用 Hostinger 数据库备份。备份文件包含业务资料，请自行保存。

## Hostinger 缺失路由的恢复

正式域名的公共目录必须有 .htaccess，指向私有 hbuilds/current/nodejs/server.mjs。2026-10-08 已修复因平台没有生成此文件而出现的 403。定时同步脚本会在 Hostinger Linux 生产环境补回缺失文件；已有平台配置保持原样。因此重新部署后若公共目录清空，下一次 10 分钟任务会恢复路由。部署维护时也应在构建完成后立即核对首页和 /api/health，必要时从 deploy/hostinger-routing.htaccess 恢复公共目录的 .htaccess，不必修改 DNS。

## 验证

    npm test
    npm run check
    npm run build

测试覆盖版本冲突、历史归档、重复同步、持久进度、独占租约、Agent 建议幂等、登录访问、密钥脱敏、跨站来源、密码修改与备份 ID 保留。

## 原工作台连接迁移

旧 Sites 工作台与 Hostinger 数据库相互独立。可先恢复邮箱地址、邮箱标识和得到大脑 Client ID；缺少密钥的来源保持暂停，不能自动收取。原凭据的解密恢复须按用户明确批准的范围进行，或由用户在设置中填写原 API 令牌。实际来源列表与上次成功时间是连接是否启用的依据。

## 官方文档

- [Hostinger Node.js 部署](https://www.hostinger.com/support/how-to-deploy-a-nodejs-website-in-hostinger/)
- [得到大脑 API](https://doc.biji.com/docs/WOxgwObNNiyMHWk1dl0cJqSxnEd)
