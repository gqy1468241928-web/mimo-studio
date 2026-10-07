# MiMo 精简工作台 Implementation Plan

**Goal:** 替换旧MiMo功能，以五个入口完成待办、内容、资料、Agent和自动同步。
**Architecture:** Vue界面调用同源Express API，Hostinger MySQL永久存储，后台扫描按数据库租约处理到期来源。
**Tech Stack:** Vue/Vite、Express、mysql2、imapflow、mailparser、Node内置测试。

- [x] server/db.mjs 与 tests/store.test.mjs：真实SQLite验证记录版本、归档重复同步、租约和Agent建议幂等。
- [x] server/security.mjs 与 tests/security.test.mjs：验证会话过期/篡改、凭据加密、公共HTTPS限制。
- [x] server/sources.mjs、server/agent.mjs、server/app.mjs：IMAP/API读取、10分钟后台任务、结构化建议审核、CRUD与私有会话。
- [x] src/App.vue 与 src/components/*：五入口、待办首页、内容/资源分页和编辑、Agent建议、来源设置。
- [ ] Hostinger数据库/环境配置、构建输出、HTTP与界面验收，替换GitHub main并部署。

部署状态：Hostinger 构建已完成（2026-10-07）；域名 DNS 和线上界面验收待完成。浏览器权限检查不可用，未宣称界面自动验收通过。
