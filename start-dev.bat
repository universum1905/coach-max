@echo off
cd /d "D:\Is Yerim\Meze Aydin\Github\Digitalmenü\coach-max"

echo Starte Firebase Emulator (Hosting, Auth, Firestore)...
firebase emulators:start --only hosting,auth,firestore

echo Emulator beendet. Terminal bleibt offen.
pause