@echo off
SETLOCAL ENABLEDELAYEDEXPANSION

echo.
echo ===============================================
echo   PSR INVENTORY MANAGEMENT - FULL START SCRIPT
echo ===============================================
echo.

REM ------------------------------------------------
REM Step 1 — Verify Docker
REM ------------------------------------------------
echo [1/8] Checking Docker engine...
docker version >nul 2>&1

IF ERRORLEVEL 1 (
  echo ❌ Docker is NOT running.
  echo 👉 Please start Docker Desktop and re-run this script.
  pause
  exit /b 1
)

echo ✅ Docker is running.
echo.

REM ------------------------------------------------
REM Step 2 — Start Containers
REM ------------------------------------------------
echo [2/8] Starting Docker containers...
cd /d C:\Users\stanl\Documents\psr-inventory-management

docker-compose up -d

IF ERRORLEVEL 1 (
  echo ❌ docker-compose failed.
  pause
  exit /b 1
)

echo ✅ Containers started.
echo.

REM ------------------------------------------------
REM Step 3 — Verify Containers
REM ------------------------------------------------
echo [3/8] Verifying running containers...
docker ps
echo.
echo 👉 You should see:
echo    - postgres on port 5432
echo    - pgadmin on port 8080
echo.

REM ------------------------------------------------
REM Step 4 — pgAdmin Info
REM ------------------------------------------------
echo [4/8] pgAdmin access:
echo -----------------------------------------------
echo URL      : http://127.0.0.1:8080/browser/
echo Username : admin@admin.com
echo Password : admin
echo -----------------------------------------------
echo.

REM ------------------------------------------------
REM Step 5 — PostgreSQL CLI Info
REM ------------------------------------------------
echo [5/8] PostgreSQL CLI command:
echo -----------------------------------------------
echo psql -h 127.0.0.1 -p 5432 -U postgres -d psr_inventory
echo Password: password
echo -----------------------------------------------
echo.

REM ------------------------------------------------
REM Step 6 — Start Backend
REM ------------------------------------------------
echo [6/8] Starting backend server...
cd backend

IF NOT EXIST node_modules (
  echo Installing backend dependencies...
  npm install
)

start "PSR Backend" cmd /k node index.js

echo ✅ Backend starting on http://localhost:5000
echo.

REM ------------------------------------------------
REM Step 7 — Start Frontend
REM ------------------------------------------------
echo [7/8] Starting frontend...
cd ..\frontend

IF NOT EXIST node_modules (
  echo Installing frontend dependencies...
  npm install
)

start "PSR Frontend" cmd /k npm run dev

echo ✅ Frontend starting on http://localhost:5173
echo.

REM ------------------------------------------------
REM Step 8 — Done
REM ------------------------------------------------
echo [8/8] All services started successfully 🎉
echo.
echo Open:
echo - Frontend : http://localhost:5173
echo - Backend  : http://localhost:5000
echo - pgAdmin  : http://127.0.0.1:8080
echo.
pause
ENDLOCAL
