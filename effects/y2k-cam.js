/**
 * effects/y2k-cam.js
 * * Contém a lógica para o efeito de câmera digital dos anos 2000.
 * Simula características como bloom, saturação elevada e aberração cromática.
 */

// Função auxiliar para aplicar um blur rápido (Box Blur)
const boxBlur = (data, width, height, radius) => {
    const sourceData = new Uint8ClampedArray(data);
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            let r = 0, g = 0, b = 0, count = 0;
            for (let ky = -radius; ky <= radius; ky++) {
                for (let kx = -radius; kx <= radius; kx++) {
                    const sy = y + ky;
                    const sx = x + kx;
                    if (sx >= 0 && sx < width && sy >= 0 && sy < height) {
                        const sIdx = (sy * width + sx) * 4;
                        r += sourceData[sIdx];
                        g += sourceData[sIdx + 1];
                        b += sourceData[sIdx + 2];
                        count++;
                    }
                }
            }
            const dIdx = (y * width + x) * 4;
            if (count > 0) {
                data[dIdx] = r / count;
                data[dIdx + 1] = g / count;
                data[dIdx + 2] = b / count;
            }
        }
    }
};


export const y2kCamEffect = {
    name: 'Y2K CAM',
    getControlsHTML: () => `
        <div class="control-panel">
            <h3 class="panel-title">--Effect Controls--</h3>
            <div class="controls-section">
                <div>
                    <div class="control-row-flex"><label for="y2kBloom">Bloom</label><span id="y2kBloomValue">0.4</span></div>
                    <input type="range" id="y2kBloom" name="y2kBloom" min="0" max="1" value="0.4" step="0.05" class="slider">
                </div>
                <div>
                    <div class="control-row-flex"><label for="y2kAberration">Aberration</label><span id="y2kAberrationValue">3</span></div>
                    <input type="range" id="y2kAberration" name="y2kAberration" min="0" max="20" value="3" step="1" class="slider">
                </div>
                <div>
                    <div class="control-row-flex"><label for="y2kSaturation">Saturation</label><span id="y2kSaturationValue">1.2</span></div>
                    <input type="range" id="y2kSaturation" name="y2kSaturation" min="0" max="2.5" value="1.2" step="0.05" class="slider">
                </div>
                <div>
                    <div class="control-row-flex"><label for="y2kVignette">Vignette</label><span id="y2kVignetteValue">0.3</span></div>
                    <input type="range" id="y2kVignette" name="y2kVignette" min="0" max="1" value="0.3" step="0.05" class="slider">
                </div>
                 <div class="control-row-flex">
                    <label for="y2kTimestamp">Show Timestamp</label>
                    <label class="switch"><input type="checkbox" id="y2kTimestamp" name="y2kTimestamp" checked><span class="switch-slider"></span></label>
                </div>
            </div>
        </div>`,
    init(app) {
    },
    apply(imageData, state) {
        const { y2kBloom, y2kAberration, y2kSaturation, y2kVignette } = state;
        const width = imageData.width;
        const height = imageData.height;
        const data = imageData.data;
        const sourceData = new Uint8ClampedArray(data);

        // 1. Criar uma cópia para o bloom
        const bloomData = new Uint8ClampedArray(sourceData);

        // Extrair áreas de brilho para o bloom
        for (let i = 0; i < bloomData.length; i += 4) {
            const brightness = (bloomData[i] * 0.299 + bloomData[i + 1] * 0.587 + bloomData[i + 2] * 0.114) / 255;
            if (brightness < 0.7) { // Limiar de brilho
                bloomData[i] = bloomData[i + 1] = bloomData[i + 2] = 0;
            }
        }

        // Aplicar blur na imagem de bloom
        if (y2kBloom > 0) {
            boxBlur(bloomData, width, height, 5);
        }

        const halfW = width / 2;
        const halfH = height / 2;
        const maxDist = Math.sqrt(halfW * halfW + halfH * halfH);

        // 2. Aplicar os outros efeitos
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const idx = (y * width + x) * 4;

                // Aberração Cromática
                const rIdx = (y * width + Math.max(0, x - Math.round(y2kAberration))) * 4;
                const bIdx = (y * width + Math.min(width - 1, x + Math.round(y2kAberration))) * 4;
                let r = sourceData[rIdx];
                let g = sourceData[idx + 1];
                let b = sourceData[bIdx + 2];

                // Saturação
                if (y2kSaturation !== 1) {
                    const gray = r * 0.299 + g * 0.587 + b * 0.114;
                    r = Math.max(0, Math.min(255, gray + (r - gray) * y2kSaturation));
                    g = Math.max(0, Math.min(255, gray + (g - gray) * y2kSaturation));
                    b = Math.max(0, Math.min(255, gray + (b - gray) * y2kSaturation));
                }
                
                // Adicionar o Bloom (mistura aditiva)
                if (y2kBloom > 0) {
                    r = Math.min(255, r + bloomData[idx] * y2kBloom);
                    g = Math.min(255, g + bloomData[idx + 1] * y2kBloom);
                    b = Math.min(255, b + bloomData[idx + 2] * y2kBloom);
                }

                // Vignette
                const dx = x - halfW;
                const dy = y - halfH;
                const dist = Math.sqrt(dx * dx + dy * dy);
                const vignetteFactor = 1 - (dist / maxDist) * y2kVignette;
                
                data[idx] = r * vignetteFactor;
                data[idx + 1] = g * vignetteFactor;
                data[idx + 2] = b * vignetteFactor;
            }
        }
    }
};
