import { err, ok, type Result } from '../result';
import type { CustomDie } from './custom';

/**
 * Notação de dados: termos somados ou subtraídos.
 *
 *   1d20+5      2d6 + 1d4 - 1      4d6kh3 (mantém os 3 maiores)      2d20kl1 (o menor)
 *   4dF         1dEsperanca+1dMedo (dados do sistema, ver `CustomDie`)
 *
 * Sem `eval` e com limites (quantidade de dados, faces, tamanho), porque a expressão vem de
 * fichas e sistemas de terceiros.
 */
export const DICE_LIMITS = {
  length: 100,
  terms: 20,
  /** Total de dados rolados numa expressão. */
  dice: 100,
  sides: 1000,
  constant: 1_000_000,
} as const;

export interface DiceTerm {
  kind: 'dados';
  sign: 1 | -1;
  count: number;
  sides: number;
  /** Manter só os maiores (`kh`) ou menores (`kl`). */
  keep?: { mode: 'maiores' | 'menores'; count: number } | undefined;
  /**
   * Dado do sistema: `sides` é o número de faces, o resultado é a face (de 1 a n) e soma o
   * `value` dela. Vai inteiro na rolagem, para quem recebe conferir sem ter o sistema.
   */
  custom?: CustomDie | undefined;
}

export interface ConstantTerm {
  kind: 'constante';
  sign: 1 | -1;
  value: number;
}

export type DiceExpression = (DiceTerm | ConstantTerm)[];

export interface DiceError {
  code: 'expressao-vazia' | 'expressao-invalida' | 'expressao-grande-demais';
  message: string;
}

const TERM = /^(\d*)d(\d+)(?:(kh|kl)(\d+))?$|^(\d+)$/;
const CUSTOM_TERM = /^(\d*)d([a-z][a-z0-9]*)$/;

/** Separa "fkh2" em dado "f" e "kh2", conferindo que o dado existe. */
function customTerm(
  text: string,
  dice: ReadonlyMap<string, CustomDie>,
): { die: CustomDie; keep?: [string, string] } | null {
  const exact = dice.get(text);
  if (exact) return { die: exact };
  const split = /^(.+?)(kh|kl)(\d+)$/.exec(text);
  const die = split && dice.get(split[1] as string);
  return die && split ? { die, keep: [split[2] as string, split[3] as string] } : null;
}

/**
 * Lê uma expressão de dados ("1d20+5"). Espaços são ignorados; "D" vale como "d".
 * `custom`: os dados do sistema (`4dF`), se houver.
 */
export function parseDice(
  source: string,
  custom: readonly CustomDie[] = [],
): Result<DiceExpression, DiceError> {
  const text = source.replace(/\s+/g, '').toLowerCase();
  if (text === '')
    return err({ code: 'expressao-vazia', message: 'Informe os dados (ex.: 1d20+5)' });
  if (source.length > DICE_LIMITS.length) {
    return err({ code: 'expressao-grande-demais', message: 'Expressão longa demais' });
  }
  const invalid = err<DiceError>({
    code: 'expressao-invalida',
    message: `"${source.trim()}" não é uma rolagem válida (ex.: 2d6+3)`,
  });

  // Separa os termos mantendo o sinal: "1d20-2+1d4" → ["1d20", "-2", "+1d4"].
  const parts = text.match(/[+-]?[^+-]+/g);
  if (!parts || parts.join('') !== text) return invalid;
  if (parts.length > DICE_LIMITS.terms) {
    return err({ code: 'expressao-grande-demais', message: 'Termos demais na rolagem' });
  }

  const terms: DiceExpression = [];
  let totalDice = 0;
  for (const part of parts) {
    const sign: 1 | -1 = part.startsWith('-') ? -1 : 1;
    const body = part.replace(/^[+-]/, '');
    const match = TERM.exec(body);
    const customMatch = match ? null : CUSTOM_TERM.exec(body);
    if (customMatch) {
      const byId = new Map(custom.map((die) => [die.id.toLowerCase(), die]));
      const found = customTerm(customMatch[2] as string, byId);
      if (!found) {
        return err({
          code: 'expressao-invalida',
          message: `"d${customMatch[2] as string}" não é um dado deste sistema`,
        });
      }
      const count = customMatch[1] === '' ? 1 : Number(customMatch[1]);
      if (count < 1) return invalid;
      totalDice += count;
      if (totalDice > DICE_LIMITS.dice) {
        return err({
          code: 'expressao-grande-demais',
          message: `Mais de ${DICE_LIMITS.dice} dados`,
        });
      }
      const term: DiceTerm = {
        kind: 'dados',
        sign,
        count,
        sides: found.die.faces.length,
        custom: found.die,
      };
      if (found.keep) {
        const keep = Number(found.keep[1]);
        if (keep < 1 || keep > count) return invalid;
        term.keep = { mode: found.keep[0] === 'kh' ? 'maiores' : 'menores', count: keep };
      }
      terms.push(term);
      continue;
    }
    if (!match) return invalid;
    if (match[5] !== undefined) {
      const value = Number(match[5]);
      if (value > DICE_LIMITS.constant) return invalid;
      terms.push({ kind: 'constante', sign, value });
      continue;
    }
    const count = match[1] === '' ? 1 : Number(match[1]);
    const sides = Number(match[2]);
    if (count < 1 || sides < 1 || sides > DICE_LIMITS.sides) return invalid;
    totalDice += count;
    if (totalDice > DICE_LIMITS.dice) {
      return err({ code: 'expressao-grande-demais', message: `Mais de ${DICE_LIMITS.dice} dados` });
    }
    const term: DiceTerm = { kind: 'dados', sign, count, sides };
    if (match[3]) {
      const keep = Number(match[4]);
      if (keep < 1 || keep > count) return invalid;
      term.keep = { mode: match[3] === 'kh' ? 'maiores' : 'menores', count: keep };
    }
    terms.push(term);
  }
  return ok(terms);
}

