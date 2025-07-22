/**
 * effects/pixel-sorting.js
 * * Contém a lógica para o efeito de Pixel Sorting.
 * Ordena segmentos de pixéis com base num limiar de brilho para criar um efeito de "esticamento".
 */

export const pixelSortingEffect = {
    name: 'PIXEL SORT',
    getControlsHTML: () => `
        <div class="control-panel">
            <h3 class="panel-title">--Effect Controls--</h3>
            <div class="controls-section">
                <div>
                    <div class="control-row-flex"><label for="sortAngle">Angle</label><span id="sortAngleValue">0</span></div>
                    <input type="range" id="sortAngle" name="sortAngle" min="-45" max="45" value="0" step="1" class="slider">
                </div>
                <div>
                    <label>Direction</label>
                    <div id="sort-direction-selector" class="pattern-selector">
                        <button class="pattern-btn active" data-direction="Horizontal">Horizontal</button>
                        <button class="pattern-btn" data-direction="Vertical">Vertical</button>
                    </div>
                </div>
                <div>
                    <div class="control-row-flex"><label for="sortThreshold">Sort Threshold</label><span id="sortThresholdValue">100</span></div>
                    <input type="range" id="sortThreshold" name="sortThreshold" min="0" max="255" value="100" step="1" class="slider">
                </div>
            </div>
        </div>`,
    init(app) {
        // Adiciona o listener para o seletor de direção
        document.getElementById('sort-direction-selector').addEventListener('click', (e) => {
            if (e.target.tagName === 'BUTTON') {
                const currentActive = document.querySelector('#sort-direction-selector .active');
                if (currentActive) {
                    currentActive.classList.remove('active');
                }
                e.target.classList.add('active');
                app.updateState({ sortDirection: e.target.dataset.direction });
            }
        });
    },
    apply(imageData, state) {
        const { sortAngle, sortDirection, sortThreshold } = state;
        const originalWidth = imageData.width;
        const originalHeight = imageData.height;

        // Helper para calcular o brilho
        const getBrightness = (r, g, b) => 0.2126 * r + 0.7152 * g + 0.0722 * b;

        // 1. Rodar a imagem num canvas temporário
        const sourceCanvas = document.createElement('canvas');
        sourceCanvas.width = originalWidth;
        sourceCanvas.height = originalHeight;
        const sourceCtx = sourceCanvas.getContext('2d');
        sourceCtx.putImageData(imageData, 0, 0);

        const radAngle = sortAngle * Math.PI / 180;
        const sin = Math.abs(Math.sin(radAngle));
        const cos = Math.abs(Math.cos(radAngle));
        const rotatedWidth = Math.floor(originalWidth * cos + originalHeight * sin);
        const rotatedHeight = Math.floor(originalWidth * sin + originalHeight * cos);

        const rotatedCanvas = document.createElement('canvas');
        rotatedCanvas.width = rotatedWidth;
        rotatedCanvas.height = rotatedHeight;
        const rotatedCtx = rotatedCanvas.getContext('2d');

        rotatedCtx.translate(rotatedWidth / 2, rotatedHeight / 2);
        rotatedCtx.rotate(radAngle);
        rotatedCtx.drawImage(sourceCanvas, -originalWidth / 2, -originalHeight / 2);
        
        const rotatedImageData = rotatedCtx.getImageData(0, 0, rotatedWidth, rotatedHeight);
        const pixels = rotatedImageData.data;

        // 2. Lógica de Ordenação
        const sortSegment = (segment) => segment.sort((a, b) => a.brightness - b.brightness);

        if (sortDirection === 'Horizontal') {
            for (let y = 0; y < rotatedHeight; y++) {
                let segment = [];
                for (let x = 0; x < rotatedWidth; x++) {
                    const i = (y * rotatedWidth + x) * 4;
                    const r = pixels[i], g = pixels[i + 1], b = pixels[i + 2];
                    const brightness = getBrightness(r, g, b);

                    if (brightness < sortThreshold) {
                        if (segment.length > 0) {
                            const sorted = sortSegment(segment);
                            for (let j = 0; j < sorted.length; j++) {
                                const k = (y * rotatedWidth + (x - sorted.length + j)) * 4;
                                pixels[k] = sorted[j].r;
                                pixels[k + 1] = sorted[j].g;
                                pixels[k + 2] = sorted[j].b;
                            }
                            segment = [];
                        }
                    } else {
                        segment.push({ r, g, b, brightness });
                    }
                }
            }
        } else { // Vertical
            for (let x = 0; x < rotatedWidth; x++) {
                let segment = [];
                for (let y = 0; y < rotatedHeight; y++) {
                    const i = (y * rotatedWidth + x) * 4;
                    const r = pixels[i], g = pixels[i + 1], b = pixels[i + 2];
                    const brightness = getBrightness(r, g, b);

                    if (brightness < sortThreshold) {
                        if (segment.length > 0) {
                            const sorted = sortSegment(segment);
                            for (let j = 0; j < sorted.length; j++) {
                                const k = ((y - sorted.length + j) * rotatedWidth + x) * 4;
                                pixels[k] = sorted[j].r;
                                pixels[k + 1] = sorted[j].g;
                                pixels[k + 2] = sorted[j].b;
                            }
                            segment = [];
                        }
                    } else {
                        segment.push({ r, g, b, brightness });
                    }
                }
            }
        }

        // 3. Desenhar a imagem ordenada e rodada de volta no canvas principal
        rotatedCtx.putImageData(rotatedImageData, 0, 0);
        
        const mainCtx = document.getElementById('imageCanvas').getContext('2d');
        mainCtx.clearRect(0, 0, originalWidth, originalHeight);
        mainCtx.save();
        mainCtx.translate(originalWidth / 2, originalHeight / 2);
        mainCtx.rotate(-radAngle);
        mainCtx.drawImage(rotatedCanvas, -rotatedWidth / 2, -rotatedHeight / 2);
        mainCtx.restore();

        // Atualiza o imageData original com o resultado final
        const finalImageData = mainCtx.getImageData(0, 0, originalWidth, originalHeight);
        for (let i = 0; i < imageData.data.length; i++) {
            imageData.data[i] = finalImageData.data[i];
        }
    }
};
