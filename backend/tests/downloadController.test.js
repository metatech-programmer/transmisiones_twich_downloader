import request from 'supertest';
import express from 'express';
import { startDownloadController, getDownloadStatusController, getDownloadsController } from '../src/controllers/downloadController.js';

const app = express();
app.use(express.json());
app.post('/api/download', startDownloadController);
app.get('/api/status/:downloadId', getDownloadStatusController);
app.get('/api/downloads', getDownloadsController);

describe('Download Controller', () => {
  it('should start a download', async () => {
    const response = await request(app)
      .post('/api/download')
      .send({ url: 'https://www.twitch.tv/videos/123456789', quality: 'best', format: 'mp4' });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('downloadId');
  });

  it('should get download status', async () => {
    const downloadId = 'some-download-id';
    const response = await request(app).get(`/api/status/${downloadId}`);

    expect(response.status).toBe(404);
  });

  it('should get downloads', async () => {
    const response = await request(app).get('/api/downloads');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('downloads');
  });
});
