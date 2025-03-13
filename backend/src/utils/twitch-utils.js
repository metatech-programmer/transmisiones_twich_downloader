import { promises as fs } from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * 
 * Procesa una URL de Twitch para obtener información del stream.
 * @param {string} url URL de Twitch (canal o VOD).
 * @returns {Promise<object>} Información del stream.
 */
async function processStreamUrl(url) {
    try {
        const isVod = url.includes('/videos/');
        const identifier = isVod ? url.split('/videos/')[1].split(/[?#]/)[0] : url.split('twitch.tv/')[1].split(/[?#/]/)[0];
        const info = isVod ? await fetchStreamInfo(identifier, true) : await fetchStreamInfo(identifier, false);
        return {
            ...info,
            isLive: !isVod,
        };
    } catch (error) {
        console.error('Error al procesar URL:', error);
        throw new Error('No se pudo procesar la URL de Twitch');
    }
}

/**
 * Obtiene información de un VOD o canal en vivo.
 * @param {string} identifier ID del video VOD o nombre del canal.
 * @param {boolean} isVod Indica si es un VOD.
 * @returns {Promise<object>} Información del stream.
 */
async function fetchStreamInfo(identifier, isVod) {
    try {
        const url = isVod ? `https://www.twitch.tv/videos/${identifier}` : `https://www.twitch.tv/${identifier}`;
        const { stdout } = await execAsync(`streamlink --json ${url}`);
        const data = JSON.parse(stdout);
        console.log(data);
        
        return isVod
            ? {
                  channelName: data.metadata.author || 'unknown',
                  title: data.metadata.title || `Video ${identifier}`,
                  resolution: data.streams?.best?.resolution || 'unknown',
              }
            : {
                  channelName: identifier,
                  title: data.metadata.title || `Stream de ${identifier}`,
                  resolution: data.streams?.best?.resolution || 'unknown',
              };
    } catch (error) {
        console.error(`Error al obtener info del ${isVod ? 'VOD' : 'stream en vivo'}:`, error);
        return {
            channelName: 'unknown',
            title: isVod ? `Video ${identifier}` : `Stream de ${identifier}`,
            resolution: 'unknown',
        };
    }
}

/**
 * Extrae información de un archivo de video descargado.
 * @param {string} filePath Ruta al archivo de video.
 * @returns {Promise<object>} Información del video (tamaño, duración, etc.).
 */
async function extractVideoInfo(filePath) {
    try {
        const stats = await fs.stat(filePath);
        const fileSizeInBytes = stats.size;
        const fileSizeInMB = fileSizeInBytes / (1024 * 1024);

        // Obtener duración con ffprobe (requiere FFmpeg instalado)
        const { stdout } = await execAsync(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${filePath}"`);
        const duration = parseFloat(stdout.trim());

        return {
            sizeMB: fileSizeInMB,
            size: `${fileSizeInMB.toFixed(2)} MB`,
            duration: formatDuration(duration),
        };
    } catch (error) {
        console.error('Error al extraer información del video:', error);
        return {
            size: 'Desconocido',
            duration: 'Desconocido',
        };
    }
}


/**
 * Monitorea el progreso de la descarga en tiempo real.
 * Se ejecuta cada segundo y llama al callback con:
 *   - sizeDownloaded (número, MB)
 *   - downloadSpeed (número, MB/s)
 *
 * @param {string} outputPath Ruta del archivo descargado.
 * @param {function} callback Función callback(err, { sizeDownloaded, downloadSpeed })
 * @returns {function} Función para detener el monitoreo.
 */
async function trackDownloadProgress(outputPath, callback) {
    let lastSize = 0;      // en bytes
    let lastTime = Date.now(); // tiempo en milisegundos

    // Verificar que el callback sea una función
    if (typeof callback !== 'function') {
        throw new Error('El callback debe ser una función.');
    }

    const intervalId = setInterval(async () => {
        try {
            // Obtener las estadísticas del archivo
            const stats = await fs.promises.stat(outputPath);
            const currentSize = stats.size; // en bytes
            const currentTime = Date.now();

            // Convertir tamaño a MB (número)
            const sizeInMB = currentSize / (1024 * 1024);

            // Calcular diferencia de tiempo en segundos y diferencia de tamaño en MB
            const timeDeltaSeconds = (currentTime - lastTime) / 1000;
            const sizeDeltaMB = (currentSize - lastSize) / (1024 * 1024);

            // Velocidad de descarga en MB/s
            const downloadSpeed = timeDeltaSeconds > 0 ? sizeDeltaMB / timeDeltaSeconds : 0;

            // Actualizar valores para el siguiente intervalo
            lastSize = currentSize;
            lastTime = currentTime;

            // Llamar al callback con datos numéricos
            callback(null, {
                sizeDownloaded: sizeInMB.toFixed(2),        // Número: MB descargados
                downloadSpeed: downloadSpeed.toFixed(2)     // Número: MB/s
            });

            // Mostrar en consola con formato
        } catch (err) {
            // Llamar al callback con el error si ocurre
            callback({
                message: 'Error al obtener estadísticas del archivo',
                error: err
            }, {
                sizeDownloaded: 0,
                downloadSpeed: 0
            });
        }
    }, 1000); // Monitorear cada segundo

    // Retornamos una función para detener el monitoreo si se necesita
    return () => clearInterval(intervalId);
}



/**
 * Formatea segundos en formato HH:MM:SS.
 * @param {number} seconds Duración en segundos.
 * @returns {string} Duración formateada.
 */
function formatDuration(seconds) {
    if (isNaN(seconds)) return 'Desconocido';

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    return [
        hours.toString().padStart(2, '0'),
        minutes.toString().padStart(2, '0'),
        secs.toString().padStart(2, '0'),
    ].join(':');
}

export { processStreamUrl, extractVideoInfo, trackDownloadProgress };
