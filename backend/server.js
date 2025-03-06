import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import { spawn } from 'child_process';
import { processStreamUrl, extractVideoInfo } from './utils/twitch-utils.js';

import path from 'path';
import { fileURLToPath } from 'url';

// Obtén la ruta del archivo actual
const __filename = fileURLToPath(import.meta.url);

// Obtén el directorio del archivo actual
const __dirname = path.dirname(__filename);


// Inicialización de la aplicación
const app = express();
const PORT = process.env.PORT || 3000;

// Directorio para almacenar los archivos descargados
const DOWNLOADS_DIR = path.join(__dirname, 'downloads');
if (!fs.existsSync(DOWNLOADS_DIR)) {
    fs.mkdirSync(DOWNLOADS_DIR);
}

// Archivo para almacenar información de descargas
const DOWNLOADS_DB = path.join(__dirname, 'downloads.json');
if (!fs.existsSync(DOWNLOADS_DB)) {
    fs.writeFileSync(DOWNLOADS_DB, JSON.stringify({ downloads: [] }));
}

// Middleware
app.use(cors());
app.use(express.json());
app.use('/downloads', express.static(DOWNLOADS_DIR));

// Store para las descargas en progreso
const activeDownloads = new Map();

// Rutas API
app.post('/api/download', async (req, res) => {
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
        
        // Guardar información del proceso
        activeDownloads.set(downloadId, {
            process: downloadProcess,
            info: {
                url,
                outputPath,
                progress: 0,
                status: 'downloading',
                error: null,
                streamInfo
            }
        });
        
        // Establecer manejadores de eventos para el proceso
        setupProcessHandlers(downloadProcess, downloadId, quality);
        
        res.status(200).json({
            message: 'Descarga iniciada',
            downloadId
        });
    } catch (error) {
        console.error('Error al iniciar descarga:', error);
        res.status(500).json({ message: 'Error al iniciar descarga: ' + error.message });
    }
});

app.get('/api/status/:downloadId', (req, res) => {
    const { downloadId } = req.params;
    
    if (!activeDownloads.has(downloadId)) {
        return res.status(404).json({ message: 'Descarga no encontrada' });
    }
    
    const download = activeDownloads.get(downloadId);
    
    res.json({
        status: download.info.status,
        progress: download.info.progress,
        error: download.info.error
    });
});

app.get('/api/downloads', (req, res) => {
    try {
        const downloadsData = JSON.parse(fs.readFileSync(DOWNLOADS_DB));
        res.json(downloadsData);
    } catch (error) {
        console.error('Error al leer descargas:', error);
        res.status(500).json({ message: 'Error al obtener descargas' });
    }
});

// Servir archivos frontend en producción
app.use(express.static(path.join(__dirname, '../frontend')));

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`Servidor iniciado en http://localhost:${PORT}`);
});

// Función para iniciar descarga con streamlink
function startDownload(url, outputPath, quality, format) {
    const args = [
        url,
        quality,
        '--stream-segment-threads', '5',
        '--hls-live-restart',
        '-o', outputPath
    ];
    
    console.log('Iniciando descarga con streamlink:', args.join(' '));
    
    return spawn('streamlink', args);
}

// Configurar manejadores de eventos para el proceso de descarga
function setupProcessHandlers(process, downloadId, quality) {
    const download = activeDownloads.get(downloadId);
    
    // Capturar salida estándar para extraer progreso
    process.stdout.on('data', (data) => {
        const output = data.toString();
        console.log(`[stdout] ${output}`);
        
        // Extraer información de progreso
        const progressMatch = output.match(/(\d+\.\d+)%/);
        if (progressMatch) {
            const progress = parseFloat(progressMatch[1]);
            download.info.progress = progress;
        }
    });
    
    // Capturar errores
    process.stderr.on('data', (data) => {
        const error = data.toString();
        console.error(`[stderr] ${error}`);
        download.info.error = error;
    });
    
    // Cuando finaliza el proceso
    process.on('close', async (code) => {
        console.log(`Proceso finalizado con código: ${code}`);
        
        if (code === 0) {
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
                
                // Limitar a 20 descargas recientes
                if (downloadsData.downloads.length > 20) {
                    downloadsData.downloads = downloadsData.downloads.slice(0, 20);
                }
                
                fs.writeFileSync(DOWNLOADS_DB, JSON.stringify(downloadsData));
            } catch (error) {
                console.error('Error al procesar video descargado:', error);
            }
        } else {
            download.info.status = 'failed';
        }
        
        // Mantener la información por un tiempo para que el cliente pueda obtener el estado final
        setTimeout(() => {
            activeDownloads.delete(downloadId);
        }, 3600000); // Eliminar después de 1 hora
    });
}
