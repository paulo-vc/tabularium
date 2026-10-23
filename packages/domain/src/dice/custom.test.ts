import { describe, expect, it } from 'vitest';
import { parseChatInput } from '../chat/schema';
import { CustomDieSchema, type CustomDie } from './custom';
import { describeRoll, parseDice, rollDice } from './dice';
import { RollEntrySchema, type RollEntry } from './log';
import { diceToShow } from './visual';

const FATE: CustomDie = {
  id: 'F',
  name: 'Dado Fate',
  faces: [
    { label: '−', value: -1 },
    { label: '−', value: -1 },
    { label: '0', value: 0 },
    { label: '0', value: 0 },
    { label: '+', value: 1 },
    { label: '+', value: 1 },
  ],
};
const HOPE: CustomDie = {
  id: 'Esperanca',
  name: 'Esperança',
  color: '#d4a017',
  faces: Array.from({ length: 12 }, (_, i) => ({ label: String(i + 1), value: i + 1 })),
};

/** Sorteia as faces na ordem dada. */
const sequence = (...faces: number[]) => {
  let i = 0;
  return () => faces[i++ % faces.length] as number;
};

const entry = (result: RollEntry['result']): RollEntry => ({
  id: 'r1',
  at: 1,
  authorId: 'ana',
  authorName: 'Ana',
  label: '',
  result,
  secret: false,
});

describe('dados do sistema', () => {
  it('só aceita 4, 6, 8, 10, 12 ou 20 faces', () => {
    expect(CustomDieSchema.safeParse(FATE).success).toBe(true);
    expect(CustomDieSchema.safeParse({ ...FATE, faces: FATE.faces.slice(0, 5) }).success).toBe(
      false,
    );
  });

  it('4dF soma o valor das faces e mostra os rótulos', () => {
    const parsed = parseDice('4dF+2', [FATE]);
    if (!parsed.ok) throw new Error(parsed.error.message);
    // Faces 6 (+), 1 (−), 5 (+), 3 (0): +1 −1 +1 0 = 1, mais 2.
    const result = rollDice(parsed.value, sequence(6, 1, 5, 3));
    expect(result.total).toBe(3);
    expect(describeRoll(result)).toBe('4dF + 2 → [+, −, +, 0] + 2 = 3');
  });

  it('maiúsculas não importam, e kh/kl usam o valor da face', () => {
    const parsed = parseDice('4dfkh2', [FATE]);
    if (!parsed.ok) throw new Error(parsed.error.message);
    const result = rollDice(parsed.value, sequence(1, 6, 3, 5));
    expect(result.total).toBe(2);
  });

  it('dado que o sistema não tem é recusado, com o motivo', () => {
    const parsed = parseDice('2dF');
    expect(parsed.ok).toBe(false);
    if (!parsed.ok) expect(parsed.error.message).toContain('não é um dado deste sistema');
  });

  it('a rolagem leva as faces: quem recebe confere sem ter o sistema', () => {
    const parsed = parseDice('1dEsperanca+4dF', [FATE, HOPE]);
    if (!parsed.ok) throw new Error(parsed.error.message);
    const result = rollDice(parsed.value, sequence(9, 6, 6, 1, 3));
    expect(RollEntrySchema.safeParse(entry(result)).success).toBe(true);
    // Trocar o valor de uma face no caminho não passa.
    const forged = JSON.parse(JSON.stringify(result)) as typeof result;
    const term = forged.terms[1];
    if (term?.kind === 'dados' && term.custom) term.custom.faces[5] = { label: '+', value: 5 };
    expect(RollEntrySchema.safeParse(entry(forged)).success).toBe(false);
  });

  it('na bandeja, o dado tem a forma pelas faces, os rótulos e a cor fixa', () => {
    const parsed = parseDice('1dEsperanca+1dF', [FATE, HOPE]);
    if (!parsed.ok) throw new Error(parsed.error.message);
    const { dice } = diceToShow(rollDice(parsed.value, sequence(7, 5)));
    expect(dice).toEqual([
      expect.objectContaining({ shape: 'd12', face: 7, color: '#d4a017' }),
      expect.objectContaining({ shape: 'd6', face: 5, labels: ['−', '−', '0', '0', '+', '+'] }),
    ]);
  });

  it('no chat, dado do sistema precisa da quantidade (para "dano" não virar dado)', () => {
    expect(parseChatInput('/r 4dF+1 Atletismo')).toEqual({
      kind: 'rolagem',
      expression: '4dF+1',
      label: 'Atletismo',
    });
    expect(parseChatInput('/r 2d6 dano de fogo')).toEqual({
      kind: 'rolagem',
      expression: '2d6',
      label: 'dano de fogo',
    });
  });
});
