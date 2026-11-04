import {
  compareVersions,
  compileTemplate,
  computeDerived,
  createSheet,
  emptyIndex,
  type Bonus,
  prepareSubmission,
  type SystemTemplate,
} from '@tabula/domain';
import { describe, expect, it } from 'vitest';
import dualidade from '../community/dualidade.json';
import pathfinder from '../community/pathfinder-2e.json';
import { BUILTIN_TEMPLATES, RETIRED_TEMPLATES } from './index';

const COMMUNITY: SystemTemplate[] = [dualidade as SystemTemplate, pathfinder as SystemTemplate];

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
      if (usesNewSheet) {
        expect(compareVersions(template.minAppVersion ?? '0.0.0', '0.2.0')).toBeGreaterThanOrEqual(
          0,
        );
      }
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

  it('testes rolam os dados de Esperança e Medo, e o maior dá o resultado', () => {
    expect(template.checkDice).toBe('1dEsperanca+1dMedo');
    expect(template.dice?.map((die) => [die.id, die.faces.length, die.duel?.win])).toEqual([
      ['Esperanca', 12, 'com Esperança'],
      ['Medo', 12, 'com Medo'],
    ]);
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

describe('Pathfinder 2e (fã)', () => {
  const template = pathfinder as SystemTemplate;
  const compiled = (() => {
    const result = compileTemplate(template);
    if (!result.ok) throw new Error(result.error.map((i) => i.message).join('\n'));
    return result.value;
  })();
  const base = createSheet(compiled, { id: 's', name: 'Teste', ownerId: 'u', now: 0 }).values;
  const calc = (values: Record<string, unknown>, bonuses: Bonus[] = []) => {
    const { computed, resourceMax } = computeDerived(
      compiled,
      { ...base, ...values } as never,
      bonuses,
    );
    const read = (result: { ok: boolean; value?: number } | undefined) =>
      result?.ok ? result.value : 'erro';
    return {
      value: (id: string) => read(computed[id] as never),
      max: (id: string) => read(resourceMax[id] as never),
    };
  };

  it('traz os avisos da política da Paizo e da licença ORC', () => {
    expect(template.description).toContain("Paizo's Community Use Policy");
    expect(template.description).toContain(
      'is not published, endorsed, or specifically approved by Paizo',
    );
    expect(template.description).toContain('TX 9-307-067');
    expect(template.description).toContain('Player Core © 2023 Paizo Inc.');
  });

  it('é a continuação do Lendas d20, que vinha no app: as fichas antigas se atualizam', () => {
    const retired = RETIRED_TEMPLATES.find((t) => t.id === template.id);
    expect(retired).toBeDefined();
    expect(compareVersions(template.version, retired?.version ?? '')).toBeGreaterThan(0);
    // Só o número do meio muda, para as fichas se atualizarem sozinhas.
    expect(template.version.split('.')[0]).toBe(retired?.version.split('.')[0]);
  });

  it('proficiência: grau + nível se treinado; só o atributo se destreinado', () => {
    const { value } = calc({ nivel: 5, for: 4, prof_atletismo: 'treinado' });
    expect(value('atletismo')).toBe(4 + 2 + 5);
    expect(value('acrobatismo')).toBe(0);
    expect(calc({ nivel: 20, for: 7, prof_atletismo: 'lendario' }).value('atletismo')).toBe(
      7 + 8 + 20,
    );
  });

  it('salvaguardas, Percepção e CD de classe começam treinadas', () => {
    const { value } = calc({ nivel: 1, con: 2, sab: 1, des: 3, atributo_chave: 'des' });
    expect(value('fortitude')).toBe(2 + 3);
    expect(value('reflexos')).toBe(3 + 3);
    expect(value('percepcao')).toBe(1 + 3);
    expect(value('cd_classe')).toBe(10 + 3 + 3);
  });

  it('CA: limite de Destreza, armadura e escudo erguido', () => {
    expect(calc({ nivel: 1, des: 3 }).value('ca')).toBe(10 + 3 + 3);
    expect(calc({ nivel: 1, des: 3, limite_des: 1, bonus_armadura: 4 }).value('ca')).toBe(
      10 + 1 + 3 + 4,
    );
    expect(calc({ nivel: 1, des: 0, escudo_erguido: true, escudo_ca: 2 }).value('ca')).toBe(
      10 + 0 + 3 + 2,
    );
  });

  it('PV: ancestralidade + (classe + Constituição) × nível', () => {
    const { max } = calc({ nivel: 3, con: 2, pv_ancestralidade: 8, pv_classe: 10 });
    expect(max('pv')).toBe(8 + (10 + 2) * 3);
    expect(calc({ ferido: 1 }).max('moribundo')).toBe(3);
  });

  it('magia, bônus e volume', () => {
    const item = (id: string, values: Record<string, unknown>) => ({ id, values });
    const { value } = calc(
      {
        nivel: 3,
        sab: 4,
        atributo_magia: 'sab',
        prof_magia: 'treinado',
        equipamento: [
          item('a', { nome: 'Armadura', qtd: 1, volume: 2, investido: false }),
          item('b', { nome: 'Rações', qtd: 5, volume: 0.1, investido: false }),
          item('c', { nome: 'Anel', qtd: 1, volume: 0, investido: true }),
        ],
      },
      [
        bonus('medo', 'Amedrontado 1', [
          { fieldId: 'medicina', value: -1 },
          { fieldId: 'cd_magia', value: -1 },
        ]),
      ],
    );
    expect(value('mod_magia')).toBe(4);
    expect(value('ataque_magia')).toBe(4 + 2 + 3);
    expect(value('cd_magia')).toBe(10 + 4 + 5 - 1);
    expect(value('medicina')).toBe(4 - 1);
    expect(value('volume_total')).toBe(2);
    expect(value('investidos')).toBe(1);
  });
});

function bonus(id: string, name: string, targets: Bonus['targets']): Bonus {
  return { id, name, kind: 'outro', active: true, targets };
}
