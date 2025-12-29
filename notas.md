# Arrancar el proyecto en dev
# Backend
source .venv/bin/activate

export BASIC_AUTH_USERNAME=admin
export BASIC_AUTH_PASSWORD=admin

python -m uvicorn beyond_api.main:app --reload --port 8000


# Frontend
npm run dev