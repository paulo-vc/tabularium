import type { CustomDie } from '../dice/custom';
import { checkExpression, parseDice } from '../dice/dice';

/** O que o Mestre digitou como iniciativa de uma criatura. */
export type InitiativeInput =
  { kind: 'valor'; value: number } | { kind: 'rolar'; expression: string };

/**
 * Interpreta a iniciativa digitada pelo Mestre para uma criatura:
 * - um número ("15") é o valor;
 * - um modificador ("+3", "-1") rola o dado dos testes do sistema com ele ("1d20+3");
 * - uma rolagem ("1d20+3", "2d12") é rolada como está.
 * `null` se não for nenhum desses.
 */
export function parseInitiativeInput(
  text: string,
  checkDice = '1d20',
  dice: readonly CustomDie[] = [],
): InitiativeInput | null {
  const input = text.trim().replace(/\s+/g, '');
  if (/^-?\d{1,3}$/.test(input)) return { kind: 'valor', value: Number(input) };
  const modifier = /^[+-]\d{1,3}$/.test(input) ? Number(input) : null;
  const expression = modifier !== null ? checkExpression(checkDice, modifier) : input.toLowerCase();
  if (!/d/.test(expression)) return null;
  return parseDice(expression, dice).ok ? { kind: 'rolar', expression } : null;
}
