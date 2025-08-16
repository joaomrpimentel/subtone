/**
 * src/ui/ui.js
 * * Gerencia todos os componentes e interações da interface do usuário que não
 * são diretamente relacionados ao canvas ou aos controles de efeitos.
 * * Responsabilidades:
 * - Lógica do painel lateral/inferior (abrir/fechar).
 * - Funcionalidade do componente acordeão.
 * - Exibição e posicionamento dos tooltips dos sliders.
 */

// Variáveis de escopo do módulo para o painel, para evitar buscas repetidas no DOM.
let panel, overlay;

/**
 * Alterna a visibilidade do painel de controles e do overlay.
 * @param {boolean} open - Força o painel a abrir (true) ou fechar (false).
 */
export function toggleControlsPanel(open) {
    if (panel && overlay) {
        panel.classList.toggle('open', open);
        overlay.classList.toggle('open', open);
        // Impede o scroll do corpo da página quando o painel está aberto em mobile.
        document.body.style.overflow = open ? 'hidden' : '';
    }
}

/**
 * Função principal que inicializa todos os componentes da UI.
 * É chamada uma vez no `app.js`.
 */
export function initUI() {
    initPanel();
    initAccordion();
    initSliderTooltips();
}

/**
 * Inicializa a lógica do painel deslizante (mobile).
 */
function initPanel() {
    const toggleBtn = document.getElementById('toggle-controls-btn');
    const closeBtn = document.getElementById('close-panel-btn');
    panel = document.getElementById('controls-panel');
    overlay = document.getElementById('panel-overlay');

    toggleBtn.addEventListener('click', () => toggleControlsPanel(true));
    closeBtn.addEventListener('click', () => toggleControlsPanel(false));
    overlay.addEventListener('click', () => toggleControlsPanel(false));
}

/**
 * Inicializa a lógica das seções de acordeão no painel de controles.
 */
function initAccordion() {
    const container = document.querySelector('.accordion-container');
    
    container.addEventListener('click', (e) => {
        const header = e.target.closest('.accordion-header');
        if (!header) return;

        const content = header.nextElementSibling;

        // Alterna a classe 'active' para a animação do ícone.
        header.classList.toggle('active');
        
        // Anima a abertura/fechamento do conteúdo.
        if (content.style.maxHeight) {
            content.style.maxHeight = null;
            content.classList.remove('open');
        } else {
            content.classList.add('open');
            // Define a altura máxima para o tamanho real do conteúdo para animar.
            content.style.maxHeight = (content.scrollHeight) + "px";
        }
    });
}

/**
 * Inicializa a lógica dos tooltips que aparecem ao arrastar os sliders.
 */
function initSliderTooltips() {
    const tooltip = document.getElementById('slider-tooltip');
    const controlsMain = document.getElementById('controls-main');

    let activeSlider = null;

    /**
     * Atualiza a posição e o texto do tooltip com base no slider ativo.
     * @param {HTMLInputElement} slider - O slider que está sendo movido.
     */
    const updateTooltip = (slider) => {
        if (!slider) return;
        
        const value = slider.value;
        tooltip.textContent = value;
        
        const rect = slider.getBoundingClientRect();
        // Calcula a posição do "polegar" (thumb) do slider.
        const thumbPosition = (value - slider.min) / (slider.max - slider.min);
        const thumbX = rect.left + thumbPosition * rect.width;

        // Posiciona o tooltip acima do polegar.
        tooltip.style.left = `${thumbX}px`;
        tooltip.style.top = `${rect.top - 10}px`;
    };

    // Mostra o tooltip ao pressionar um slider.
    controlsMain.addEventListener('pointerdown', (e) => {
        if (e.target.type === 'range') {
            activeSlider = e.target;
            tooltip.classList.remove('hidden');
            updateTooltip(activeSlider);
        }
    });

    // Esconde o tooltip ao soltar o clique em qualquer lugar.
    window.addEventListener('pointerup', () => {
        if (activeSlider) {
            tooltip.classList.add('hidden');
            activeSlider = null;
        }
    });

    // Atualiza o tooltip enquanto o slider é movido.
    controlsMain.addEventListener('input', (e) => {
        if (e.target.type === 'range' && activeSlider) {
            updateTooltip(e.target);
        }
    });
}
