/**
 * ================================================================
 *  server.js —— 任禹桐「动态个人名片网站」后端主程序
 *  技术栈：Node.js + Express + 轻量 JSON 文件存储（无需数据库）
 *
 *  启动方式：双击 start.bat，或在命令行运行 `node server.js`
 *  访问地址：http://localhost:3000
 *
 *  路由规范：
 *     /           主页
 *     /projects   项目
 *     /about      关于我
 *     /reads      阅读
 *     /admin      后台可视化管理
 * ================================================================
 */

// ---------- 1. 引入依赖 ----------
const express = require('express'); // Web 服务框架
const path = require('path');       // 拼接文件路径
const fs = require('fs');           // 读写本地 JSON 数据文件

// 是否运行在 Vercel 无服务器环境（其文件系统只读）
const IS_SERVERLESS = !!process.env.VERCEL;

// 数据文件：Vercel 上用 require 打包读取（确保随代码一起部署）；本地仍走 fs 实时读写
const BUNDLED_DATA = {
  projects: require('./data/projects.json'),
  reads: require('./data/reads.json'),
  site: require('./data/site.json'),
};

// ---------- 2. 创建应用并设定端口 ----------
const app = express();
const PORT = process.env.PORT || 3000; // 默认端口 3000，可用环境变量覆盖

// ---------- 后台管理密码 ----------
// 安全原则：密码绝不写入会被提交到 Git 的文件（避免推到 GitHub 后泄露）。
// 优先级：
//   1) 环境变量 ADMIN_PASSWORD（部署到 Render 时在控制台设置）
//   2) 本地文件 data/.admin-password（首次运行自动生成随机密码并保存，已加入 .gitignore）
const ADMIN_PASSWORD_FILE = path.join(__dirname, 'data', '.admin-password');

function loadAdminPassword() {
  // 环境变量优先（部署环境用）
  if (process.env.ADMIN_PASSWORD) return process.env.ADMIN_PASSWORD;
  // 其次读取本地保存的密码
  try {
    if (fs.existsSync(ADMIN_PASSWORD_FILE)) {
      const pwd = fs.readFileSync(ADMIN_PASSWORD_FILE, 'utf-8').trim();
      if (pwd) return pwd;
    }
  } catch (e) { /* 忽略读取错误 */ }
  // 都没有：生成随机密码并保存，供本地使用
  const pwd = Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 6);
  try {
    fs.mkdirSync(path.dirname(ADMIN_PASSWORD_FILE), { recursive: true });
    fs.writeFileSync(ADMIN_PASSWORD_FILE, pwd, 'utf-8');
  } catch (e) { /* 写入失败则仅本次有效 */ }
  return pwd;
}

const ADMIN_PASSWORD = loadAdminPassword();

// ---------- 3. 数据文件路径配置 ----------
const DATA_DIR = path.join(__dirname, 'data');     // 数据统一放在 data/ 目录下
const FILES = {
  projects: path.join(DATA_DIR, 'projects.json'),  // 项目数据
  reads:    path.join(DATA_DIR, 'reads.json'),     // 阅读数据
  site:     path.join(DATA_DIR, 'site.json'),      // 站点 / 个人信息
};

