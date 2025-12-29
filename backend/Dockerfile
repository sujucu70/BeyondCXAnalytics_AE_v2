FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Primero copiamos el pyproject para aprovechar la caché al instalar deps
COPY pyproject.toml ./
# Si tienes setup.cfg/setup.py, los copias también

RUN pip install --upgrade pip && \
    pip install .

# Ahora copiamos todo el código
COPY . .

# Crear directorios base de datos
RUN mkdir -p /app/data/input /app/data/output

EXPOSE 8000

# Credenciales por defecto (en runtime las puedes sobrescribir)
ENV BASIC_AUTH_USERNAME=beyond \
    BASIC_AUTH_PASSWORD=beyond2026

CMD ["uvicorn", "beyond_api.main:app", "--host", "0.0.0.0", "--port", "8000"]
