export const validateDownloadRequest = (req, res, next) => {
    const { url, quality, format } = req.body;
    
    if (!url || !url.includes('twitch.tv')) {
        return res.status(400).json({ message: 'URL de Twitch inválida' });
    }
    
    if (!quality || !['best', '720p', '480p', '360p'].includes(quality)) {
        return res.status(400).json({ message: 'Calidad inválida' });
    }
    
    if (!format || !['mp4', 'mkv', 'ts'].includes(format)) {
        return res.status(400).json({ message: 'Formato inválido' });
    }
    
    next();
};
