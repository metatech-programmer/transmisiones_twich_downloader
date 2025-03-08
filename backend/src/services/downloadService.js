import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { extractVideoInfo } from '../utils/twitch-utils.js';

// Función para iniciar descarga con streamlink

// Función para descargar un stream con Streamlink
export function startDownload(url, outputPath, quality = 'best', format = 'mp4') {
    // Validación de parámetros
    if (!url || typeof url !== 'string') {
        throw new Error('❌ La URL proporcionada no es válida.');
    }
    if (!outputPath || typeof outputPath !== 'string') {
        throw new Error('❌ La ruta de salida proporcionada no es válida.');
    }
    if (!['best', 'worst', '1080p', '720p', '480p', '360p', '160p'].includes(quality)) {
        throw new Error('❌ La calidad proporcionada no es válida.');
    }
    if (!['mp4', 'mkv', 'flv', 'avi'].includes(format)) {
        throw new Error('❌ El formato proporcionado no es válido.');
    }

    // Asegurar que el directorio de salida exista
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    // Generar un nombre dinámico para evitar sobrescribir archivos
    const timestamp = Date.now();
    const finalOutputPath = path.join(outputDir, `video_${timestamp}.${format}`);

    // Construcción de argumentos optimizados para Streamlink
    const args = [
        '--hls-segment-timeout', '30',       // Tiempo de espera por segmento (mejor estabilidad)
        '--hls-timeout', '1800',             // Timeout global de 30 minutos
        '--hls-segment-attempts', '15',      // Intentos por segmento (evita fallos de conexión)
        '--stream-segment-threads', '10',    // Mayor velocidad de descarga con más hilos
        '--hls-live-edge', '6',              // Mantiene un buffer de 6 segmentos
        '--retry-open', '5',                 // Reintenta abrir el stream hasta 5 veces
        '--retry-streams', '5',              // Reintenta la conexión en caso de fallos
        '--force',                            // Evita errores si el archivo ya existe
        '--progress',                         // Muestra progreso en tiempo real
        '--output', finalOutputPath,         // Ruta del archivo de salida
        url,                                  // URL del stream
        quality                               // Calidad seleccionada
    ];

    console.log(`📡 Iniciando descarga de: ${url}`);
    console.log(`📂 Guardando en: ${finalOutputPath}\n`);

    // Ejecutar Streamlink
    const downloadProcess = spawn('streamlink', args);

    // Capturar salida del proceso
    downloadProcess.stdout.on('data', (data) => {
        console.log(`[📥] ${data.toString()}`);
    });

    // Capturar errores
    downloadProcess.stderr.on('data', (data) => {
        console.error(`[⚠️ ERROR] ${data.toString()}`);
    });

    // Manejo del cierre del proceso
    downloadProcess.on('close', (code) => {
        if (code === 0) {
            console.log(`✅ Descarga completada: ${finalOutputPath}`);
        } else {
            console.error(`❌ Error en la descarga (Código ${code})`);
        }
    });

    return downloadProcess;
}



// Configurar manejadores de eventos para el proceso de descarga
export function setupProcessHandlers(process, downloadId, quality, activeDownloads, DOWNLOADS_DB) {
    const download = activeDownloads.get(downloadId);
    let lastProgress = 0;
    let isCompleted = false;
    let totalSize = 0;
    let downloadedSize = 0;
    
    // Capturar salida estándar para extraer progreso
    process.stdout.on('data', (data) => {
        const output = data.toString();
        console.log(`[stdout] ${output}`);
        
        // Mejorar detección de progreso
        const progressMatch = output.match(/(\d+(\.\d+)?%)/);
        if (progressMatch) {
            const progress = parseFloat(progressMatch[1]);
            if (progress > lastProgress) {
                lastProgress = progress;
                download.info.progress = progress;
            }
        }

        // Detectar tamaño total y descargado
        const sizeMatch = output.match(/Total size: (\d+) bytes/);
        if (sizeMatch) {
            totalSize = parseInt(sizeMatch[1], 10);
        }
        const downloadedMatch = output.match(/Downloaded: (\d+) bytes/);
        if (downloadedMatch) {
            downloadedSize = parseInt(downloadedMatch[1], 10);
            download.info.downloadedSize = downloadedSize;
            download.info.totalSize = totalSize;
        }

        // Detectar finalización
        if (output.includes('Download Complete') || output.includes('Stream ended')) {
            isCompleted = true;
            download.info.status = 'completed';
            download.info.progress = 100;
        }
    });
    
    // Capturar errores
    process.stderr.on('data', (data) => {
        const error = data.toString();
        console.error(`[stderr] ${error}`);
        if (!isCompleted) {
            download.info.error = error;
        }
    });
    
    // Cuando finaliza el proceso
    process.on('close', async (code) => {
        console.log(`Proceso finalizado con código: ${code}`);
        
        if (code === 0 || isCompleted) {
            download.info.status = 'completed';
            download.info.progress = 100;
            
            // Obtener información adicional del video
            try {
                const videoInfo = await extractVideoInfo(download.info.outputPath);
                
                // Guardar información de descarga completada
                const downloadsData = JSON.parse(fs.readFileSync(DOWNLOADS_DB));
                downloadsData.downloads.unshift({
                    id: downloadId,
                    title: download.info.streamInfo.title || 'Transmisión de Twitch',
                    channel: download.info.streamInfo.channelName,
                    quality: download.info.streamInfo.resolution || quality,
                    format: path.extname(download.info.outputPath).substring(1),
                    size: videoInfo.size,
                    duration: videoInfo.duration,
                    downloadUrl: `/downloads/${path.basename(download.info.outputPath)}`,
                    date: new Date().toISOString()
                });
                
                // Limitar a 3 descargas recientes
                if (downloadsData.downloads.length > 5) {
                    downloadsData.downloads = downloadsData.downloads.slice(0, 5);
                }
                
                fs.writeFileSync(DOWNLOADS_DB, JSON.stringify(downloadsData));
            } catch (error) {
                console.error('Error al procesar video descargado:', error);
            }
        } else {
            download.info.status = 'failed';
        }
        
        // Limpiar la descarga después de 5 minutos en lugar de 1 hora
        setTimeout(() => {
            activeDownloads.delete(downloadId);
        }, 300000); // Eliminar después de 5 minutos
    });
}


