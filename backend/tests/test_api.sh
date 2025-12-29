#!/usr/bin/env bash
set -euo pipefail

# ===========================
# Configuración
# ===========================
HOST="${HOST:-localhost}"
PORT="${PORT:-8000}"

API_URL="http://$HOST:$PORT/analysis"

# Credenciales Basic Auth (ajusta si usas otras)
API_USER="${API_USER:-beyond}"
API_PASS="${API_PASS:-beyond2026}"

# Ruta del CSV en tu máquina para subirlo
LOCAL_CSV_FILE="${LOCAL_CSV_FILE:-data/example/synthetic_interactions.csv}"

# Carpetas de salida
OUT_DIR="${OUT_DIR:-./test_results}"
mkdir -p "$OUT_DIR"

print_header() {
  echo
  echo "============================================================"
  echo "$1"
  echo "============================================================"
}

# ===========================
# 1. Health-check simple (sin auth)
# ===========================
print_header "1) Comprobando que el servidor responde (sin auth) - debería devolver 401"

set +e
curl -s -o /dev/null -w "HTTP status: %{http_code}\n" \
  -X POST "$API_URL"
set -e

# ===========================
# 2. Test: subir CSV (analysis=premium por defecto)
# ===========================
print_header "2) Subiendo CSV local con análisis 'premium' (default) y guardando JSON"

if [ ! -f "$LOCAL_CSV_FILE" ]; then
  echo "⚠️  Aviso: el fichero LOCAL_CSV_FILE='$LOCAL_CSV_FILE' no existe."
  echo "    Cambia la variable LOCAL_CSV_FILE o copia el CSV a esa ruta."
else
  curl -v \
    -u "$API_USER:$API_PASS" \
    -X POST "$API_URL" \
    -F "csv_file=@${LOCAL_CSV_FILE}" \
    -o "${OUT_DIR}/resultados_premium.json"

  echo "✅ JSON guardado en: ${OUT_DIR}/resultados_premium.json"
  echo "   Primeras líneas:"
  head -n 20 "${OUT_DIR}/resultados_premium.json" || true
fi

# ===========================
# 3. Test: subir CSV con analysis=basic
# ===========================
print_header "3) Subiendo CSV local con análisis 'basic' y guardando JSON"

if [ ! -f "$LOCAL_CSV_FILE" ]; then
  echo "⚠️  Saltando este test porque LOCAL_CSV_FILE='$LOCAL_CSV_FILE' no existe."
else
  curl -v \
    -u "$API_USER:$API_PASS" \
    -X POST "$API_URL" \
    -F "csv_file=@${LOCAL_CSV_FILE}" \
    -F "analysis=basic" \
    -o "${OUT_DIR}/resultados_basic.json"

  echo "✅ JSON guardado en: ${OUT_DIR}/resultados_basic.json"
  echo "   Primeras líneas:"
  head -n 20 "${OUT_DIR}/resultados_basic.json" || true
fi

# ===========================
# 4. Test: con economy_json personalizado (premium)
# ===========================
print_header "4) Subiendo CSV con configuración económica personalizada (analysis=premium)"

if [ ! -f "$LOCAL_CSV_FILE" ]; then
  echo "⚠️  Saltando este test porque LOCAL_CSV_FILE='$LOCAL_CSV_FILE' no existe."
else
  curl -v \
    -u "$API_USER:$API_PASS" \
    -X POST "$API_URL" \
    -F "csv_file=@${LOCAL_CSV_FILE}" \
    -F 'economy_json={"labor_cost_per_hour":30,"automation_volume_share":0.7,"customer_segments":{"VIP":"high","Basico":"medium"}}' \
    -F "analysis=premium" \
    -o "${OUT_DIR}/resultados_economy_premium.json"

  echo "✅ JSON con economía personalizada guardado en: ${OUT_DIR}/resultados_economy_premium.json"
  echo "   Primeras líneas:"
  head -n 20 "${OUT_DIR}/resultados_economy_premium.json" || true
fi

# ===========================
# 5. Test de error: economy_json inválido
# ===========================
print_header "5) Petición con economy_json inválido - debe devolver 400"

set +e
curl -v \
  -u "$API_USER:$API_PASS" \
  -X POST "$API_URL" \
  -F "csv_file=@${LOCAL_CSV_FILE}" \
  -F "economy_json={invalid json" \
  -o "${OUT_DIR}/error_economy_invalid.json"
STATUS=$?
set -e

echo "✅ Respuesta guardada en: ${OUT_DIR}/error_economy_invalid.json"
cat "${OUT_DIR}/error_economy_invalid.json" || true

# ===========================
# 6. Test de error: analysis inválido
# ===========================
print_header "6) Petición con analysis inválido - debe devolver 400"

set +e
curl -v \
  -u "$API_USER:$API_PASS" \
  -X POST "$API_URL" \
  -F "csv_file=@${LOCAL_CSV_FILE}" \
  -F "analysis=ultra" \
  -o "${OUT_DIR}/error_analysis_invalid.json"
set -e

echo "✅ Respuesta guardada en: ${OUT_DIR}/error_analysis_invalid.json"
cat "${OUT_DIR}/error_analysis_invalid.json" || true

# ===========================
# 7. Test de error: sin csv_file (debe devolver 422)
# ===========================
print_header "7) Petición inválida (sin csv_file) - debe devolver 422 (FastAPI validation)"

set +e
curl -v \
  -u "$API_USER:$API_PASS" \
  -X POST "$API_URL" \
  -o "${OUT_DIR}/error_missing_csv.json"
set -e

echo "✅ Respuesta guardada en: ${OUT_DIR}/error_missing_csv.json"
cat "${OUT_DIR}/error_missing_csv.json" || true

# ===========================
# 8. Test de error: credenciales incorrectas
# ===========================
print_header "8) Petición con credenciales incorrectas - debe devolver 401"

set +e
curl -v \
  -u "wrong:wrong" \
  -X POST "$API_URL" \
  -F "csv_file=@${LOCAL_CSV_FILE}" \
  -o "${OUT_DIR}/error_auth.json"
set -e

echo "✅ Respuesta de error de auth guardada en: ${OUT_DIR}/error_auth.json"
cat "${OUT_DIR}/error_auth.json" || true

echo
echo "✨ Tests terminados. Revisa la carpeta: ${OUT_DIR}"
