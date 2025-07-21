// Importa os efeitos da biblioteca
import { ditheringEffect } from './effects/dithering.js';
import { crtEffect } from './effects/crt.js';
import { halftoneEffect } from './effects/halftone.js';
import { palMEffect } from './effects/pal-m.js';

// ===================================================================================
// E F F E C T S   L I B R A R Y
// ===================================================================================
const EFFECTS_LIBRARY = {
    dithering: ditheringEffect,
    crt: crtEffect,
    halftone: halftoneEffect,
    "pal-m": palMEffect,
};

// ===================================================================================
// A P P L I C A T I O N   C O R E
// ===================================================================================
class ImageProcessorApp {
    constructor(effectsLibrary) {
        this.effectsLibrary = effectsLibrary;
        this.dom = {};
        this.originalImage = null;
        this.originalImageData = null;
        
        this.state = {
            activeEffect: 'dithering',
            preprocessing: {
                blackPoint: 0,
                whitePoint: 255,
                gamma: 1,
                grain: 0,
            },
            effects: {
                dithering: {
                    pixelSize: 1, isColorMode: false, ditheringPattern: 'F-S', threshold: 128, colorCount: 8,
                },
                crt: {
                    crtDistortion: 0.03, crtDotPitch: 4, crtDotScale: 1, crtPattern: 'Monitor', crtConvergence: 1,
                },
                halftone: {
                    halftoneGridSize: 10, halftoneDotScale: 1, halftoneGrayscale: false, halftoneIsBgBlack: true,
                },
                "pal-m": {
                    palamBleed: 8, palamScanlines: 0.3, palamScanlineGap: 2, palamNoise: 0.15, palamFringing: 2.0, palamSaturation: 1.0, palamPhaseShift: 2,
                }
            }
        };
        this.init();
    }

    init() {
        this.queryDOMElements();
        this.setupEventListeners();
        this.renderEffectSelector();
        this.setActiveEffect('dithering', true);
    }

    queryDOMElements() {
        this.dom.canvas = document.getElementById('imageCanvas');
        this.dom.ctx = this.dom.canvas.getContext('2d', { willReadFrequently: true });
        this.dom.fileInput = document.getElementById('fileInput');
        this.dom.uploadButton = document.getElementById('uploadButton');
        this.dom.exportButton = document.getElementById('exportButton');
        this.dom.effectsMenu = document.getElementById('effects-menu');
        this.dom.effectControlsContainer = document.getElementById('effect-controls-container');
        this.dom.toggleControlsBtn = document.getElementById('toggle-controls-btn');
        this.dom.closeControlsBtn = document.getElementById('close-controls-btn');
        this.dom.controlsOverlay = document.getElementById('controls-overlay');
        this.dom.controlsColumn = document.getElementById('controls-column');
        this.dom.controlsMain = document.getElementById('controls-main');
        this.dom.uploadPlaceholder = document.getElementById('upload-placeholder');
    }

    setupEventListeners() {
        // Eventos de clique
        this.dom.uploadButton.addEventListener('click', () => this.dom.fileInput.click());
        this.dom.uploadPlaceholder.addEventListener('click', () => this.dom.fileInput.click());
        this.dom.fileInput.addEventListener('change', (e) => this.loadImage(e.target.files[0]));
        this.dom.exportButton.addEventListener('click', () => this.exportImage());
        this.dom.toggleControlsBtn.addEventListener('click', () => this.toggleControlsPanel(true));
        this.dom.closeControlsBtn.addEventListener('click', () => this.toggleControlsPanel(false));
        this.dom.controlsOverlay.addEventListener('click', () => this.toggleControlsPanel(false));

        // Eventos de Drag and Drop
        const placeholder = this.dom.uploadPlaceholder;
        placeholder.addEventListener('dragover', (e) => {
            e.preventDefault();
            placeholder.classList.add('drag-over');
        });
        placeholder.addEventListener('dragleave', (e) => {
            e.preventDefault();
            placeholder.classList.remove('drag-over');
        });
        placeholder.addEventListener('drop', (e) => {
            e.preventDefault();
            placeholder.classList.remove('drag-over');
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                this.loadImage(files[0]);
            }
        });

        window.addEventListener('resize', () => {
            this.resizeCanvas();
            this.drawImageToCanvas();
            this.applyEffects();
        });

