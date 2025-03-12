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

        // Iniciar proceso de descarga (suponiendo que startDownload ya está definida)
        const downloadProcess = startDownload(url, outputPath, quality, format);

        // Iniciar el tracker que se ejecutará continuamente y enviará datos cada segundo
        const stopTracker = await trackDownloadProgress(outputPath, (error, { sizeDownloaded, downloadSpeed }) => {

            let sizeDownloadedVOD = 0;
            let speedDataVOD = 0;

            if (error) {
                console.error('Error en el tracker:', error);
            } else {
                console.log(`Tamaño descargado: ${sizeDownloaded} MB, Velocidad: ${downloadSpeed} MB/s`);
                sizeDownloadedVOD = sizeDownloaded;
                speedDataVOD = downloadSpeed;

            }
            activeDownloads.set(downloadId, {
                process: downloadProcess,
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
        });

        // Guardar información del proceso


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