/** Texto canônico da expressão: "1d20 + 5", "4d6kh3 - 1". */
export function printDice(expression: DiceExpression): string {
  return expression
    .map((term, index) => {
      const body =
        term.kind === 'constante'
          ? String(term.value)
          : `${term.count}d${term.custom ? term.custom.id : term.sides}${term.keep ? `${term.keep.mode === 'maiores' ? 'kh' : 'kl'}${term.keep.count}` : ''}`;
      if (index === 0) return term.sign < 0 ? `-${body}` : body;
      return `${term.sign < 0 ? '-' : '+'} ${body}`;
    })
    .join(' ');
}

/** Sorteia um inteiro de 1 a `sides` (uniforme). Injetado: criptográfico no app, fixo nos testes. */
export type DieRoller = (sides: number) => number;

export interface DieResult {
  value: number;
  /** Fora dos mantidos (kh/kl): aparece riscado e não soma. */
  dropped: boolean;
}

export type TermResult =
  (DiceTerm & { results: DieResult[]; subtotal: number }) | (ConstantTerm & { subtotal: number });

export interface RollResult {
  expression: string;
  terms: TermResult[];
  total: number;
}

export function rollDice(expression: DiceExpression, roll: DieRoller): RollResult {
  const terms = expression.map((term): TermResult => {
    if (term.kind === 'constante') return { ...term, subtotal: term.sign * term.value };
    const values = Array.from({ length: term.count }, () => roll(term.sides));
    const kept = new Set<number>();
    if (term.keep) {
      // Índices ordenados pelo valor (o da face, num dado do sistema); empate: o primeiro fica.
      const order = values
        .map((face, index) => ({ value: faceValue(term, face), index }))
        .sort((a, b) =>
          term.keep?.mode === 'maiores'
            ? b.value - a.value || a.index - b.index
            : a.value - b.value || a.index - b.index,
        );
      for (const { index } of order.slice(0, term.keep.count)) kept.add(index);
    }
    const results = values.map((value, index) => ({
      value,
      dropped: term.keep !== undefined && !kept.has(index),
    }));
    const sum = results.reduce(
      (total, die) => total + (die.dropped ? 0 : faceValue(term, die.value)),
      0,
    );
    return { ...term, results, subtotal: term.sign * sum };
  });
  return {
    expression: printDice(expression),
    terms,
    total: terms.reduce((total, term) => total + term.subtotal, 0),
  };
}

/** Quanto soma a face sorteada: ela mesma, ou o valor dela num dado do sistema. */
export function faceValue(term: Pick<DiceTerm, 'custom'>, face: number): number {
  return term.custom ? (term.custom.faces[face - 1]?.value ?? 0) : face;
}

/** O que aparece na face: o número, ou o rótulo dela num dado do sistema. */
export function faceText(term: Pick<DiceTerm, 'custom'>, face: number): string {
  return term.custom ? (term.custom.faces[face - 1]?.label ?? '?') : String(face);
}

/** Como rolar um teste: normal, com vantagem (dois dados, o maior) ou desvantagem (o menor). */
export type RollMode = 'normal' | 'vantagem' | 'desvantagem';

/** O dado dos testes, se for um só dado comum ("1d20"): só aí valem vantagem e crítico. */
function singleCheckDie(checkDice: string): DiceTerm | null {
  const parsed = parseDice(checkDice);
  if (!parsed.ok || parsed.value.length !== 1) return null;
  const [term] = parsed.value;
  return term?.kind === 'dados' && term.sign === 1 && term.count === 1 && !term.keep ? term : null;
}

/** O sistema rola os testes com um dado só ("1d20")? Aí a ficha oferece vantagem. */
export function supportsRollMode(checkDice: string): boolean {
  return singleCheckDie(checkDice) !== null;
}

/** Máximo de dados num teste rolado pelo valor de um campo (ex.: atributo 5 → 5d20). */
export const CHECK_DICE_MAX = 20;

