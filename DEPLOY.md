# 永久部署教程（Render 免费版）

> 目标：把网站部署到 Render，得到一个**永久固定、任何人都能打开**的网址，形如
> `https://renyutong-card.onrender.com`（名字可在部署时自定义）。
>
> 前置：需要一个 GitHub 账号（你已有 `asl-op`）。全程免费、**无需信用卡**。

---

## 总体流程

1. 把本项目上传到 GitHub（下面第 1~4 步）
2. 在 Render 上连接这个仓库并一键部署（第 5~8 步）
3. 得到永久网址

---

## 第 1 步：登录 GitHub

打开 https://github.com 登录你的账号 `asl-op`。
（如果你当前的网络打不开 GitHub，见文末「网络提示」。）

## 第 2 步：新建一个仓库

1. 点右上角 `+` → **New repository**
2. 仓库名填 `renyutong-card`（或任意名字）
3. 选 **Public**（公开，免费）
4. **不要**勾选任何初始化选项（README / .gitignore 都不要勾）
5. 点 **Create repository**

## 第 3 步：上传代码

新仓库创建后，GitHub 会显示一个「push an existing repository」的说明，里面有一段命令。
在**本项目文件夹**（`renyutong-card`）打开命令行，依次执行：

```bash
# 1) 关联远程仓库（把下面地址换成你的仓库地址）
git remote add origin https://github.com/asl-op/renyutong-card.git

# 2) 推送代码
git push -u origin main
```

> 本文件夹我已经帮你 `git init` 并做好了首次提交，直接执行上面两条即可。
> 如果提示分支名不是 main，可用 `git branch -M main` 先重命名。

> 提示：第一次 push 时 GitHub 会要求登录验证，按提示输入账号密码或 Personal Access Token。

## 第 4 步：注册 Render

打开 https://render.com → 点 **Get Started** → 用 **GitHub 账号**登录（Sign in with GitHub），
并授权 Render 访问你的仓库。

## 第 5 步：部署

**方式 A —— 用蓝图一键部署（推荐）**

1. 登录后进入 Render 控制台，点 **New +** → **Blueprint**
2. 选择你的 `renyutong-card` 仓库
3. Render 会自动读取项目里的 `render.yaml`，点 **Apply** / **Create**
4. 等几分钟，状态变 **Live** 即部署完成

**方式 B —— 手动创建 Web Service**

1. 点 **New +** → **Web Service**
2. 选择仓库 `renyutong-card`
3. 名称、区域默认即可；**Environment** 选 **Node**
4. Build Command 填 `npm install`，Start Command 填 `node server.js`
5. 方案选 **Free**，点 **Create Web Service**
6. 等状态变 **Live**

## 第 6 步：得到永久网址

部署完成后，控制台顶部会显示网址，例如：

```
https://renyutong-card.onrender.com
```

这就是你的永久链接，发给任何人都能打开。后台管理地址是：

```
https://renyutong-card.onrender.com/admin   （管理密码默认 asl11320）
```

---

## 注意事项（重要）

1. **免费版会休眠**：Render 免费版在约 15 分钟无访问后自动休眠，第一次打开需要等 **30~60 秒**唤醒，之后正常。这是免费方案的通病，介意可升级付费。
2. **后台修改不持久**：免费版磁盘是临时的，部署版上通过 `/admin` 做的修改，在**重新部署或重启后会还原**为仓库里的内容。
   - 想永久改内容：在本地改好 `data/*.json` → `git push` → Render 自动重新部署。
   - 本地（`start.bat`）运行不受影响，后台修改会正常保存到本地文件。
3. **自定义域名**（可选）：可在 Render 设置里绑定自己的域名，但国内域名需要 ICP 备案。

---

## 网络提示（重要）

国内直连 `github.com` / `render.com` 经常不稳定或超时。如果你遇到打不开的情况：

- **换网络**：用校园网、手机热点（4G/5G）、或挂代理/VPN 再操作
- 或者告诉我，我改用 **Glitch** 方案（无需 GitHub、在网页里粘贴文件即可部署，但免费版也有休眠）

需要我协助时，把你在哪一步卡住了告诉我即可。
