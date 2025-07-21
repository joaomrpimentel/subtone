/**
 * effects/dithering.js
 * * Contém a lógica para o efeito de Dithering.
 * Inclui os padrões Floyd-Steinberg, Bayer e Random, com modo colorido e monocromático.
 */

export const ditheringEffect = {
    name: 'DITHERING',
    getControlsHTML: () => `
        <div class="control-panel">
            <h3 class="panel-title">--Effect Controls--</h3>
            <div class="controls-section">
                <div>
                    <label>Pattern</label>
                    <div id="dithering-pattern-selector" class="pattern-selector">
                        <button class="pattern-btn active" data-pattern="F-S">F-S</button>
                        <button class="pattern-btn" data-pattern="Bayer">Bayer</button>
                        <button class="pattern-btn" data-pattern="Random">Random</button>
                    </div>
                </div>
                <div>
                    <div class="control-row-flex"><label for="pixelSize">Pixel Size</label><span id="pixelSizeValue">1</span></div>
                    <input type="range" id="pixelSize" name="pixelSize" min="1" max="20" value="1" class="slider">
                </div>
                <div class="control-row-flex">
                    <label for="colorMode">Color Mode</label>
                    <label class="switch"><input type="checkbox" id="colorMode"><span class="switch-slider"></span></label>
                </div>
                <div id="threshold-control" class="control-row visible">
                    <div class="control-row-flex"><label for="threshold">Threshold</label><span id="thresholdValue">128</span></div>
                    <input type="range" id="threshold" name="threshold" min="0" max="255" value="128" class="slider">
                </div>
                <div id="colorCount-control" class="control-row">
                    <div class="control-row-flex"><label for="colorCount">Color Count</label><span id="colorCountValue">8</span></div>
                    <input type="range" id="colorCount" name="colorCount" min="2" max="32" value="8" class="slider">
                </div>
            </div>
        </div>`,
    init(app) {
        document.getElementById('dithering-pattern-selector').addEventListener('click', (e) => {
            if (e.target.tagName === 'BUTTON') {
                const currentActive = document.querySelector('#dithering-pattern-selector .active');
                if (currentActive) {
                    currentActive.classList.remove('active');
                }
                e.target.classList.add('active');
                
                app.updateState({ ditheringPattern: e.target.dataset.pattern });
            }
        });
        
        // Listener to toggle control visibility based on color mode
        const colorModeCheckbox = document.getElementById('colorMode');
        const thresholdControl = document.getElementById('threshold-control');
        const colorCountControl = document.getElementById('colorCount-control');

        const toggleControls = () => {
            thresholdControl.classList.toggle('visible', !colorModeCheckbox.checked);
            colorCountControl.classList.toggle('visible', colorModeCheckbox.checked);
        };
        
        colorModeCheckbox.addEventListener('change', (e) => {
            app.updateState({ isColorMode: e.target.checked });
            toggleControls();
        });

        toggleControls();
    },
    apply(imageData, state) {
        const { pixelSize, isColorMode, ditheringPattern, threshold, colorCount } = state;
        const width = imageData.width;
        const height = imageData.height;
        const data = imageData.data;
        const gridW = Math.floor(width / pixelSize);
        const gridH = Math.floor(height / pixelSize);
        const pixelGrid = new Array(gridW * gridH);
        
        // Helper functions
        const colorDist = (c1, c2) => Math.pow((c1.r - c2.r) * 0.299, 2) + Math.pow((c1.g - c2.g) * 0.587, 2) + Math.pow((c1.b - c2.b) * 0.114, 2);
        
        const findNearestColor = (pixel, palette) => {
            let nearest = palette[0];
            let minDist = Infinity;
            for (const color of palette) {
                const dist = colorDist(pixel, color);
                if (dist < minDist) {
                    minDist = dist;
                    nearest = color;
                }
            }
            return nearest;
        };
        
        const generateColorPalette = (count) => {
            let palette = [{r: 0, g: 0, b: 0}, {r: 255, g: 255, b: 255}];
            if (count <= 2) return palette;
            const points = Math.ceil(Math.pow(count - 2, 1 / 3));
            const step = 255 / (points > 1 ? points - 1 : 1);
            for (let r = 0; r < points; r++) {
                for (let g = 0; g < points; g++) {
                    for (let b = 0; b < points; b++) {
                        if (palette.length < count) {
                             const newColor = { r: Math.round(r * step), g: Math.round(g * step), b: Math.round(b * step) };
                             if (!palette.some(c => c.r === newColor.r && c.g === newColor.g && c.b === newColor.b)) {
                                palette.push(newColor);
                             }
                        }
                    }
                }
            }
            return palette;
        };

        // 1. Downsample
        for (let y = 0; y < gridH; y++) {
            for (let x = 0; x < gridW; x++) {
                let r = 0, g = 0, b = 0, count = 0;
                for (let py = 0; py < pixelSize; py++) {
                    for (let px = 0; px < pixelSize; px++) {
                        const ix = x * pixelSize + px;
                        const iy = y * pixelSize + py;
                        if (ix < width && iy < height) {
                            const i = (iy * width + ix) * 4;
                            r += data[i]; g += data[i+1]; b += data[i+2];
                            count++;
                        }
                    }
                }
                if (count > 0) {
                    if (isColorMode) {
                        pixelGrid[y * gridW + x] = { r: r / count, g: g / count, b: b / count };
                    } else {
                        const avg = (r / count * 0.299) + (g / count * 0.587) + (b / count * 0.114);
                        pixelGrid[y * gridW + x] = avg;
                    }
                }
            }
        }

        const colorPalette = isColorMode ? generateColorPalette(colorCount) : [];

        // 2. Aplicar padrões de dithering
        if (ditheringPattern === 'F-S') {
            // Floyd-Steinberg: propaga o erro para os pixels vizinhos.
            for (let y = 0; y < gridH; y++) {
                for (let x = 0; x < gridW; x++) {
                    const i = y * gridW + x;
                    const oldPixel = pixelGrid[i];
                    const newPixel = isColorMode ? findNearestColor(oldPixel, colorPalette) : (oldPixel < threshold ? 0 : 255);
                    pixelGrid[i] = newPixel;
                    
                    const errR = isColorMode ? oldPixel.r - newPixel.r : oldPixel - newPixel;
                    const errG = isColorMode ? oldPixel.g - newPixel.g : errR;
                    const errB = isColorMode ? oldPixel.b - newPixel.b : errR;

                    const setError = (dx, dy, factor) => {
                        const ni = (y + dy) * gridW + (x + dx);
                        if (x + dx >= 0 && x + dx < gridW && y + dy >= 0 && y + dy < gridH) {
                            if (isColorMode) {
                                pixelGrid[ni].r += errR * factor;
                                pixelGrid[ni].g += errG * factor;
                                pixelGrid[ni].b += errB * factor;
                            } else {
                                pixelGrid[ni] += errR * factor;
                            }
                        }
                    };
                    setError(1, 0, 7 / 16);
                    setError(-1, 1, 3 / 16);
                    setError(0, 1, 5 / 16);
                    setError(1, 1, 1 / 16);
                }
            }
        } else { 
            const bayerMatrix = [
                [0, 8, 2, 10], [12, 4, 14, 6],
                [3, 11, 1, 9], [15, 7, 13, 5]
            ];
            const bayerSize = 4;

            for (let y = 0; y < gridH; y++) {
                for (let x = 0; x < gridW; x++) {
                    const i = y * gridW + x;
                    const oldPixel = pixelGrid[i];

                    if (isColorMode) {
                        let ditheredPixel = { r: oldPixel.r, g: oldPixel.g, b: oldPixel.b };
                        let adjustment = 0;
                        if (ditheringPattern === 'Bayer') {
                            adjustment = (bayerMatrix[y % bayerSize][x % bayerSize] / 16.0 - 0.5) * (255.0 / colorCount);
                        } else if (ditheringPattern === 'Random') {
                            adjustment = (Math.random() - 0.5) * (255.0 / colorCount);
                        }
                        ditheredPixel.r += adjustment;
                        ditheredPixel.g += adjustment;
                        ditheredPixel.b += adjustment;
                        pixelGrid[i] = findNearestColor(ditheredPixel, colorPalette);
                    } else { // Monochrome
                        let ditherThreshold;
                        if (ditheringPattern === 'Bayer') {
                            ditherThreshold = (bayerMatrix[y % bayerSize][x % bayerSize] / 16.0) * 255.0;
                        } else { // Random
                            ditherThreshold = Math.random() * 255.0;
                        }
                        pixelGrid[i] = oldPixel > ditherThreshold ? 255 : 0;
                    }
                }
            }
        }
        
        // 3. Desenhar o resultado no imageData final
        const pixels = imageData.data;
        for (let y = 0; y < gridH; y++) {
            for (let x = 0; x < gridW; x++) {
                const val = pixelGrid[y * gridW + x];
                const color = isColorMode ? val : { r: val, g: val, b: val };
                for (let py = 0; py < pixelSize; py++) {
                    for (let px = 0; px < pixelSize; px++) {
                        const ix = x * pixelSize + px;
                        const iy = y * pixelSize + py;
                        if (ix < width && iy < height) {
                            const i = (iy * width + ix) * 4;
                            pixels[i] = color.r;
                            pixels[i+1] = color.g;
                            pixels[i+2] = color.b;
                        }
                    }
                }
            }
        }
    }
};
