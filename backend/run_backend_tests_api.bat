@echo off
REM =========================
REM One-shot backend test script (with /api prefix)
REM =========================

cd C:\Users\stanl\Documents\psr-inventory-management\backend

echo 🔹 Step 1: Run roles seed
npx knex seed:run --knexfile knexfile.js --env development --specific 01_roles.js

echo 🔹 Step 2: Run users seed
npx knex seed:run --knexfile knexfile.js --env development --specific 02_users.js

echo 🔹 Step 3: Start backend server in a new CMD window (port 5000)
start "" cmd /k "cd C:\Users\stanl\Documents\psr-inventory-management\backend && npm start"
echo Waiting 15 seconds for server to start...
timeout /t 15

REM =========================
REM Step 4: Test user registration
echo 🔹 Step 4: Test user registration
curl -X POST http://localhost:5000/api/users/register -H "Content-Type: application/json" -d "{\"username\":\"staff\",\"email\":\"staff@psr.com\",\"password\":\"staff123\",\"role_id\":2}"

REM =========================
REM Step 5: Test user login and capture JWT
echo 🔹 Step 5: Test user login and capture JWT

REM Use PowerShell to extract token
for /f "delims=" %%i in ('powershell -Command "Invoke-RestMethod -Uri http://localhost:5000/api/users/login -Method POST -Body '{\"email\":\"staff@psr.com\",\"password\":\"staff123\"}' -ContentType 'application/json' | Select-Object -ExpandProperty token"') do set TOKEN=%%i

echo 🔹 JWT token received:
echo %TOKEN%

REM =========================
REM Step 6: Test product creation using JWT
echo 🔹 Step 6: Test product creation using JWT
curl -X POST http://localhost:5000/api/products -H "Authorization: Bearer %TOKEN%" -H "Content-Type: application/json" -d "{\"name\":\"Product A\",\"price\":100}"

REM =========================
REM Step 7: Test inventory adjustment
echo 🔹 Step 7: Test inventory adjustment
curl -X POST http://localhost:5000/api/inventory -H "Authorization: Bearer %TOKEN%" -H "Content-Type: application/json" -d "{\"product_id\":1,\"quantity\":50,\"location\":\"Warehouse 1\"}"

REM =========================
REM Step 8: Test sales order creation
echo 🔹 Step 8: Test sales order creation
curl -X POST http://localhost:5000/api/sales_orders -H "Authorization: Bearer %TOKEN%" -H "Content-Type: application/json" -d "{\"product_id\":1,\"quantity\":10,\"customer_name\":\"Customer X\"}"

REM =========================
REM Step 9: Test purchase order creation
echo 🔹 Step 9: Test purchase order creation
curl -X POST http://localhost:5000/api/purchase_orders -H "Authorization: Bearer %TOKEN%" -H "Content-Type: application/json" -d "{\"product_id\":1,\"quantity\":20,\"supplier_name\":\"Supplier Y\"}"

REM =========================
REM Step 10: Verify roles in DB
echo 🔹 Step 10: Verify roles in DB
docker exec -it psr-inventory-management-db-1 psql -U postgres -d psr_inventory -c "SELECT * FROM roles;"

REM =========================
REM Step 11: Verify users in DB
echo 🔹 Step 11: Verify users in DB
docker exec -it psr-inventory-management-db-1 psql -U postgres -d psr_inventory -c "SELECT id, username, email, role_id FROM users;"

REM =========================
REM Step 12: Verify products in DB
echo 🔹 Step 12: Verify products in DB
docker exec -it psr-inventory-management-db-1 psql -U postgres -d psr_inventory -c "SELECT * FROM products;"

REM =========================
REM Step 13: Verify inventory in DB
echo 🔹 Step 13: Verify inventory in DB
docker exec -it psr-inventory-management-db-1 psql -U postgres -d psr_inventory -c "SELECT * FROM inventory;"

REM =========================
REM Step 14: Verify sales orders in DB
echo 🔹 Step 14: Verify sales orders in DB
docker exec -it psr-inventory-management-db-1 psql -U postgres -d psr_inventory -c "SELECT * FROM sales_orders;"

REM =========================
REM Step 15: Verify purchase orders in DB
echo 🔹 Step 15: Verify purchase orders in DB
docker exec -it psr-inventory-management-db-1 psql -U postgres -d psr_inventory -c "SELECT * FROM purchase_orders;"

echo ✅ All backend functionality verified. Check outputs above for success.
pause
