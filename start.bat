@echo off
rem ============================================================
rem  start.bat —— 任禹桐个人名片网站 · 一键启动脚本（Windows）
rem  作用：自动检查环境 → 首次自动安装依赖 → 启动服务器 → 打开浏览器
rem ============================================================
chcp 65001 >nul
title 任禹桐 · 个人名片网站
cd /d "%~dp0"

rem ---------- 1. 检查是否安装了 Node.js ----------
where node >nul 2>nul
if errorlevel 1 (
    echo [错误] 未检测到 Node.js。
    echo        请先到 https://nodejs.org 下载并安装 LTS 版本，安装完成后重试。
    pause
    exit /b 1
)

rem ---------- 2. 首次运行时自动安装依赖 ----------
if not exist node_modules (
    echo [信息] 首次运行，正在安装依赖 express ...
    call npm install
    if errorlevel 1 (
        echo [错误] 依赖安装失败，请检查网络后重试。
        pause
        exit /b 1
    )
)

rem ---------- 3. 启动服务器并自动打开浏览器 ----------
echo [信息] 正在启动服务器...
start "" http://localhost:3000
node server.js

pause