/**
 * Rolagem de um teste: o dado do sistema (ex.: 1d20) mais o modificador. Com vantagem ou
 * desvantagem, dois dados ficando com o maior ou o menor ("2d20kh1+5"), se o dado dos testes
 * for um só; senão, a rolagem fica normal.
 *
 * `count`: quantos dados rolar (o atributo, na Ordem Paranormal), ficando com o maior; com 0
 * ou menos, rola dois (três com -1…) e fica com o menor. Vantagem soma um dado e
 * desvantagem tira um.
 */
export function checkExpression(
  checkDice: string,
  modifier: number,
  mode: RollMode = 'normal',
  count?: number,
): string {
  const single = mode === 'normal' && count === undefined ? null : singleCheckDie(checkDice);
  let base = checkDice;
  if (single && count !== undefined && Number.isFinite(count)) {
    const n = Math.trunc(count) + (mode === 'vantagem' ? 1 : mode === 'desvantagem' ? -1 : 0);
    const dice = Math.min(CHECK_DICE_MAX, n >= 1 ? n : 2 - n);
    base = n === 1 ? `1d${single.sides}` : `${dice}d${single.sides}${n >= 1 ? 'kh1' : 'kl1'}`;
  } else if (single && mode !== 'normal') {
    base = `2d${single.sides}${mode === 'vantagem' ? 'kh1' : 'kl1'}`;
  }
  if (modifier === 0) return base;
  return `${base}${modifier > 0 ? '+' : '-'}${Math.abs(modifier)}`;
}

/**
 * Acerto crítico: no primeiro termo, um dado só valendo (o que ficou, com vantagem) e na face
 * máxima, como o 20 natural no d20. Dados do sistema e várias faces somadas não contam.
 */
export function isCriticalRoll(result: RollResult): boolean {
  const first = result.terms[0];
  if (!first || first.kind !== 'dados' || first.custom || first.sign !== 1) return false;
  const kept = first.results.filter((die) => !die.dropped);
  return kept.length === 1 && first.sides > 1 && kept[0]?.value === first.sides;
}

/**
 * Dano de crítico: o dobro de dados em cada termo de dados ("1d8+3" → "2d8 + 3"). Se passar do
 * limite de dados, fica como está.
 */
export function criticalDamage(expression: string, custom: readonly CustomDie[] = []): string {
  const parsed = parseDice(expression, custom);
  if (!parsed.ok) return expression;
  let total = 0;
  const doubled = parsed.value.map((term) => {
    if (term.kind !== 'dados') return term;
    total += term.count * 2;
    return {
      ...term,
      count: term.count * 2,
      keep: term.keep && { ...term.keep, count: term.keep.count * 2 },
    };
  });
  return total > DICE_LIMITS.dice ? expression : printDice(doubled);
}

/** O resultado de dados que se comparam: o texto e, se houver, a cor do dado que venceu. */
export interface RollOutcome {
  label: string;
  color?: string | undefined;
}

/**
 * O resultado de dados que se comparam (ver `CustomDie.duel`): "com Esperança" quando o dado
 * de Esperança sai maior que o de Medo, por exemplo. Só vale com um dado de cada lado na
 * rolagem; sem comparação, nada.
 */
export function rollOutcome(result: RollResult): RollOutcome | undefined {
  const single = new Map<string, { value: number; term: DiceTerm }>();
  for (const term of result.terms) {
    if (term.kind !== 'dados' || !term.custom || term.count !== 1) continue;
    const die = term.results[0];
    const id = term.custom.id.toLowerCase();
    if (die && !single.has(id)) single.set(id, { value: faceValue(term, die.value), term });
  }
  for (const { value, term } of single.values()) {
    const duel = term.custom?.duel;
    const rival = duel && single.get(duel.against.toLowerCase());
    if (!duel || !rival || rival.term === term) continue;
    if (value > rival.value) return { label: duel.win, color: term.custom?.color };
    if (value < rival.value) {
      const back = rival.term.custom?.duel;
      return back && back.against.toLowerCase() === term.custom?.id.toLowerCase()
        ? { label: back.win, color: rival.term.custom?.color }
        : undefined;
    }
    const tie = duel.tie ?? rival.term.custom?.duel?.tie;
    return tie ? { label: tie } : undefined;
  }
  return undefined;
}

/**
 * Resumo legível: "1d20 + 5 → [14] + 5 = 19". Dados descartados aparecem entre parênteses.
 * O resultado de dados que se comparam vem no fim ("· com Esperança"), a não ser que a tela o
 * mostre à parte (`withOutcome` falso).
 */
export function describeRoll(result: RollResult, withOutcome = true): string {
  const parts = result.terms.map((term, index) => {
    const body =
      term.kind === 'constante'
        ? String(term.value)
        : `[${term.results.map((die) => (die.dropped ? `(${faceText(term, die.value)})` : faceText(term, die.value))).join(', ')}]`;
    if (index === 0) return term.sign < 0 ? `-${body}` : body;
    return `${term.sign < 0 ? '-' : '+'} ${body}`;
  });
  const outcome = withOutcome ? rollOutcome(result) : undefined;
  return `${result.expression} → ${parts.join(' ')} = ${result.total}${outcome ? ` · ${outcome.label}` : ''}`;
}
