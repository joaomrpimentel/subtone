/**
 * src/core/state.js
 * * Define e exporta o estado inicial da aplicação.
 * Centralizar o estado aqui facilita o gerenciamento, a compreensão
 * da estrutura de dados do app e a redefinição para os valores padrão.
 */
export const getInitialState = () => ({
    // Efeito que será carregado ao iniciar a aplicação.
    activeEffect: 'dithering',
    
    // Configurações de pré-processamento aplicadas antes de qualquer efeito.
    preprocessing: {
        blackPoint: 0,
        whitePoint: 255,
        gamma: 1,
        grain: 0,
    },
    
    // Contém o estado individual de cada efeito.
    // Manter os valores aqui garante que as configurações do usuário
    // sejam preservadas ao alternar entre os efeitos.
    effects: {
        dithering: {
            pixelSize: 1,
            isColorMode: false,
            ditheringPattern: 'F-S',
            threshold: 128,
            colorCount: 8
        },
        crt: {
            crtDistortion: 0.03,
            crtDotPitch: 4,
            crtDotScale: 1,
            crtPattern: 'Monitor',
            crtConvergence: 1
        },
        halftone: {
            halftoneGridSize: 10,
            halftoneDotScale: 1,
            halftoneGrayscale: false,
            halftoneIsBgBlack: true
        },
        "pal-m": {
            palamBleed: 8,
            palamScanlines: 0.3,
            palamScanlineGap: 2,
            palamNoise: 0.15,
            palamFringing: 2.0,
            palamSaturation: 1.0,
            palamPhaseShift: 2
        },
        ascii: {
            asciiResolution: 8,
            asciiInvert: false,
            asciiIsColor: false,
            asciiColorBoost: 1.5,
            asciiFont: 'mono'
        },
        "pixel-sort": {
            sortAngle: 0,
            sortDirection: 'Horizontal',
            sortThreshold: 100
        },
        "y2k-cam": {
            y2kBloom: 0.4,
            y2kAberration: 3,
            y2kSaturation: 1.2,
            y2kVignette: 0.3,
            y2kTimestamp: true,
            y2kCustomTimestamp: ""
        },
    }
});
