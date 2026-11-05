import { describe, expect, it } from 'vitest';
import {
  addCombatant,
  damageCombatant,
  publicView,
  startCombat,
  type Combatant,
} from '../initiative/tracker';
import { validateTemplate } from '../template/validate';
import { TEMPLATE_MAX_BYTES } from '../template/compile';
import type { SystemTemplate } from '../template/schema';
import { blankCreature, woundCondition, type Creature } from './schema';

const goblin: Creature = {
  id: 'goblin',
  name: 'Goblin',
  kind: 'Humanoide pequeno',
  hp: 7,
  initiative: '+2',
  stats: [{ label: 'CA', value: '15' }],
  attacks: [{ id: 'cimitarra', name: 'Cimitarra', roll: '1d20+4', damage: '1d6+2' }],
  text: '**Fuga Ágil.** Desengaja como ação bônus.',
};

const system = (extra: Partial<SystemTemplate> = {}): SystemTemplate => ({
  id: 'teste',
  version: '1.0.0',
  name: 'Teste',
  source: 'local',
  fields: [{ id: 'nome', key: 'nome', label: 'Nome', type: 'text' }],
  layouts: { full: [{ kind: 'field', fieldId: 'nome' }] },
  ...extra,
});

const codes = (template: SystemTemplate) => {
  const result = validateTemplate(template);
  return result.ok ? [] : result.error.map((issue) => issue.code);
};

describe('estado da criatura', () => {
  it('ilesa, ferida, muito ferida e caída', () => {
    expect([10, 9, 6, 5, 1, 0].map((hp) => woundCondition(hp, 10))).toEqual([
      'ilesa',
      'ferida',
      'ferida',
      'muito-ferida',
      'muito-ferida',
      'caida',
    ]);
  });

  it('criatura em branco com as características do sistema', () => {
    expect(blankCreature('x', ['CA', 'ND']).stats).toEqual([
      { label: 'CA', value: '' },
      { label: 'ND', value: '' },
    ]);
  });
});

describe('criaturas no combate', () => {
  const creature = (hp: number): Combatant => ({
    id: 'g1',
    name: 'Goblin 1',
    initiative: 12,
    kind: 'npc',
    hidden: false,
    hp: { value: hp, max: 7 },
    creature: { origin: 'sistema', id: 'goblin' },
  });

  it('dano e cura ficam entre 0 e o máximo', () => {
    let tracker = addCombatant(startCombat([]), creature(7));
    tracker = damageCombatant(tracker, 'g1', 5);
    expect(tracker.combatants[0]?.hp).toEqual({ value: 2, max: 7 });
    tracker = damageCombatant(tracker, 'g1', 10);
    expect(tracker.combatants[0]?.hp?.value).toBe(0);
    tracker = damageCombatant(tracker, 'g1', -20);
    expect(tracker.combatants[0]?.hp?.value).toBe(7);
  });

  it('os jogadores veem só o estado, sem o PV nem a ficha', () => {
    const tracker = addCombatant(startCombat([]), creature(3));
    const [seen] = publicView(tracker).combatants;
    expect(seen).toEqual({
      id: 'g1',
      name: 'Goblin 1',
      initiative: 12,
      kind: 'npc',
      condition: 'muito-ferida',
    });
  });
});

describe('códice e bestiário no sistema', () => {
  it('sistema com códice e criaturas válidas', () => {
    expect(
      codes(
        system({
          codex: [{ id: 'p1', title: 'Fúria', body: '# Fúria' }],
          bestiary: [goblin],
          creatureStats: ['CA'],
        }),
      ),
    ).toEqual([]);
  });

  it('acusa páginas com o mesmo título e criaturas repetidas', () => {
    expect(
      codes(
        system({
          codex: [
            { id: 'p1', title: 'Fúria', body: '' },
            { id: 'p2', title: 'fúria', body: '' },
          ],
          bestiary: [goblin, goblin],
        }),
      ),
    ).toEqual(['titulo-repetido', 'criatura-repetida']);
  });

  it('acusa rolagens e iniciativas que não rolam', () => {
    const broken: Creature = {
      ...goblin,
      initiative: 'rápido',
      attacks: [{ id: 'a', name: 'Mordida', roll: '1d20+x', damage: '2d4+2' }],
    };
    expect(codes(system({ bestiary: [broken] }))).toEqual([
      'iniciativa-de-criatura-invalida',
      'rolagem-de-criatura-invalida',
    ]);
  });

  it('acusa um sistema grande demais para a sessão', () => {
    const body = 'a'.repeat(19_000);
    const codex = Array.from({ length: Math.ceil(TEMPLATE_MAX_BYTES / 19_000) + 1 }, (_, i) => ({
      id: `p${i}`,
      title: `Página ${i}`,
      body,
    }));
    expect(codes(system({ codex }))).toEqual(['sistema-grande-demais']);
  });
});
