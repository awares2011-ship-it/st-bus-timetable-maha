@echo off
cd /d "%~dp0"
call npx vite preview --port 4780 --strictPort --host 127.0.0.1