// ---------- 4. 首次运行的默认数据（文件不存在时自动生成） ----------
const DEFAULTS = {
  projects: [
    {
      id: 'prj-1001',
      title: '个人名片网站',
      summary: '你正在浏览的这个站点：宇宙星轨主题，原生 JS 星云与太阳系同心轨道。',
      category: 'Web 开发',
      link: 'https://github.com/asl-op',
      tags: ['Node.js', 'Express', '原生 JS'],
      date: '2026-08',
    },
    {
      id: 'prj-1002',
      title: '星云粒子系统',
      summary: '基于 Canvas 的粒子星云背景，含缓慢漂移、视差与鼠标引力扰动。',
      category: 'Web 开发',
      link: 'https://github.com/asl-op',
      tags: ['Canvas', '动画'],
      date: '2026-07',
    },
    {
      id: 'prj-1003',
      title: '算法刷题笔记',
      summary: '数据结构与算法题解整理，持续更新的个人学习仓库。',
      category: '算法学习',
      link: 'https://github.com/asl-op',
      tags: ['算法', 'LeetCode'],
      date: '2026-06',
    },
    {
      id: 'prj-1004',
      title: 'GitHub 开源小工具集',
      summary: '自己写的一些命令行与日常小工具，开源在 GitHub 上。',
      category: '开源项目',
      link: 'https://github.com/asl-op',
      tags: ['开源', '工具'],
      date: '2026-05',
    },
    {
      id: 'prj-1005',
      title: '学习笔记知识库',
      summary: '用 Markdown 整理的各门课程与读书心得，本地可检索。',
      category: '开源项目',
      link: 'https://github.com/asl-op',
      tags: ['Markdown', '笔记'],
      date: '2026-04',
    },
  ],
  reads: [
    {
      id: 'rd-1001',
      title: '《代码整洁之道》笔记',
      summary: '关于命名、函数与重构的读后整理：代码是写给人看的。',
      category: '技术',
      link: '',
      tags: ['工程', '重构'],
      date: '2026-07',
    },
    {
      id: 'rd-1002',
      title: '《人类简史》读书随笔',
      summary: '从认知革命到科学革命，重新理解人类协作的想象共同体。',
      category: '社科',
      link: '',
      tags: ['历史', '认知'],
      date: '2026-06',
    },
    {
      id: 'rd-1003',
      title: '《三体》读后感',
      summary: '黑暗森林法则与宇宙社会学，科幻外壳下的人性思考。',
      category: '科幻',
      link: '',
      tags: ['科幻', '刘慈欣'],
      date: '2026-05',
    },
    {
      id: 'rd-1004',
      title: '关于宇宙与自我',
      summary: '仰望星空时的零散随笔：我们只是星尘，却会思考宇宙。',
      category: '随笔',
      link: '',
      tags: ['随笔', '宇宙'],
      date: '2026-04',
    },
    {
      id: 'rd-1005',
      title: '《深入理解计算机系统》摘录',
      summary: 'CSAPP 关键章节笔记：从位运算到存储层次。',
      category: '技术',
      link: '',
      tags: ['计算机', 'CSAPP'],
      date: '2026-03',
    },
  ],
  site: {
    name: '任禹桐',
    englishName: 'Ren Yutong',
    tagline: '学生 · 开发者 · 终身学习者',
    intro: '在代码与文字之间，探索世界的秩序与美。',
    bio: '你好，我是任禹桐。\n热爱编程、阅读与设计，喜欢把复杂的事情拆解成简单优雅的解决方案。\n这个网站是一张会呼吸的星空名片，记录我的项目、阅读与思考。\n欢迎你来到这里，也欢迎与我交流。',
    skills: ['Node.js', 'JavaScript', 'HTML / CSS', 'Python', 'UI 设计'],
    email: 'd.gloss.ad@gmail.com',
    email2: '3867731709@qq.com',
    github: 'https://github.com/asl-op',
    githubUser: 'asl-op',
    wechat: 'ASL11320',
    qq: '3867731709',
  },
};

// ---------- 5. 数据读写工具函数 ----------

// 确保数据文件存在：不存在则用默认数据创建（不会覆盖已有文件）
function ensureData() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  Object.keys(FILES).forEach((key) => {
    if (!fs.existsSync(FILES[key])) {
      writeJSON(FILES[key], DEFAULTS[key]);
    }
  });
}

// 读取 JSON 文件 → 返回 JS 对象/数组（读失败时返回空数组，避免程序崩溃）
function readJSON(file) {
  try {
    const raw = fs.readFileSync(file, 'utf-8');
    return JSON.parse(raw);
  } catch (e) {
    return [];
  }
}

// 把 JS 对象/数组写入 JSON 文件（格式化缩进，方便人工查看与编辑）
function writeJSON(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf-8');
}

// 统一的数据读取入口：
//   - Vercel 无服务器环境：返回打包好的只读数据
//   - 本地：实时读取 JSON 文件，支持后台编辑
function readData(type) {
  if (IS_SERVERLESS) return BUNDLED_DATA[type];
  return readJSON(FILES[type]);
}

// 生成一个唯一 id（时间戳 + 随机串，足够用于本地小站）
function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

// 初始化数据文件
ensureData();

// ---------- 6. 中间件 ----------
app.use(express.json());                                   // 解析请求体中的 JSON
app.use(express.static(path.join(__dirname, 'public')));   // 托管前端静态资源（css/js/html）

