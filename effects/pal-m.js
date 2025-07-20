/**
 * effects/pal-m.js
 * * Contém a lógica para o efeito de simulação do sistema de TV PAL-M.
 * Simula artefatos como color bleed, scanlines e ruído de sinal.
 */

export const palMEffect = {
    name: 'PAL-M',
    getControlsHTML: () => `
        <div class="control-panel">
            <h3 class="panel-title">--Effect Controls--</h3>
            <div class="controls-section">
                <div>
                    <div class="control-row-flex"><label for="palamBleed">Color Bleed</label><span id="palamBleedValue">8</span></div>
                    <input type="range" id="palamBleed" name="palamBleed" min="0" max="40" value="8" step="1" class="slider">
                </div>
                <div>
                    <div class="control-row-flex"><label for="palamScanlines">Scanline Intensity</label><span id="palamScanlinesValue">0.3</span></div>
                    <input type="range" id="palamScanlines" name="palamScanlines" min="0" max="1" value="0.3" step="0.05" class="slider">
                </div>
                <div>
                    <div class="control-row-flex"><label for="palamScanlineGap">Scanline Gap</label><span id="palamScanlineGapValue">2</span></div>
                    <input type="range" id="palamScanlineGap" name="palamScanlineGap" min="2" max="16" value="2" step="1" class="slider">
                </div>
                <div>
                    <div class="control-row-flex"><label for="palamNoise">Signal Noise</label><span id="palamNoiseValue">0.15</span></div>
                    <input type="range" id="palamNoise" name="palamNoise" min="0" max="1" value="0.15" step="0.01" class="slider">
                </div>
                <div>
                    <div class="control-row-flex"><label for="palamFringing">Fringing</label><span id="palamFringingValue">2.0</span></div>
                    <input type="range" id="palamFringing" name="palamFringing" min="0" max="20" value="2.0" step="0.1" class="slider">
                </div>
                <div>
                    <div class="control-row-flex"><label for="palamSaturation">Saturation</label><span id="palamSaturationValue">1.0</span></div>
                    <input type="range" id="palamSaturation" name="palamSaturation" min="0" max="3" value="1.0" step="0.1" class="slider">
                </div>
                <div>
                    <div class="control-row-flex"><label for="palamPhaseShift">Phase Shift</label><span id="palamPhaseShiftValue">2</span></div>
                    <input type="range" id="palamPhaseShift" name="palamPhaseShift" min="0" max="10" value="2" step="0.1" class="slider">
                </div>
            </div>
        </div>`,
    init(app) {
        // O event listener principal no main.js já cuida dos sliders.
    },

    apply(imageData, state) {
        const { palamBleed, palamScanlines, palamScanlineGap, palamNoise, palamFringing, palamSaturation, palamPhaseShift } = state;
        const width = imageData.width;
        const height = imageData.height;
        const data = imageData.data;
        const sourceData = new Uint8ClampedArray(data);

        // Funções de conversão de espaço de cor
        const rgbToYiq = (r, g, b) => {
            const y = r * 0.299 + g * 0.587 + b * 0.114;
            const i = r * 0.596 - g * 0.274 - b * 0.322;
            const q = r * 0.211 - g * 0.523 + b * 0.312;
            return { y, i, q };
        };

        const yiqToRgb = (y, i, q) => {
            let r = y + i * 0.956 + q * 0.621;
            let g = y - i * 0.272 - q * 0.647;
            let b = y - i * 1.106 + q * 1.703;
            r = Math.max(0, Math.min(255, r));
            g = Math.max(0, Math.min(255, g));
            b = Math.max(0, Math.min(255, b));
            return { r, g, b };
        };
        
        // 1. Criar um buffer YIQ
        const yiqBuffer = new Array(width * height);
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const idx = (y * width + x) * 4;
                yiqBuffer[y * width + x] = rgbToYiq(sourceData[idx], sourceData[idx + 1], sourceData[idx + 2]);
            }
        }
        
        // Aplicar o blur horizontal (Color Bleed) apenas nos canais I e Q
        if (palamBleed > 0) {
            const bleed = Math.round(palamBleed);
            for (let y = 0; y < height; y++) {
                for (let x = 0; x < width; x++) {
                    let avgI = 0;
                    let avgQ = 0;
                    let count = 0;
                    for (let bleedX = -bleed; bleedX <= bleed; bleedX++) {
                        const sampleX = x + bleedX;
                        if (sampleX >= 0 && sampleX < width) {
                            const sampleIdx = y * width + sampleX;
                            avgI += yiqBuffer[sampleIdx].i;
                            avgQ += yiqBuffer[sampleIdx].q;
                            count++;
                        }
                    }
                    if (count > 0) {
                        const currentIdx = y * width + x;
                        yiqBuffer[currentIdx].i = avgI / count;
                        yiqBuffer[currentIdx].q = avgQ / count;
                    }
                }
            }
        }


        // 2. Aplicar os outros efeitos e converter de volta para RGB
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const idx = (y * width + x) * 4;
                
                // Aplicar Phase Shift (ondulação horizontal)
                const phaseOffset = Math.sin(y * 0.2 + palamPhaseShift) * palamPhaseShift;
                const phaseX = Math.round(x + phaseOffset);

                if (phaseX < 0 || phaseX >= width) continue;

                const yiq = yiqBuffer[y * width + phaseX];

                // Aplicar Fringing (deslocamento de croma)
                const fringeOffset = Math.round(palamFringing);
                const fringeX = Math.max(0, phaseX - fringeOffset);
                const fringeI = yiqBuffer[y * width + fringeX].i;
                const fringeQ = yiqBuffer[y * width + fringeX].q;

                // Aplicar Scanlines e Ruído no Luma (Y)
                let luma = yiq.y;
                if (y % palamScanlineGap !== 0) {
                    luma *= (1.0 - palamScanlines);
                }
                luma += (Math.random() - 0.5) * palamNoise * 255;

                // Aplicar Saturação e converter para RGB
                const rgb = yiqToRgb(luma, fringeI * palamSaturation, fringeQ * palamSaturation);

                data[idx] = rgb.r;
                data[idx + 1] = rgb.g;
                data[idx + 2] = rgb.b;
            }
        }
    }
};
