import type { z } from 'zod';
import { embeddedImageSchema } from '../image/embedded';

/** Lado maior do ícone do sistema depois de reduzido. */
export const SYSTEM_ICON_MAX_SIDE = 128;
/** Tamanho máximo do ícone (data URL): vai dentro do arquivo do sistema e pela sessão. */
export const SYSTEM_ICON_MAX_CHARS = 40_000;

/** Ícone do sistema, embutido no arquivo dele (aparece nas listas de sistemas e fichas). */
export const SystemIconSchema = embeddedImageSchema({
  maxChars: SYSTEM_ICON_MAX_CHARS,
  maxSide: SYSTEM_ICON_MAX_SIDE,
});
export type SystemIcon = z.infer<typeof SystemIconSchema>;
