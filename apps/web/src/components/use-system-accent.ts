import type { HeadingFont, SystemAccent } from '@tabula/domain';

/**
 * Tema do sistema na ficha e na campanha dele: a cor de destaque e a fonte dos títulos, como
 * atributos do contêiner da tela (o index.css lê `data-destaque` e `data-titulos`). O resto do
 * app (cabeçalho, listas, janelas) continua grafite e dourado.
 */
export function systemTheme(
  template:
    { accent?: SystemAccent | undefined; headingFont?: HeadingFont | undefined } | undefined,
): { 'data-destaque'?: SystemAccent; 'data-titulos'?: HeadingFont } {
  return {
    ...(template?.accent && { 'data-destaque': template.accent }),
    ...(template?.headingFont &&
      template.headingFont !== 'condensada' && { 'data-titulos': template.headingFont }),
  };
}
