/**
 * effects/pixel-sorting.js
 * * Contém a lógica para o efeito de Pixel Sorting.
 * Ordena segmentos de pixéis com base num limiar de brilho.
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

        // Lógica de Ordenação (inalterada)
        const sortSegment = (segment) => segment.sort((a, b) => a.brightness - b.brightness);

        if (sortDirection === 'Horizontal') {
            for (let y = 0; y < rotatedHeight; y++) {
                let start = -1;
                for (let x = 0; x < rotatedWidth; x++) {
                    const i = (y * rotatedWidth + x) * 4;
                    const brightness = getBrightness(pixels[i], pixels[i + 1], pixels[i + 2]);

                    if (brightness > sortThreshold) {
                        if (start === -1) {
                            start = x;
                        }
                    } else {
                        if (start !== -1) {
                            const segment = [];
                            for (let k = start; k < x; k++) {
                                const j = (y * rotatedWidth + k) * 4;
                                segment.push({
                                    r: pixels[j], g: pixels[j+1], b: pixels[j+2],
                                    brightness: getBrightness(pixels[j], pixels[j+1], pixels[j+2])
                                });
                            }
                            sortSegment(segment);
                            for (let k = 0; k < segment.length; k++) {
                                const j = (y * rotatedWidth + (start + k)) * 4;
                                pixels[j] = segment[k].r;
                                pixels[j+1] = segment[k].g;
                                pixels[j+2] = segment[k].b;
                            }
                            start = -1;
                        }
                    }
                }
            }
        } else { // Vertical
            for (let x = 0; x < rotatedWidth; x++) {
                 let start = -1;
                for (let y = 0; y < rotatedHeight; y++) {
                    const i = (y * rotatedWidth + x) * 4;
                    const brightness = getBrightness(pixels[i], pixels[i + 1], pixels[i + 2]);
                     if (brightness > sortThreshold) {
                        if (start === -1) {
                            start = y;
                        }
                    } else {
                        if (start !== -1) {
                            const segment = [];
                            for (let k = start; k < y; k++) {
                                const j = (k * rotatedWidth + x) * 4;
                                segment.push({
                                    r: pixels[j], g: pixels[j+1], b: pixels[j+2],
                                    brightness: getBrightness(pixels[j], pixels[j+1], pixels[j+2])
                                });
                            }
                            sortSegment(segment);
                            for (let k = 0; k < segment.length; k++) {
                                const j = ((start + k) * rotatedWidth + x) * 4;
                                pixels[j] = segment[k].r;
                                pixels[j+1] = segment[k].g;
                                pixels[j+2] = segment[k].b;
                            }
                            start = -1;
                        }
                    }
                }
            }
        }
        
        // Rodar a imagem ordenada de volta
        rotatedCtx.putImageData(rotatedImageData, 0, 0);
        
        const finalCanvas = new OffscreenCanvas(originalWidth, originalHeight);
        const finalCtx = finalCanvas.getContext('2d');
        
        finalCtx.translate(originalWidth / 2, originalHeight / 2);
        finalCtx.rotate(-radAngle);
        finalCtx.drawImage(rotatedCanvas, -rotatedWidth / 2, -rotatedHeight / 2);

        // Copia o resultado para o imageData principal
        const finalImageData = finalCtx.getImageData(0, 0, originalWidth, originalHeight);
        imageData.data.set(finalImageData.data);
    }
};
