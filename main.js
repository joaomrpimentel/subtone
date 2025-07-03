// Importa os efeitos da biblioteca
import { ditheringEffect } from './effects/dithering.js';
import { crtEffect } from './effects/crt.js';

// ===================================================================================
// E F F E C T S   L I B R A R Y
// Central de todos os efeitos de imagem.
// ===================================================================================

const EFFECTS_LIBRARY = {
    dithering: ditheringEffect,
    crt: crtEffect,
    // Para adicionar novos efeitos, importe e adicione-os aqui.
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
        
        // Estado centralizado: uma única fonte da verdade para todos os parâmetros.
        this.state = {
            activeEffect: 'dithering',
            // Preprocessing
            blackPoint: 0, whitePoint: 255, grain: 0, gamma: 1,
            // Parâmetros do Dithering
            pixelSize: 1, isColorMode: false, ditheringPattern: 'F-S', threshold: 128, colorCount: 8,
            // Parâmetros do CRT
            crtDistortion: 0.03,
            crtDotPitch: 4,
            crtDotScale: 1,
            crtPattern: 'Monitor',
            crtConvergence: 1,
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
        this.dom.toggleControlsBtn = document.getElementById('toggle-controls-btn');
        this.dom.controlsOverlay = document.getElementById('controls-overlay');
    }

    setupEventListeners() {
        this.dom.uploadButton.addEventListener('click', () => this.dom.fileInput.click());
        this.dom.fileInput.addEventListener('change', (e) => this.loadImage(e.target.files[0]));
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
                const valueSpan = document.getElementById(`${id}Value`);
                if(valueSpan) valueSpan.textContent = value;
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
