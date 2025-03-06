# Dockerización de Twitch Downloader

Este documento explica cómo ejecutar la aplicación Twitch Downloader usando Docker.

## Requisitos previos

- Docker instalado en tu sistema
- Docker Compose instalado en tu sistema

## Configuración

Los siguientes archivos han sido añadidos al proyecto:

1. `Dockerfile` - Configura el contenedor con Node.js, ffmpeg y streamlink
2. `.dockerignore` - Evita copiar archivos innecesarios al contenedor
3. `docker-compose.yml` - Facilita la ejecución del contenedor

## Instrucciones de uso

### Primera ejecución

1. Coloca los archivos en el directorio raíz de tu proyecto
2. Abre una terminal en el directorio del proyecto
3. Ejecuta el siguiente comando para construir y arrancar el contenedor:

```bash
docker-compose up -d
```

### Gestión del contenedor

- **Detener el contenedor**:
  ```bash
  docker-compose stop
  ```

- **Reiniciar el contenedor**:
  ```bash
  docker-compose restart
  ```

- **Ver logs**:
  ```bash
  docker-compose logs -f
  ```

- **Reconstruir contenedor después de cambios**:
  ```bash
  docker-compose up -d --build
  ```

## Acceso a la aplicación

La aplicación estará disponible en: [http://localhost:3000](http://localhost:3000)

## Datos persistentes

Los videos descargados se almacenan en el directorio `backend/downloads` de tu sistema host, que está montado como volumen en el contenedor. Esto permite que los archivos descargados permanezcan incluso si el contenedor se detiene o se elimina.

## Solución de problemas

Si encuentras algún problema:

1. Verifica los logs con `docker-compose logs -f`
2. Asegúrate de que los puertos necesarios (3000) no estén siendo utilizados por otros servicios
3. Verifica que streamlink y ffmpeg se hayan instalado correctamente dentro del contenedor:
   ```bash
   docker exec -it twitch-downloader sh -c "streamlink --version && ffmpeg -version"
   ```