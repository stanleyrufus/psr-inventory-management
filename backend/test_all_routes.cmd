@echo off
echo ============================================
echo Testing PSR Inventory Management Backend
echo ============================================

:: --- PRODUCTS ---
echo.
echo Testing Products
curl -H "Authorization: Bearer %TOKEN%" http://localhost:5000/products
curl -X POST -H "Authorization: Bearer %TOKEN%" -H "Content-Type: application/json" -d "{\"name\":\"Machine A\",\"price\":1000}" http://localhost:5000/products
curl -X PUT -H "Authorization: Bearer %TOKEN%" -H "Content-Type: application/json" -d "{\"price\":1200}" http://localhost:5000/products/1
curl -X DELETE -H "Authorization: Bearer %TOKEN%" http://localhost:5000/products/1

:: --- INVENTORY ---
echo.
echo Testing Inventory
curl -H "Authorization: Bearer %TOKEN%" http://localhost:5000/inventory
curl -X POST -H "Authorization: Bearer %TOKEN%" -H "Content-Type: application/json" -d "{\"item\":\"Machine A\",\"quantity\":10}" http://localhost:5000/inventory
curl -X PUT -H "Authorization: Bearer %TOKEN%" -H "Content-Type: application/json" -d "{\"quantity\":15}" http://localhost:5000/inventory/1
curl -X DELETE -H "Authorization: Bearer %TOKEN%" http://localhost:5000/inventory/1

:: --- SALES ORDERS ---
echo.
echo Testing Sales Orders
curl -H "Authorization: Bearer %TOKEN%" http://localhost:5000/sales_orders
curl -X POST -H "Authorization: Bearer %TOKEN%" -H "Content-Type: application/json" -d "{\"customer\":\"Customer A\",\"items\":[\"Machine A\"]}" http://localhost:5000/sales_orders
curl -X PUT -H "Authorization: Bearer %TOKEN%" -H "Content-Type: application/json" -d "{\"status\":\"shipped\"}" http://localhost:5000/sales_orders/1
curl -X DELETE -H "Authorization: Bearer %TOKEN%" http://localhost:5000/sales_orders/1

:: --- PURCHASE ORDERS ---
echo.
echo Testing Purchase Orders
curl -H "Authorization: Bearer %TOKEN%" http://localhost:5000/purchase_orders
curl -X POST -H "Authorization: Bearer %TOKEN%" -H "Content-Type: application/json" -d "{\"supplier\":\"Supplier X\",\"items\":[\"Machine A\"]}" http://localhost:5000/purchase_orders
curl -X PUT -H "Authorization: Bearer %TOKEN%" -H "Content-Type: application/json" -d "{\"status\":\"received\"}" http://localhost:5000/purchase_orders/1
curl -X DELETE -H "Authorization: Bearer %TOKEN%" http://localhost:5000/purchase_orders/1

echo.
echo ============================================
echo All tests executed
echo ============================================
pause
