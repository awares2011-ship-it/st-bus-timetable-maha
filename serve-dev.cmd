@echo off
cd /d "%~dp0"
call npx vite --port 4781 --strictPort --host 127.0.0.1
