# 部署到公网 —— 获得可分享的链接

本地 `http://localhost:3000/` 只有你自己的电脑能访问。想把网站分享给同学 / 老师，
需要一个公网链接。下面是两种免费方案。

> 好消息：`server.js` 已经用 `process.env.PORT` 读取端口，且 `package.json` 里有
> `"start": "node server.js"`，所以部署到任何 Node 托管平台**都不需要改代码**。

---

## 方案一：Glitch（推荐）

**为什么选 Glitch**：免费、无需信用卡、原生支持 Node.js + Express，而且**项目文件会持久保存**，
后台管理改动的 JSON 数据也能留存——最契合本项目「JSON 文件存储」的设计。

### 第 1 步：把项目上传到 GitHub

1. 用你的 GitHub 账号（asl-op）新建一个空仓库，例如叫 `renyutong-card`。
2. 把整个 `renyutong-card` 文件夹传上去（保留目录结构：`server.js`、`package.json`、`data/`、`public/`）。
   - 会用 git：命令行 `git init && git add . && git commit && git push`
   - 不会 git：直接登录 GitHub 网页版，在仓库页点 **Uploading files**，把文件夹里的文件拖进去即可。

### 第 2 步：在 Glitch 导入项目

1. 打开 <https://glitch.com>，用 **Sign in with GitHub** 登录。
2. 点 **New project → Import from GitHub**。
3. 粘贴你的仓库地址，例如 `https://github.com/asl-op/renyutong-card`。
4. Glitch 会自动识别 Node 项目、执行 `npm install`，并按 `package.json` 的 `start` 脚本启动服务。

### 第 3 步：得到公开链接

- 导入完成后，Glitch 会生成一个 `https://你的项目名.glitch.me` 的链接，**任何人打开都能看到你的网站**。
- 免费版在长时间无人访问后会「休眠」，第一次打开要等几秒唤醒（属正常现象）。

### 注意：公网版的后台管理

- 公网版后台在 `https://你的项目名.glitch.me/admin`，**已加口令保护**，登录后才能增删改。
- 默认口令是 `admin123`，**部署前务必修改**：在 Glitch 项目里点 **Tools → Environment Variables**，添加变量 `ADMIN_PASSWORD` 并设成你自己的强口令，然后重启项目。这样口令不会写进代码里。
- 前台页面（主页 / 项目 / 关于我 / 阅读）仍是公开的，任何人无需登录即可浏览。

---

## 方案二：Render（备选）

1. 同样先把项目推到 GitHub。
2. 打开 <https://render.com>，用 GitHub 登录。
3. 点 **New → Web Service**，选择你的仓库。
4. 构建命令填 `npm install`，启动命令填 `npm start`，选免费套餐，点 **Create Web Service**。
5. 部署完成后得到一个 `https://xxx.onrender.com` 链接。

> 区别：Render 免费版的磁盘是**临时的**，服务重启后，通过 admin 后台上改动的 JSON 会丢失
> （但项目里自带的种子数据还在）。所以如果你主要用后台改内容，优先选 Glitch。

---

## 小结

| 平台 | 链接 | 数据持久 | 适合 |
|------|------|---------|------|
| Glitch | `https://xxx.glitch.me` | ✅ 持久 | 首选，支持后台管理 |
| Render | `https://xxx.onrender.com` | ⚠️ 临时 | 只读展示 |
