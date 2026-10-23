import type { RollEntry } from './log';

/** Formas de dado que dá para mostrar em 3D. */
export type DieShape = 'd4' | 'd6' | 'd8' | 'd10' | 'd12' | 'd20';

/** Um dado para a animação: a forma, a face (de 1 a n) que fica para cima e o rótulo dela. */
export interface VisualDie {
  shape: DieShape;
  face: number;
  /** `dezenas`: o d10 das dezenas do d100 (faces 00, 10… 90). */
  tens?: true;
  /** Descartado (ex.: o menor em 4d6kh3): aparece apagado. */
  dropped: boolean;
}

/** Mais dados que isso não cabem na bandeja (o resto vira "+N"). */
export const MAX_VISUAL_DICE = 10;

const SHAPES: Record<number, DieShape> = {
  4: 'd4',
  6: 'd6',
  8: 'd8',
  10: 'd10',
  12: 'd12',
  20: 'd20',
};

/** Rótulo de uma face. O d10 mostra 0 na face 10; o das dezenas, 00 a 90. */
export function faceLabel(shape: DieShape, face: number, tens = false): string {
  if (shape !== 'd10') return String(face);
  const digit = face % 10;
  return tens ? `${digit}0`.padStart(2, '0') : String(digit);
}

/**
 * Os dados de uma rolagem, como aparecem na bandeja. Um d100 vira dois d10 (dezenas e
 * unidades, 00 + 0 = 100). Dados sem forma (d3, d7…) ficam só no resultado escrito.
 */
export function diceToShow(result: RollEntry['result']): { dice: VisualDie[]; hidden: number } {
  const all: VisualDie[] = [];
  let hidden = 0;
  for (const term of result.terms) {
    if (term.kind !== 'dados') continue;
    for (const die of term.results) {
      const shape = SHAPES[term.sides];
      if (shape) {
        all.push({ shape, face: die.value, dropped: die.dropped });
      } else if (term.sides === 100) {
        const tens = Math.floor(die.value / 10) % 10;
        const units = die.value % 10;
        all.push({ shape: 'd10', face: tens === 0 ? 10 : tens, tens: true, dropped: die.dropped });
        all.push({ shape: 'd10', face: units === 0 ? 10 : units, dropped: die.dropped });
      } else {
        hidden++;
      }
    }
  }
  return {
    dice: all.slice(0, MAX_VISUAL_DICE),
    hidden: hidden + Math.max(0, all.length - MAX_VISUAL_DICE),
  };
}
