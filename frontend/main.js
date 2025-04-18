document.addEventListener('DOMContentLoaded', function () {
    const downloadBtn = document.getElementById('downloadBtn');
    const cancelBtn = document.getElementById('cancelBtn');
    const streamUrlInput = document.getElementById('streamUrl');
    const qualitySelect = document.getElementById('quality');
    const formatSelect = document.getElementById('format');
    const statusElement = document.getElementById('status');
    const loader = document.getElementById('loader');
    const downloadsList = document.getElementById('downloads-list');
    const noDownloadsText = document.getElementById('no-downloads');

    let API_BASE_URL = 'http://localhost:8091/api';
    let currentDownloadId = null;

    if (window.location.hostname === 'localhost') {

        API_BASE_URL = 'http://localhost:8091/api';

    } else {

        API_BASE_URL = 'http://' + window.location.hostname + ':8091/api';

    }

    const activeDownloads = new Map(); 

    loadDownloads();
    setInterval(loadDownloads, 5000); 

    downloadBtn.addEventListener('click', function () {
        const streamUrl = streamUrlInput.value.trim();
        const quality = qualitySelect.value;
        const format = formatSelect.value;

        if (!isValidTwitchUrl(streamUrl)) {
            showStatus('Por favor, ingresa una URL válida de Twitch.', 'error');
            return;
        }

        downloadBtn.disabled = true;
        showStatus('Iniciando descarga...', 'info');

        fetch(`${API_BASE_URL}/download`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: streamUrl, quality, format })
        })
            .then(response => response.json())
            .then(data => {
                if (data.downloadId) {
                    currentDownloadId = data.downloadId;
                    showStatus('Descargando video...', 'info');
                    loader.classList.remove('hidden');
                    cancelBtn.classList.remove('hidden');
                    trackDownloadProgress(data.downloadId);
                } else {
                    throw new Error(data.message || 'Error desconocido');
                }
            })
            .catch(error => {
                showStatus(`Error: ${error.message}`, 'error');
                downloadBtn.disabled = false;
                loader.classList.add('hidden');
                cancelBtn.classList.add('hidden');
            });
    });

    cancelBtn.addEventListener('click', function() {
        if (!currentDownloadId) return;

        cancelBtn.disabled = true;
        
        fetch(`${API_BASE_URL}/download/${currentDownloadId}/cancel`, {
            method: 'POST'
        })
        .then(response => response.json())
        .then(data => {
            // Limpiar el intervalo de progreso primero
            clearDownloadInterval(currentDownloadId);
            
            showStatus('Descarga cancelada', 'info');
            downloadBtn.disabled = false;
            loader.classList.add('hidden');
            cancelBtn.classList.add('hidden');
            cancelBtn.disabled = false;
            currentDownloadId = null;
            loadDownloads();
        })
        .catch(error => {
            showStatus(`Error al cancelar la descarga: ${error.message}`, 'error');
            cancelBtn.disabled = false;
        });
    });

    function isValidTwitchUrl(url) {
        return url.includes('twitch.tv');
    }

    function showStatus(message, type) {
        statusElement.textContent = message;
        statusElement.className = type;
        statusElement.classList.remove('hidden');
    }

    function trackDownloadProgress(downloadId) {
        // Limpiar cualquier intervalo existente primero
        clearDownloadInterval(downloadId);
        
        let failedAttempts = 0;
        const maxFailedAttempts = 3;

        const progressInterval = setInterval(async () => {
            try {
                if (!currentDownloadId) {
                    clearInterval(progressInterval);
                    return;
                }

                const response = await fetch(`${API_BASE_URL}/status/${downloadId}`);
                if (!response.ok) {
                    throw new Error('Error en la respuesta del servidor');
                }

                const data = await response.json();

                // Si la descarga ya no está activa, detener el seguimiento
                if (!data || data.status === 'cancelled') {
                    clearInterval(progressInterval);
                    showStatus('Descarga cancelada', 'info');
                    downloadBtn.disabled = false;
                    loader.classList.add('hidden');
                    cancelBtn.classList.add('hidden');
                    currentDownloadId = null;
                    loadDownloads();
                    return;
                }

                const sizeDownloaded = data.downloadedSize;
                const speedData = data.downloadSpeed;

                if (!isNaN(sizeDownloaded) && sizeDownloaded > 0) {
                    showStatus(`Descargando video en progreso... ${sizeDownloaded} MB descargados a ${speedData} MB/s`, 'info');
                } else {
                    showStatus('Descargando video...', 'info');
                }

                // Verificar estado
                if (data.status === 'completed') {
                    clearInterval(progressInterval);
                    showStatus('¡Descarga completada!', 'success');
                    downloadBtn.disabled = false;
                    loader.classList.add('hidden');
                    cancelBtn.classList.add('hidden');
                    currentDownloadId = null;
                    loadDownloads();
                    return;
                } else if (data.status === 'failed') {
                    clearInterval(progressInterval);
                    showStatus(`Error: ${data.error || 'Error desconocido'}`, 'error');
                    downloadBtn.disabled = false;
                    loader.classList.add('hidden');
                    cancelBtn.classList.add('hidden');
                    currentDownloadId = null;
                    return;
                }

                // Resetear contador de intentos fallidos si llegamos aquí
                failedAttempts = 0;

            } catch (error) {
                console.error('Error al obtener el estado:', error);
                failedAttempts++;

                if (failedAttempts >= maxFailedAttempts) {
                    clearInterval(progressInterval);
                    showStatus('Error: Se perdió la conexión con el servidor', 'error');
                    downloadBtn.disabled = false;
                    loader.classList.add('hidden');
                    cancelBtn.classList.add('hidden');
                    currentDownloadId = null;
                }
            }
        }, 1000);

        activeDownloads.set(downloadId, { intervalId: progressInterval });
    }

    function clearDownloadInterval(downloadId) {
        const download = activeDownloads.get(downloadId);
        if (download?.intervalId) {
            clearInterval(download.intervalId);
            activeDownloads.delete(downloadId); 
        }
    }

    function loadDownloads() {
        fetch(`${API_BASE_URL}/downloads`)
            .then(response => response.json())
            .then(data => {
                downloadsList.innerHTML = '';
                if (data.downloads.length > 0) {
                    noDownloadsText.style.display = 'none';
                    data.downloads.forEach(download => {
                        const downloadItem = document.createElement('div');
                        downloadItem.className = 'download-item';
                        downloadItem.innerHTML = `
                            <div class="download-info">
                                <div class="download-title">${download.title || 'Transmisión de Twitch'}</div>
                                <div class="download-meta">${download.quality} · ${download.format.toUpperCase()} · ${formatDate(download.date)}</div>
                            </div>
                            <div class="download-actions">
                                <a href="${download.downloadUrl}" download>Descargar</a>
                            </div>
                        `;
                        downloadsList.appendChild(downloadItem);
                    });
                } else {
                    noDownloadsText.style.display = 'block';
                }
            })
            .catch(error => console.error('Error al cargar descargas:', error));
    }

    function formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
    }

    loader.classList.add('hidden');
});
