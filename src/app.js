/**
 * src/app.js
 * * Ponto de entrada e orquestrador principal da aplicação.
 * * Responsabilidades:
 * - Inicializar todos os módulos (Estado, UI, Canvas, Efeitos).
 * - Configurar os event listeners globais (upload, drag-drop, resize).
 * - Gerenciar a comunicação com o Web Worker para processamento de imagem.
 * - Coordenar as atualizações de estado e solicitar as re-renderizações.
 */
import { initUI, toggleControlsPanel } from './ui/ui.js';
import { getInitialState } from './core/state.js';
import { CanvasController } from './core/canvas.js';
import { EffectsManager } from './core/effectsManager.js';

class ImageProcessorApp {
    /**
     * Construtor da classe principal da aplicação.
     * Inicializa o estado, os controladores e o worker.
     */
    constructor() {
        this.dom = this.queryDOMElements();
        this.state = getInitialState();
        this.originalImage = null;
        this.originalImageData = null;

        this.worker = new Worker('./worker.js', { type: 'module' });
        this.isWorkerBusy = false;
        this.pendingUpdate = false;

        this.canvasController = new CanvasController(this.dom.canvas);
        this.effectsManager = new EffectsManager(this.dom, this.setActiveEffect.bind(this));

        this.init();
    }

    /**
     * Inicializa a aplicação, configurando a UI, os listeners e o efeito inicial.
     */
    init() {
        initUI(this);
        this.effectsManager.renderEffectSelector();
        this.setupEventListeners();
        this.setActiveEffect(this.state.activeEffect, true);
    }

    /**
     * Mapeia os elementos do DOM para um objeto para fácil acesso.
     * @returns {Object} Um objeto com referências aos elementos do DOM.
     */
    queryDOMElements() {
        return {
            canvas: document.getElementById('imageCanvas'),
            fileInput: document.getElementById('fileInput'),
            uploadButton: document.getElementById('uploadButton'),
            exportButtonHeader: document.getElementById('exportButtonHeader'),
            exportButtonPanel: document.getElementById('exportButtonPanel'),
            effectsMenu: document.getElementById('effects-menu'),
            effectsMenuDesktop: document.getElementById('effects-menu-desktop'),
            effectControlsContainer: document.getElementById('effect-controls-accordion-item'),
            controlsMain: document.getElementById('controls-main'),
            uploadPlaceholder: document.getElementById('upload-placeholder'),
        };
    }

