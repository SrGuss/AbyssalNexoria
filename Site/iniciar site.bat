
@echo off
title Abyssal Nexoria - Inicializador
setlocal

set "SITE_DIR=%~dp0"

echo.
echo ==========================================
echo       ABYSSAL NEXORIA - INICIALIZADOR
echo ==========================================
echo.

if not exist "%SITE_DIR%web\package.json" (
    echo ERRO: Nao encontrei o package.json do front-end.
    echo Pasta esperada: "%SITE_DIR%web"
    pause
    exit /b 1
)

if not exist "%SITE_DIR%api\package.json" (
    echo ERRO: Nao encontrei o package.json da API.
    echo Pasta esperada: "%SITE_DIR%api"
    pause
    exit /b 1
)

where npm >nul 2>&1
if errorlevel 1 (
    echo ERRO: npm nao encontrado. Verifique a instalacao do Node.js.
    pause
    exit /b 1
)

echo Iniciando o front-end...
start "Abyssal Nexoria - Front-end" /D "%SITE_DIR%web" cmd /k "npm run dev"

echo Iniciando a API...
start "Abyssal Nexoria - API" /D "%SITE_DIR%api" cmd /k "npm run dev"

echo.
echo Os dois servicos foram iniciados.
echo Front-end: http://127.0.0.1:5173/
echo API:       http://127.0.0.1:3001
echo.
echo Aguarde alguns segundos para o Vite iniciar...
timeout /t 3 /nobreak >nul

start "" "http://127.0.0.1:5173/"

echo Pode fechar esta janela inicial.
echo Os terminais do front-end e da API permanecerao abertos.
exit /b 0
