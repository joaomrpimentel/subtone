// ===================================================================================
// E F F E C T S   L I B R A R Y
// Central de todos os efeitos de imagem.
// ===================================================================================

const EFFECTS_LIBRARY = {
    dithering: {
        name: 'DITHERING',
        getControlsHTML: () => `
            <div class="control-panel">
                <h3 class="mb-4 text-xl">--Effect Controls--</h3>
                <div class="space-y-4">
                    <div>
                        <label>Pattern</label>
                        <div id="dithering-pattern-selector" class="flex gap-2 mt-1">
                            <button class="pattern-btn active" data-pattern="F-S">F-S</button>
                            <button class="pattern-btn" data-pattern="Bayer">Bayer</button>
                            <button class="pattern-btn" data-pattern="Random">Random</button>
                        </div>
                    </div>
                    <div class="flex justify-between items-center"><label for="pixelSize">Pixel Size</label><span id="pixelSizeValue">1</span></div>
                    <input type="range" id="pixelSize" name="pixelSize" min="1" max="20" value="1" class="slider">
                    <div class="flex justify-between items-center"><label for="colorMode">Color Mode</label><label class="switch"><input type="checkbox" id="colorMode"><span class="switch-slider"></span></label></div>
                    <div id="threshold-control" class="control-row visible">
                        <div class="flex justify-between items-center"><label for="threshold">Threshold</label><span id="thresholdValue">128</span></div>
                        <input type="range" id="threshold" name="threshold" min="0" max="255" value="128" class="slider">
                    </div>
                    <div id="colorCount-control" class="control-row">
                        <div class="flex justify-between items-center"><label for="colorCount">Color Count</label><span id="colorCountValue">8</span></div>
                        <input type="range" id="colorCount" name="colorCount" min="2" max="32" value="8" class="slider">
                    </div>
                </div>
            </div>
        `,
        init(app) {
            document.getElementById('dithering-pattern-selector').addEventListener('click', (e) => {
                if (e.target.tagName === 'BUTTON') {
                    document.querySelector('#dithering-pattern-selector .active').classList.remove('active');
                    e.target.classList.add('active');
                    app.updateState({ ditheringPattern: e.target.dataset.pattern });
                }
            });
            document.getElementById('colorMode').addEventListener('change', (e) => {
                document.getElementById('threshold-control').classList.toggle('visible', !e.target.checked);
                document.getElementById('colorCount-control').classList.toggle('visible', e.target.checked);
                app.updateState({ isColorMode: e.target.checked });
            });
        },
        apply(imageData, state) {
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
                const step = 255 / (points - 1);
                for (let r = 0; r < points; r++) for (let g = 0; g < points; g++) for (let b = 0; b < points; b++) {
                    if (palette.length < count && !(r === 0 && g === 0 && b === 0) && !(r === points - 1 && g === points - 1 && b === points - 1)) {
                        palette.push({ r: Math.round(r * step), g: Math.round(g * step), b: Math.round(b * step) });
                    }
                }
                return palette;
            };

            const { pixelSize, isColorMode, ditheringPattern, threshold, colorCount } = state;
            const width = imageData.width;
            const height = imageData.height;
            const gridW = Math.floor(width / pixelSize);
            const gridH = Math.floor(height / pixelSize);
            const pixelGrid = new Array(gridW * gridH);

            for (let y = 0; y < gridH; y++) {
                for (let x = 0; x < gridW; x++) {
                    let r = 0, g = 0, b = 0, count = 0;
                    for (let py = 0; py < pixelSize; py++) {
                        for (let px = 0; px < pixelSize; px++) {
                            const ix = x * pixelSize + px;
                            const iy = y * pixelSize + py;
                            if (ix < width && iy < height) {
                                const i = (iy * width + ix) * 4;
                                r += imageData.data[i]; g += imageData.data[i+1]; b += imageData.data[i+2];
                                count++;
                            }
                        }
                    }
                    if (isColorMode) {
                        pixelGrid[y * gridW + x] = { r: r / count, g: g / count, b: b / count };
                    } else {
                        const avg = (r / count * 0.299) + (g / count * 0.587) + (b / count * 0.114);
                        pixelGrid[y * gridW + x] = avg;
                    }
                }
            }

            const colorPalette = isColorMode ? generateColorPalette(colorCount) : [];

            if (ditheringPattern === 'F-S') {
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
                                    pixelGrid[ni].r += errR * factor; pixelGrid[ni].g += errG * factor; pixelGrid[ni].b += errB * factor;
                                } else {
                                    pixelGrid[ni] += errR * factor;
                                }
                            }
                        };
                        setError(1, 0, 7 / 16); setError(-1, 1, 3 / 16); setError(0, 1, 5 / 16); setError(1, 1, 1 / 16);
                    }
                }
            }
            
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
                                pixels[i] = color.r; pixels[i+1] = color.g; pixels[i+2] = color.b;
                            }
                        }
                    }
                }
            }
        }
    },
};

