@echo off
setlocal
for %%P in (11434 8080 8081 5000 5173 3000) do (
  for /f "tokens=5" %%a in ('netstat -ano ^| findstr :%%P ^| findstr LISTENING') do (
    echo Killing PID %%a on port %%P
    taskkill /PID %%a /F >nul 2>&1
  )
)
echo Alle definierten Ports sind frei (sofern vorher belegt).
endlocal
pause
