@echo off
rem ============================================================
rem  share.bat —— 一键建立公网隧道，生成「任何人都能打开」的链接
rem  原理：用系统自带的 SSH 反向隧道（serveo.net），无需注册、无需下载
rem ============================================================
chcp 65001 >nul
title 任禹桐 · 个人名片网站 · 公网分享
cd /d "%~dp0"

rem ---------- 1. 检查 SSH 客户端 ----------
where ssh >nul 2>nul
if errorlevel 1 (
    echo [错误] 未检测到 ssh 命令。
    echo        Windows 10/11 一般自带，可在「设置 - 系统 - 可选功能」里添加「OpenSSH 客户端」。
    pause
    exit /b 1
)

rem ---------- 2. 确认本地服务器已启动 ----------
curl -s -o nul http://localhost:3000
if errorlevel 1 (
    echo [信息] 检测到服务器未运行，正在启动...
    start "任禹桐名片网站-服务" cmd /c "node server.js"
    timeout /t 3 /nobreak >nul
)

rem ---------- 3. 建立公网隧道 ----------
echo [信息] 正在建立公网隧道（本窗口需保持开启）...
echo [提示] 出现类似 https://xxxx.serveousercontent.com 的地址后，
echo        把该地址复制发给任何人即可访问；按 Ctrl+C 可关闭隧道。
echo.
ssh -o StrictHostKeyChecking=no -o ServerAliveInterval=30 -R 80:localhost:3000 nokey@serveo.net

pause
