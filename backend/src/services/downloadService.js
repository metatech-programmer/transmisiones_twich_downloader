import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { extractVideoInfo } from '../utils/twitch-utils.js';

// Función para iniciar descarga con streamlink
export function startDownload(url, outputPath, quality, format) {
    // Siguiendo el orden correcto de argumentos para streamlink:
    // 1. URL del stream
    // 2. Calidad
    // 3. Opciones adicionales
    // 4. Opción de salida (-o) y ruta
    const args = [
        url,                                 // 1. URL del stream
        quality || 'best',                   // 2. Calidad
        '--force',                          // 3. Opciones adicionales
        '--hls-live-restart',
        '--ringbuffer-size', '256M',
        '--stream-timeout', '120',
        '--stream-segment-timeout', '60',
        '--hls-live-edge', '2',
        '--retry-streams', '3',
        '-o', outputPath                     // 4. Opción de salida y ruta
    ];
    
    console.log('Iniciando descarga con streamlink:', args.join(' '));
    
    const downloadProcess = spawn('streamlink', args);

    downloadProcess.stdout.on('data', (data) => {
        console.log(`stdout: ${data}`);
    });

    downloadProcess.stderr.on('data', (data) => {
        console.error(`stderr: ${data}`);
    });

    downloadProcess.on('close', (code) => {
        console.log(`Proceso de descarga finalizado con código ${code}`);
    });

    return downloadProcess;
}

// Configurar manejadores de eventos para el proceso de descarga
export function setupProcessHandlers(process, downloadId, quality, activeDownloads, DOWNLOADS_DB) {
    if (!activeDownloads.has(downloadId)) {
        console.error('No se encontró la descarga activa:', downloadId);
        return;
    }

    const download = activeDownloads.get(downloadId);
    let lastProgress = 0;
    let isCompleted = false;
    let totalSize = 0;
    let downloadedSize = 0;
    
    // Capturar salida estándar para extraer progreso
    process.stdout.on('data', (data) => {
        if (!activeDownloads.has(downloadId)) return;
        
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
            if (activeDownloads.has(downloadId)) {
                download.info.status = 'completed';
                download.info.progress = 100;
            }
        }
    });
    
    // Capturar errores
    process.stderr.on('data', (data) => {
        if (!activeDownloads.has(downloadId)) return;
        
        const error = data.toString();
        console.error(`[stderr] ${error}`);
        if (!isCompleted && activeDownloads.has(downloadId)) {
            download.info.error = error;
        }
    });
    
    // Cuando finaliza el proceso
    process.on('close', async (code) => {
        console.log(`Proceso finalizado con código: ${code}`);
        
        if (!activeDownloads.has(downloadId)) {
            console.log('Descarga ya no está activa, posiblemente cancelada');
            return;
        }
        
        const download = activeDownloads.get(downloadId);
        
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
                
                // Limitar a 5 descargas recientes
                if (downloadsData.downloads.length > 5) {
                    downloadsData.downloads = downloadsData.downloads.slice(0, 5);
                }
                
                fs.writeFileSync(DOWNLOADS_DB, JSON.stringify(downloadsData));
            } catch (error) {
                console.error('Error al procesar video descargado:', error);
            }
        } else if (download.info.status !== 'cancelled') {
            // Solo marcar como fallido si no fue cancelado
            download.info.status = 'failed';
        }
        
        // Limpiar la descarga después de 5 minutos
        setTimeout(() => {
            activeDownloads.delete(downloadId);
        }, 300000);
    });
}
