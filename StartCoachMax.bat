@echo off
cd /d "D:\Is Yerim\Meze Aydin\Github\Digitalmenü\coach-max"
start cmd /k "npx live-server public --port=8080"
timeout /t 3 >nul
start http://127.0.0.1:8080/day.html?day=1