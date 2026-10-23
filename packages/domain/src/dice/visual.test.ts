import { describe, expect, it } from 'vitest';
import type { RollEntry } from './log';
import { diceToShow, faceLabel, MAX_VISUAL_DICE } from './visual';

type Result = RollEntry['result'];

const dice = (
  sides: number,
  values: number[],
  dropped: number[] = [],
): Result['terms'][number] => ({
  kind: 'dados',
  sign: 1,
  count: values.length,
  sides,
  results: values.map((value, i) => ({ value, dropped: dropped.includes(i) })),
  subtotal: values.reduce((sum, v, i) => sum + (dropped.includes(i) ? 0 : v), 0),
});

const roll = (...terms: Result['terms']): Result =>
  ({ expression: 'x', total: 0, terms }) as unknown as Result;

describe('dados na bandeja', () => {
  it('cada dado vira uma forma, com a face sorteada e os descartados marcados', () => {
    const shown = diceToShow(roll(dice(20, [17]), dice(6, [2, 5, 6], [0])));
    expect(shown).toEqual({
      dice: [
        { shape: 'd20', face: 17, dropped: false },
        { shape: 'd6', face: 2, dropped: true },
        { shape: 'd6', face: 5, dropped: false },
        { shape: 'd6', face: 6, dropped: false },
      ],
      hidden: 0,
    });
  });

  it('o d100 vira dois d10 (dezenas e unidades), e 100 é 00 + 0', () => {
    const labels = (value: number) =>
      diceToShow(roll(dice(100, [value]))).dice.map((d) => faceLabel(d.shape, d.face, d.tens));
    expect(labels(37)).toEqual(['30', '7']);
    expect(labels(40)).toEqual(['40', '0']);
    expect(labels(7)).toEqual(['00', '7']);
    expect(labels(100)).toEqual(['00', '0']);
  });

  it('dados sem forma e o excesso ficam de fora, contados', () => {
    expect(diceToShow(roll(dice(3, [2]), dice(20, [1]))).hidden).toBe(1);
    const many = diceToShow(
      roll(
        dice(
          6,
          Array.from({ length: 14 }, () => 3),
        ),
      ),
    );
    expect(many.dice).toHaveLength(MAX_VISUAL_DICE);
    expect(many.hidden).toBe(14 - MAX_VISUAL_DICE);
  });
});
