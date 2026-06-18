@echo off
set PATH=C:\Users\mohda\node-portable;%PATH%
cd /d "%~dp0"
echo Starting QuizKit...
npm.cmd run dev
pause
