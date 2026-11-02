@echo off
REM Runs the Johnnybits local end-to-end test. Output: local-test.log
cd /d "%~dp0"
node src\scripts\local-test\run.mjs
echo.
pause
