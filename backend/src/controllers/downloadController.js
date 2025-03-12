import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import { extractVideoInfo, processStreamUrl } from '../utils/twitch-utils.js';
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
        let sizeDownloaded = 0;
        let sizeTotal = 0; 
                

        extractVideoInfo(outputPath).then(videoInfo => {
            sizeTotal = videoInfo.sizeMB;
        })

        downloadProcess.stderr.on('data', (data) => {
            console.error(`stderr: ${data}`);
        });

        downloadProcess.stdout.on('data', (data) => {
            sizeDownloaded += data.length;
            activeDownloads.get(downloadId).info.downloadedSize = sizeDownloaded;
        });

        // Guardar información del proceso
        activeDownloads.set(downloadId, {
            process: downloadProcess,
            info: {
                totalSize: sizeTotal,
                downloadedSize: sizeDownloaded,
                url,
                outputPath,
                progress: 0,
                status: 'downloading',
                error: null,
                streamInfo
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
        downloadedSize: download.info.downloadedSize,
        totalSize: download.info.totalSize,
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


