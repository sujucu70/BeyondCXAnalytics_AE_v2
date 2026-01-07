# backend/Dockerfile
FROM python:3.11-slim

# Evitar .pyc y buffering
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

# Dependencias del sistema mínimas
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copiamos pyproject y lock si lo hubiera
COPY pyproject.toml ./

# Instalamos dependencias
RUN pip install --upgrade pip && \
    pip install .

# Copiamos el resto del código (respetando .dockerignore)
COPY . .

# Variables de autenticación básica
ENV BASIC_AUTH_USERNAME=admin
ENV BASIC_AUTH_PASSWORD=admin

EXPOSE 8000

CMD ["python", "-m", "uvicorn", "beyond_api.main:app", "--host", "0.0.0.0", "--port", "8000"]
