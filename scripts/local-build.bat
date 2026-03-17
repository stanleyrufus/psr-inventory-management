@echo off
echo ========================================
echo PSR Local Frontend Build Starting...
echo ========================================

cd /d C:\Users\stanl\Documents\psr-inventory-management\frontend

call npm run build
if errorlevel 1 (
  echo.
  echo Frontend build failed.
  pause
  exit /b 1
)

echo.
echo ========================================
echo Local build complete.
echo Open: http://psrinventory.local
echo Then press Ctrl + F5
echo ========================================
pause