@echo off
echo ============================================
echo   TruthLens Backend Setup
echo ============================================
echo.

cd /d "%~dp0"

echo [1/3] Creating Python virtual environment...
py -3.12 -m venv venv
if errorlevel 1 (
    echo ERROR: Python 3.12 not found. Install Python 3.12 and make sure the py launcher can see it.
    pause
    exit /b 1
)

echo [2/3] Installing dependencies...
call .\venv\Scripts\activate.bat
pip install -r requirements.txt
if errorlevel 1 (
    echo ERROR: Failed to install dependencies.
    pause
    exit /b 1
)

echo [3/3] Checking .env file...
if not exist .env (
    copy .env.example .env
    echo.
    echo =============================================
    echo   IMPORTANT: Edit backend\.env and add your
    echo   HuggingFace token (HF_TOKEN=hf_xxx...)
    echo   Get one at: https://huggingface.co/settings/tokens
    echo =============================================
    echo.
)

echo.
echo Setup complete! Run the server with:
echo   .\venv\Scripts\activate.bat
echo   python main.py
echo.
pause
