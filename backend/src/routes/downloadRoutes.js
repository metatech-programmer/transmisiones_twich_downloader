import express, { Router } from 'express';
import { startDownloadController, getDownloadStatusController, getDownloadsController } from '../controllers/downloadController.js';
import { validateDownloadRequest } from '../middleware/downloadMiddleware.js';
const router = express.Router();

router.post('/download', validateDownloadRequest, startDownloadController);
router.get('/status/:downloadId', getDownloadStatusController);
router.get('/downloads', getDownloadsController);

export default router;