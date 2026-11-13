@echo off
title SmartTask Pro - Build and Run
cd /d "%~dp0"
echo.
echo =========================================
echo       SMARTTASK PRO - C++ BACKEND
echo =========================================
where g++ >nul 2>nul
if errorlevel 1 (
  echo ERROR: g++ was not found.
  echo Install MSYS2 MinGW-w64 or MinGW and add its bin folder to PATH.
  echo Then reopen this window and run run.bat again.
  pause
  exit /b 1
)
echo Building C++ backend...
g++ -std=c++17 -O2 backend.cpp -o smarttask_server.exe -lws2_32
if errorlevel 1 (
  echo.
  echo Build failed. Check the compiler installation and error messages above.
  pause
  exit /b 1
)
echo.
echo Build successful. Starting server...
echo Open http://localhost:8080 in your browser.
echo Keep this window open while using SmartTask Pro.
echo.
smarttask_server.exe
pause