// 后台鉴权中间件：校验请求头中的 x-admin-password
// 只保护「新增/编辑/删除」，读取接口保持公开，方便任何人浏览
function requireAdmin(req, res, next) {
  if (req.get('x-admin-password') === ADMIN_PASSWORD) return next();
  return res.status(401).json({ message: '密码错误或缺失，无权限修改' });
}

// 只读保护：Vercel 无服务器环境文件系统只读，禁止后台增删改
function writableOnly(req, res, next) {
  if (IS_SERVERLESS) return res.status(403).json({ message: '只读模式：部署版不支持后台修改，请在本地编辑后重新部署' });
  next();
}

// ---------- 7. 页面路由（严格规范） ----------
// 用 sendFile 返回具体 HTML 页面，保证 /projects、/about 等路径能正确打开
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/projects', (req, res) => res.sendFile(path.join(__dirname, 'public', 'projects.html')));
app.get('/about', (req, res) => res.sendFile(path.join(__dirname, 'public', 'about.html')));
app.get('/reads', (req, res) => res.sendFile(path.join(__dirname, 'public', 'reads.html')));
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin.html')));

// ---------- 8. 站点信息接口 ----------
// 前端主页 / 关于我页面读取此接口，修改 data/site.json 即可更新个人信息
app.get('/api/site', (req, res) => {
  res.json(readData('site'));
});

// ---------- 9. 项目 / 阅读 通用资源接口 ----------
// 项目与阅读的数据结构一致，用工厂函数生成两套增删改查接口，避免重复代码
function mountResource(type) {
  const file = FILES[type];
  const list = () => readData(type); // 本地实时读文件；Vercel 读打包数据

  // 读取列表
  app.get(`/api/${type}`, (req, res) => {
    res.json(list());
  });

  // 新增一条（需要管理密码，且仅本地可写）
  app.post(`/api/${type}`, requireAdmin, writableOnly, (req, res) => {
    const items = list();
    const item = Object.assign({ id: genId(), date: '' }, req.body || {});
    items.push(item);
    writeJSON(file, items);
    res.status(201).json(item); // 201 = 创建成功
  });

  // 编辑一条（按 id 定位，需要管理密码，且仅本地可写）
  app.put(`/api/${type}/:id`, requireAdmin, writableOnly, (req, res) => {
    const items = list();
    const idx = items.findIndex((it) => it.id === req.params.id);
    if (idx === -1) return res.status(404).json({ message: '未找到该记录' });
    // 保留原 id，用请求体覆盖其余字段
    items[idx] = Object.assign({}, items[idx], req.body || {}, { id: req.params.id });
    writeJSON(file, items);
    res.json(items[idx]);
  });

  // 删除一条（按 id 定位，需要管理密码，且仅本地可写）
  app.delete(`/api/${type}/:id`, requireAdmin, writableOnly, (req, res) => {
    const items = list();
    const next = items.filter((it) => it.id !== req.params.id);
    if (next.length === items.length) return res.status(404).json({ message: '未找到该记录' });
    writeJSON(file, next);
    res.json({ ok: true });
  });
}

// 挂载两套接口：/api/projects 和 /api/reads
mountResource('projects');
mountResource('reads');

// ---------- 10. 404 兜底 ----------
app.use((req, res) => {
  res.status(404).json({ message: '接口不存在' });
});

// ---------- 11. 导出与启动 ----------
// 导出 app，供 Vercel 的 api/index.js 引入
module.exports = app;

// 仅当用 `node server.js` 直接运行时才监听端口；部署到 Vercel 时由平台托管，无需监听
if (require.main === module) {
  app.listen(PORT, () => {
    console.log('==============================================');
    console.log('  任禹桐 · 个人名片网站 已启动');
    console.log('  请打开浏览器访问：http://localhost:' + PORT);
    console.log('  后台管理地址：    http://localhost:' + PORT + '/admin');
    if (process.env.ADMIN_PASSWORD) {
      console.log('  后台管理密码：    已通过环境变量 ADMIN_PASSWORD 设置');
    } else {
      console.log('  后台管理密码：    ' + ADMIN_PASSWORD + '  （保存在 data/.admin-password）');
    }
    console.log('==============================================');
  });
}
