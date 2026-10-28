import {
  compileTemplate,
  computeDerived,
  createSheet,
  emptyIndex,
  type LayoutNode,
  prepareSubmission,
  type SystemTemplate,
} from '@tabula/domain';
import { describe, expect, it } from 'vitest';
import chamadoCthulhu from '../community/chamado-cthulhu-7e-fan.json';
import dualidade from '../community/dualidade.json';
import ordemParanormal from '../community/ordem-paranormal-fan.json';
import tormenta20 from '../community/tormenta20-fan.json';
import { BUILTIN_TEMPLATES } from './index';

const COMMUNITY = [dualidade, ordemParanormal, chamadoCthulhu, tormenta20] as SystemTemplate[];

describe.each(COMMUNITY.map((template) => [template.id, template] as const))(
  'sistema da comunidade %s',
  (_, template) => {
    it('passa pelas regras de publicação do repositório', () => {
      const result = prepareSubmission(JSON.stringify(template), {
        index: emptyIndex('2026-10-08T00:00:00.000Z'),
        submitter: 'paulo-vc',
        builtinIds: BUILTIN_TEMPLATES.map((t) => t.id),
      });
      expect(result).toMatchObject({ ok: true, value: { source: 'community' } });
    });

    it('não vem embutido no app', () => {
      expect(BUILTIN_TEMPLATES.some((t) => t.id === template.id)).toBe(false);
    });

    it('pede a v0.2 se usa recursos da ficha nova (a v0.1 esconderia campos)', () => {
      const json = JSON.stringify(template);
      const usesNewSheet = /"(tab|secondary|display)":/.test(json);
      if (usesNewSheet) expect(template.minAppVersion).toBe('0.2.0');
    });

    it('calcula uma ficha nova sem erros e mostra todos os campos', () => {
      const result = compileTemplate(template);
      if (!result.ok) throw new Error(result.error.map((i) => i.message).join('\n'));
      const sheet = createSheet(result.value, { id: 's', name: 'Teste', ownerId: 'u', now: 0 });
      const { computed, resourceMax } = computeDerived(result.value, sheet.values);
      expect(Object.entries({ ...computed, ...resourceMax }).filter(([, r]) => !r.ok)).toEqual([]);
      const fieldIds = (nodes: readonly LayoutNode[]): string[] =>
        nodes.flatMap((node) =>
          node.kind === 'field'
            ? [node.fieldId, ...(node.secondary ? [node.secondary] : [])]
            : fieldIds(node.children),
        );
      const shown = new Set(fieldIds(template.layouts.full));
      expect(template.fields.filter((f) => !shown.has(f.id)).map((f) => f.id)).toEqual([]);
    });
  },
);

describe('Dualidade (compatível com Daggerheart)', () => {
  const template = dualidade as SystemTemplate;
  const compiled = (() => {
    const result = compileTemplate(template);
    if (!result.ok) throw new Error(result.error.map((i) => i.message).join('\n'));
    return result.value;
  })();
  const base = createSheet(compiled, { id: 's', name: 'Teste', ownerId: 'u', now: 0 }).values;
  const calc = (values: Record<string, unknown>) => {
    const { computed, resourceMax } = computeDerived(compiled, { ...base, ...values } as never);
    const read = (result: { ok: boolean; value?: number } | undefined) =>
      result?.ok ? result.value : 'erro';
    return {
      value: (id: string) => read(computed[id] as never),
      max: (id: string) => read(resourceMax[id] as never),
    };
  };

  it('segue a DPCGL: sem a marca no título e com a atribuição exigida', () => {
    expect(template.name).not.toMatch(/daggerheart/i);
    expect(template.license).toBe('DPCGL');
    expect(template.description).toContain('Daggerheart System Reference Document 1.0');
    expect(template.description).toContain('Darrington Press Community Gaming License');
  });

  it('testes rolam os dados de dualidade (2d12)', () => {
    expect(template.checkDice).toBe('2d12');
  });

  it('patamar acompanha o nível', () => {
    expect([1, 2, 4, 5, 7, 8, 10].map((nivel) => calc({ nivel }).value('patamar'))).toEqual([
      1, 2, 2, 3, 3, 4, 4,
    ]);
  });

  it('limiares somam o nível; efeitos alteram Evasão e traços', () => {
    const item = (id: string, values: Record<string, unknown>) => ({ id, values });
    const { value, max } = calc({
      nivel: 3,
      limiar_maior_base: 7,
      limiar_grave_base: 15,
      armadura_base: 4,
      agilidade_base: 2,
      efeitos: [
        item('e1', { nome: 'Esquiva', alvo: 'evasao', valor: 1, ativo: true }),
        item('e2', { nome: 'Bênção', alvo: 'testes', valor: 1, ativo: false }),
      ],
    });
    expect(value('limiar_maior')).toBe(10);
    expect(value('limiar_grave')).toBe(18);
    expect(value('evasao')).toBe(11);
    expect(value('agilidade')).toBe(2);
    expect(max('espacos_armadura')).toBe(4);
    expect(max('esperanca')).toBe(6);
  });
});

describe('regras dos sistemas de fãs', () => {
  const calc = (template: SystemTemplate, values: Record<string, unknown>) => {
    const result = compileTemplate(template);
    if (!result.ok) throw new Error('não compila');
    const base = createSheet(result.value, { id: 's', name: 'T', ownerId: 'u', now: 0 }).values;
    const { computed } = computeDerived(result.value, { ...base, ...values } as never);
    return (id: string) => {
      const r = computed[id] as { ok: boolean; value?: number } | undefined;
      return r?.ok ? r.value : 'erro';
    };
  };

  it('Ordem Paranormal: PV, PE e SAN pela classe e pelo NEX', () => {
    const op = ordemParanormal as SystemTemplate;
    const comb = calc(op, { classe: 'combatente', nex: 5, vig: 2, pre: 1 });
    expect([comb('pv_max'), comb('pe_max'), comb('san_max')]).toEqual([22, 3, 12]);
    const ocult = calc(op, { classe: 'ocultista', nex: 20, vig: 1, pre: 3 });
    expect([ocult('nivel'), ocult('pv_max'), ocult('pe_max'), ocult('san_max')]).toEqual([
      4, 22, 28, 35,
    ]);
    expect(calc(op, { nex: 99 })('nivel')).toBe(20);
  });

  it('Chamado de Cthulhu: PV, PM, Corpo e Movimento', () => {
    const v = calc(chamadoCthulhu as SystemTemplate, {
      con: 60,
      tam: 70,
      pod: 55,
      for: 80,
      des: 75,
      idade: 45,
    });
    expect([v('pv_max'), v('pm_max'), v('corpo'), v('movimento'), v('for_metade')]).toEqual([
      13, 11, 1, 8, 40,
    ]);
  });

  it('Tormenta20: perícia treinada soma metade do nível, atributo e treino', () => {
    const v = calc(tormenta20 as SystemTemplate, { nivel: 7, des: 3, luta_treinada: true, for: 2 });
    expect([v('luta'), v('acrobacia'), v('defesa')]).toEqual([3 + 2 + 4, 3 + 3, 13]);
  });
});
