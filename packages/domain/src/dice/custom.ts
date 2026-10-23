import { z } from 'zod';
import { LabelSchema } from '../schema/primitives';

/** Quantas faces um dado do sistema pode ter: as formas que existem em 3D. */
export const CUSTOM_DIE_FACES = [4, 6, 8, 10, 12, 20] as const;

/**
 * Dado definido pelo sistema, com faces próprias: o dado Fate (−, −, 0, 0, +, +), os dados
 * de dualidade (Esperança e Medo, com cores diferentes)… Na notação, vale `d` + o ID, com a
 * quantidade na frente: `4dF`, `1dEsperanca`. Cada face tem o que aparece no dado (`label`)
 * e quanto soma (`value`).
 */
export const CustomDieSchema = z.object({
  /** Usado na notação (`4dF`). Letras e números, começando por letra; maiúsculas não importam. */
  id: z.string().regex(/^[A-Za-z][A-Za-z0-9]{0,15}$/),
  name: LabelSchema,
  faces: z
    .array(
      z.object({
        label: z.string().trim().min(1).max(3),
        value: z.number().int().min(-1000).max(1000),
      }),
    )
    .refine((faces) => (CUSTOM_DIE_FACES as readonly number[]).includes(faces.length), {
      message: 'O dado precisa ter 4, 6, 8, 10, 12 ou 20 faces',
    }),
  /** Cor fixa do dado (#rrggbb), ex.: Esperança dourada e Medo roxo. Sem ela, a cor de quem rola. */
  color: z
    .string()
    .regex(/^#[0-9a-f]{6}$/i)
    .optional(),
});
export type CustomDie = z.infer<typeof CustomDieSchema>;
