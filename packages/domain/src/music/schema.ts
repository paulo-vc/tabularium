import { z } from 'zod';
import { ImageHashSchema } from '../cutscene/schema';
import { IdSchema, TimestampSchema } from '../schema/primitives';

/** Formatos de áudio aceitos: MP3 e OGG (tocam no navegador e no app desktop). */
export const AUDIO_MIMES = ['audio/mpeg', 'audio/ogg'] as const;
export type AudioMime = (typeof AUDIO_MIMES)[number];

/** Tamanho máximo de uma trilha (uns 10 minutos de MP3 a 192 kbps). */
export const MAX_TRACK_BYTES = 15 * 1024 * 1024;

/** Uma trilha: identificada pelo conteúdo (SHA-256), como as imagens da cutscene. */
export const TrackInfoSchema = z.object({
  hash: ImageHashSchema,
  mime: z.enum(AUDIO_MIMES),
  size: z.number().int().min(1).max(MAX_TRACK_BYTES),
  title: z.string().trim().min(1).max(100),
});
export type TrackInfo = z.infer<typeof TrackInfoSchema>;

/** Trilha guardada neste aparelho: na biblioteca do Mestre, ou recebida pelo jogador. */
export const StoredTrackSchema = TrackInfoSchema.extend({
  id: IdSchema,
  origin: z.enum(['biblioteca', 'recebida']),
  createdAt: TimestampSchema,
});
export type StoredTrack = z.infer<typeof StoredTrackSchema>;

/**
 * O que toca na mesa agora. `position` é o ponto da trilha (em segundos) quando o estado foi
 * enviado: quem recebe começa dali. Pausar e retomar mandam um estado novo.
 */
export const MusicStateSchema = z.object({
  track: TrackInfoSchema,
  playing: z.boolean(),
  loop: z.boolean(),
  position: z
    .number()
    .min(0)
    .max(24 * 60 * 60),
});
export type MusicState = z.infer<typeof MusicStateSchema>;

/**
 * Confere o tipo real pelos primeiros bytes. MP3: marca ID3 ou o início de um quadro MPEG
 * (11 bits ligados). OGG: "OggS". `null` se não for nenhum dos dois.
 */
export function sniffAudioMime(bytes: Uint8Array): AudioMime | null {
  const at = (i: number) => bytes[i] ?? -1;
  if (at(0) === 0x49 && at(1) === 0x44 && at(2) === 0x33) return 'audio/mpeg'; // "ID3"
  if (at(0) === 0xff && (at(1) & 0xe0) === 0xe0) return 'audio/mpeg';
  if (at(0) === 0x4f && at(1) === 0x67 && at(2) === 0x67 && at(3) === 0x53) return 'audio/ogg';
  return null;
}
