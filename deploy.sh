#!/bin/bash
# Script para reconstruir y desplegar los contenedores de Beyond Diagnosis
# Ejecutar con: sudo ./deploy.sh

set -e

echo "=========================================="
echo "  Beyond Diagnosis - Deploy Script"
echo "=========================================="

cd /opt/beyonddiagnosis

echo ""
echo "[1/4] Deteniendo contenedores actuales..."
docker compose down

echo ""
echo "[2/4] Reconstruyendo contenedor del frontend (con cambios)..."
docker compose build --no-cache frontend

echo ""
echo "[3/4] Reconstruyendo contenedor del backend (si hay cambios)..."
docker compose build backend

echo ""
echo "[4/4] Iniciando todos los contenedores..."
docker compose up -d

echo ""
echo "=========================================="
echo "  Deploy completado!"
echo "=========================================="
echo ""
echo "Verificando estado de contenedores:"
docker compose ps

echo ""
echo "Logs del frontend (últimas 20 líneas):"
docker compose logs --tail=20 frontend

echo ""
echo "La aplicación está disponible en: https://diag.yourcompany.com"
