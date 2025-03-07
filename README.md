# 🌟 Twitch Downloader 🌟

![Twitch Downloader Logo](frontend/icon.png)

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D14.0.0-brightgreen.svg)](https://nodejs.org/)
[![Docker](https://img.shields.io/badge/docker-supported-blue.svg)](https://www.docker.com/)

## 📝 Descripción

Twitch Downloader es una herramienta de código abierto que permite descargar contenido de Twitch.tv, incluyendo:
- Streams en vivo
- VODs (Videos bajo demanda)
- Clips
- Transmisiones pasadas

La aplicación está diseñada con una arquitectura moderna y separada en frontend/backend para garantizar un rendimiento óptimo y una experiencia de usuario fluida.

## ✨ Características Principales

- **Descarga Flexible**:
  - Múltiples formatos: MP4, MKV, TS
  - Diferentes calidades: desde 360p hasta la mejor calidad disponible
  - Soporte para streams en vivo y VODs

- **Interfaz Intuitiva**:
  - Diseño responsive
  - Interfaz de usuario intuitiva
  - Historial de descargas
  - Vista previa de streams

- **Características Técnicas**:
  - Procesamiento asíncrono
  - Gestión eficiente de memoria
  - Caché inteligente
  - Recuperación automática de errores

## 🛠️ Tecnologías Utilizadas

### Backend
- Node.js
- Express.js
- Streamlink
- FFmpeg
- UUID

### Frontend
- HTML5
- CSS3 (con variables CSS)
- JavaScript (ES6+)
- Responsive Design

### Herramientas
- Docker
- Docker Compose
- Git

## 📋 Requisitos Previos

### Requisitos Esenciales
- Node.js (v14.0.0 o superior)
- npm (v6.0.0 o superior)
- Streamlink (última versión)
- FFmpeg (última versión)

### Requisitos Opcionales
- Docker y Docker Compose (para instalación containerizada)
- Git (para clonar el repositorio)

## 🚀 Instalación

### Método 1: Instalación Local

1. **Clonar el Repositorio**:
   ```bash
   git clone https://github.com/metatech-programmer/transmisiones_twich_downloader.git
   cd twitch-downloader
   ```

2. **Instalar Dependencias del Backend**:
   ```bash
   cd backend
   npm install
   ```

3. **Instalar Dependencias del Frontend** (si es necesario):
   ```bash
   cd ../frontend
   npm install
   ```

4. **Instalar Streamlink y FFmpeg**:

   En Ubuntu/Debian:
   ```bash
   sudo apt update
   sudo apt install streamlink ffmpeg
   ```

   En macOS:
   ```bash
   brew install streamlink ffmpeg
   ```

   En Windows:
   - Descarga Streamlink desde [streamlink.github.io](https://streamlink.github.io/)
   - Descarga FFmpeg desde [ffmpeg.org](https://ffmpeg.org/)
  
### Metodo 1.1: Utilizar .bat para arrancar la aplicación luego de la instalación

Puede darle click al archivo `twich.bat` en el directorio raíz del proyecto con el objetivo de arrancar la aplicación luego de la instalación de todos los progrramas o paquetes necesarios, para su buen funcionamiento.

### Método 2: Instalación con Docker

1. **Construir y Ejecutar con Docker Compose**:
   ```bash
   docker-compose up -d
   ```

2. **Verificar la Instalación**:
   ```bash
   docker-compose ps
   ```



## 💻 Uso

### Iniciar la Aplicación

1. **Modo Desarrollo**:
   ```bash
   # Backend
   cd backend
   npm run dev

   # Frontend (en otra terminal)
   cd frontend
   npm start
   ```

2. **Modo Producción**:
   ```bash
   npm start
   ```

3. **Acceder a la Aplicación**:
   Abre tu navegador y navega a http://localhost:8091




### Descargar Contenido

1. Abra la aplicación en su navegador (http://localhost:8091)
2. Pegue la URL del contenido de Twitch
3. Seleccione la calidad y formato deseados
4. Haga clic en "Iniciar Descarga"

### Ejemplos de URLs Soportadas

```
# VODs
https://www.twitch.tv/videos/1234567890

# Canales en Vivo
https://www.twitch.tv/nombrecanal

# Clips
https://clips.twitch.tv/ClipName
```

## ⚙️ Configuración

### Variables de Entorno

Cree un archivo `.env` en el directorio `backend`:

```env
PORT=8091
NODE_ENV=development
DOWNLOAD_DIR=./downloads
MAX_CONCURRENT_DOWNLOADS=3
```

### Configuración de Docker

Ajuste `docker-compose.yml` según sus necesidades:

```yaml
version: '3.8'
services:
  app:
    build: .
    environment:
      - NODE_ENV=production
    ports:
      - "8091:8091"
    volumes:
      - ./downloads:/app/downloads
```

## 🔧 Desarrollo

### Estructura del Proyecto

```
TWITCH_DOWNLOADER/
├── backend/
│   ├── downloads/          # Directorio de descargas
│   ├── src/               # Código fuente
│   │   ├── controllers/   # Controladores
│   │   ├── middleware/    # Middleware
│   │   ├── routes/       # Rutas API
│   │   ├── services/     # Servicios
│   │   └── utils/        # Utilidades
│   ├── tests/            # Tests
│   └── config/           # Configuración
├── frontend/
│   ├── src/              # Código fuente
│   ├── public/           # Archivos estáticos
│   └── tests/            # Tests
└── docs/                 # Documentación
```

### Comandos Útiles

```bash
# Desarrollo
npm run dev          # Iniciar en modo desarrollo
npm run test         # Ejecutar tests
npm run lint         # Verificar estilo de código

# Producción
npm run build        # Construir para producción
npm start           # Iniciar en producción
```

### Ejecutar Tests

Para ejecutar los tests del backend:

```bash
cd backend
npm run test
```

Para ejecutar los tests del frontend:

```bash
cd frontend
npm run test
```

## 📝 Documentación API

### Endpoints

#### POST /api/download
Inicia una descarga
```json
{
  "url": "https://twitch.tv/...",
  "quality": "best",
  "format": "mp4"
}
```

#### GET /api/status/:downloadId
Obtiene el estado de una descarga
```json
{
  "status": "downloading",
  "progress": 45.2,
  "error": null
}
```

## 🤝 Contribución

1. Fork el proyecto
2. Cree su rama de características (`git checkout -b feature/AmazingFeature`)
3. Commit sus cambios (`git commit -m 'Add: nueva característica'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abra un Pull Request

### Guía de Estilo

- Siga la guía de estilo de JavaScript Standard
- Documente todas las funciones y clases
- Mantenga el código modular y reutilizable
- Escriba tests para nuevas características

## 📄 Licencia

Este proyecto está bajo la Licencia MIT - vea el archivo [LICENSE](LICENSE) para más detalles.

## 👥 Autores

* **[Tu Nombre]** - *Trabajo Inicial* - [@metatech-programmer](https://github.com/metatech-programmer)

## 🎉 Agradecimientos

* [Twitch](https://dev.twitch.tv/) por su API
* [Streamlink](https://streamlink.github.io/) por su excelente herramienta
* [FFmpeg](https://ffmpeg.org/) por hacer posible el procesamiento de video


## 🔍 Solución de Problemas

### Problemas Comunes

1. **Error: Puerto en uso**
   ```bash
   sudo lsof -i :8091
   kill -9 PID
   ```

2. **Error: Streamlink no encontrado**
   - Verifique la instalación de Streamlink
   - Asegúrese de que está en el PATH del sistema

## 🔗 Enlaces Útiles

* [Documentación de Twitch API](https://dev.twitch.tv/docs)
* [Guía de Streamlink](https://streamlink.github.io/cli.html)
* [Documentación de FFmpeg](https://ffmpeg.org/documentation.html)

## 📱 Soporte

¿Tiene problemas? Por favor:
1. Revise las [issues existentes](https://github.com/metatech-programmer/transmisiones_twich_downloader/issues)
2. Cree una nueva issue si su problema es nuevo
3. Proporcione detalles completos del error