@echo off
echo ========================================
echo PSR Git Push Starting...
echo ========================================

cd /d C:\Users\stanl\Documents\psr-inventory-management

git status
echo.
set /p msg=Enter commit message: 

git add .
if errorlevel 1 (
  echo.
  echo Git add failed.
  pause
  exit /b 1
)

git commit -m "%msg%"
if errorlevel 1 (
  echo.
  echo Git commit failed.
  pause
  exit /b 1
)

git push origin main
if errorlevel 1 (
  echo.
  echo Git push failed.
  pause
  exit /b 1
)

echo.
echo ========================================
echo Push complete.
echo Now deploy on Ubuntu.
echo ========================================
pause