// ===================================================================================
// A P P L I C A T I O N   C O R E
// Gerencia o estado, a UI e a pipeline de renderização.
// ===================================================================================
class ImageProcessorApp {
    constructor(effectsLibrary) {
        this.effectsLibrary = effectsLibrary;
        this.dom = {};
        this.originalImage = null;
        this.originalImageData = null;
        this.state = {
            activeEffect: 'dithering',
            blackPoint: 0, whitePoint: 255, grain: 0, gamma: 1,
            pixelSize: 1, isColorMode: false, ditheringPattern: 'F-S', threshold: 128, colorCount: 8,
        };
        this.init();
    }

    init() {
        this.queryDOMElements();
        this.setupEventListeners();
        this.setupCanvas();
        this.renderEffectSelector();
        this.renderEffectControls();
    }

    queryDOMElements() {
        this.dom.appContainer = document.getElementById('app-container');
        this.dom.canvas = document.getElementById('imageCanvas');
        this.dom.ctx = this.dom.canvas.getContext('2d', { willReadFrequently: true });
        this.dom.fileInput = document.getElementById('fileInput');
        this.dom.uploadButton = document.getElementById('uploadButton');
        this.dom.exportButton = document.getElementById('exportButton');
        this.dom.effectsMenu = document.getElementById('effects-menu');
        this.dom.effectControlsContainer = document.getElementById('effect-controls-container');
        // Mobile-specific elements
        this.dom.toggleControlsBtn = document.getElementById('toggle-controls-btn');
        this.dom.controlsOverlay = document.getElementById('controls-overlay');
    }

    setupEventListeners() {
        this.dom.uploadButton.addEventListener('click', () => this.dom.fileInput.click());
        this.dom.fileInput.addEventListener('change', (e) => this.loadImage(e.target.files[0]));
        
        // Listeners para os controles mobile
        this.dom.toggleControlsBtn.addEventListener('click', () => this.toggleControlsPanel());
        this.dom.controlsOverlay.addEventListener('click', () => this.toggleControlsPanel(false));

        window.addEventListener('resize', () => {
             this.setupCanvas();
             this.applyEffects();
        });

        const sliders = document.querySelectorAll('.slider');
        sliders.forEach(slider => {
            slider.addEventListener('input', (e) => {
                const { id, value } = e.target;
                document.getElementById(`${id}Value`).textContent = value;
                this.updateState({ [id]: parseFloat(value) });
            });
        });
    }

    toggleControlsPanel(forceOpen) {
        this.dom.appContainer.classList.toggle('controls-open', forceOpen);
    }

    updateState(newState) {
        Object.assign(this.state, newState);
        requestAnimationFrame(() => this.applyEffects());
    }

    setupCanvas() {
        const container = this.dom.canvas.parentElement;
        const size = Math.min(container.clientWidth, container.clientHeight);
        this.dom.canvas.width = size;
        this.dom.canvas.height = size;
        if (!this.originalImage) this.drawPlaceholder();
    }
    
    drawPlaceholder() {
        const { ctx, canvas } = this.dom;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = 'rgba(0, 255, 65, 0.8)';
        ctx.textAlign = 'center';
        ctx.font = "24px 'VT323', monospace";
        ctx.fillText('UPLOAD IMAGE', canvas.width / 2, canvas.height / 2);
    }

