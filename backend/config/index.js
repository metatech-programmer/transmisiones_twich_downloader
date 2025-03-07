import { exampleConfig } from './exampleConfig.js';
import dotenv from 'dotenv';

dotenv.config();

const config = {
    port: process.env.PORT || 8091,
    nodeEnv: process.env.NODE_ENV || 'development',
    downloadDir: process.env.DOWNLOAD_DIR || './downloads',
    maxConcurrentDownloads: process.env.MAX_CONCURRENT_DOWNLOADS || 3,
    // ...other configurations...
};

export default config;

export {
    exampleConfig,
    // ...other configurations...
};
