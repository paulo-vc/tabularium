import { z } from 'zod';
import {
  CREATURE_HP_MAX,
  WOUND_CONDITIONS,
  woundCondition,
  type CreatureOrigin,
} from '../bestiary/schema';
import { IdSchema, LabelSchema } from '../schema/primitives';

/** Participantes de um combate (jogadores + inimigos e aliados do Mestre). */
export const COMBATANT_LIMIT = 40;
export const INITIATIVE_RANGE = 999;

/** Condições marcadas num participante ("Caído", "Envenenado"): a mesa toda vê. */
export const EFFECT_LIMIT = 12;
export const EFFECT_MAX_LENGTH = 40;
const EffectSchema = z.string().trim().min(1).max(EFFECT_MAX_LENGTH);
/** Duração de uma condição, em rodadas (ex.: "Atordoado por 1 rodada"). */
export const EFFECT_ROUNDS_MAX = 99;
const ROUND_MAX = 9999;

const InitiativeSchema = z.number().int().min(-INITIATIVE_RANGE).max(INITIATIVE_RANGE);

export const CombatantSchema = z.object({
  id: IdSchema,
  name: LabelSchema,
  initiative: InitiativeSchema,
  /** Jogador da mesa (com a ficha na sessão) ou criatura controlada pelo Mestre. */
  kind: z.enum(['jogador', 'npc']),
  /** Do jogador: assim ele reconhece a própria vez. */
  userId: IdSchema.optional(),
  /** Só o Mestre vê (ex.: o monstro que ainda não apareceu). */
  hidden: z.boolean(),
  /** PV da criatura (só o Mestre vê o número; os jogadores, o estado aproximado). */
  hp: z
    .object({
      value: z.number().int().min(0).max(CREATURE_HP_MAX),
      max: z.number().int().min(1).max(CREATURE_HP_MAX),
    })
    .optional(),
  /** Criatura de um bestiário: abre a ficha dela (ataques, habilidades) no painel do Mestre. */
  creature: z
    .object({ origin: z.enum(['sistema', 'campanha'] satisfies CreatureOrigin[]), id: IdSchema })
    .optional(),
  /** Condições do participante, na ordem em que foram marcadas. */
  effects: z.array(EffectSchema).max(EFFECT_LIMIT).optional(),
  /**
   * Condições com duração: a última rodada em que a condição ainda vale. Ela acaba quando
   * termina a vez do participante nessa rodada.
   */
  effectUntil: z
    .record(
      EffectSchema,
      z
        .number()
        .int()
        .min(1)
        .max(ROUND_MAX + EFFECT_ROUNDS_MAX),
    )
    .optional(),
});
export type Combatant = z.infer<typeof CombatantSchema>;

const uniqueIds = (combatants: readonly { id: string }[]) =>
  new Set(combatants.map((c) => c.id)).size === combatants.length;

/**
 * Ordem de turno do combate, do lado do Mestre. `preparando`: as iniciativas estão sendo
 * definidas; `combate`: `activeId` age agora, na rodada `round`.
 */
export const TrackerSchema = z
  .object({
    phase: z.enum(['preparando', 'combate']),
    round: z.number().int().min(1).max(ROUND_MAX),
    activeId: IdSchema.nullable(),
    combatants: z.array(CombatantSchema).max(COMBATANT_LIMIT),
  })
  .refine((t) => uniqueIds(t.combatants), 'Participante repetido')
  .refine(
    (t) => t.activeId === null || t.combatants.some((c) => c.id === t.activeId),
    'Turno de quem não está no combate',
  );
export type Tracker = z.infer<typeof TrackerSchema>;

/**
 * O que os jogadores recebem: sem os ocultos. Na vez de um oculto, ninguém aparece como
 * ativo (`activeId` nulo), e o jogador vê "vez do Mestre".
 */
export const PublicTrackerSchema = z
  .object({
    phase: z.enum(['preparando', 'combate']),
    round: z.number().int().min(1).max(ROUND_MAX),
    activeId: IdSchema.nullable(),
    combatants: z
      .array(
        CombatantSchema.omit({
          hidden: true,
          hp: true,
          creature: true,
          effectUntil: true,
        }).extend({
          /** Estado aproximado de uma criatura com PV ("ferida"), no lugar do número. */
          condition: z.enum(WOUND_CONDITIONS).optional(),
          /** Rodadas que faltam das condições com duração (só as que ainda valem). */
          effectRounds: z
            .record(
              EffectSchema,
              z
                .number()
                .int()
                .min(1)
                .max(ROUND_MAX + EFFECT_ROUNDS_MAX),
            )
            .optional(),
        }),
      )
      .max(COMBATANT_LIMIT),
  })
  .refine((t) => uniqueIds(t.combatants), 'Participante repetido')
  .refine(
    (t) => t.activeId === null || t.combatants.some((c) => c.id === t.activeId),
    'Turno de quem não está no combate',
  );
