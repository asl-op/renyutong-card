/**
 * ============================================================
 *  任禹桐 · 个人名片网站 —— 后端主服务
 * ------------------------------------------------------------
 *  技术栈：Node.js + Express
 *  存储：轻量 JSON 文件（data/ 目录），无需额外数据库，新手友好
 *
 *  页面路由：
 *      GET  /            主页
 *      GET  /projects    项目页
 *      GET  /about       关于我
 *      GET  /reads       阅读页（径向圈层星图）
 *      GET  /admin       后台可视化管理（增删改项目 / 阅读）
 *
 *  数据接口：
 *      GET  /api/profile        读取个人资料
 *      GET  /api/projects       读取项目列表
 *      POST /api/projects       新增项目
 *      PUT  /api/projects/:id   修改项目
 *      DELETE /api/projects/:id 删除项目
 *      （阅读 /api/reads 同理：GET / POST / PUT / DELETE）
 *
 *  说明：本项目不引入数据库，所有数据都以 JSON 文本形式
 *        存放在 data/ 目录下，直接用记事本打开也能编辑。
 * ============================================================
 */

const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000; // 端口号，可用环境变量覆盖

/* ---------- 后台访问口令（简单密码保护） ---------- */

// 后台口令：优先读环境变量 ADMIN_PASSWORD（部署到 Glitch/Render 时在平台设置），
// 本地未设置时默认 admin123。请改成你自己的口令，尤其是部署到公网前！
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

// 用口令算出一个固定令牌（HMAC）。登录成功后，服务器把令牌写入 httpOnly Cookie，
// 之后的写操作（新增 / 编辑 / 删除）都会校验这个令牌。
const ADMIN_TOKEN = crypto.createHmac('sha256', 'renyutong-card-salt').update(ADMIN_PASSWORD).digest('hex');

/* ---------- 1. 基础中间件 ---------- */

// 解析 application/json 请求体：后台新增/编辑时提交的数据用 JSON 传输
app.use(express.json());

// 托管 public 目录下的静态资源（css / js），前端页面直接引用
app.use(express.static(path.join(__dirname, 'public')));

/* ---------- 2. 数据文件路径 ---------- */

const DATA_DIR = path.join(__dirname, 'data');
const FILES = {
  profile: path.join(DATA_DIR, 'profile.json'),
  projects: path.join(DATA_DIR, 'projects.json'),
  reads: path.join(DATA_DIR, 'reads.json'),
};

/* ---------- 3. 种子数据（首次运行时若文件缺失则写入） ---------- */

const DEFAULT_PROFILE = {
  name: '任禹桐',
  nameEn: 'REN YUTONG',
  title: '学生 · 开发者 · 终身学习者',
  intro: '在代码与文字之间，探索世界的秩序与美。',
  about:
    '你好，我是任禹桐。\n' +
    '热爱编程、阅读与设计，喜欢把复杂的事情拆解成简单优雅的解决方案。\n' +
    '这个网站是一张会呼吸的星空名片，记录我的项目、阅读与思考。\n' +
    '欢迎你来到这里，也欢迎与我交流。',
  skills: ['Node.js', 'JavaScript', 'HTML / CSS', 'Python', 'UI 设计'],
  contact: {
    emails: ['d.gloss.ad@gmail.com', '3867731709@qq.com'],
    github: 'https://github.com/asl-op',
    wechat: 'ASL11320',
    qq: '3867731709',
    blog: '',
  },
};

const DEFAULT_PROJECTS = [
  {
    id: 'p-1',
    title: '个人名片网站',
    description:
      '极简高级宇宙星系质感的个人名片网站：Node.js + Express 后端，原生 JS 手写星云粒子与径向星图。',
    tags: ['Node.js', 'Express', 'Canvas'],
    link: 'https://github.com/asl-op',
    createdAt: '2026-08-13',
  },
  {
    id: 'p-2',
    title: '示例项目二',
    description: '这是一个演示卡片，可在后台管理页新增、编辑或删除。',
    tags: ['JavaScript'],
    link: '',
    createdAt: '2026-08-13',
  },
  {
    id: 'p-3',
    title: '示例项目三',
    description: '轻量化、不使用重型前端框架，保持纯粹的原生手写实现。',
    tags: ['HTML / CSS', 'Design'],
    link: '',
    createdAt: '2026-08-13',
  },
];

