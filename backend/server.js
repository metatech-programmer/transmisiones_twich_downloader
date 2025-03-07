import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import downloadRoutes from './src/routes/downloadRoutes.js';
import config from './config/index.js';

// Obtén la ruta del archivo actual
const __filename = fileURLToPath(import.meta.url);

// Obtén el directorio del archivo actual
const __dirname = path.dirname(__filename);

// Inicialización de la aplicación
const app = express();
const PORT = config.port;

// Middleware
app.use(cors());
app.use(express.json());

// Rutas API
app.use('/api', downloadRoutes);
app.use('/downloads', express.static(path.join(__dirname, 'downloads')));

// Servir archivos frontend en producción
app.use(express.static(path.join(__dirname, '../frontend')));

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`Servidor iniciado en http://localhost:${PORT}`);
});
