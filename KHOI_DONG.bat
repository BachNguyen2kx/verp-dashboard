@echo off
chcp 65001 >nul
title ERP Dashboard
cd /d "%~dp0"

echo.
echo  ERP Dashboard - He thong Quan tri ERP
echo  ========================================
echo.

python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo  [LOI] Khong tim thay Python tren he thong!
    echo  Vui long tai Python tai: https://www.python.org/downloads/
    echo  LUU Y: Nho tich chon "Add Python to PATH" trong qua trinh cai dat.
    echo.
    pause
    exit /b 1
)

echo  Dang kiem tra thu vien Flask...
python -c "import flask" >nul 2>&1
if %errorlevel% neq 0 (
    echo  Chua tim thay Flask. Dang tien hanh cai dat thu vien...
    python -m pip install -r requirements.txt --disable-pip-version-check
    if %errorlevel% neq 0 (
        echo  [LOI] Khong the cai dat cac thu vien can thiet! Vui long kiem tra ket noi mang.
        pause
        exit /b 1
    )
) else (
    echo  Thu vien Flask: OK.
)

echo.
echo  Dang mo trinh duyet...
ping 127.0.0.1 -n 3 >nul
start "" "http://127.0.0.1:5000"

echo  Dang khoi dong server...
echo.
echo  Dia chi truy cap: http://127.0.0.1:5000
echo  Nhan Ctrl+C tai cua so nay de dung server
echo.

python backend\server.py

echo.
pause >nul