const DEFAULT_READS = [
  { id: 'r-1', type: 'book', title: '人类简史', category: '历史', status: '已读完', note: '从认知革命到科学革命，重读人类如何成为地球的主宰。' },
  { id: 'r-2', type: 'book', title: '代码整洁之道', category: '科技', status: '在读', note: '关于如何写出可读、可维护代码的经典之书。' },
  { id: 'r-3', type: 'note', title: '费曼学习法笔记', category: '学习', status: '笔记', note: '以教代学：能把一个概念讲给外行听懂，才算真正掌握。' },
  { id: 'r-4', type: 'book', title: '三体', category: '科幻', status: '已读完', note: '宇宙尺度的想象力，黑暗森林法则让人不寒而栗。' },
  { id: 'r-5', type: 'book', title: '小王子', category: '文学', status: '已读完', note: '每个大人都曾经是孩子，只是很少有人记得。' },
  { id: 'r-6', type: 'note', title: '设计中的克制', category: '设计', status: '笔记', note: '高级感来自克制：少即是多，留白比堆砌更有力量。' },
  { id: 'r-7', type: 'book', title: '苏菲的世界', category: '哲学', status: '在读', note: '一本用小说串起西方哲学史的启蒙读物。' },
  { id: 'r-8', type: 'book', title: '刻意练习', category: '学习', status: '已读完', note: '天才不是天生的，一万小时背后的方法论。' },
  { id: 'r-9', type: 'note', title: '银河系认知笔记', category: '科幻', status: '笔记', note: '我们抬头看到的星光，是数万年前出发的光。' },
];

/* ---------- 4. 工具函数：JSON 文件读写 ---------- */

// 读取 JSON 文件并解析；文件不存在或内容非法时返回 fallback（避免程序崩溃）
function readJSON(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (err) {
    return fallback;
  }
}

// 把数据写入 JSON 文件（缩进 2 空格，方便直接打开文件查看/编辑）
function writeJSON(file, data) {
  fs.mkdirSync(DATA_DIR, { recursive: true }); // 确保 data 目录存在
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
}

// 生成唯一 id（Node 14+ 内置的 crypto.randomUUID，无需额外依赖）
function genId() {
  return crypto.randomUUID();
}

/* ---------- 后台鉴权：读取 Cookie / 校验令牌 ---------- */

// 手动从请求头解析 admin_token（避免引入 cookie-parser 依赖）
function getToken(req) {
  const header = req.headers.cookie || '';
  const pair = header.split(';').map((s) => s.trim()).find((s) => s.startsWith('admin_token='));
  return pair ? pair.slice('admin_token='.length) : '';
}

// 写操作鉴权中间件：未携带正确令牌一律返回 401
function requireAdmin(req, res, next) {
  if (getToken(req) === ADMIN_TOKEN) return next();
  res.status(401).json({ error: '未授权：请先在 /admin 登录' });
}

/* ---------- 5. 通用 CRUD 路由注册 ---------- */

/**
 * 为「项目」和「阅读」两个集合注册相同结构的增删改查接口，
 * 避免重复代码。base 形如 '/api/projects'，file 为对应 JSON 文件。
 */
function collectionRoutes(base, file, defaults) {
  // 首次运行时文件可能不存在，先写入种子数据
  if (!fs.existsSync(file)) {
    writeJSON(file, defaults);
  }

  // 读取列表
  app.get(base, (req, res) => {
    res.json(readJSON(file, defaults));
  });

  // 新增一条（需登录）
  app.post(base, requireAdmin, (req, res) => {
    const list = readJSON(file, defaults);
    const item = Object.assign(
      { id: genId(), createdAt: new Date().toISOString().slice(0, 10) },
      req.body // 后台提交的字段（title / description / category ...）
    );
    list.push(item);
    writeJSON(file, list);
    res.json(item); // 返回新增的完整记录（含生成的 id）
  });

  // 修改一条（按 id 定位，需登录）
  app.put(base + '/:id', requireAdmin, (req, res) => {
    const list = readJSON(file, defaults);
    const idx = list.findIndex((it) => it.id === req.params.id);
    if (idx === -1) {
      return res.status(404).json({ error: '未找到该记录' });
    }
    // 合并：保留原 id 与 createdAt，覆盖其余字段
    list[idx] = Object.assign({}, list[idx], req.body, { id: list[idx].id });
    writeJSON(file, list);
    res.json(list[idx]);
  });

  // 删除一条（按 id 定位，需登录）
  app.delete(base + '/:id', requireAdmin, (req, res) => {
    const list = readJSON(file, defaults);
    const next = list.filter((it) => it.id !== req.params.id);
    writeJSON(file, next);
    res.json({ ok: true });
  });
}

