@echo off
setlocal

REM Port wählbar
set PORT=5000

REM eigene IPv4 ermitteln (deutsch oder englisch)
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4-Adresse" /c:"IPv4 Address"') do set IP=%%a
set IP=%IP: =%

REM Firewall-Regel einmalig anlegen (ignoriert Fehler, falls schon vorhanden)
netsh advfirewall firewall add rule name="CoachMax Dev %PORT%" dir=in action=allow protocol=TCP localport=%PORT% >nul 2>&1

echo --------------------------------------------------
echo Starte CoachMax Dev-Server...
echo PC:     http://localhost:%PORT%
if defined IP echo Handy:  http://%IP%:%PORT%
echo (PC und Handy muessen im selben WLAN sein)
echo --------------------------------------------------

set PORT=%PORT%
node server.js

endlocal
pause
