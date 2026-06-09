@echo off
:: Demande automatiquement les droits admin
net session >nul 2>&1
if %errorLevel% neq 0 (
    powershell -Command "Start-Process '%~f0' -Verb RunAs"
    exit
)

echo Demarrage Apache...
net start Apache2.4

echo Demarrage MySQL...
net start MySQL84

echo Demarrage Snipe-IT...
cd C:\Users\Windows\Videos\git\Snippet-newapp
start cmd /k "php artisan serve --port=8000"

echo Demarrage Node Server...
cd C:\Users\Windows\Videos\git\Snippet-newapp\NewApp
start cmd /k "node server/index.js"

echo Demarrage NewApp...
cd C:\Users\Windows\Videos\git\Snippet-newapp\NewApp
start cmd /k "npm run dev"

echo Tout est demarre !
echo Snipe-IT: http://localhost:8000
echo NewApp:   http://localhost:5173
echo Node API: http://localhost:3000
pause