// 注册两个集合的路由
collectionRoutes('/api/projects', FILES.projects, DEFAULT_PROJECTS);
collectionRoutes('/api/reads', FILES.reads, DEFAULT_READS);

/* ---------- 6. 个人资料接口（只读，供前端动态填充姓名/简介/页脚） ---------- */

app.get('/api/profile', (req, res) => {
  if (!fs.existsSync(FILES.profile)) {
    writeJSON(FILES.profile, DEFAULT_PROFILE);
  }
  res.json(readJSON(FILES.profile, DEFAULT_PROFILE));
});

/* ---------- 后台登录 / 登出 / 状态接口 ---------- */

// 登录：口令正确则下发 httpOnly Cookie（7 天有效）
app.post('/api/login', (req, res) => {
  const password = (req.body && req.body.password) || '';
  if (password === ADMIN_PASSWORD) {
    res.cookie('admin_token', ADMIN_TOKEN, {
      httpOnly: true,             // 仅服务器可读，JS 拿不到，防 XSS 窃取
      sameSite: 'lax',            // 阻止跨站请求携带，降低 CSRF 风险
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 天
    });
    return res.json({ ok: true });
  }
  res.status(401).json({ ok: false, error: '口令错误' });
});

// 登出：清除 Cookie
app.post('/api/logout', (req, res) => {
  res.clearCookie('admin_token');
  res.json({ ok: true });
});

// 查询当前是否已登录（供 admin 页判断显示登录表单还是管理界面）
app.get('/api/auth', (req, res) => {
  res.json({ authed: getToken(req) === ADMIN_TOKEN });
});

/* ---------- 7. 页面路由 ---------- */

// 路径 -> 对应 HTML 文件，显式声明让路由一目了然
const PAGES = {
  '/': 'index.html',
  '/projects': 'projects.html',
  '/about': 'about.html',
  '/reads': 'reads.html',
  '/admin': 'admin.html',
};

for (const [route, file] of Object.entries(PAGES)) {
  app.get(route, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', file));
  });
}

/* ---------- 8. 兜底：404 与错误处理 ---------- */

// 未匹配到任何路由时返回 404
app.use((req, res) => {
  res.status(404).send('404 · 页面不存在，请检查地址');
});

// 全局错误处理（4 个参数缺一不可，Express 以此识别错误中间件）
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: '服务器内部错误' });
});

/* ---------- 9. 启动服务 ---------- */

app.listen(PORT, () => {
  console.log('================================================');
  console.log('  任禹桐 · 个人名片网站 已启动');
  console.log(`  主页：  http://localhost:${PORT}/`);
  console.log(`  阅读：  http://localhost:${PORT}/reads`);
  console.log(`  后台：  http://localhost:${PORT}/admin`);
  console.log('  按 Ctrl + C 可停止服务');
  console.log('================================================');

  // 服务启动成功后，按需自动打开默认浏览器。
  // 只有设置了环境变量 OPEN_BROWSER=1（start.bat 会设置）才打开，
  // 部署到公网时不设置该变量，避免在服务器上误开浏览器。
  if (process.env.OPEN_BROWSER === '1') {
    const { exec } = require('child_process');
    const url = `http://localhost:${PORT}/`;
    const opener =
      process.platform === 'win32' ? `start "" "${url}"`
      : process.platform === 'darwin' ? `open "${url}"`
      : `xdg-open "${url}"`;
    exec(opener, (err) => {
      if (err) console.log('  未能自动打开浏览器，请手动访问上面的地址');
    });
  }
});
