import { describe, expect, it } from 'vitest';
import { initiativeExpression } from '../initiative/roll';
import { compileTemplate } from '../template/compile';
import type { SystemTemplate } from '../template/schema';
import { checkDiceCount } from './check';
import { computeDerived } from './compute';

const template = (from = 'agi'): SystemTemplate => ({
  id: 'dados-atributo',
  version: '1.0.0',
  name: 'Dados pelo atributo',
  source: 'local',
  checkDice: '1d20',
  initiative: 'iniciativa',
  fields: [
    { id: 'agi', key: 'agi', label: 'Agilidade', type: 'number', default: 1 },
    { id: 'treino', key: 'treino', label: 'Treino', type: 'number' },
    {
      id: 'iniciativa',
      key: 'iniciativa',
      label: 'Iniciativa',
      type: 'computed',
      formula: '@treino',
      signed: true,
      checkDiceFrom: from,
    },
  ],
  layouts: { full: [{ kind: 'field', fieldId: 'iniciativa' }] },
});

describe('dados do teste pelo valor de um campo', () => {
  it('a perícia rola tantos dados quanto o atributo', () => {
    const result = compileTemplate(template());
    if (!result.ok) throw new Error('modelo inválido');
    const compiled = result.value;
    const values = { agi: 3, treino: 5 };
    const derived = computeDerived(compiled, values, []);
    expect(checkDiceCount(compiled, values, derived, 'iniciativa')).toBe(3);
    expect(initiativeExpression(compiled, values, derived)).toBe('3d20kh1+5');
  });

  it('a origem precisa ser outro número ou calculado', () => {
    const wrong = compileTemplate(template('iniciativa'));
    expect(wrong.ok).toBe(false);
    if (!wrong.ok) expect(wrong.error.map((i) => i.code)).toContain('dados-invalidos');
  });
});
