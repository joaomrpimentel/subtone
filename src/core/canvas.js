/**
 * src/core/canvas.js
 * * Módulo controlador para o elemento Canvas.
 * Encapsula toda a manipulação direta do canvas, como desenhar,
 * redimensionar, obter dados da imagem e exportar. Isso mantém o
 * `app.js` mais limpo e focado na lógica da aplicação.
 */
export class CanvasController {
    /**
     * @param {HTMLCanvasElement} canvasElement - O elemento canvas a ser controlado.
     */
    constructor(canvasElement) {
        this.canvas = canvasElement;
        this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });
    }

    /**
     * Redimensiona o canvas para caber no seu container, mantendo a proporção da imagem.
     * @param {HTMLImageElement} image - A imagem original para calcular a proporção.
     */
    resize(image) {
        const container = this.canvas.parentElement;
        const { clientWidth: maxWidth, clientHeight: maxHeight } = container;
        const imgRatio = image.width / image.height;
        const containerRatio = maxWidth / maxHeight;

        let newWidth = maxWidth;
        let newHeight = maxHeight;

        if (imgRatio > containerRatio) {
            newHeight = maxWidth / imgRatio;
        } else {
            newWidth = maxHeight * imgRatio;
        }

        this.canvas.width = newWidth;
        this.canvas.height = newHeight;
    }

    /**
     * Limpa o canvas, desenha a imagem fornecida e retorna seus dados de pixel.
     * @param {HTMLImageElement} image - A imagem a ser desenhada.
     * @returns {ImageData} Os dados da imagem desenhada.
     */
    drawImage(image) {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.drawImage(image, 0, 0, this.canvas.width, this.canvas.height);
        return this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
    }

    /**
     * Atualiza o conteúdo do canvas com novos dados de imagem.
     * @param {ImageData} imageData - Os novos dados de imagem a serem exibidos.
     */
    update(imageData) {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.putImageData(imageData, 0, 0);
    }

    /**
     * Desenha um texto formatado no canto inferior direito do canvas.
     * @param {string} text - O texto a ser desenhado no timestamp.
     */
    drawTimestamp(text) {
        const fontSize = Math.max(16, Math.min(this.canvas.width * 0.045, 28));
        this.ctx.font = `${fontSize}px 'VT323', monospace`;
        this.ctx.textAlign = 'right';
        this.ctx.textBaseline = 'bottom';

        const padding = fontSize * 0.8;
        this.ctx.fillStyle = '#FF9900';
        this.ctx.fillText(text, this.canvas.width - padding, this.canvas.height - padding);
    }

    /**
     * Inicia o download do conteúdo atual do canvas como uma imagem PNG.
     * @param {string} filename - O nome do arquivo para o download.
     */
    export(filename) {
        const link = document.createElement('a');
        link.download = filename;
        link.href = this.canvas.toDataURL('image/png');
        link.click();
    }
}
