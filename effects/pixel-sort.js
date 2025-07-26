/**
 * effects/pixel-sorting.js
 * * Contém a lógica para o efeito de Pixel Sorting.
 * Ordena segmentos de pixéis com base num limiar de brilho.
 * OTIMIZADO: Usa OffscreenCanvas para ser compatível com Web Workers.
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

        const getBrightness = (r, g, b) => 0.2126 * r + 0.7152 * g + 0.0722 * b;

        // 1. Rodar a imagem num OffscreenCanvas temporário
        const sourceCanvas = new OffscreenCanvas(originalWidth, originalHeight);
        sourceCanvas.getContext('2d').putImageData(imageData, 0, 0);

        const radAngle = sortAngle * Math.PI / 180;
        const sin = Math.abs(Math.sin(radAngle));
        const cos = Math.abs(Math.cos(radAngle));
        const rotatedWidth = Math.floor(originalWidth * cos + originalHeight * sin);
        const rotatedHeight = Math.floor(originalWidth * sin + originalHeight * cos);

        const rotatedCanvas = new OffscreenCanvas(rotatedWidth, rotatedHeight);
        const rotatedCtx = rotatedCanvas.getContext('2d');

        rotatedCtx.translate(rotatedWidth / 2, rotatedHeight / 2);
        rotatedCtx.rotate(radAngle);
        rotatedCtx.drawImage(sourceCanvas, -originalWidth / 2, -originalHeight / 2);
        
        const rotatedImageData = rotatedCtx.getImageData(0, 0, rotatedWidth, rotatedHeight);
        const pixels = rotatedImageData.data;

        // 2. Lógica de Ordenação (inalterada)
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
        
        // 3. Rodar a imagem ordenada de volta
        rotatedCtx.putImageData(rotatedImageData, 0, 0);
        
        const finalCanvas = new OffscreenCanvas(originalWidth, originalHeight);
        const finalCtx = finalCanvas.getContext('2d');
        
        finalCtx.translate(originalWidth / 2, originalHeight / 2);
        finalCtx.rotate(-radAngle);
        finalCtx.drawImage(rotatedCanvas, -rotatedWidth / 2, -rotatedHeight / 2);

        // 4. Copia o resultado para o imageData principal
        const finalImageData = finalCtx.getImageData(0, 0, originalWidth, originalHeight);
        imageData.data.set(finalImageData.data);
    }
};
