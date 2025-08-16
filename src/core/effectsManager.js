/**
 * src/core/effectsManager.js
 * * Gerencia a lógica relacionada aos efeitos.
 * * Responsabilidades:
 * - Manter uma lista dos efeitos disponíveis.
 * - Renderizar os botões de seleção de efeito na UI.
 * - Carregar dinamicamente os controles HTML do efeito ativo.
 * - Chamar a função de inicialização de um efeito, se existir.
 */

export class EffectsManager {
    constructor(domElements, onEffectChange) {
        this.dom = domElements;
        this.onEffectChange = onEffectChange;
        this.effectsLibrary = {
            dithering: { name: 'DITHERING' },
            crt: { name: 'CRT' },
            "pal-m": { name: 'PAL-M' },
            halftone: { name: 'HALFTONE' },
            ascii: { name: 'ASCII' },
            "pixel-sort": { name: 'PIXEL SORT' },
            'y2k-cam': { name: 'Y2K CAM' },
        };
    }

    renderEffectSelector() {
        const createButton = (id, effect) => {
            const item = document.createElement('button');
            item.className = 'effect-item';
            item.dataset.effect = id;
            item.textContent = effect.name;
            item.addEventListener('click', () => this.onEffectChange(id));
            return item;
        };

        this.dom.effectsMenu.innerHTML = '';
        this.dom.effectsMenuDesktop.innerHTML = '';

        for (const effectId in this.effectsLibrary) {
            const effect = this.effectsLibrary[effectId];
            this.dom.effectsMenu.appendChild(createButton(effectId, effect));
            const desktopButton = createButton(effectId, effect);
            this.dom.effectsMenuDesktop.appendChild(desktopButton);
        }
    }

    async renderEffectControls(effectId, app) {
        try {
            const effectModule = await import(`../effects/${effectId}.js`);
            const effectKey = Object.keys(effectModule)[0];
            const effect = effectModule[effectKey];

            if (!effect || !effect.getControlsHTML) {
                this.dom.effectControlsContainer.innerHTML = '';
                return;
            }

            this.dom.effectControlsContainer.innerHTML = `
                <button class="accordion-header active">
                    <span>--Effect Controls--</span>
                    <svg class="accordion-icon" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                </button>
                <div class="accordion-content open">
                    <div class="accordion-content-inner">
                        ${effect.getControlsHTML()}
                    </div>
                </div>
            `;

            const content = this.dom.effectControlsContainer.querySelector('.accordion-content');
            if (content) {
                content.style.maxHeight = content.scrollHeight + "px";
            }

            if (effect.init) {
                effect.init(app);
            }

        } catch (error) {
            console.error(`Failed to load controls for effect ${effectId}:`, error);
            this.dom.effectControlsContainer.innerHTML = '';
        }
    }
}
