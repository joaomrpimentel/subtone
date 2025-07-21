/**
 * effects/halftone.js
 * * Contém a lógica para o efeito Halftone (Retícula).
 * Transforma a imagem em uma grade de círculos, onde a cor de cada
 * círculo é a média da área correspondente na imagem original.
 */

export const halftoneEffect = {
    name: 'HALFTONE',
    getControlsHTML: () => `
        <div class="control-panel">
            <h3 class="panel-title">--Effect Controls--</h3>
            <div class="controls-section">
                <div>
                    <div class="control-row-flex"><label for="halftoneGridSize">Grid Size</label><span id="halftoneGridSizeValue">10</span></div>
                    <input type="range" id="halftoneGridSize" name="halftoneGridSize" min="2" max="50" value="10" step="1" class="slider">
                </div>
                <div>
                    <div class="control-row-flex"><label for="halftoneDotScale">Dot Scale</label><span id="halftoneDotScaleValue">1</span></div>
                    <input type="range" id="halftoneDotScale" name="halftoneDotScale" min="0.1" max="2" value="1" step="0.05" class="slider">
                </div>
                <div class="control-row-flex">
                    <label for="halftoneGrayscale">Grayscale</label>
                    <label class="switch"><input type="checkbox" id="halftoneGrayscale"><span class="switch-slider"></span></label>
                </div>
                <div class="control-row-flex">
                    <label for="halftoneIsBgBlack">Black Background</label>
                    <label class="switch"><input type="checkbox" id="halftoneIsBgBlack"><span class="switch-slider"></span></label>
                </div>
            </div>
        </div>`,

    init(app) {
    },

    apply(imageData, state) {
        const { halftoneGridSize, halftoneDotScale, halftoneGrayscale, halftoneIsBgBlack } = state;
        const width = imageData.width;
        const height = imageData.height;
        const sourceData = new Uint8ClampedArray(imageData.data);
        const outputData = imageData.data;

        const bgColor = halftoneIsBgBlack ? 0 : 255;
        outputData.fill(bgColor);

        const radius = (halftoneGridSize / 2) * halftoneDotScale;
        const radiusSq = radius * radius;

        for (let y = 0; y < height; y += halftoneGridSize) {
            for (let x = 0; x < width; x += halftoneGridSize) {
                
                // 1. Calcula a cor média do bloco
                let totalR = 0, totalG = 0, totalB = 0, count = 0;
                for (let blockY = 0; blockY < halftoneGridSize; blockY++) {
                    for (let blockX = 0; blockX < halftoneGridSize; blockX++) {
                        const currentY = y + blockY;
                        const currentX = x + blockX;
                        if (currentX < width && currentY < height) {
                            const i = (currentY * width + currentX) * 4;
                            totalR += sourceData[i];
                            totalG += sourceData[i + 1];
                            totalB += sourceData[i + 2];
                            count++;
                        }
                    }
                }

                if (count === 0) continue;

                let avgR = totalR / count;
                let avgG = totalG / count;
                let avgB = totalB / count;

                if (halftoneGrayscale) {
                    const gray = avgR * 0.299 + avgG * 0.587 + avgB * 0.114;
                    avgR = avgG = avgB = gray;
                }

                // 2. Desenha o círculo no buffer de saída
                const centerX = halftoneGridSize / 2;
                const centerY = halftoneGridSize / 2;

                for (let blockY = 0; blockY < halftoneGridSize; blockY++) {
                    for (let blockX = 0; blockX < halftoneGridSize; blockX++) {
                        const currentY = y + blockY;
                        const currentX = x + blockX;

                        if (currentX < width && currentY < height) {
                            const dx = blockX - centerX;
                            const dy = blockY - centerY;
                            
                            // Verifica se o pixel está dentro do círculo
                            if (dx * dx + dy * dy <= radiusSq) {
                                const i = (currentY * width + currentX) * 4;
                                outputData[i] = avgR;
                                outputData[i + 1] = avgG;
                                outputData[i + 2] = avgB;
                                outputData[i + 3] = 255;
                            }
                        }
                    }
                }
            }
        }
    }
};
