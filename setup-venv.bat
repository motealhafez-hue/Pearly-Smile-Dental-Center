@echo off
REM إنشاء .venv في المشروع باستخدام بايثون النظام (py -3 أو python).
set PYTHONHOME=
set PYTHONEXECUTABLE=
set PYTHONPATH=
cd /d "%~dp0"

where py >nul 2>&1
if %errorlevel%==0 (
  echo Using: py -3
  py -3 -m venv "%~dp0.venv"
  if errorlevel 1 ( pause & exit /b 1 )
  call "%~dp0.venv\Scripts\activate.bat"
  python -m pip install --upgrade pip
  python -m pip install -r "%~dp0api\requirements.txt"
  echo.
  echo Done. Run start-api.bat
  pause
  exit /b 0
)

where python >nul 2>&1
if %errorlevel%==0 (
  echo Using: python
  python -m venv "%~dp0.venv"
  if errorlevel 1 ( pause & exit /b 1 )
  call "%~dp0.venv\Scripts\activate.bat"
  python -m pip install --upgrade pip
  python -m pip install -r "%~dp0api\requirements.txt"
  echo.
  echo Done. Run start-api.bat
  pause
  exit /b 0
)

echo Install Python from https://www.python.org and enable "Add python.exe to PATH", then run this again.
pause
exit /b 1
