import { describe, expect, it } from 'vitest';
import { compileTemplate } from '../template/compile';
import type { SystemTemplate } from '../template/schema';
import { conditionallyHidden } from './visibility';

const template = (overrides: Partial<SystemTemplate> = {}): SystemTemplate => ({
  id: 'regra-opcional',
  version: '1.0.0',
  name: 'Regra opcional',
  source: 'local',
  fields: [
    { id: 'usa_pd', key: 'usa_pd', label: 'Usar Determinação', type: 'boolean' },
    {
      id: 'san',
      key: 'san',
      label: 'Sanidade',
      type: 'resource',
      visibleWhen: { field: 'usa_pd', value: false },
    },
    {
      id: 'pd',
      key: 'pd',
      label: 'Determinação',
      type: 'resource',
      visibleWhen: { field: 'usa_pd', value: true },
    },
    { id: 'pv', key: 'pv', label: 'PV', type: 'resource' },
  ],
  layouts: { full: [{ kind: 'field', fieldId: 'pv' }] },
  ...overrides,
});

const compiled = (() => {
  const result = compileTemplate(template());
  if (!result.ok) throw new Error('modelo inválido');
  return result.value;
})();

describe('campos que só aparecem com uma regra', () => {
  it('sem a regra marcada, aparece a Sanidade; marcada, a Determinação', () => {
    expect([...conditionallyHidden(compiled, {})]).toEqual(['pd']);
    expect([...conditionallyHidden(compiled, { usa_pd: true })]).toEqual(['san']);
  });

  it('a condição precisa ser outro campo sim/não', () => {
    const wrong = compileTemplate(
      template({
        fields: [
          { id: 'pv', key: 'pv', label: 'PV', type: 'resource' },
          {
            id: 'pd',
            key: 'pd',
            label: 'Determinação',
            type: 'resource',
            visibleWhen: { field: 'pv', value: true },
          },
        ],
      }),
    );
    expect(wrong.ok).toBe(false);
    if (!wrong.ok) expect(wrong.error.map((i) => i.code)).toContain('condicao-invalida');
  });
});
