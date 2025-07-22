/**
 * ui.js
 * * Gerencia todos os componentes e interações da interface do usuário.
 * Inclui a lógica para o painel deslizante, seções acordeão e os tooltips dos sliders.
 */

// Variáveis de escopo do módulo para o painel
let panel, overlay;

// Função para abrir/fechar o painel de controles
export function toggleControlsPanel(open) {
    if (panel && overlay) {
        panel.classList.toggle('open', open);
        overlay.classList.toggle('open', open);
        document.body.style.overflow = open ? 'hidden' : '';
    }
}

// Função principal que inicializa todos os componentes da UI
export function initUI(app) {
    initPanel();
    initAccordion();
    initSliderTooltips();
}

// Inicializa a lógica do Painel Deslizante
function initPanel() {
    const toggleBtn = document.getElementById('toggle-controls-btn');
    const closeBtn = document.getElementById('close-panel-btn');
    // Atribui os elementos às variáveis do módulo
    panel = document.getElementById('controls-panel');
    overlay = document.getElementById('panel-overlay');

    toggleBtn.addEventListener('click', () => toggleControlsPanel(true));
    closeBtn.addEventListener('click', () => toggleControlsPanel(false));
    overlay.addEventListener('click', () => toggleControlsPanel(false));
}

// Inicializa a lógica das seções Acordeão
function initAccordion() {
    const container = document.querySelector('.accordion-container');
    
    container.addEventListener('click', (e) => {
        const header = e.target.closest('.accordion-header');
        if (!header) return;

        const item = header.parentElement;
        const content = header.nextElementSibling;

        // Fecha outros itens abertos
        const allItems = container.querySelectorAll('.accordion-item');
        allItems.forEach(otherItem => {
            if (otherItem !== item && otherItem.classList.contains('open')) {
                otherItem.classList.remove('open');
                otherItem.querySelector('.accordion-header').classList.remove('active');
                const otherContent = otherItem.querySelector('.accordion-content');
                otherContent.style.maxHeight = null;
                otherContent.classList.remove('open');
            }
        });

        // Abre ou fecha o item clicado
        item.classList.toggle('open');
        header.classList.toggle('active');
        
        if (content.style.maxHeight) {
            content.style.maxHeight = null;
            content.classList.remove('open');
        } else {
            content.classList.add('open');
            content.style.maxHeight = (content.scrollHeight + 20) + "px";
        }
    });
}

// Inicializa a lógica dos Tooltips para Sliders
function initSliderTooltips() {
    const tooltip = document.getElementById('slider-tooltip');
    const controlsMain = document.getElementById('controls-main');

    let activeSlider = null;

    const updateTooltip = (slider) => {
        if (!slider) return;
        
        const value = slider.value;
        tooltip.textContent = value;
        
        const rect = slider.getBoundingClientRect();
        const thumbPosition = (value - slider.min) / (slider.max - slider.min);
        const thumbX = rect.left + thumbPosition * rect.width;

        tooltip.style.left = `${thumbX}px`;
        tooltip.style.top = `${rect.top - 10}px`;
    };

    controlsMain.addEventListener('pointerdown', (e) => {
        if (e.target.type === 'range') {
            activeSlider = e.target;
            tooltip.classList.remove('hidden');
            updateTooltip(activeSlider);
        }
    });

    window.addEventListener('pointerup', () => {
        if (activeSlider) {
            tooltip.classList.add('hidden');
            activeSlider = null;
        }
    });

    controlsMain.addEventListener('input', (e) => {
        if (e.target.type === 'range' && activeSlider) {
            updateTooltip(e.target);
        }
    });
}
