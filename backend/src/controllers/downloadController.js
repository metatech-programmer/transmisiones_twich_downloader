import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import { trackDownloadProgress, processStreamUrl } from '../utils/twitch-utils.js';
import { startDownload, setupProcessHandlers } from '../services/downloadService.js';
import config from '../../config/index.js';

const DOWNLOADS_DIR = path.resolve(config.downloadDir);
const DOWNLOADS_DB = path.join(DOWNLOADS_DIR, 'downloads.json');
const activeDownloads = new Map();

export const startDownloadController = async (req, res) => {
    try {
        const { url, quality, format } = req.body;

        // Validar URL
        if (!url || !url.includes('twitch.tv')) {
            return res.status(400).json({ message: 'URL de Twitch inválida' });
        }

        // Generar ID único para esta descarga
        const downloadId = uuidv4();

        // Procesar URL para obtener información del stream
        const streamInfo = await processStreamUrl(url);

        // Configurar nombre del archivo
        const fileName = `${streamInfo.channelName}_${streamInfo.videoId || 'live'}_${streamInfo.title.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.${format}`;
        const outputPath = path.join(DOWNLOADS_DIR, fileName);

        // Iniciar proceso de descarga
        const downloadProcess = startDownload(url, outputPath, quality, format);

        let stopTracker = null;

        // Iniciar el tracker
        stopTracker = await trackDownloadProgress(outputPath, (error, { sizeDownloaded, downloadSpeed }) => {
            let sizeDownloadedVOD = 0;
            let speedDataVOD = 0;

            if (error) {
                console.error('Error en el tracker:', {
                    message: 'Archivo no encontrado o aun no creado ...',
                    error: error.message
                });
            } else {
                sizeDownloadedVOD = sizeDownloaded;
                speedDataVOD = downloadSpeed;
            }

            // Solo actualizar si la descarga sigue activa
            if (activeDownloads.has(downloadId)) {
                activeDownloads.set(downloadId, {
                    process: downloadProcess,
                    stopTracker,
                    info: {
                        url,
                        outputPath,
                        sizeDownloadedVOD,
                        speedDataVOD,
                        status: 'downloading',
                        error: null,
                        streamInfo
                    }
                });
            }
        });

        // Guardar información del proceso con el stopTracker
        activeDownloads.set(downloadId, {
            process: downloadProcess,
            stopTracker,
            info: {
                url,
                outputPath,
                status: 'downloading',
                error: null,
                streamInfo,
                sizeDownloadedVOD: 0,
                speedDataVOD: 0
            }
        });

        // Establecer manejadores de eventos para el proceso
        setupProcessHandlers(downloadProcess, downloadId, quality, activeDownloads, DOWNLOADS_DB);

        res.status(200).json({
            message: 'Descarga iniciada',
            downloadId
        });
    } catch (error) {
        console.error('Error al iniciar descarga:', error);
        res.status(500).json({ message: 'Error al iniciar descarga: ' + error.message });
    }
};

export const getDownloadStatusController = (req, res) => {
    const { downloadId } = req.params;

    if (!activeDownloads.has(downloadId)) {
        return res.status(404).json({ message: 'Descarga no encontrada' });
    }

    const download = activeDownloads.get(downloadId);

    res.json({
        id: downloadId,
        downloadedSize: download.info.sizeDownloadedVOD,
        downloadSpeed: download.info.speedDataVOD,
        status: download.info.status,
        progress: download.info.progress,
        error: download.info.error
    });
};

export const getDownloadsController = (req, res) => {
    try {
        const downloadsData = JSON.parse(fs.readFileSync(DOWNLOADS_DB));
        res.json(downloadsData);
    } catch (error) {
        console.error('Error al leer descargas:', error);
        res.status(500).json({ message: 'Error al obtener descargas' });
    }
};

export const cancelDownloadController = (req, res) => {
    const { downloadId } = req.params;

    if (!activeDownloads.has(downloadId)) {
        return res.status(404).json({ message: 'Descarga no encontrada' });
    }

    const download = activeDownloads.get(downloadId);
    
    try {
        // Detener el tracker primero
        if (download.stopTracker) {
            download.stopTracker();
        }

        // Actualizar estado
        download.info.status = 'cancelled';
        download.info.error = 'Descarga cancelada por el usuario';
        
        // Matar el proceso de descarga
        if (download.process) {
            download.process.on('exit', () => {
                try {
                    // Intentar eliminar el archivo después de que el proceso termine
                    if (fs.existsSync(download.info.outputPath)) {
                        setTimeout(() => {
                            try {
                                fs.unlinkSync(download.info.outputPath);
                            } catch (deleteError) {
                                console.error('Error al eliminar archivo:', deleteError);
                            }
                        }, 1000);
                    }
                } catch (error) {
                    console.error('Error al verificar/eliminar archivo:', error);
                }
            });

            download.process.kill();
        }
        
        // Mantener la descarga activa por un momento para que el frontend pueda obtener el estado final
        setTimeout(() => {
            activeDownloads.delete(downloadId);
        }, 5000);
        
        res.json({ message: 'Descarga cancelada exitosamente' });
    } catch (error) {
        console.error('Error al cancelar descarga:', error);
        res.status(500).json({ message: 'Error al cancelar la descarga' });
    }
};
