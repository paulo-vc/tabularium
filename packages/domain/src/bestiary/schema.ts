import { z } from 'zod';
import { IdSchema, LabelSchema } from '../schema/primitives';

/** Criaturas num bestiário (do sistema ou da campanha). */
export const BESTIARY_LIMIT = 200;
/** Linhas de características de uma criatura (CA, Deslocamento, FOR…). */
export const CREATURE_STAT_LIMIT = 16;
export const CREATURE_ATTACK_LIMIT = 12;
export const CREATURE_TEXT_LIMIT = 8_000;
export const CREATURE_HP_MAX = 99_999;

const ShortTextSchema = z.string().trim().max(60);
/** Rolagem de um ataque ("1d20+4", "2d6+3"). Conferida contra os dados do sistema ao compilar. */
const RollTextSchema = z.string().trim().max(60);

export const CreatureStatSchema = z.object({
  label: z.string().trim().min(1, 'Obrigatório').max(40),
  value: ShortTextSchema,
});
export type CreatureStat = z.infer<typeof CreatureStatSchema>;

export const CreatureAttackSchema = z.object({
  id: IdSchema,
  name: LabelSchema,
  /** Rolagem para acertar (ex.: "1d20+4"). */
  roll: RollTextSchema.optional(),
  /** Rolagem de dano (ex.: "1d6+2"). */
  damage: RollTextSchema.optional(),
  /** Tipo de dano, alcance… ("cortante, 1,5 m"). */
  notes: z.string().trim().max(200).optional(),
});
export type CreatureAttack = z.infer<typeof CreatureAttackSchema>;

/**
 * Ficha curta de uma criatura (o "bloco de estatísticas"): PV, iniciativa, características
 * livres, ataques que rolam e o texto das habilidades (com a formatação do códice).
 */
export const CreatureSchema = z.object({
  id: IdSchema,
  name: LabelSchema,
  /** Tipo, tamanho, nível ou ND ("Humanoide pequeno, ND 1/4"). */
  kind: ShortTextSchema.optional(),
  hp: z.number().int().min(1).max(CREATURE_HP_MAX),
  /** Como no combate: número ("15"), modificador ("+2", rola o dado dos testes) ou rolagem. */
  initiative: z.string().trim().max(20).optional(),
  stats: z.array(CreatureStatSchema).max(CREATURE_STAT_LIMIT),
  attacks: z.array(CreatureAttackSchema).max(CREATURE_ATTACK_LIMIT),
  /** Habilidades, táticas, notas. */
  text: z.string().max(CREATURE_TEXT_LIMIT).optional(),
});
export type Creature = z.infer<typeof CreatureSchema>;

export const BestiarySchema = z.array(CreatureSchema).max(BESTIARY_LIMIT);

/** Características que uma criatura nova traz quando o sistema não diz quais são. */
export const DEFAULT_CREATURE_STATS = ['Defesa', 'Deslocamento'] as const;

/** Criatura em branco, com as características que o sistema pede (só os nomes). */
export function blankCreature(id: string, statLabels: readonly string[] = DEFAULT_CREATURE_STATS) {
  return {
    id,
    name: 'Nova criatura',
    hp: 10,
    stats: statLabels.slice(0, CREATURE_STAT_LIMIT).map((label) => ({ label, value: '' })),
    attacks: [],
  } satisfies Creature;
}

/** Onde está a criatura: no bestiário do sistema ou no da campanha. */
export type CreatureOrigin = 'sistema' | 'campanha';

/** Estado aproximado que os jogadores veem de uma criatura no combate. */
export const WOUND_CONDITIONS = ['ilesa', 'ferida', 'muito-ferida', 'caida'] as const;
export type WoundCondition = (typeof WOUND_CONDITIONS)[number];

export const WOUND_LABELS: Record<WoundCondition, string> = {
  ilesa: 'Ilesa',
  ferida: 'Ferida',
  'muito-ferida': 'Muito ferida',
  caida: 'Caída',
};

/** Ilesa com o PV cheio; ferida acima da metade; muito ferida até a metade; caída em 0. */
export function woundCondition(value: number, max: number): WoundCondition {
  if (value <= 0) return 'caida';
  if (value >= max) return 'ilesa';
  return value * 2 > max ? 'ferida' : 'muito-ferida';
}
