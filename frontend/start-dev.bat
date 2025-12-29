@echo off
echo.
echo ╔════════════════════════════════════════════════════════════╗
echo ║        Beyond Diagnostic Prototipo - Dev Server            ║
echo ║                                                            ║
echo ║  Aplicación revisada y corregida - 22 errores fixed       ║
echo ╚════════════════════════════════════════════════════════════╝
echo.

REM Verificar si Node.js está instalado
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ ERROR: Node.js no está instalado
    echo.
    echo Por favor instala Node.js desde: https://nodejs.org/
    pause
    exit /b 1
)

echo ✓ Node.js detectado
node --version
echo.

REM Verificar si npm_modules existe
if not exist "node_modules" (
    echo ⏳ Instalando dependencias (primera vez)...
    echo.
    call npm install
    if errorlevel 1 (
        echo ❌ Error en instalación de dependencias
        pause
        exit /b 1
    )
    echo ✓ Dependencias instaladas
    echo.
)

REM Iniciar servidor de desarrollo
echo 🚀 Iniciando servidor de desarrollo...
echo.
echo 📝 Logs disponibles en la consola abajo
echo.
echo 💡 Cuando veas "Local: http://localhost:5173", abre tu navegador
echo    y accede a esa dirección
echo.
echo ⚡ Presiona CTRL+C para detener el servidor
echo.
echo ════════════════════════════════════════════════════════════
echo.

call npm run dev

pause
