document.addEventListener('DOMContentLoaded', function() {
    const downloadBtn = document.getElementById('downloadBtn');
    const streamUrlInput = document.getElementById('streamUrl');
    const qualitySelect = document.getElementById('quality');
    const formatSelect = document.getElementById('format');
    const statusElement = document.getElementById('status');
    const progressContainer = document.getElementById('progress-container');
    const progressBar = document.getElementById('progress-bar');
    const progressText = document.getElementById('progress-text');
    const downloadsList = document.getElementById('downloads-list');
    const noDownloadsText = document.getElementById('no-downloads');
    
    const API_BASE_URL = 'http://localhost:3000/api';
    
    // Cargar descargas previas y actualizar en tiempo real
    loadDownloads();
    setInterval(loadDownloads, 5000); // Actualizar cada 5 segundos
    
    downloadBtn.addEventListener('click', function() {
        const streamUrl = streamUrlInput.value.trim();
        const quality = qualitySelect.value;
        const format = formatSelect.value;
        
        if (!isValidTwitchUrl(streamUrl)) {
            showStatus('Por favor, ingresa una URL válida de Twitch.', 'error');
            return;
        }
        
        downloadBtn.disabled = true;
        showStatus('Iniciando descarga...', 'info');
        progressContainer.classList.remove('hidden');
        progressBar.style.width = '0%';
        progressText.textContent = '0%';
        
        fetch(`${API_BASE_URL}/download`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: streamUrl, quality, format })
        })
        .then(response => response.json())
        .then(data => {
            if (data.downloadId) {
                trackDownloadProgress(data.downloadId);
            } else {
                throw new Error(data.message || 'Error desconocido');
            }
        })
        .catch(error => {
            showStatus(`Error: ${error.message}`, 'error');
            downloadBtn.disabled = false;
            progressContainer.classList.add('hidden');
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
        let failedAttempts = 0;
        const maxFailedAttempts = 3;
        
        const progressInterval = setInterval(async () => {
            try {
                const response = await fetch(`${API_BASE_URL}/status/${downloadId}`);
                if (!response.ok) {
                    throw new Error('Error en la respuesta del servidor');
                }
                
                const data = await response.json();
                
                // Actualizar progreso
                const progress = Math.min(Math.round(data.progress), 100);
                progressBar.style.width = `${progress}%`;
                progressText.textContent = `${progress}%`;
                
                // Verificar estado
                if (data.status === 'completed') {
                    clearInterval(progressInterval);
                    showStatus('¡Descarga completada!', 'success');
                    downloadBtn.disabled = false;
                    loadDownloads();
                    return;
                } else if (data.status === 'failed') {
                    clearInterval(progressInterval);
                    showStatus(`Error: ${data.error || 'Error desconocido'}`, 'error');
                    downloadBtn.disabled = false;
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
                }
            }
        }, 1000); // Actualizar cada segundo en lugar de cada 2 segundos
        
        // Guardar el ID del intervalo para limpieza
        download.intervalId = progressInterval;
    }
    
    // Añadir función para limpiar intervalos antiguos
    function clearDownloadInterval(downloadId) {
        const download = activeDownloads.get(downloadId);
        if (download?.intervalId) {
            clearInterval(download.intervalId);
            delete download.intervalId;
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
});
