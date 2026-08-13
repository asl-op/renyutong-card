// Vercel 无服务器函数入口：导出 Express 应用
// Vercel 会通过 vercel.json 里的 rewrite 把所有请求转发到这里处理
module.exports = require('../server');
