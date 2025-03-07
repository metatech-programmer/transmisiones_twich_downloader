# Imagen base de Node.js
FROM node:18-alpine

# Instalar dependencias necesarias incluyendo streamlink desde el repositorio de Alpine
RUN apk add --no-cache ffmpeg python3 streamlink

# Crear directorio de trabajo
WORKDIR /app

# Copiar todo el proyecto
COPY . .

# Instalar dependencias del backend
WORKDIR /app/backend
RUN if [ -f "package.json" ]; then npm install; fi

# Instalar dependencias del frontend
WORKDIR /app/frontend
RUN if [ -f "package.json" ]; then npm install; fi

# Volver al directorio raíz
WORKDIR /app

# Crear el directorio de descargas si no existe
RUN mkdir -p backend/downloads

# Exponer el puerto en el que se ejecuta el servidor
EXPOSE 8091

# Comando para ejecutar la aplicación
CMD ["node", "backend/server.js"]