export type PublicTracker = z.infer<typeof PublicTrackerSchema>;

/** Novo combate com os jogadores presentes, todos com iniciativa 0 até o Mestre definir. */
export function startCombat(
  players: readonly { id: string; name: string; userId: string }[],
): Tracker {
  return {
    phase: 'preparando',
    round: 1,
    activeId: null,
    combatants: players.slice(0, COMBATANT_LIMIT).map((player) => ({
      id: player.id,
      name: player.name,
      initiative: 0,
      kind: 'jogador',
      userId: player.userId,
      hidden: false,
    })),
  };
}

/** Ordem de ação: maior iniciativa primeiro; empate mantém a ordem em que entraram. */
export function turnOrder<T extends { initiative: number }>(combatants: readonly T[]): T[] {
  return combatants
    .map((combatant, index) => ({ combatant, index }))
    .sort((a, b) => b.combatant.initiative - a.combatant.initiative || a.index - b.index)
    .map(({ combatant }) => combatant);
}

export function addCombatant(tracker: Tracker, combatant: Combatant): Tracker {
  if (tracker.combatants.length >= COMBATANT_LIMIT) return tracker;
  if (tracker.combatants.some((c) => c.id === combatant.id)) return tracker;
  return { ...tracker, combatants: [...tracker.combatants, combatant] };
}

export function updateCombatant(
  tracker: Tracker,
  id: string,
  changes: Partial<Pick<Combatant, 'name' | 'initiative' | 'hidden' | 'hp'>>,
): Tracker {
  return {
    ...tracker,
    combatants: tracker.combatants.map((c) => (c.id === id ? { ...c, ...changes } : c)),
  };
}

/**
 * Dano (positivo) ou cura (negativo) numa criatura com PV, entre 0 e o máximo. Sem PV, nada
 * muda.
 */
export function damageCombatant(tracker: Tracker, id: string, amount: number): Tracker {
  return {
    ...tracker,
    combatants: tracker.combatants.map((c) =>
      c.id === id && c.hp
        ? {
            ...c,
            hp: {
              ...c.hp,
              value: Math.max(0, Math.min(c.hp.max, c.hp.value - Math.trunc(amount))),
            },
          }
        : c,
    ),
  };
}

/** Uma condição que vale agora; `rounds`: as vezes do participante que ela ainda pega. */
export interface ActiveEffect {
  name: string;
  rounds?: number;
}

/** A vez do participante já terminou nesta rodada? (Na preparação, ninguém agiu.) */
function turnDone(tracker: Tracker, id: string): boolean {
  if (tracker.phase !== 'combate') return false;
  const order = turnOrder(tracker.combatants);
  const active = order.findIndex((c) => c.id === tracker.activeId);
  const own = order.findIndex((c) => c.id === id);
  return active !== -1 && own !== -1 && active > own;
}

/**
 * As condições que valem agora, na ordem em que foram marcadas. As com duração somem sozinhas
 * quando termina a vez do participante na última rodada; voltar a vez traz de volta.
 */
export function combatantEffects(tracker: Tracker, combatant: Combatant): ActiveEffect[] {
  const done = turnDone(tracker, combatant.id);
  const result: ActiveEffect[] = [];
  for (const name of combatant.effects ?? []) {
    const until = combatant.effectUntil?.[name];
    if (until === undefined) {
      result.push({ name });
      continue;
    }
    const rounds = until - tracker.round + (done ? 0 : 1);
    if (rounds >= 1) result.push({ name, rounds });
  }
  return result;
}

const effectKey = (effect: string) => effect.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/**
 * Troca as condições de um participante: sem espaços sobrando, sem repetidas (maiúsculas e
 * acentos não contam) e no máximo `EFFECT_LIMIT`. Com `rounds`, a condição pega as próximas
 * vezes do participante (contando a atual, se ele ainda está nela) e depois some. Sem
 * nenhuma, os campos somem.
 */
