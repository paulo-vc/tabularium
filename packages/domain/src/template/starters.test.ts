import { describe, expect, it } from 'vitest';
import { computeDerived } from '../sheet/compute';
import { createSheet } from '../sheet/operations';
import { compileTemplate } from './compile';
import { SystemTemplateSchema } from './schema';
import { STARTERS, starterTemplate } from './starters';

describe('modelos prontos', () => {
  it.each(STARTERS.map((s) => [s.name, s.id] as const))(
    '%s é um sistema válido, que compila e gera ficha',
    (_, id) => {
      const template = starterTemplate(id, { id: 'meu', name: 'Meu Sistema' });
      expect(SystemTemplateSchema.safeParse(template).success).toBe(true);
      const compiled = compileTemplate(template);
      if (!compiled.ok) throw new Error(compiled.error.map((i) => i.message).join('; '));
      const sheet = createSheet(compiled.value, { id: 's', name: 'Lia', ownerId: 'u', now: 0 });
      expect(sheet.templateRef.id).toBe('meu');
    },
  );

  it('no d20, a perícia soma a proficiência só quando marcada', () => {
    const compiled = compileTemplate(starterTemplate('d20', { id: 'meu', name: 'Meu' }));
    if (!compiled.ok) throw new Error('não compilou');
    const values = { for: 16, nivel: 5, prof_atletismo: false };
    const derived = (v: Record<string, unknown>) =>
      computeDerived(compiled.value, v as never, []).computed;
    expect(derived(values).atletismo).toEqual({ ok: true, value: 3 });
    expect(derived({ ...values, prof_atletismo: true }).atletismo).toEqual({ ok: true, value: 6 });
  });
});
