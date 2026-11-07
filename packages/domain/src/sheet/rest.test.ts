import { describe, expect, it } from 'vitest';
import { compileTemplate } from '../template/compile';
import type { SystemTemplate } from '../template/schema';
import { computeDerived } from './compute';
import { restChanges, restFields } from './rest';
import type { SheetValues } from './schema';

const TEMPLATE: SystemTemplate = {
  id: 'descanso',
  version: '1.0.0',
  name: 'Descanso',
  source: 'local',
  fields: [
    { id: 'nivel', key: 'nivel', label: 'Nível', type: 'number', default: 1 },
    {
      id: 'pv',
      key: 'pv',
      label: 'PV',
      type: 'resource',
      max: '@nivel * 10',
      default: 10,
      recover: { rest: 'longo' },
    },
    {
      id: 'dv',
      key: 'dv',
      label: 'Dados de Vida',
      type: 'resource',
      default: 1,
      recover: { rest: 'longo', amount: 'metade' },
    },
    {
      id: 'morte',
      key: 'morte',
      label: 'Falhas contra a morte',
      type: 'number',
      min: 0,
      max: 3,
      recover: { rest: 'curto' },
    },
    {
      id: 'exaustao',
      key: 'exaustao',
      label: 'Exaustão',
      type: 'number',
      min: 0,
      max: 6,
      recover: { rest: 'longo', amount: -1 },
    },
    { id: 'ouro', key: 'ouro', label: 'Ouro', type: 'number' },
  ],
  layouts: { full: [{ kind: 'field', fieldId: 'pv' }] },
};

const compiled = (() => {
  const result = compileTemplate(TEMPLATE);
  if (!result.ok) throw new Error('modelo inválido');
  return result.value;
})();

const changes = (values: SheetValues, rest: 'curto' | 'longo') =>
  restChanges(compiled, values, computeDerived(compiled, values, []), rest).map((c) => [
    c.fieldId,
    c.from,
    c.to,
  ]);

describe('descanso', () => {
  const tired: SheetValues = {
    nivel: 5,
    pv: { current: 12 },
    dv: { current: 1, max: 5 },
    morte: 2,
    exaustao: 2,
    ouro: 40,
  };

  it('o longo enche os PV, devolve metade dos Dados de Vida e tira um nível de exaustão', () => {
    expect(changes(tired, 'longo')).toEqual([
      ['pv', 12, 50],
      ['dv', 1, 3],
      ['morte', 2, 0],
      ['exaustao', 2, 1],
    ]);
  });

  it('o curto só recupera o que volta no curto', () => {
    expect(changes(tired, 'curto')).toEqual([['morte', 2, 0]]);
    expect(restFields(compiled, 'curto').map((f) => f.id)).toEqual(['morte']);
  });

  it('nada passa do máximo nem do mínimo, e o que já está cheio não entra', () => {
    const rested: SheetValues = {
      nivel: 1,
      pv: { current: 10 },
      dv: { current: 4, max: 5 },
      morte: 0,
      exaustao: 0,
    };
    expect(changes(rested, 'longo')).toEqual([['dv', 4, 5]]);
  });

  it('acima do máximo (PV de uma regra da casa), o descanso não baixa', () => {
    expect(changes({ nivel: 1, pv: { current: 14 } }, 'longo')).toEqual([]);
  });

  it('o valor novo do recurso mantém o resto (máximo digitado, temporários)', () => {
    const values: SheetValues = { dv: { current: 0, max: 4, temp: 2 } };
    const dv = restChanges(compiled, values, computeDerived(compiled, values, []), 'longo').find(
      (c) => c.fieldId === 'dv',
    );
    expect(dv?.value).toEqual({ current: 2, max: 4, temp: 2 });
  });
});
