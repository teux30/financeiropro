@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo.
echo ========================================
echo   Publicando Finance Pro na Vercel
echo ========================================
echo.

REM Mensagem do commit: usa o que voce digitar, ou uma padrao com data/hora
set "msg=%~1"
if "%msg%"=="" set "msg=Atualizacao %date% %time%"

echo Enviando alteracoes...
git add .
git commit -m "%msg%"

if errorlevel 1 (
  echo.
  echo Nada novo para publicar ^(nenhuma alteracao^).
  echo.
  pause
  exit /b 0
)

git push

if errorlevel 1 (
  echo.
  echo ERRO ao enviar. Verifique sua conexao ou login do GitHub.
  echo.
  pause
  exit /b 1
)

echo.
echo ========================================
echo   Pronto! Enviado para o GitHub.
echo   A Vercel vai republicar sozinha em ~1-2 min.
echo   Site: https://financeiropro-lemon.vercel.app
echo ========================================
echo.
pause
