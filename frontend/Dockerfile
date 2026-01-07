# frontend/Dockerfile

# 1) Fase de build
FROM node:20-alpine AS build

WORKDIR /app

# Copiamos sólo package.json para cachear mejor
COPY package*.json ./

RUN npm install

# Copiamos el resto del código
COPY . .

# Variable para que el front apunte a nginx (/api -> backend)
ARG VITE_API_BASE_URL=/api
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}

# Construimos el bundle
RUN npm run build

# 2) Fase de servidor estático
FROM node:20-alpine

WORKDIR /app

# Copiamos el build
COPY --from=build /app/dist ./dist

# Server estático muy simple
RUN npm install -g serve

EXPOSE 4173

CMD ["serve", "-s", "dist", "-l", "4173"]
