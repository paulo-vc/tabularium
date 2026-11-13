import type { HeadingFont, SheetStyle, SystemAccent } from '@tabula/domain';

/**
 * Tema do sistema na ficha e na campanha dele: a cor de destaque, a fonte dos títulos e o
 * estilo (medieval, sombrio), como atributos do contêiner da tela (o index.css lê
 * `data-destaque`, `data-titulos` e `data-estilo`). O resto do app (cabeçalho, listas,
 * janelas) continua no tema do app.
 */
export function systemTheme(
  template:
    | {
        accent?: SystemAccent | undefined;
        headingFont?: HeadingFont | undefined;
        style?: SheetStyle | undefined;
      }
    | undefined,
): { 'data-destaque'?: SystemAccent; 'data-titulos'?: HeadingFont; 'data-estilo'?: SheetStyle } {
  return {
    ...(template?.accent && { 'data-destaque': template.accent }),
    ...(template?.headingFont &&
      template.headingFont !== 'condensada' && { 'data-titulos': template.headingFont }),
    ...(template?.style && { 'data-estilo': template.style }),
  };
}
