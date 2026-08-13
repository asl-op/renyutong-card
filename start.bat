@echo off
chcp 65001 >nul
title 任禹桐 · 个人名片网站

rem 切换到本脚本所在目录（保证相对路径正确）
cd /d "%~dp0"

rem 检查是否已安装 Node.js
where node >nul 2>nul
if errorlevel 1 (
    echo [错误] 未检测到 Node.js，请先安装 Node.js
    echo 下载地址：https://nodejs.org/
    echo.
    pause
    exit /b 1
)

rem 首次运行时自动安装依赖
if not exist node_modules (
    echo [首次运行] 正在安装依赖 express...
    echo.
    call npm install
    echo.
)

echo.
echo  网站已启动：http://localhost:3000/
echo  正在打开浏览器...（若未自动打开，请手动访问上面的地址）
echo  关闭本窗口即可停止服务。
echo.

rem 设置 OPEN_BROWSER=1，让服务启动成功后自动打开默认浏览器
set OPEN_BROWSER=1
node server.js

echo.
echo [提示] 服务已停止。
pause
