import { SystemTemplateSchema, type SystemTemplate } from '@tabula/domain';
import lendasD20Orc from './aposentados/lendas-d20-orc.json';
import dnd5eSrd from './dnd5e-srd.json';

/**
 * Templates embutidos no app. Ficam em JSON (o mesmo formato dos templates da comunidade)
 * e são validados ao carregar: um template nativo inválido é um bug e deve falhar cedo.
 */
export const BUILTIN_TEMPLATES: readonly SystemTemplate[] = [dnd5eSrd].map((json) =>
  SystemTemplateSchema.parse(json),
);

/**
 * Sistemas que já vieram embutidos e saíram do app (hoje vivem no repositório da
 * comunidade, com o mesmo `id`). Não aparecem para quem nunca os usou: servem só para as
 * fichas e campanhas antigas continuarem abrindo. Na primeira vez que alguém precisa de um
 * deles, o catálogo o instala como sistema da comunidade, e dali em diante o repositório
 * oferece as versões novas.
 */
export const RETIRED_TEMPLATES: readonly SystemTemplate[] = [lendasD20Orc].map((json) => ({
  ...SystemTemplateSchema.parse(json),
  source: 'community' as const,
}));

export function getBuiltinTemplate(id: string): SystemTemplate | undefined {
  return BUILTIN_TEMPLATES.find((template) => template.id === id);
}
