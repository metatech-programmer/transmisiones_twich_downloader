import { fireEvent, getByText, getByLabelText } from '@testing-library/dom';
import '@testing-library/jest-dom/extend-expect';
import fs from 'fs';
import path from 'path';

const html = fs.readFileSync(path.resolve(__dirname, '../index.html'), 'utf8');

describe('Main.js', () => {
  beforeEach(() => {
    document.documentElement.innerHTML = html.toString();
    require('../main.js');
  });

  it('should show error for invalid URL', () => {
    const downloadBtn = getByText(document, 'Iniciar Descarga');
    const streamUrlInput = getByLabelText(document, 'URL de la transmisión o canal:');

    fireEvent.input(streamUrlInput, { target: { value: 'invalid-url' } });
    fireEvent.click(downloadBtn);

    const statusElement = document.getElementById('status');
    expect(statusElement).toHaveTextContent('Por favor, ingresa una URL válida de Twitch.');
  });

  it('should start download for valid URL', () => {
    const downloadBtn = getByText(document, 'Iniciar Descarga');
    const streamUrlInput = getByLabelText(document, 'URL de la transmisión o canal:');

    fireEvent.input(streamUrlInput, { target: { value: 'https://www.twitch.tv/videos/123456789' } });
    fireEvent.click(downloadBtn);

    const statusElement = document.getElementById('status');
    expect(statusElement).toHaveTextContent('Iniciando descarga...');
  });
});
