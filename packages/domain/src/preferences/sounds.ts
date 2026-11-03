import { z } from 'zod';

/** Avisos sonoros do app. */
export const SOUND_CUES = ['sua-vez', 'rolagem', 'mensagem', 'sussurro'] as const;
export type SoundCue = (typeof SOUND_CUES)[number];

/**
 * Acabamento dos dados 3D: liso, ou com textura de mármore, madeira, pedra ou metal, sempre
 * na cor escolhida.
 */
export const DICE_FINISHES = ['liso', 'marmore', 'madeira', 'pedra', 'metal'] as const;
export type DiceFinish = (typeof DICE_FINISHES)[number];

/** O acabamento que veio numa rolagem; um desconhecido (de uma versão mais nova) vira liso. */
export function asDiceFinish(value: string | undefined): DiceFinish {
  return (DICE_FINISHES as readonly string[]).includes(value ?? '')
    ? (value as DiceFinish)
    : 'liso';
}

/** Preferências de som deste aparelho. */
export const SoundSettingsSchema = z.object({
  enabled: z.boolean(),
  /** De 0 a 1. */
  volume: z.number().min(0).max(1),
  /** Volume da música da mesa (de 0 a 1), à parte dos avisos. */
  musicVolume: z.number().min(0).max(1).optional(),
  /** Baixar e tocar a música da mesa neste aparelho (desligar economiza dados no 4G). */
  downloadMusic: z.boolean().optional(),
  /** Mostrar as rolagens com dados 3D (ligado quando nunca escolhido). */
  dice3d: z.boolean().optional(),
  /** Os dados 3D giram ao cair (ligado quando nunca escolhido); desligado, aparecem parados. */
  diceMotion: z.boolean().optional(),
  /** Cor dos dados 3D neste aparelho (#rrggbb). */
  diceColor: z
    .string()
    .regex(/^#[0-9a-f]{6}$/i)
    .optional(),
  /** Acabamento dos dados 3D neste aparelho (liso quando nunca escolhido). */
  diceFinish: z.enum(DICE_FINISHES).optional(),
});
export type SoundSettings = z.infer<typeof SoundSettingsSchema>;

/** Cor dos dados quando a pessoa nunca escolheu uma (marfim). */
export const DEFAULT_DICE_COLOR = '#f2e8d5';

/** Volume da música quando a pessoa nunca escolheu um. */
export const DEFAULT_MUSIC_VOLUME = 0.6;

/** Ligados, a meio volume: avisam sem assustar. Dá para desligar no cabeçalho. */
export const DEFAULT_SOUND_SETTINGS: SoundSettings = { enabled: true, volume: 0.5 };
