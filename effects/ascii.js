/**
 * effects/ascii.js
 * * Contém a lógica para o efeito de Arte ASCII.
 * Utiliza um mapeamento de brilho para uma rampa de caracteres detalhada
 * e pode colorir cada caractere com base na cor da imagem original.
 */

export const asciiEffect = {
    name: 'ASCII',
    getControlsHTML: () => `
        <div class="control-panel">
            <h3 class="panel-title">--Effect Controls--</h3>
            <div class="controls-section">
                <div>
                    <div class="control-row-flex"><label for="asciiResolution">Resolution</label><span id="asciiResolutionValue">8</span></div>
                    <input type="range" id="asciiResolution" name="asciiResolution" min="4" max="32" value="8" step="1" class="slider">
                </div>
                <div>
                    <label>Font Style</label>
                    <div id="ascii-font-selector" class="pattern-selector">
                        <button class="pattern-btn active" data-font="mono">Mono</button>
                        <button class="pattern-btn" data-font="retro">Retro</button>
                    </div>
                </div>
                <div class="control-row-flex">
                    <label for="asciiIsColor">Enable Color</label>
                    <label class="switch"><input type="checkbox" id="asciiIsColor" name="asciiIsColor" checked><span class="switch-slider"></span></label>
                </div>
                <div>
                    <div class="control-row-flex"><label for="asciiColorBoost">Color Boost</label><span id="asciiColorBoostValue">1.5</span></div>
                    <input type="range" id="asciiColorBoost" name="asciiColorBoost" min="0.5" max="5" value="1.5" step="0.1" class="slider">
                </div>
                 <div class="control-row-flex">
                    <label for="asciiInvert">Invert Image</label>
                    <label class="switch"><input type="checkbox" id="asciiInvert" name="asciiInvert"><span class="switch-slider"></span></label>
                </div>
            </div>
        </div>`,
    init(app) {
        // Adiciona o listener para o seletor de fonte
        document.getElementById('ascii-font-selector').addEventListener('click', (e) => {
            if (e.target.tagName === 'BUTTON') {
                const currentActive = document.querySelector('#ascii-font-selector .active');
                if (currentActive) {
                    currentActive.classList.remove('active');
                }
                e.target.classList.add('active');
                app.updateState({ asciiFont: e.target.dataset.font });
            }
        });
    },
    apply(imageData, state) {
        // Cria um canvas temporário para desenhar o efeito
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = imageData.width;
        tempCanvas.height = imageData.height;
        const ctx = tempCanvas.getContext('2d');

        const { width, height } = imageData;
        const { asciiResolution, asciiInvert, asciiIsColor, asciiColorBoost, asciiFont } = state;

        // Rampa de caracteres para preenchimento.
        const charRamp = ".:coPO?@▉";
        const rampLength = charRamp.length;

        // 1. Renderiza no canvas temporário
        const bgColor = '#1a1a1a';
        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, width, height);
        
        const fontName = asciiFont === 'retro' ? "'VT323', monospace" : "'Courier New', monospace";
        ctx.font = `${asciiResolution * 1.5}px ${fontName}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        const cellW = asciiResolution;
        const cellH = asciiResolution;

        for (let y = 0; y < height; y += cellH) {
            for (let x = 0; x < width; x += cellW) {
                let totalR = 0, totalG = 0, totalB = 0, totalBrightness = 0;
                let count = 0;

                // Calcula a média de cor e brilho dentro da célula
                for (let blockY = 0; blockY < cellH; blockY++) {
                    for (let blockX = 0; blockX < cellW; blockX++) {
                        const ix = x + blockX;
                        const iy = y + blockY;
                        if (ix < width && iy < height) {
                            const index = (iy * width + ix) * 4;
                            const r = imageData.data[index];
                            const g = imageData.data[index + 1];
                            const b = imageData.data[index + 2];
                            
                            totalR += r;
                            totalG += g;
                            totalB += b;
                            totalBrightness += (0.2126 * r + 0.7152 * g + 0.0722 * b);
                            count++;
                        }
                    }
                }
                
                if (count === 0) continue;

                const avgR = totalR / count;
                const avgG = totalG / count;
                const avgB = totalB / count;
                let avgBrightness = totalBrightness / count;
                
                if (asciiInvert) {
                    avgBrightness = 255 - avgBrightness;
                }
                
                const rampIndex = Math.floor((avgBrightness / 255) * (rampLength - 1));
                const char = charRamp[rampIndex];
                
                if (asciiIsColor) {
                    const luma = 0.2126 * avgR + 0.7152 * avgG + 0.0722 * avgB;
                    const boostedR = Math.max(0, Math.min(255, luma + (avgR - luma) * asciiColorBoost));
                    const boostedG = Math.max(0, Math.min(255, luma + (avgG - luma) * asciiColorBoost));
                    const boostedB = Math.max(0, Math.min(255, luma + (avgB - luma) * asciiColorBoost));
                    ctx.fillStyle = `rgb(${boostedR}, ${boostedG}, ${boostedB})`;
                } else {
                    ctx.fillStyle = '#00ff41';
                }
                
                const posX = x + cellW / 2;
                const posY = y + cellH / 2;
                ctx.fillText(char, posX, posY);
            }
        }
        
        // 2. Copia o resultado do canvas temporário para o imageData principal
        const finalImageData = ctx.getImageData(0, 0, width, height);
        imageData.data.set(finalImageData.data);
    }
};
