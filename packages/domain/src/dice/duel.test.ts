import { describe, expect, it } from 'vitest';
import { compileTemplate } from '../template/compile';
import type { SystemTemplate } from '../template/schema';
import type { CustomDie } from './custom';
import { describeRoll, parseDice, rollDice, rollOutcome } from './dice';
import { RollEntrySchema } from './log';

const d12 = Array.from({ length: 12 }, (_, i) => ({ label: String(i + 1), value: i + 1 }));
const HOPE: CustomDie = {
  id: 'Esperanca',
  name: 'Esperança',
  color: '#d4a017',
  faces: d12,
  duel: { against: 'Medo', win: 'com Esperança', tie: 'crítico' },
};
const FEAR: CustomDie = {
  id: 'Medo',
  name: 'Medo',
  faces: d12,
  duel: { against: 'Esperanca', win: 'com Medo', tie: 'crítico' },
};
const DICE = [HOPE, FEAR];

/** Sorteia as faces na ordem dada. */
const sequence = (...faces: number[]) => {
  let i = 0;
  return () => faces[i++ % faces.length] as number;
};

function roll(notation: string, ...faces: number[]) {
  const dice = parseDice(notation, DICE);
  if (!dice.ok) throw new Error(dice.error.message);
  return rollDice(dice.value, sequence(...faces));
}

describe('dados que se comparam (dualidade)', () => {
  it('o dado maior decide: "com Esperança" ou "com Medo"; empate é crítico', () => {
    expect(rollOutcome(roll('1dEsperanca+1dMedo+2', 9, 4))?.label).toBe('com Esperança');
    expect(rollOutcome(roll('1dEsperanca+1dMedo+2', 3, 11))?.label).toBe('com Medo');
    expect(rollOutcome(roll('1dMedo+1dEsperanca', 11, 3))?.label).toBe('com Medo');
    expect(rollOutcome(roll('1dEsperanca+1dMedo', 7, 7))).toEqual({ label: 'crítico' });
  });

  it('o resultado leva a cor do dado que venceu', () => {
    expect(rollOutcome(roll('1dEsperanca+1dMedo', 9, 4))).toEqual({
      label: 'com Esperança',
      color: '#d4a017',
    });
  });

  it('o resumo da rolagem mostra o resultado depois do total', () => {
    expect(describeRoll(roll('1dEsperanca+1dMedo+2', 9, 4))).toBe(
      '1dEsperanca + 1dMedo + 2 → [9] + [4] + 2 = 15 · com Esperança',
    );
  });

  it('sem os dois dados, ou com mais de um de cada, não há comparação', () => {
    expect(rollOutcome(roll('1dEsperanca+2', 9))).toBeUndefined();
    expect(rollOutcome(roll('2dEsperanca+1dMedo', 9, 1, 4))).toBeUndefined();
    expect(rollOutcome(roll('1d20+3', 12))).toBeUndefined();
  });

  it('a comparação vai na rolagem: quem recebe mostra o resultado sem ter o sistema', () => {
    const entry = RollEntrySchema.parse({
      id: 'r1',
      at: 1,
      authorId: 'ana',
      authorName: 'Ana',
      label: 'Agilidade',
      result: roll('1dEsperanca+1dMedo', 2, 10),
      secret: false,
    });
    expect(rollOutcome(entry.result)?.label).toBe('com Medo');
  });

  it('o sistema recusa comparar com um dado que ele não tem', () => {
    const template: SystemTemplate = {
      id: 'duelo',
      version: '1.0.0',
      name: 'Duelo',
      source: 'local',
      dice: [{ ...HOPE, duel: { against: 'Raiva', win: 'com Esperança' } }],
      fields: [],
      layouts: { full: [] },
    };
    const result = compileTemplate(template);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.map((problem) => problem.code)).toContain('dado-sem-rival');
    }
  });
});
