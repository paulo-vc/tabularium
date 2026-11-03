import type { DiceFinish } from '@tabula/domain';

/**
 * Acabamentos dos dados 3D. A textura sai em tons de cinza, desenhada aqui mesmo (sem
 * arquivos de imagem), e o material a multiplica pela cor de quem rola: mármore azul, madeira
 * vermelha… `shade` é o quanto a textura escurece a cor, em média, para o número da face
 * continuar legível.
 */
export interface FinishLook {
  roughness: number;
  metalness: number;
  shade: number;
  /** Desenha a textura (256 × 256, em cinza); sem ela, o dado é liso. */
  paint?: (pixel: (x: number, y: number, value: number) => void) => void;
}

const SIZE = 256;

/**
 * Ruído suave e repetível (o mesmo dado sempre com o mesmo desenho), que emenda nas bordas da
 * textura. Para emendar, quem chama multiplica x e y só por números inteiros.
 */
function valueNoise(seed: number, grid = 16) {
  const values = Array.from({ length: grid * grid }, (_, i) => {
    const x = Math.sin(i * 127.1 + seed * 311.7) * 43758.5453;
    return x - Math.floor(x);
  });
  const at = (gx: number, gy: number) =>
    values[(((gy % grid) + grid) % grid) * grid + (((gx % grid) + grid) % grid)] ?? 0;
  const smooth = (t: number) => t * t * (3 - 2 * t);
  return (x: number, y: number) => {
    const fx = (x / SIZE) * grid;
    const fy = (y / SIZE) * grid;
    const x0 = Math.floor(fx);
    const y0 = Math.floor(fy);
    const tx = smooth(fx - x0);
    const ty = smooth(fy - y0);
    const top = at(x0, y0) * (1 - tx) + at(x0 + 1, y0) * tx;
    const bottom = at(x0, y0 + 1) * (1 - tx) + at(x0 + 1, y0 + 1) * tx;
    return top * (1 - ty) + bottom * ty;
  };
}

/** Várias camadas de ruído (de 0 a 1), do grosso ao fino; `grid` é o tamanho da mais grossa. */
function turbulence(seed: number, grid = 4) {
  const layers = [
    valueNoise(seed, grid),
    valueNoise(seed + 1, grid * 2),
    valueNoise(seed + 2, grid * 4),
  ];
  return (x: number, y: number) =>
    ((layers[0]?.(x, y) ?? 0) * 4 + (layers[1]?.(x, y) ?? 0) * 2 + (layers[2]?.(x, y) ?? 0)) / 7;
}

export const FINISHES: Record<DiceFinish, FinishLook> = {
  liso: { roughness: 0.35, metalness: 0.05, shade: 1 },
  marmore: {
    roughness: 0.18,
    metalness: 0.05,
    shade: 0.9,
    paint: (pixel) => {
      const noise = turbulence(3, 3);
      for (let y = 0; y < SIZE; y++) {
        for (let x = 0; x < SIZE; x++) {
          // Veios: uma onda larga distorcida pelo ruído, escura e fina onde passa perto de zero.
          const wave = Math.abs(Math.sin((x / SIZE) * Math.PI * 4 + noise(x, y) * 7));
          pixel(x, y, 0.45 + 0.55 * Math.pow(wave, 0.22));
        }
      }
    },
  },
  madeira: {
    roughness: 0.7,
    metalness: 0,
    shade: 0.72,
    paint: (pixel) => {
      const noise = turbulence(7, 2);
      const fiber = valueNoise(9, 16);
      for (let y = 0; y < SIZE; y++) {
        for (let x = 0; x < SIZE; x++) {
          // Anéis largos na horizontal (o veio), ondulados pelo ruído, e fibras finas por cima.
          const ring = (y / SIZE) * 6 + noise(x, y) * 2.2;
          const band = ring - Math.floor(ring);
          const grain = 0.5 + 0.42 * Math.pow(Math.sin(band * Math.PI), 3);
          pixel(x, y, grain - fiber(x, y * 4) * 0.12);
        }
      }
    },
  },
  pedra: {
    roughness: 0.92,
    metalness: 0,
    shade: 0.75,
    paint: (pixel) => {
      const noise = turbulence(11, 8);
      const grain = valueNoise(13, 16);
      for (let y = 0; y < SIZE; y++) {
        for (let x = 0; x < SIZE; x++) {
          // Granito: manchas grandes e grãos finos, claros e escuros.
          const speck = grain(x * 9, y * 9);
          const tone = 0.5 + noise(x, y) * 0.4 + (speck > 0.74 ? 0.22 : speck < 0.22 ? -0.3 : 0);
          pixel(x, y, Math.min(1, Math.max(0.3, tone)));
        }
      }
    },
  },
  metal: {
    roughness: 0.32,
    metalness: 0.85,
    shade: 0.85,
    paint: (pixel) => {
      const streak = valueNoise(17, 4);
      for (let y = 0; y < SIZE; y++) {
        for (let x = 0; x < SIZE; x++) {
          // Escovado: riscos finos na horizontal.
          pixel(x, y, 0.8 + streak(x, y * 16) * 0.2);
        }
      }
    },
  },
};

/**
 * Desenha a textura do acabamento num `<canvas>` (cinza), ou `null` no liso. Sem three.js:
 * serve também para a amostra nas Configurações.
 */
export function paintFinish(finish: DiceFinish, size = SIZE): HTMLCanvasElement | null {
  const paint = FINISHES[finish].paint;
  if (!paint) return null;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = SIZE;
  const context = canvas.getContext('2d');
  if (!context) return null;
  const image = context.createImageData(SIZE, SIZE);
  paint((x, y, value) => {
    const i = (y * SIZE + x) * 4;
    const v = Math.round(Math.min(1, Math.max(0, value)) * 255);
    image.data[i] = image.data[i + 1] = image.data[i + 2] = v;
    image.data[i + 3] = 255;
  });
  context.putImageData(image, 0, 0);
  if (size === SIZE) return canvas;
  const small = document.createElement('canvas');
  small.width = small.height = size;
  small.getContext('2d')?.drawImage(canvas, 0, 0, size, size);
  return small;
}
