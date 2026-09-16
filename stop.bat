@echo off
echo Stopping Discord Bot Environment processes...

REM 既存のnode.exeプロセスを終了（ポート3000/5173を使用中の古いサーバーを停止）
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3000 " ^| findstr "LISTENING"') do (
    taskkill /PID %%a /F >nul 2>&1
)
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":5173 " ^| findstr "LISTENING"') do (
    taskkill /PID %%a /F >nul 2>&1
)

echo Processes stopped.
pause
