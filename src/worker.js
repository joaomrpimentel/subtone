/**
 * src/worker.js
 * * Este Web Worker é responsável por todo o processamento de imagem pesado.
 * Ele opera em uma thread separada para não bloquear a interface do usuário.
 * * Responsabilidades:
 * - Receber o `ImageData` original e o estado da aplicação da thread principal.
 * - Importar e aplicar a lógica de pré-processamento.
 * - Importar e aplicar a lógica do efeito ativo.
 * - Devolver o `ImageData` processado para a thread principal.
 */

// Importa todos os módulos de efeitos.
// Os caminhos são relativos à localização do worker.js dentro de src/.
import { ditheringEffect } from './effects/dithering.js';
import { crtEffect } from './effects/crt.js';
import { halftoneEffect } from './effects/halftone.js';
import { palMEffect } from './effects/pal-m.js';
import { asciiEffect } from './effects/ascii.js';
import { pixelSortingEffect } from './effects/pixel-sort.js';
import { y2kCamEffect } from './effects/y2k-cam.js';

// Mapeia os efeitos importados para um objeto para fácil acesso.
const EFFECTS_LIBRARY = {
    dithering: ditheringEffect,
    crt: crtEffect,
    "pal-m": palMEffect,
    halftone: halftoneEffect,
    ascii: asciiEffect,
    "pixel-sort": pixelSortingEffect,
    "y2k-cam": y2kCamEffect,
};

/**
 * Aplica ajustes de pré-processamento à imagem, como contraste, gama e granulação.
 * @param {Uint8ClampedArray} pixels - O array de pixels do ImageData.
 * @param {Object} prepState - O objeto de estado contendo os valores de pré-processamento.
 */
function applyPreprocessing(pixels, prepState) {
    let { blackPoint, whitePoint, gamma, grain } = prepState;
    if (whitePoint <= blackPoint) { whitePoint = blackPoint + 1; }
    const range = whitePoint - blackPoint;

    for (let i = 0; i < pixels.length; i += 4) {
        // Ajusta o contraste (pontos preto e branco).
        for (let j = 0; j < 3; j++) {
            let val = pixels[i + j];
            val = (range > 0) ? (val - blackPoint) / range * 255 : (val < blackPoint ? 0 : 255);
            pixels[i + j] = Math.max(0, Math.min(255, val));
        }
        // Aplica a correção de gama.
        pixels[i]   = 255 * Math.pow(pixels[i] / 255, gamma);
        pixels[i+1] = 255 * Math.pow(pixels[i+1] / 255, gamma);
        pixels[i+2] = 255 * Math.pow(pixels[i+2] / 255, gamma);
        
        // Adiciona ruído (granulação).
        if (grain > 0) {
            const noise = (Math.random() - 0.5) * grain;
            pixels[i]   = Math.max(0, Math.min(255, pixels[i] + noise));
            pixels[i+1] = Math.max(0, Math.min(255, pixels[i+1] + noise));
            pixels[i+2] = Math.max(0, Math.min(255, pixels[i+2] + noise));
        }
    }
}

/**
 * Listener para mensagens recebidas da thread principal.
 * Este é o ponto de entrada do worker.
 */
self.onmessage = (e) => {
    const { imageData, state } = e.data;

    // Cria uma cópia dos dados para não modificar o original, que é importante
    // para reaplicar efeitos sem recarregar a imagem.
    const processedData = new Uint8ClampedArray(imageData.data);
    const newImageData = new ImageData(processedData, imageData.width, imageData.height);

    // 1. Aplica o pré-processamento.
    applyPreprocessing(newImageData.data, state.preprocessing);

    // 2. Aplica o efeito atualmente selecionado.
    const activeEffect = EFFECTS_LIBRARY[state.activeEffect];
    if (activeEffect && activeEffect.apply) {
        const effectState = state.effects[state.activeEffect];
        activeEffect.apply(newImageData, effectState);
    }

    // 3. Envia o resultado de volta para a thread principal.
    // O objeto ImageData é transferível, o que melhora a performance.
    postMessage(newImageData, [newImageData.data.buffer]);
};
