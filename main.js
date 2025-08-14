// Importa os módulos de UI
import { initUI, toggleControlsPanel } from './ui.js';

// ===================================================================================
// A P P L I C A T I O N   C O R E
// ===================================================================================
class ImageProcessorApp {
    constructor() {
        this.dom = {};
        this.originalImage = null;
        this.originalImageData = null;
        this.worker = new Worker('./worker.js', { type: 'module' });
        this.isWorkerBusy = false;
        this.pendingUpdate = null;

        this.state = {
            activeEffect: 'dithering',
            preprocessing: {
                blackPoint: 0, whitePoint: 255, gamma: 1, grain: 0,
            },
            effects: {
                dithering: { pixelSize: 1, isColorMode: false, ditheringPattern: 'F-S', threshold: 128, colorCount: 8 },
                crt: { crtDistortion: 0.03, crtDotPitch: 4, crtDotScale: 1, crtPattern: 'Monitor', crtConvergence: 1 },
                halftone: { halftoneGridSize: 10, halftoneDotScale: 1, halftoneGrayscale: false, halftoneIsBgBlack: true },
                "pal-m": { palamBleed: 8, palamScanlines: 0.3, palamScanlineGap: 2, palamNoise: 0.15, palamFringing: 2.0, palamSaturation: 1.0, palamPhaseShift: 2 },
                ascii: { asciiResolution: 8, asciiInvert: false, asciiIsColor: false, asciiColorBoost: 1.5, asciiFont: 'mono' },
                "pixel-sort": { sortAngle: 0, sortDirection: 'Horizontal', sortThreshold: 100 },
                "y2k-cam": { y2kBloom: 0.4, y2kAberration: 3, y2kSaturation: 1.2, y2kVignette: 0.3, y2kTimestamp: true },
            }
        };
        this.init();
    }

    init() {
        this.queryDOMElements();
        this.setupEventListeners();
        initUI(this);
        this.renderEffectSelector();
        this.setActiveEffect('dithering', true);
    }

    queryDOMElements() {
        this.dom.canvas = document.getElementById('imageCanvas');
        this.dom.ctx = this.dom.canvas.getContext('2d', { willReadFrequently: true });
        this.dom.fileInput = document.getElementById('fileInput');
        this.dom.uploadButton = document.getElementById('uploadButton');
        this.dom.exportButtonHeader = document.getElementById('exportButtonHeader');
        this.dom.exportButtonPanel = document.getElementById('exportButtonPanel');
        this.dom.effectsMenu = document.getElementById('effects-menu');
        this.dom.effectsMenuDesktop = document.getElementById('effects-menu-desktop');
        this.dom.effectControlsContainer = document.getElementById('effect-controls-accordion-item');
        this.dom.controlsMain = document.getElementById('controls-main');
        this.dom.uploadPlaceholder = document.getElementById('upload-placeholder');
        this.dom.controlsPanel = document.getElementById('controls-panel');
    }

