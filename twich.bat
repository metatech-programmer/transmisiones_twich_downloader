@echo off
setlocal

echo Iniciando la aplicación de descargas de Twitch...

:: Obtener la ruta del script y definir variables
set "RUTA_BACKEND=%~dp0backend"
set "RUTA_DESCARGAS=%RUTA_BACKEND%\downloads"

:: Verificar si la carpeta de descargas existe antes de abrirla
if exist "%RUTA_DESCARGAS%" (
    explorer "%RUTA_DESCARGAS%"
) else (
    echo [ADVERTENCIA] La carpeta de descargas no existe: %RUTA_DESCARGAS%
)

:: Verificar si la carpeta del backend existe
if not exist "%RUTA_BACKEND%" (
    echo [ERROR] La carpeta del backend no existe en: %RUTA_BACKEND%
    pause
    exit /b
)

:: Cambiar al directorio del backend
cd /d "%RUTA_BACKEND%"

:: Verificar si npm está instalado
where npm >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] npm no está instalado o no está en el PATH.
    pause
    exit /b
)

:: Iniciar el backend con npm
npm run start

:: Mantener la ventana abierta si hay un error
if %errorlevel% neq 0 (
    echo [ERROR] Ocurrió un problema al ejecutar npm run start.
    pause
)

endlocal
