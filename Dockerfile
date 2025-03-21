# ============================
# Etapa 1: Construcción del backend
# ============================
FROM node:18-alpine AS backend-build
WORKDIR /app/backend
COPY backend/package.json backend/package-lock.json ./
RUN npm install --production
COPY backend . 

# ============================
# Etapa 2: Construcción del frontend con Parcel
# ============================
FROM node:18-alpine AS frontend-build
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm install
COPY frontend . 
RUN npm run build  # Parcel generará la carpeta `dist/`

# ============================
# Etapa 3: Imagen final
# ============================
FROM node:18-alpine
WORKDIR /app

# Instalar dependencias necesarias incluyendo streamlink
RUN apk add --no-cache ffmpeg python3 streamlink

# Copiar el backend ya construido sin node_modules innecesarios
COPY --from=backend-build /app/backend /app/backend

# Copiar solo los archivos compilados del frontend
COPY --from=frontend-build /app/frontend/dist /app/frontend/dist

# Crear el directorio de descargas si no existe
RUN mkdir -p backend/downloads

# Exponer el puerto en el que se ejecuta el servidor
EXPOSE 8091

# Comando para ejecutar la aplicación
CMD ["node", "backend/server.js"]
