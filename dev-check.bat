@echo off
chcp 65001 >nul
cd /d "%~dp0"
title 卓鯖ビルダー 開発プレビュー

echo ============================================
echo  卓鯖ビルダー 開発プレビューを起動します
echo   - サーバー: http://127.0.0.1:3000
echo   - 画面    : http://localhost:5173 (数秒後にブラウザで開きます)
echo   - 終了    : このウィンドウを閉じる / Ctrl+C
echo ============================================
echo.
echo ※「卓を立てる」まで押すと本当に Discord にカテゴリが作られます。
echo    確認後は「カテゴリ削除」で消してください。
echo.

if not exist node_modules (
    echo node_modules がないので npm install を実行します...
    call npm install
)
if not exist web\node_modules (
    echo web\node_modules がないので npm install を実行します...
    pushd web
    call npm install
    popd
)

start "" /b cmd /c "timeout /t 6 /nobreak >nul && start "" http://localhost:5173"
call npm run dev
pause
