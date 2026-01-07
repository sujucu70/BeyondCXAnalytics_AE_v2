#!/usr/bin/env bash
set -euo pipefail

###############################################
# CONFIGURACIÓN BÁSICA – EDITA ESTO
###############################################
# TODO: pon aquí la URL real de tu repo
REPO_URL_DEFAULT="https://github.com/igferne/Beyond-Diagnosis.git"
INSTALL_DIR="/opt/beyonddiagnosis"

###############################################
# UTILIDADES
###############################################
step() {
  echo
  echo "=================================================="
  echo "  👉 $1"
  echo "=================================================="
}

require_root() {
  if [ "$(id -u)" -ne 0 ]; then
    echo "Este script debe ejecutarse como root (o con sudo)."
    exit 1
  fi
}

###############################################
# 1. COMPROBACIONES INICIALES
###############################################
require_root

step "Recogiendo datos de configuración"

read -rp "Dominio para la aplicación (ej: app.cliente.com): " DOMAIN
if [ -z "$DOMAIN" ]; then
  echo "El dominio no puede estar vacío."
  exit 1
fi

read -rp "Email para Let's Encrypt (avisos de renovación): " EMAIL
if [ -z "$EMAIL" ]; then
  echo "El email no puede estar vacío."
  exit 1
fi

read -rp "Usuario de acceso (Basic Auth / login): " API_USER
if [ -z "$API_USER" ]; then
  echo "El usuario no puede estar vacío."
  exit 1
fi

read -rsp "Contraseña de acceso: " API_PASS
echo
if [ -z "$API_PASS" ]; then
  echo "La contraseña no puede estar vacía."
  exit 1
fi

read -rp "URL del repositorio Git [$REPO_URL_DEFAULT]: " REPO_URL
REPO_URL=${REPO_URL:-$REPO_URL_DEFAULT}

echo
echo "Resumen de configuración:"
echo "  Dominio:         $DOMAIN"
echo "  Email Let'sEnc:  $EMAIL"
echo "  Usuario API:     $API_USER"
echo "  Repo:            $REPO_URL"
echo

read -rp "¿Continuar con la instalación? [s/N]: " CONFIRM
CONFIRM=${CONFIRM:-N}
if [[ ! "$CONFIRM" =~ ^[sS]$ ]]; then
  echo "Instalación cancelada."
  exit 0
fi

###############################################
# 2. INSTALAR DOCKER + DOCKER COMPOSE + CERTBOT
###############################################
step "Instalando Docker, docker compose plugin y certbot"

apt-get update -y

# Dependencias para repositorio Docker
apt-get install -y \
  ca-certificates \
  curl \
  gnupg \
  lsb-release

# Clave GPG de Docker
if [ ! -f /etc/apt/keyrings/docker.gpg ]; then
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg | \
    gpg --dearmor -o /etc/apt/keyrings/docker.gpg
fi

# Repo Docker estable
if [ ! -f /etc/apt/sources.list.d/docker.list ]; then
  echo \
    "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
    $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
    tee /etc/apt/sources.list.d/docker.list > /dev/null
fi

apt-get update -y

apt-get install -y \
  docker-ce \
  docker-ce-cli \
  containerd.io \
  docker-buildx-plugin \
  docker-compose-plugin \
  git \
  certbot

systemctl enable docker
systemctl start docker

# Abrimos puertos en ufw si está activo
if command -v ufw >/dev/null 2>&1; then
  if ufw status | grep -q "Status: active"; then
    step "Configurando firewall (ufw) para permitir 80 y 443"
    ufw allow 80/tcp || true
    ufw allow 443/tcp || true
  fi
fi

###############################################
# 3. CLONAR / ACTUALIZAR REPO
###############################################
step "Descargando/actualizando el repositorio en $INSTALL_DIR"

if [ -d "$INSTALL_DIR/.git" ]; then
  echo "Directorio git ya existe, haciendo 'git pull'..."
  git -C "$INSTALL_DIR" pull --ff-only
else
  rm -rf "$INSTALL_DIR"
  git clone "$REPO_URL" "$INSTALL_DIR"
fi

cd "$INSTALL_DIR"

###############################################
# 4. CONFIGURAR docker-compose.yml (credenciales y nginx)
###############################################
step "Aplicando credenciales al docker-compose.yml"

if ! grep -q "BASIC_AUTH_USERNAME" docker-compose.yml; then
  echo "⚠ No encuentro BASIC_AUTH_USERNAME en docker-compose.yml. Revisa el archivo a mano."
else
  sed -i "s/BASIC_AUTH_USERNAME:.*/BASIC_AUTH_USERNAME: \"$API_USER\"/" docker-compose.yml
fi

if ! grep -q "BASIC_AUTH_PASSWORD" docker-compose.yml; then
  echo "⚠ No encuentro BASIC_AUTH_PASSWORD en docker-compose.yml. Revisa el archivo a mano."
else
  sed -i "s/BASIC_AUTH_PASSWORD:.*/BASIC_AUTH_PASSWORD: \"$API_PASS\"/" docker-compose.yml
fi

# Aseguramos que nginx exponga también 443
if grep -q 'ports:' docker-compose.yml && grep -q 'nginx:' docker-compose.yml; then
  if ! grep -q '443:443' docker-compose.yml; then
    sed -i '/- "80:80"/a\      - "443:443"' docker-compose.yml || true
  fi
fi

# Aseguramos que montamos /etc/letsencrypt dentro del contenedor de nginx
if ! grep -q '/etc/letsencrypt:/etc/letsencrypt:ro' docker-compose.yml; then
  sed -i '/nginx:/,/networks:/{
    /volumes:/a\      - /etc/letsencrypt:/etc/letsencrypt:ro
  }' docker-compose.yml || true
fi

###############################################
# 5. OBTENER CERTIFICADO LET'S ENCRYPT
###############################################
step "Obteniendo certificado SSL de Let’s Encrypt para $DOMAIN"

if [ -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]; then
  echo "Certificado ya existe, saltando paso de emisión."
else
  # Asegurarnos de que no hay nada escuchando en 80/443
  systemctl stop nginx || true

  certbot certonly \
    --standalone \
    --non-interactive \
    --agree-tos \
    -m "$EMAIL" \
    -d "$DOMAIN"

  echo "Certificado emitido en /etc/letsencrypt/live/$DOMAIN/"
fi

###############################################
# 6. CONFIGURAR NGINX DENTRO DEL REPO
###############################################
step "Generando configuración nginx con SSL"

mkdir -p nginx/conf.d

cat > nginx/conf.d/beyond.conf <<EOF
server {
    listen 80;
    server_name $DOMAIN;
    return 301 https://\$host\$request_uri;
}

server {
    listen 443 ssl;
    server_name $DOMAIN;

    ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # FRONTEND (React)
    location / {
        proxy_pass http://frontend:4173/;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    # BACKEND (FastAPI)
    location /api/ {
        proxy_pass http://backend:8000/;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
EOF

###############################################
# 7. BUILD Y ARRANQUE DE CONTENEDORES
###############################################
step "Construyendo imágenes Docker y arrancando contenedores"

docker compose build
docker compose up -d

###############################################
# 8. FIN
###############################################
step "Instalación completada"

echo "La aplicación debería estar disponible en: https://$DOMAIN"
echo
echo "Servicios levantados:"
docker compose ps
echo
echo "Para ver logs:   cd $INSTALL_DIR && docker compose logs -f"
echo "Para parar:      cd $INSTALL_DIR && docker compose down"