    setupEventListeners() {
        // Listener para respostas do Worker
        this.worker.onmessage = (e) => {
            const processedImageData = e.data;
            this.dom.ctx.clearRect(0, 0, this.dom.canvas.width, this.dom.canvas.height);
            this.dom.ctx.putImageData(processedImageData, 0, 0);
            
            // Desenha o timestamp se o efeito Y2K estiver ativo e a opção marcada
            if (this.state.activeEffect === 'y2k-cam' && this.state.effects['y2k-cam'].y2kTimestamp) {
                this.drawTimestamp();
            }

            this.isWorkerBusy = false;

            if (this.pendingUpdate) {
                this.applyEffects();
                this.pendingUpdate = null;
            }
        };

        // Eventos de clique
        this.dom.uploadButton.addEventListener('click', () => this.dom.fileInput.click());
        this.dom.uploadPlaceholder.addEventListener('click', () => this.dom.fileInput.click());
        this.dom.fileInput.addEventListener('change', (e) => this.loadImage(e.target.files[0]));
        this.dom.exportButtonHeader.addEventListener('click', () => this.exportImage());
        this.dom.exportButtonPanel.addEventListener('click', () => this.exportImage());

        // Eventos de Drag and Drop
        const dropArea = document.body;
        dropArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            if (this.originalImage) return;
            this.dom.uploadPlaceholder.classList.add('drag-over');
        });
        dropArea.addEventListener('dragleave', () => this.dom.uploadPlaceholder.classList.remove('drag-over'));
        dropArea.addEventListener('drop', (e) => {
            e.preventDefault();
            if (this.originalImage) return;
            this.dom.uploadPlaceholder.classList.remove('drag-over');
            if (e.dataTransfer.files.length > 0) {
                this.loadImage(e.dataTransfer.files[0]);
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
    
    drawTimestamp() {
        const { ctx, canvas } = this.dom;
        const now = new Date();
        const day = String(now.getDate()).padStart(2, '0');
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const year = String(now.getFullYear()).slice(-2);
        
        const dateString = `${day}.${month}.'${year}`;

        const fontSize = Math.max(16, Math.min(canvas.width * 0.045, 28));
        ctx.font = `${fontSize}px 'VT323', monospace`;
        ctx.textAlign = 'right';
        ctx.textBaseline = 'bottom';

        const padding = fontSize * 0.8;
        const textMetrics = ctx.measureText(dateString);
        const textWidth = textMetrics.width;
        const textHeight = fontSize; 
        
        ctx.fillStyle = '#FF9900';
        ctx.fillText(dateString, canvas.width - padding, canvas.height - padding);
    }

    updateState(newState, isPreprocessing = false) {
        if (isPreprocessing) {
            Object.assign(this.state.preprocessing, newState);
        } else {
            // Se a propriedade for 'y2kTimestamp', atualizamos o estado e redesenhamos
            if (newState.hasOwnProperty('y2kTimestamp')) {
                 Object.assign(this.state.effects[this.state.activeEffect], newState);
                 this.applyEffects(); // Reaplicar para redesenhar com ou sem timestamp
                 return;
            }
            const activeEffectState = this.state.effects[this.state.activeEffect];
            Object.assign(activeEffectState, newState);
        }
        this.applyEffects();
    }
    
    loadImage(file) {
        if (!file || !file.type.startsWith('image/')) {
            console.error("O ficheiro não é uma imagem.");
            return;
        };
        const reader = new FileReader();
        reader.onload = (e) => {
            this.originalImage = new Image();
            this.originalImage.onload = () => {
                this.dom.uploadPlaceholder.classList.add('hidden');
                this.dom.canvas.classList.remove('hidden');
                this.dom.exportButtonHeader.classList.remove('hidden');
                this.dom.exportButtonPanel.classList.remove('hidden');
                this.resizeCanvas();
                this.drawImageToCanvas();
                this.applyEffects();
            };
            this.originalImage.src = e.target.result;
        };
        reader.readAsDataURL(file);
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

    drawImageToCanvas() {
        if (!this.originalImage) return;
        const { ctx, canvas } = this.dom;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(this.originalImage, 0, 0, canvas.width, canvas.height);
        this.originalImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    }

    applyEffects() {
        if (!this.originalImageData) return;

        // Se o worker estiver ocupado, marca uma atualização pendente com o estado mais recente.
        if (this.isWorkerBusy) {
            this.pendingUpdate = true;
            return;
        }

        this.isWorkerBusy = true;
        
        // Envia os dados para o worker em vez de processar aqui
        this.worker.postMessage({
            imageData: this.originalImageData,
            state: this.state
        });
    }

    setActiveEffect(effectId, isInitial = false) {
        if (!isInitial && effectId === this.state.activeEffect) {
            if (window.innerWidth < 1024) {
                 toggleControlsPanel(true);
            }
            return; 
        }
        
        this.state.activeEffect = effectId;

        document.querySelectorAll('.effect-item').forEach(item => {
            item.classList.toggle('active', item.dataset.effect === effectId);
        });

        this.renderEffectControls();
        this.applyEffects();
    }
    
    renderEffectSelector() {
        const effectsLibrary = {
            dithering: { name: 'DITHERING' },
            crt: { name: 'CRT' },
            "pal-m": { name: 'PAL-M' },
            halftone: { name: 'HALFTONE' },
            ascii: { name: 'ASCII' },
            "pixel-sort": { name: 'PIXEL SORT' },
            'y2k-cam': { name: 'Y2K CAM' },
        };

        const createEffectButton = (effectId, effect) => {
            const item = document.createElement('button');
            item.className = 'effect-item';
            item.dataset.effect = effectId;
            item.textContent = effect.name;
            item.addEventListener('click', () => this.setActiveEffect(effectId));
            return item;
        };

        this.dom.effectsMenu.innerHTML = '';
        this.dom.effectsMenuDesktop.innerHTML = '';

        for (const effectId in effectsLibrary) {
            const effect = effectsLibrary[effectId];
            this.dom.effectsMenu.appendChild(createEffectButton(effectId, effect));
            this.dom.effectsMenuDesktop.appendChild(createEffectButton(effectId, effect).cloneNode(true));
            this.dom.effectsMenuDesktop.lastChild.addEventListener('click', () => this.setActiveEffect(effectId));
        }
    }

    async renderEffectControls() {
        const effectId = this.state.activeEffect;
        try {
            const effectModule = await import(`./effects/${effectId}.js`);
            const effectKey = Object.keys(effectModule)[0];
            const effect = effectModule[effectKey];

            if (!effect || !effect.getControlsHTML) {
                this.dom.effectControlsContainer.innerHTML = '';
                return;
            };
            
            let controlsHTML = effect.getControlsHTML();
            controlsHTML = controlsHTML.replace(/<h3 class="panel-title">--Effect Controls--<\/h3>/, '');

            this.dom.effectControlsContainer.innerHTML = `
                <button class="accordion-header active">
                    <span>--Effect Controls--</span>
                    <svg class="accordion-icon" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                </button>
                <div class="accordion-content">
                    <div class="accordion-content-inner">
                        ${controlsHTML}
                    </div>
                </div>
            `;

            const content = this.dom.effectControlsContainer.querySelector('.accordion-content');
            if (content) {
                content.classList.add('open');
                content.style.maxHeight = content.scrollHeight + "px";
            }

            if (effect.init) {
                effect.init(this);
            }
            this.updateAllControlValues();
        } catch (error) {
            console.error(`Falha ao carregar controlos para o efeito ${effectId}:`, error);
            this.dom.effectControlsContainer.innerHTML = '';
        }
    }

    updateAllControlValues() {
        const activeEffectState = this.state.effects[this.state.activeEffect];
        const currentState = {
            ...this.state.preprocessing,
            ...activeEffectState
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

        // Lógica específica para seletores de botão
        const selectors = {
            'ascii': { selector: '#ascii-font-selector', prop: 'asciiFont', dataAttr: 'font' },
            'pixel-sort': { selector: '#sort-direction-selector', prop: 'sortDirection', dataAttr: 'direction' },
            'dithering': { selector: '#dithering-pattern-selector', prop: 'ditheringPattern', dataAttr: 'pattern' },
            'crt': { selector: '#crt-pattern-selector', prop: 'crtPattern', dataAttr: 'pattern' }
        };

        const effectConfig = selectors[this.state.activeEffect];
        if (effectConfig) {
            document.querySelectorAll(`${effectConfig.selector} .pattern-btn`).forEach(btn => {
                btn.classList.toggle('active', btn.dataset[effectConfig.dataAttr] === activeEffectState[effectConfig.prop]);
            });
        }
    }

    exportImage() {
        if (!this.originalImage) return;
        const link = document.createElement('a');
        link.download = `subtone_export_${this.state.activeEffect}.png`;
        link.href = this.dom.canvas.toDataURL('image/png');
        link.click();
    }
}

// Inicia a aplicação quando o DOM estiver pronto.
window.addEventListener('DOMContentLoaded', () => {
    new ImageProcessorApp();

    // Controla a tela de loading
    setTimeout(() => {
        document.body.classList.add('loaded');
    }, 2000);
});