export function setCombatantEffects(
  tracker: Tracker,
  id: string,
  effects: readonly (string | ActiveEffect)[],
): Tracker {
  const done = turnDone(tracker, id);
  const seen = new Set<string>();
  const clean: string[] = [];
  const until: Record<string, number> = {};
  for (const item of effects) {
    const raw = typeof item === 'string' ? item : item.name;
    const effect = raw.trim().slice(0, EFFECT_MAX_LENGTH).trim();
    const key = effectKey(effect);
    if (!effect || seen.has(key)) continue;
    seen.add(key);
    clean.push(effect);
    const rounds = typeof item === 'string' ? undefined : item.rounds;
    if (rounds !== undefined && Number.isFinite(rounds)) {
      const turns = Math.max(1, Math.min(EFFECT_ROUNDS_MAX, Math.trunc(rounds)));
      until[effect] = Math.max(1, tracker.round + turns - (done ? 0 : 1));
    }
    if (clean.length === EFFECT_LIMIT) break;
  }
  return {
    ...tracker,
    combatants: tracker.combatants.map((c) => {
      if (c.id !== id) return c;
      const { effects: _old, effectUntil: _oldUntil, ...rest } = c;
      if (clean.length === 0) return rest;
      return Object.keys(until).length > 0
        ? { ...rest, effects: clean, effectUntil: until }
        : { ...rest, effects: clean };
    }),
  };
}

/** Remove um participante. Se era a vez dele, a vez passa ao seguinte. */
export function removeCombatant(tracker: Tracker, id: string): Tracker {
  if (!tracker.combatants.some((c) => c.id === id)) return tracker;
  const advanced = tracker.activeId === id ? nextTurn(tracker) : tracker;
  const combatants = advanced.combatants.filter((c) => c.id !== id);
  // Era o único: não sobra ninguém para agir.
  if (combatants.length === 0) {
    return { ...advanced, phase: 'preparando', round: 1, activeId: null, combatants };
  }
  return { ...advanced, combatants };
}

/** Passa a vez. Na preparação, começa o combate com o primeiro da ordem. */
export function nextTurn(tracker: Tracker): Tracker {
  const order = turnOrder(tracker.combatants);
  if (order.length === 0) return tracker;
  const index = order.findIndex((c) => c.id === tracker.activeId);
  if (tracker.phase === 'preparando' || index === -1) {
    return { ...tracker, phase: 'combate', activeId: order[0]?.id ?? null };
  }
  const wraps = index === order.length - 1;
  return {
    ...tracker,
    round: wraps ? Math.min(tracker.round + 1, ROUND_MAX) : tracker.round,
    activeId: order[wraps ? 0 : index + 1]?.id ?? null,
  };
}

/** Volta a vez (corrigir um clique a mais). No primeiro turno do combate, não faz nada. */
export function previousTurn(tracker: Tracker): Tracker {
  const order = turnOrder(tracker.combatants);
  const index = order.findIndex((c) => c.id === tracker.activeId);
  if (tracker.phase !== 'combate' || index === -1) return tracker;
  if (index === 0) {
    if (tracker.round === 1) return tracker;
    return { ...tracker, round: tracker.round - 1, activeId: order.at(-1)?.id ?? null };
  }
  return { ...tracker, activeId: order[index - 1]?.id ?? null };
}

/** A ordem como os jogadores a veem (sem os ocultos). */
export function publicView(tracker: Tracker): PublicTracker {
  const visible = tracker.combatants.filter((c) => !c.hidden);
  const activeVisible = visible.some((c) => c.id === tracker.activeId);
  return {
    phase: tracker.phase,
    round: tracker.round,
    activeId: activeVisible ? tracker.activeId : null,
    combatants: visible.map((combatant) => {
      const {
        hidden: _hidden,
        hp,
        creature: _creature,
        effects: _effects,
        effectUntil: _until,
        ...rest
      } = combatant;
      const active = combatantEffects(tracker, combatant);
      const rounds = Object.fromEntries(
        active.flatMap((e) => (e.rounds === undefined ? [] : [[e.name, e.rounds]])),
      );
      return {
        ...rest,
        ...(active.length > 0 ? { effects: active.map((e) => e.name) } : {}),
        ...(Object.keys(rounds).length > 0 ? { effectRounds: rounds } : {}),
        ...(hp ? { condition: woundCondition(hp.value, hp.max) } : {}),
      };
    }),
  };
}
