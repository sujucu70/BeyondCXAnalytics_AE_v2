# Arrancar el proyecto en dev
# Backend
source .venv/bin/activate

export BASIC_AUTH_USERNAME=admin
export BASIC_AUTH_PASSWORD=admin

python -m uvicorn beyond_api.main:app --reload --port 8000


# Frontend
npm run dev

# Siguientes pasos: que revise todo el código y quitar todo lo random para que utilice datos reales
# Comparar los sintéticos con la demo y ver que ofrecen los mismos datos. Faltan cosas
# Hacer que funcione de alguna manera el selector de JSON
# Dockerizar
# Limpieza de código