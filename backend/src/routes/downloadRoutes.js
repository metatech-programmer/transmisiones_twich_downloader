import express, { Router } from 'express';
import { startDownloadController, getDownloadStatusController, getDownloadsController, cancelDownloadController } from '../controllers/downloadController.js';
import { validateDownloadRequest } from '../middleware/downloadMiddleware.js';
const router = express.Router();

router.post('/download', validateDownloadRequest, startDownloadController);
router.get('/status/:downloadId', getDownloadStatusController);
router.get('/downloads', getDownloadsController);
router.post('/download/:downloadId/cancel', cancelDownloadController);

export default router;