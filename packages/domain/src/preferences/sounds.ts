import { z } from 'zod';

/** Avisos sonoros do app. */
export const SOUND_CUES = ['sua-vez', 'rolagem', 'mensagem', 'sussurro'] as const;
export type SoundCue = (typeof SOUND_CUES)[number];

/** Preferências de som deste aparelho. */
export const SoundSettingsSchema = z.object({
  enabled: z.boolean(),
  /** De 0 a 1. */
  volume: z.number().min(0).max(1),
  /** Volume da música da mesa (de 0 a 1), à parte dos avisos. */
  musicVolume: z.number().min(0).max(1).optional(),
});
export type SoundSettings = z.infer<typeof SoundSettingsSchema>;

/** Volume da música quando a pessoa nunca escolheu um. */
export const DEFAULT_MUSIC_VOLUME = 0.6;

/** Ligados, a meio volume: avisam sem assustar. Dá para desligar no cabeçalho. */
export const DEFAULT_SOUND_SETTINGS: SoundSettings = { enabled: true, volume: 0.5 };
