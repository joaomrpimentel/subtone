/**
 * effects/crt.js
 * * Contém a lógica para o efeito de simulação de CRT.
 * Inclui distorção de lente, máscara de subpixels e aberração cromática.
 */

export const crtEffect = {
    name: 'CRT',
    getControlsHTML: () => `
        <div class="control-panel">
            <h3 class="panel-title">--Effect Controls--</h3>
            <div class="controls-section">
                <div>
                    <label>Pattern</label>
                    <div id="crt-pattern-selector" class="pattern-selector">
                        <button class="pattern-btn active" data-pattern="Monitor">Monitor</button>
                        <button class="pattern-btn" data-pattern="TV">TV</button>
                        <button class="pattern-btn" data-pattern="LCD">LCD</button>
                    </div>
                </div>
                <div>
                    <div class="control-row-flex"><label for="crtDistortion">Distortion</label><span id="crtDistortionValue">0.03</span></div>
                    <input type="range" id="crtDistortion" name="crtDistortion" min="0" max="0.1" value="0.03" step="0.005" class="slider">
                </div>
                <div>
                    <div class="control-row-flex"><label for="crtDotPitch">Dot Pitch</label><span id="crtDotPitchValue">4</span></div>
                    <input type="range" id="crtDotPitch" name="crtDotPitch" min="1" max="10" value="4" step="1" class="slider">
                </div>
                <div>
                    <div class="control-row-flex"><label for="crtDotScale">Dot Scale</label><span id="crtDotScaleValue">1</span></div>
                    <input type="range" id="crtDotScale" name="crtDotScale" min="0.5" max="1.5" value="1" step="0.05" class="slider">
                </div>
                <div>
                    <div class="control-row-flex"><label for="crtConvergence">Convergence</label><span id="crtConvergenceValue">1</span></div>
                    <input type="range" id="crtConvergence" name="crtConvergence" min="0" max="5" value="1" step="0.1" class="slider">
                </div>
            </div>
        </div>`,
    init(app) {
        document.getElementById('crt-pattern-selector').addEventListener('click', (e) => {
            if (e.target.tagName === 'BUTTON') {
                const currentActive = document.querySelector('#crt-pattern-selector .active');
                if (currentActive) {
                    currentActive.classList.remove('active');
                }
                e.target.classList.add('active');
                app.updateState({ crtPattern: e.target.dataset.pattern });
            }
        });
    },
    apply(imageData, state) {
        const { crtDistortion, crtDotPitch, crtDotScale, crtPattern, crtConvergence } = state;
        const width = imageData.width;
        const height = imageData.height;
        const data = imageData.data;
        const sourceData = new Uint8ClampedArray(data);

        const halfW = width / 2;
        const halfH = height / 2;

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const destIdx = (y * width + x) * 4;

                const normX = (x - halfW) / halfW;
                const normY = (y - halfH) / halfH;
                const r2 = normX * normX + normY * normY;
                const distortionFactor = 1.0 + crtDistortion * r2;
                
                const srcX_distorted = halfW + normX * distortionFactor * halfW;
                const srcY_distorted = halfH + normY * distortionFactor * halfH;

                const getPixelColor = (srcX, srcY, channel) => {
                    const sx = Math.round(srcX);
                    const sy = Math.round(srcY);

                    if (sx < 0 || sx >= width || sy < 0 || sy >= height) {
                        return 0;
                    }
                    const srcIdx = (sy * width + sx) * 4;
                    return sourceData[srcIdx + channel];
                };

                const r = getPixelColor(srcX_distorted - crtConvergence, srcY_distorted, 0);
                const g = getPixelColor(srcX_distorted, srcY_distorted, 1);
                const b = getPixelColor(srcX_distorted + crtConvergence, srcY_distorted, 2);

                let maskR = 1.0, maskG = 1.0, maskB = 1.0;

                if (crtPattern === 'LCD') {
                    const col = x % 3;
                    maskR = (col === 0) ? 1.0 : 0.0;
                    maskG = (col === 1) ? 1.0 : 0.0;
                    maskB = (col === 2) ? 1.0 : 0.0;
                } else if (crtPattern === 'Monitor' || crtPattern === 'TV') {
                    const yOffset = (crtPattern === 'TV' && (Math.floor(x / 3) % 2) !== 0) ? 1.5 : 0;
                    const row = Math.floor(y + yOffset) % 3;
                    maskR = (row === 0) ? 1.0 : 0.0;
                    maskG = (row === 1) ? 1.0 : 0.0;
                    maskB = (row === 2) ? 1.0 : 0.0;
                }

                const gridX = x % crtDotPitch;
                const gridY = y % crtDotPitch;
                const halfPitch = crtDotPitch / 2;

                const distFromCenterX = Math.abs(gridX - halfPitch);
                const distFromCenterY = Math.abs(gridY - halfPitch);
                
                const litArea = halfPitch * crtDotScale;

                if (distFromCenterX > litArea || distFromCenterY > litArea) {
                    maskR = 0;
                    maskG = 0;
                    maskB = 0;
                }
                data[destIdx] = r * maskR;
                data[destIdx + 1] = g * maskG;
                data[destIdx + 2] = b * maskB;
                data[destIdx + 3] = 255; // Alpha
            }
        }
    }
};
