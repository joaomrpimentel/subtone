/**
 * worker.js
 * Este worker é responsável por todo o processamento de imagem pesado.
 * Ele recebe o imageData e o estado da thread principal, aplica os efeitos
 * e devolve o imageData processado.
 */

// Importa todos os módulos de efeitos
import { ditheringEffect } from './effects/dithering.js';
import { crtEffect } from './effects/crt.js';
import { halftoneEffect } from './effects/halftone.js';
import { palMEffect } from './effects/pal-m.js';
import { asciiEffect } from './effects/ascii.js';
import { pixelSortingEffect } from './effects/pixel-sort.js';

const EFFECTS_LIBRARY = {
    dithering: ditheringEffect,
    crt: crtEffect,
    "pal-m": palMEffect,
    halftone: halftoneEffect,
    ascii: asciiEffect,
    "pixel-sort": pixelSortingEffect,
};

// Função de pré-processamento (idêntica à do main.js original)
function applyPreprocessing(pixels, prepState) {
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


// Listener para mensagens da thread principal
self.onmessage = (e) => {
    const { imageData, state } = e.data;

    // Cria uma cópia dos dados para não modificar o original
    const processedData = new Uint8ClampedArray(imageData.data);
    const newImageData = new ImageData(processedData, imageData.width, imageData.height);

    // 1. Aplica o pré-processamento
    applyPreprocessing(newImageData.data, state.preprocessing);

    // 2. Aplica o efeito ativo
    const activeEffect = EFFECTS_LIBRARY[state.activeEffect];
    if (activeEffect && activeEffect.apply) {
        const effectState = state.effects[state.activeEffect];
        activeEffect.apply(newImageData, effectState);
    }

    // 3. Envia o resultado de volta para a thread principal
    postMessage(newImageData);
};
