import type { CustomDie } from '../dice/custom';
import { parseDice } from '../dice/dice';
import { parseInitiativeInput } from '../initiative/input';
import type { Issue } from '../result';
import type { Creature } from './schema';

/**
 * Problemas de uma criatura que o formato não pega: iniciativa e rolagens dos ataques que
 * não rolam com os dados do sistema. `path` é relativo à criatura.
 */
export function creatureProblems(
  creature: Creature,
  checkDice: string | undefined,
  dice: readonly CustomDie[] | undefined,
): Issue[] {
  const problems: Issue[] = [];
  const initiative = creature.initiative?.trim();
  if (initiative && !parseInitiativeInput(initiative, checkDice, dice)) {
    problems.push({
      code: 'iniciativa-de-criatura-invalida',
      path: ['initiative'],
      message: `${creature.name}: iniciativa inválida ("${initiative}"). Use um número (15), um modificador (+2) ou uma rolagem (1d20+2)`,
    });
  }
  creature.attacks.forEach((attack, index) => {
    for (const property of ['roll', 'damage'] as const) {
      const roll = attack[property]?.trim();
      if (!roll) continue;
      const parsed = parseDice(roll, dice);
      if (!parsed.ok) {
        problems.push({
          code: 'rolagem-de-criatura-invalida',
          path: ['attacks', index, property],
          message: `${creature.name}, ${attack.name}: ${parsed.error.message}`,
        });
      }
    }
  });
  return problems;
}