    loadImage(file) {
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            this.originalImage = new Image();
            this.originalImage.onload = () => {
                this.setupCanvas();
                const { canvas, ctx } = this.dom;
                const hRatio = canvas.width / this.originalImage.width;
                const vRatio = canvas.height / this.originalImage.height;
                const ratio = Math.min(hRatio, vRatio);
                const sx = (canvas.width - this.originalImage.width * ratio) / 2;
                const sy = (canvas.height - this.originalImage.height * ratio) / 2;
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(this.originalImage, 0, 0, this.originalImage.width, this.originalImage.height, sx, sy, this.originalImage.width * ratio, this.originalImage.height * ratio);
                this.originalImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                this.applyEffects();
            };
            this.originalImage.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    renderEffectSelector() {
        this.dom.effectsMenu.innerHTML = '';
        for (const effectId in this.effectsLibrary) {
            const effect = this.effectsLibrary[effectId];
            const item = document.createElement('div');
            item.className = 'effect-item';
            item.dataset.effect = effectId;
            item.innerHTML = `<span class="bracket">[*]</span> ${effect.name}`;
            if (effectId === this.state.activeEffect) {
                item.classList.add('active');
            }
            item.addEventListener('click', () => this.setActiveEffect(effectId));
            this.dom.effectsMenu.appendChild(item);
        }
    }

    renderEffectControls() {
        const effect = this.effectsLibrary[this.state.activeEffect];
        if (!effect) return;
        this.dom.effectControlsContainer.innerHTML = effect.getControlsHTML();
        if (effect.init) {
            effect.init(this);
        }
        this.dom.effectControlsContainer.querySelectorAll('.slider').forEach(slider => {
            const valueSpan = document.getElementById(`${slider.id}Value`);
            if (valueSpan) valueSpan.textContent = slider.value;
            slider.addEventListener('input', (e) => {
                const { id, value } = e.target;
                if (valueSpan) valueSpan.textContent = value;
                this.updateState({ [id]: parseFloat(value) });
            });
        });
    }

    setActiveEffect(effectId) {
        if (effectId === this.state.activeEffect) return;
        this.updateState({ activeEffect: effectId });
        this.renderEffectSelector();
        this.renderEffectControls();
    }

    applyEffects() {
        if (!this.originalImageData) return;
        const imageData = new ImageData(
            new Uint8ClampedArray(this.originalImageData.data),
            this.originalImageData.width,
            this.originalImageData.height
        );
        this.applyPreprocessing(imageData.data);
        const activeEffect = this.effectsLibrary[this.state.activeEffect];
        if (activeEffect && activeEffect.apply) {
            activeEffect.apply(imageData, this.state);
        }
        this.dom.ctx.clearRect(0, 0, this.dom.canvas.width, this.dom.canvas.height);
        this.dom.ctx.putImageData(imageData, 0, 0);
    }
    
    applyPreprocessing(pixels) {
        let { blackPoint, whitePoint, gamma, grain } = this.state;
        if (whitePoint <= blackPoint) { whitePoint = blackPoint + 1; }
        const range = whitePoint - blackPoint;
        for (let i = 0; i < pixels.length; i += 4) {
            for (let j = 0; j < 3; j++) {
                let val = pixels[i + j];
                val = (range > 0) ? (val - blackPoint) / range * 255 : (val < blackPoint ? 0 : 255);
                pixels[i + j] = Math.max(0, Math.min(255, val));
            }
            pixels[i]   = 255 * Math.pow(pixels[i] / 255, gamma);
            pixels[i+1] = 255 * Math.pow(pixels[i+1] / 255, gamma);
            pixels[i+2] = 255 * Math.pow(pixels[i+2] / 255, gamma);
            if (grain > 0) {
                const noise = (Math.random() - 0.5) * grain;
                pixels[i]   = Math.max(0, Math.min(255, pixels[i] + noise));
                pixels[i+1] = Math.max(0, Math.min(255, pixels[i+1] + noise));
                pixels[i+2] = Math.max(0, Math.min(255, pixels[i+2] + noise));
            }
        }
    }
}

window.addEventListener('DOMContentLoaded', () => {
    new ImageProcessorApp(EFFECTS_LIBRARY);
});
