# MiMo 工作台部署指南

## 域名：mimo-studio.top

### 第一步：推送到 GitHub

```bash
cd G:/文档/mimo-workstation
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/gqy1468241928/mimo-studio.git
git push -u origin main
```

### 第二步：Vercel 部署

1. 访问 https://vercel.com
2. 点击 "Log in with GitHub"
3. 点击 "New Project"
4. 选择 "mimo-studio" 仓库
5. 点击 "Deploy"

### 第三步：配置自定义域名

1. 在 Vercel 项目设置中点击 "Domains"
2. 输入 `mimo-studio.top`
3. 添加 `www.mimo-studio.top`
4. 按提示配置 DNS：

#### DNS 配置（在你的域名注册商处）

| 类型 | 名称 | 值 |
|------|------|-----|
| A | @ | 76.76.21.21 |
| CNAME | www | cname.vercel-dns.com |

### 第四步：等待生效

- DNS 解析通常需要 5-30 分钟
- SSL 证书会自动配置
- 访问 https://mimo-studio.top

---

## 注意事项

1. **环境变量**：如果需要配置 API 密钥，在 Vercel 项目的 Settings > Environment Variables 中添加
2. **自动部署**：每次推送到 GitHub 会自动触发部署
3. **预览部署**：每个 PR 会生成预览链接

## 常用命令

```bash
# 本地开发
npm run dev

# 构建测试
npm run build

# 预览构建结果
npm run preview
```
