@echo off
REM تشغيل الـ API باستخدام بايثون النظام العادي (بعد تفريغ متغيرات قد تعرقل المسار).
set PYTHONHOME=
set PYTHONEXECUTABLE=
set PYTHONPATH=
cd /d "%~dp0"

if exist "%~dp0.venv\Scripts\python.exe" (
  set "PYFULL=%~dp0.venv\Scripts\python.exe"
  goto run
)

where py >nul 2>&1
if %errorlevel%==0 (
  echo Using: py -3
  py -3 -c "import uvicorn" 2>nul
  if errorlevel 1 (
    echo Installing dependencies...
    py -3 -m pip install -r "%~dp0api\requirements.txt"
  )
  py -3 -m uvicorn api.main:app --reload --host 127.0.0.1 --port 8000
  pause
  exit /b 0
)

where python >nul 2>&1
if %errorlevel%==0 (
  echo Using: python (PATH)
  python -c "import uvicorn" 2>nul
  if errorlevel 1 (
    echo Installing dependencies...
    python -m pip install -r "%~dp0api\requirements.txt"
  )
  python -m uvicorn api.main:app --reload --host 127.0.0.1 --port 8000
  pause
  exit /b 0
)

echo لم يُعثر على Python. ثبّت Python من https://www.python.org وفعّل "Add to PATH"، أو شغّل setup-venv.bat
pause
exit /b 1

:run
echo Using: %PYFULL%
"%PYFULL%" -c "import uvicorn" 2>nul
if errorlevel 1 (
  echo Installing dependencies...
  "%PYFULL%" -m pip install -r "%~dp0api\requirements.txt"
)
"%PYFULL%" -m uvicorn api.main:app --reload --host 127.0.0.1 --port 8000
pause