    /**
     * Configura todos os event listeners da aplicação.
     */
    setupEventListeners() {
        this.worker.onmessage = (e) => {
            const processedImageData = e.data;
            this.canvasController.update(processedImageData);

            if (this.state.activeEffect === 'y2k-cam' && this.state.effects['y2k-cam'].y2kTimestamp) {
                let timestampText = this.state.effects['y2k-cam'].y2kCustomTimestamp;
                
                // Se o texto personalizado estiver vazio, usa a data atual como fallback.
                if (!timestampText || !timestampText.trim()) {
                    const now = new Date();
                    const day = String(now.getDate()).padStart(2, '0');
                    const month = String(now.getMonth() + 1).padStart(2, '0');
                    const year = String(now.getFullYear()).slice(-2);
                    timestampText = `${day}.${month}.'${year}`;
                }
                this.canvasController.drawTimestamp(timestampText);
            }

            this.isWorkerBusy = false;
            if (this.pendingUpdate) {
                this.pendingUpdate = false;
                this.applyEffects();
            }
        };

        this.dom.uploadButton.addEventListener('click', () => this.dom.fileInput.click());
        this.dom.uploadPlaceholder.addEventListener('click', () => this.dom.fileInput.click());
        this.dom.fileInput.addEventListener('change', (e) => this.loadImage(e.target.files[0]));
        this.dom.exportButtonHeader.addEventListener('click', () => this.exportImage());
        this.dom.exportButtonPanel.addEventListener('click', () => this.exportImage());

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
            if (e.dataTransfer.files.length > 0) this.loadImage(e.dataTransfer.files[0]);
        });

        window.addEventListener('resize', () => {
            if (!this.originalImage) return;
            this.canvasController.resize(this.originalImage);
            this.originalImageData = this.canvasController.drawImage(this.originalImage);
            this.applyEffects();
        });

        this.dom.controlsMain.addEventListener('input', (e) => {
            const { id, type, value, checked } = e.target;
            let finalValue;

            if (type === 'range') {
                finalValue = parseFloat(value);
            } else if (type === 'checkbox') {
                finalValue = checked;
            } else {
                finalValue = value;
            }
            
            const valueSpan = document.getElementById(`${id}Value`);
            if (valueSpan) valueSpan.textContent = value;

            const isPreprocessing = e.target.closest('.preprocessing-panel') !== null;
            this.updateState({ [id]: finalValue }, isPreprocessing);
        });
    }

    loadImage(file) {
        if (!file || !file.type.startsWith('image/')) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            this.originalImage = new Image();
            this.originalImage.onload = () => {
                this.dom.uploadPlaceholder.classList.add('hidden');
                this.dom.canvas.classList.remove('hidden');
                this.dom.exportButtonHeader.classList.remove('hidden');
                this.dom.exportButtonPanel.classList.remove('hidden');

                this.canvasController.resize(this.originalImage);
                this.originalImageData = this.canvasController.drawImage(this.originalImage);
                this.applyEffects();
            };
            this.originalImage.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    updateState(newState, isPreprocessing = false) {
        if (isPreprocessing) {
            Object.assign(this.state.preprocessing, newState);
        } else {
            Object.assign(this.state.effects[this.state.activeEffect], newState);
        }
        this.applyEffects();
    }

    applyEffects() {
        if (!this.originalImageData) return;
        if (this.isWorkerBusy) {
            this.pendingUpdate = true;
            return;
        }
        this.isWorkerBusy = true;
        this.worker.postMessage({
            imageData: this.originalImageData,
            state: this.state,
        });
    }

    async setActiveEffect(effectId, isInitial = false) {
        if (!isInitial && effectId === this.state.activeEffect) {
            if (window.innerWidth < 1024) toggleControlsPanel(true);
            return;
        }
        this.state.activeEffect = effectId;

        document.querySelectorAll('.effect-item').forEach(item => {
            item.classList.toggle('active', item.dataset.effect === effectId);
        });

        await this.effectsManager.renderEffectControls(effectId, this);
        this.updateAllControlValues();
        this.applyEffects();
    }

    updateAllControlValues() {
        const activeEffectState = this.state.effects[this.state.activeEffect];
        const currentState = { ...this.state.preprocessing, ...activeEffectState };

        Object.keys(currentState).forEach(key => {
            const control = document.getElementById(key);
            if (control) {
                if (control.type === 'checkbox') {
                    control.checked = currentState[key];
                } else { // Funciona para range e text
                    control.value = currentState[key];
                }
            }
            const valueSpan = document.getElementById(`${key}Value`);
            if (valueSpan) {
                valueSpan.textContent = currentState[key];
            }
        });
        
        const selectors = {
            'ascii': { selector: '#ascii-font-selector', prop: 'asciiFont', dataAttr: 'font' },
            'pixel-sort': { selector: '#sort-direction-selector', prop: 'sortDirection', dataAttr: 'direction' },
            'dithering': { selector: '#dithering-pattern-selector', prop: 'ditheringPattern', dataAttr: 'pattern' },
            'crt': { selector: '#crt-pattern-selector', prop: 'crtPattern', dataAttr: 'pattern' }
        };
        const config = selectors[this.state.activeEffect];
        if (config) {
            document.querySelectorAll(`${config.selector} .pattern-btn`).forEach(btn => {
                btn.classList.toggle('active', btn.dataset[config.dataAttr] === activeEffectState[config.prop]);
            });
        }
    }

    exportImage() {
        if (!this.originalImage) return;
        const filename = `subtone_export_${this.state.activeEffect}.png`;
        this.canvasController.export(filename);
    }
}

window.addEventListener('DOMContentLoaded', () => {
    new ImageProcessorApp();
    setTimeout(() => document.body.classList.add('loaded'), 2000);
});
