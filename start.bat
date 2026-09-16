@echo off
echo Starting Discord Bot Environment (Production Mode)...

REM 既存のnode.exeプロセスを終了（ポート3000を使用中の古いサーバーを停止）
echo Stopping old processes...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3000 " ^| findstr "LISTENING"') do (
    taskkill /PID %%a /F >nul 2>&1
)

echo Starting production server...
start http://localhost:3000
npm run start:prod
pause