        this.dom.controlsMain.addEventListener('input', (e) => {
            const target = e.target;
            const id = target.id;
            let value;

            if (target.type === 'range') {
                value = parseFloat(target.value);
                const valueSpan = document.getElementById(`${id}Value`);
                if (valueSpan) valueSpan.textContent = value;
            } else if (target.type === 'checkbox') {
                value = target.checked;
            } else {
                return;
            }
            
            const isPreprocessing = target.closest('.preprocessing-panel') !== null;
            this.updateState({ [id]: value }, isPreprocessing);
        });
    }

    toggleControlsPanel(open) {
        this.dom.controlsColumn.classList.toggle('open', open);
        this.dom.controlsOverlay.classList.toggle('open', open);
    }

    updateState(newState, isPreprocessing = false) {
        if (isPreprocessing) {
            Object.assign(this.state.preprocessing, newState);
        } else {
            const activeEffectState = this.state.effects[this.state.activeEffect];
            Object.assign(activeEffectState, newState);
        }
        requestAnimationFrame(() => this.applyEffects());
    }

    resizeCanvas() {
        if (!this.originalImage) return;
        const container = this.dom.canvas.parentElement;
        const { clientWidth: maxWidth, clientHeight: maxHeight } = container;
        const imgRatio = this.originalImage.width / this.originalImage.height;
        const containerRatio = maxWidth / maxHeight;
        let newWidth = maxWidth;
        let newHeight = maxHeight;
        if (imgRatio > containerRatio) {
            newHeight = maxWidth / imgRatio;
        } else {
            newWidth = maxHeight * imgRatio;
        }
        this.dom.canvas.width = newWidth;
        this.dom.canvas.height = newHeight;
    }

    loadImage(file) {
        if (!file || !file.type.startsWith('image/')) {
            console.error("File is not an image.");
            return;
        };
        const reader = new FileReader();
        reader.onload = (e) => {
            this.originalImage = new Image();
            this.originalImage.onload = () => {
                this.dom.uploadPlaceholder.classList.add('hidden');
                this.dom.canvas.classList.remove('hidden');
                this.resizeCanvas();
                this.drawImageToCanvas();
                this.applyEffects();
            };
            this.originalImage.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }
    
    drawImageToCanvas() {
        if (!this.originalImage) return;
        const { ctx, canvas } = this.dom;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(this.originalImage, 0, 0, canvas.width, canvas.height);
        this.originalImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    }

    renderEffectSelector() {
        this.dom.effectsMenu.innerHTML = '';
        for (const effectId in this.effectsLibrary) {
            const effect = this.effectsLibrary[effectId];
            const item = document.createElement('div');
            item.className = 'effect-item';
            item.dataset.effect = effectId;
            item.innerHTML = `<span class="bracket">[*]</span> ${effect.name}`;
            item.addEventListener('click', () => this.setActiveEffect(effectId));
            this.dom.effectsMenu.appendChild(item);
        }
        const activeItem = this.dom.effectsMenu.querySelector(`[data-effect="${this.state.activeEffect}"]`);
        if (activeItem) activeItem.classList.add('active');
    }

    renderEffectControls() {
        const effect = this.effectsLibrary[this.state.activeEffect];
        if (!effect) {
            this.dom.effectControlsContainer.innerHTML = '';
            return;
        };
        
        this.dom.effectControlsContainer.innerHTML = effect.getControlsHTML();

        if (effect.init) {
            effect.init(this);
        }
        this.updateAllControlValues();
    }
    
    updateAllControlValues() {
        const currentState = {
            ...this.state.preprocessing,
            ...this.state.effects[this.state.activeEffect]
        };

        Object.keys(currentState).forEach(key => {
            const control = document.getElementById(key);
            const valueSpan = document.getElementById(`${key}Value`);
            
            if (control) {
                if (control.type === 'checkbox') {
                    control.checked = currentState[key];
                } else {
                    control.value = currentState[key];
                }
            }
            if (valueSpan) {
                valueSpan.textContent = currentState[key];
            }
        });
    }

    setActiveEffect(effectId, isInitial = false) {
        if (!isInitial && effectId === this.state.activeEffect) return;
        
        this.state.activeEffect = effectId;
        this.renderEffectSelector();
        this.renderEffectControls();
        this.applyEffects();
    }

    applyEffects() {
        if (!this.originalImageData) return;
        const imageData = new ImageData(
            new Uint8ClampedArray(this.originalImageData.data),
            this.originalImageData.width,
            this.originalImageData.height
        );
        
        this.applyPreprocessing(imageData.data, this.state.preprocessing);
        
        const activeEffect = this.effectsLibrary[this.state.activeEffect];
        if (activeEffect && activeEffect.apply) {
            const effectState = this.state.effects[this.state.activeEffect];
            activeEffect.apply(imageData, effectState);
        }
        this.dom.ctx.clearRect(0, 0, this.dom.canvas.width, this.dom.canvas.height);
        this.dom.ctx.putImageData(imageData, 0, 0);
    }

    applyPreprocessing(pixels, prepState) {
        let { blackPoint, whitePoint, gamma, grain } = prepState;
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
    
    exportImage() {
        const link = document.createElement('a');
        link.download = 'subtone_export.png';
        link.href = this.dom.canvas.toDataURL('image/png');
        link.click();
    }
}

// Inicia a aplicação quando o DOM estiver pronto.
window.addEventListener('DOMContentLoaded', () => {
    new ImageProcessorApp(EFFECTS_LIBRARY);

    // Controla a tela de loading
    setTimeout(() => {
        document.body.classList.add('loaded');
    }, 3000);
});
