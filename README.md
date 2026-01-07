# Beyond Diagnosis

Beyond Diagnosis es una aplicación de análisis de operaciones de contact center.  
Permite subir un CSV con interacciones y genera:

- Análisis de volumetría por canal y skill  
- Métricas operativas (AHT, escalaciones, recurrencia, etc.)  
- CSAT global y métricas de satisfacción  
- Modelo económico (coste anual, ahorro potencial, etc.)  
- Matriz de oportunidades y roadmap basados en datos reales  
- Cálculo de *agentic readiness* para priorizar iniciativas de automatización

La arquitectura está compuesta por:

- **Frontend** (React + Vite)  
- **Backend** (FastAPI + Python)  
- **Nginx** como proxy inverso y terminación TLS  
- **Docker Compose** para orquestar los tres servicios

En producción, la aplicación se sirve en **HTTPS (443)** con certificados de **Let’s Encrypt**.

---

## Requisitos

Para instalación manual o con el script:

- Servidor **Ubuntu** reciente (20.04 o superior recomendado)
- Dominio apuntando al servidor (ej: `app.cliente.com`)
- Puertos **80** y **443** accesibles desde Internet (para Let’s Encrypt)
- Usuario con permisos de `sudo`

> El script de instalación se encarga de instalar Docker, docker compose plugin y certbot si no están presentes.

---

## Instalación con script (recomendada)

### 1. Copiar el script al servidor

Conéctate al servidor por SSH y crea el fichero:

```bash
nano install_beyond.sh
```

Pega dentro el contenido del script de instalación que has preparado (el que:

- Instala Docker y dependencias
- Pide dominio, email, usuario y contraseña
- Clona/actualiza el repo en `/opt/beyonddiagnosis`
- Solicita el certificado de Let’s Encrypt
- Genera la configuración de Nginx con SSL
- Lanza `docker compose build` + `docker compose up -d`
).

Guarda (`Ctrl + O`, Enter) y sal (`Ctrl + X`).

Hazlo ejecutable:

```bash
chmod +x install_beyond.sh
```

### 2. Ejecutar el instalador

Ejecuta el script como root (o con sudo):

```bash
sudo ./install_beyond.sh
```

El script te pedirá:

- **Dominio** de la aplicación (ej. `app.cliente.com`)
- **Email** para Let’s Encrypt (avisos de renovación)
- **Usuario** de acceso (Basic Auth / login)
- **Contraseña** de acceso
- **URL del repositorio Git** (por defecto usará la que se haya dejado en el script)

Te mostrará un resumen y te preguntará si quieres continuar.  
A partir de ahí, el proceso es **desatendido**, pero irá indicando cada paso:

- Instalación de Docker + docker compose plugin + certbot  
- Descarga o actualización del repositorio en `/opt/beyonddiagnosis`  
- Sustitución de credenciales en `docker-compose.yml`  
- Obtención del certificado de Let’s Encrypt para el dominio indicado  
- Generación de `nginx/conf.d/beyond.conf` con configuración HTTPS  
- Construcción de imágenes y arranque de contenedores con `docker compose up -d`

### 3. Acceso a la aplicación

Una vez finalizado:

- La aplicación estará disponible en:  
  **https://TU_DOMINIO**

- Inicia sesión con el **usuario** y **contraseña** que has introducido durante la instalación.

---

## Estructura de la instalación

Por defecto, el script instala todo en:

```text
/opt/beyonddiagnosis
  ├── backend/       # Código del backend (FastAPI)
  ├── frontend/      # Código del frontend (React + Vite)
  ├── nginx/
  │   └── conf.d/
  │       └── beyond.conf   # Configuración nginx para este dominio
  └── docker-compose.yml    # Orquestación de backend, frontend y nginx
```

Servicios en Docker:

- `backend` → FastAPI en el puerto 8000 interno  
- `frontend` → React en el puerto 4173 interno  
- `nginx` → expone 80/443 y hace de proxy:

  - `/` → frontend  
  - `/api/` → backend

Los certificados de Let’s Encrypt se almacenan en:

```text
/etc/letsencrypt/live/TU_DOMINIO/
```

y se montan en el contenedor de Nginx como volumen de solo lectura.

---

## Actualización de la aplicación

Para desplegar una nueva versión del código:

```bash
cd /opt/beyonddiagnosis
sudo git pull
sudo docker compose build
sudo docker compose up -d
```

Esto:

- Actualiza el código desde el repositorio
- Reconstruye las imágenes
- Levanta los contenedores con la nueva versión sin perder datos de configuración ni certificados.

---

## Gestión de la aplicación

Desde `/opt/beyonddiagnosis`:

- Ver estado de los contenedores:

  ```bash
  docker compose ps
  ```

- Ver logs en tiempo real:

  ```bash
  docker compose logs -f
  ```

- Parar la aplicación:

  ```bash
  docker compose down
  ```

---

## Uso básico

1. Accede a `https://TU_DOMINIO`.
2. Inicia sesión con las credenciales configuradas en la instalación.
3. Sube un fichero CSV con las columnas esperadas (canal, skill, tiempos, etc.).
4. La aplicación enviará el fichero al backend, que:
   - Calcula métricas de volumetría, rendimiento, satisfacción y costes.
   - Devuelve un JSON estructurado con el análisis.
5. El frontend muestra:
   - Dashboard de métricas clave
   - Dimensiones (volumetría, performance, satisfacción, economía, eficiencia…)
   - Heatmap por skill
   - Oportunidades y roadmap basado en datos reales.

Este README junto con el script de instalación permiten desplegar la aplicación de forma rápida y homogénea en un servidor por cliente.
