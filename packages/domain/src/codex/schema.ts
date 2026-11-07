import { z } from 'zod';
import { IdSchema, LabelSchema } from '../schema/primitives';

/** Páginas que um códice pode ter. */
export const CODEX_PAGE_LIMIT = 200;
/** Tamanho do texto de uma página. O sistema inteiro ainda tem de caber numa mensagem da sessão. */
export const CODEX_BODY_LIMIT = 20_000;

/**
 * Página do códice do sistema: o que o autor quer que a mesa consulte (habilidades, regras,
 * itens, magias, condições…). O texto usa uma formatação simples (ver `parseCodexText`).
 * `gmOnly` esconde a página de quem não mestra o sistema; não é segredo de verdade: quem
 * abre o arquivo do sistema vê tudo.
 */
export const CodexPageSchema = z.object({
  id: IdSchema,
  title: LabelSchema,
  /** Agrupa as páginas na lista (ex.: "Habilidades", "Regras"). Sem categoria, ficam em "Geral". */
  category: z.string().trim().max(40).optional(),
  body: z.string().max(CODEX_BODY_LIMIT),
  gmOnly: z.boolean().optional(),
});
export type CodexPage = z.infer<typeof CodexPageSchema>;

/** Categoria das páginas sem categoria. */
export const CODEX_DEFAULT_CATEGORY = 'Geral';

/** Páginas agrupadas por categoria, na ordem em que cada categoria aparece primeiro. */
export function codexByCategory(
  pages: readonly CodexPage[],
): { category: string; pages: CodexPage[] }[] {
  const groups = new Map<string, CodexPage[]>();
  for (const page of pages) {
    const category = page.category?.trim() || CODEX_DEFAULT_CATEGORY;
    const group = groups.get(category);
    if (group) group.push(page);
    else groups.set(category, [page]);
  }
  return [...groups].map(([category, items]) => ({ category, pages: items }));
}

const normalize = (text: string) => text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Busca no título, na categoria e no texto, ignorando acentos e maiúsculas. */
export function searchCodex(pages: readonly CodexPage[], query: string): CodexPage[] {
  const terms = normalize(query).split(/\s+/).filter(Boolean);
  if (terms.length === 0) return [...pages];
  return pages.filter((page) => {
    const haystack = normalize(`${page.title} ${page.category ?? ''} ${page.body}`);
    return terms.every((term) => haystack.includes(term));
  });
}

/** A página com esse título (para os links `[[Título]]`), sem diferenciar acentos e maiúsculas. */
export function findCodexPage(pages: readonly CodexPage[], title: string): CodexPage | undefined {
  const wanted = normalize(title.trim());
  return pages.find((page) => normalize(page.title.trim()) === wanted);
}

/**
 * Condições que o sistema descreve no códice (páginas da categoria "Condições"): viram as
 * sugestões ao marcar condições no combate, e cada uma abre a própria página.
 */
export function codexConditions(pages: readonly CodexPage[]): string[] {
  return pages
    .filter((page) => !page.gmOnly && normalize(page.category ?? '').trim() === 'condicoes')
    .map((page) => page.title.trim());
}

// ---------- Texto ----------

/** Trecho de uma linha: texto, **negrito**, *itálico* ou um link para outra página. */
export type CodexInline =
  | { kind: 'texto'; text: string }
  | { kind: 'negrito'; children: CodexInline[] }
  | { kind: 'italico'; children: CodexInline[] }
  | { kind: 'link'; title: string; label: string };

export type CodexBlock =
  | { kind: 'titulo'; level: 1 | 2 | 3; content: CodexInline[] }
  | { kind: 'paragrafo'; lines: CodexInline[][] }
  | { kind: 'lista'; ordered: boolean; items: CodexInline[][] }
  | { kind: 'tabela'; header: CodexInline[][]; rows: CodexInline[][][] }
  | { kind: 'citacao'; lines: CodexInline[][] };

/**
 * Formatação do códice, de propósito pequena (cabe na ajuda do editor):
 * - `# Título`, `## Subtítulo`, `### Menor`;
 * - `- item` (ou `* item`) e `1. item`;
 * - tabelas com `| a | b |` (a segunda linha, `|---|---|`, separa o cabeçalho);
 * - `> citação` (para destacar um trecho);
 * - `**negrito**`, `*itálico*` e `[[Outra página]]` (ou `[[Outra página|texto]]`);
 * - linha em branco separa parágrafos.
 * O resultado vira elementos da interface, nunca HTML: o texto vem de arquivos de terceiros.
 */
export function parseCodexText(text: string): CodexBlock[] {
  const lines = text.replace(/\r\n?/g, '\n').split('\n');
  const blocks: CodexBlock[] = [];
  let index = 0;
  const isTableRow = (line: string) => /^\s*\|.*\|\s*$/.test(line);
  const isSeparator = (line: string) => /^\s*\|(\s*:?-{2,}:?\s*\|)+\s*$/.test(line);
  const bullet = /^\s*[-*]\s+(.*)$/;
  const numbered = /^\s*\d{1,3}[.)]\s+(.*)$/;

  while (index < lines.length) {
    const line = lines[index] ?? '';
    if (line.trim() === '') {
      index++;
      continue;
    }
    const heading = /^(#{1,3})\s+(.*)$/.exec(line);
    if (heading) {
      const level = (heading[1]?.length ?? 1) as 1 | 2 | 3;
      blocks.push({ kind: 'titulo', level, content: parseInline(heading[2] ?? '') });
      index++;
      continue;
    }
    if (isTableRow(line) && isSeparator(lines[index + 1] ?? '')) {
      const header = cells(line);
      const rows: CodexInline[][][] = [];
      index += 2;
      while (index < lines.length && isTableRow(lines[index] ?? '')) {
        const row = cells(lines[index] ?? '');
        // Cada linha com o número de colunas do cabeçalho.
        rows.push(header.map((_, column) => row[column] ?? []));
        index++;
      }
      blocks.push({ kind: 'tabela', header, rows });
      continue;
    }
    const list = bullet.test(line) ? bullet : numbered.test(line) ? numbered : null;
    if (list) {
      const items: CodexInline[][] = [];
      while (index < lines.length) {
        const match = list.exec(lines[index] ?? '');
        if (!match) break;
        items.push(parseInline(match[1] ?? ''));
        index++;
      }
      blocks.push({ kind: 'lista', ordered: list === numbered, items });
      continue;
    }
    if (/^\s*>/.test(line)) {
      const quoted: CodexInline[][] = [];
      while (index < lines.length && /^\s*>/.test(lines[index] ?? '')) {
        quoted.push(parseInline((lines[index] ?? '').replace(/^\s*>\s?/, '')));
        index++;
      }
      blocks.push({ kind: 'citacao', lines: quoted });
      continue;
    }
    // Parágrafo: até a linha em branco ou o começo de outro bloco.
    const paragraph: CodexInline[][] = [];
    while (index < lines.length) {
      const current = lines[index] ?? '';
      if (
        current.trim() === '' ||
        /^#{1,3}\s/.test(current) ||
        bullet.test(current) ||
        numbered.test(current) ||
        /^\s*>/.test(current) ||
        (isTableRow(current) && isSeparator(lines[index + 1] ?? ''))
      ) {
        break;
      }
      paragraph.push(parseInline(current.trim()));
      index++;
    }
    blocks.push({ kind: 'paragrafo', lines: paragraph });
  }
  return blocks;
}

function cells(row: string): CodexInline[][] {
  return row
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((cell) => parseInline(cell.trim()));
}

/** Trechos de uma linha. Marcas sem par ficam como texto. */
export function parseInline(text: string): CodexInline[] {
  const result: CodexInline[] = [];
  let plain = '';
  const flush = () => {
    if (plain) result.push({ kind: 'texto', text: plain });
    plain = '';
  };
  let index = 0;
  while (index < text.length) {
    const rest = text.slice(index);
    const link = /^\[\[([^\]|]{1,100})(?:\|([^\]]{1,100}))?\]\]/.exec(rest);
    if (link) {
      flush();
      const title = (link[1] ?? '').trim();
      result.push({ kind: 'link', title, label: (link[2] ?? title).trim() });
      index += link[0].length;
      continue;
    }
    if (rest.startsWith('**')) {
      const end = text.indexOf('**', index + 2);
      if (end > index + 2) {
        flush();
        result.push({ kind: 'negrito', children: parseInline(text.slice(index + 2, end)) });
        index = end + 2;
        continue;
      }
    }
    const mark = rest[0];
    if ((mark === '*' || mark === '_') && rest[1] !== mark && !/\s/.test(rest[1] ?? ' ')) {
      const end = text.indexOf(mark, index + 1);
      // `_` no meio de palavras (nomes_assim) não é itálico; nem "2 * 3" (espaço junto da marca).
      const wordBefore = mark === '_' && /\w/.test(text[index - 1] ?? '');
      if (end > index + 1 && !wordBefore && !/\s/.test(text[end - 1] ?? '')) {
        flush();
        result.push({ kind: 'italico', children: parseInline(text.slice(index + 1, end)) });
        index = end + 1;
        continue;
      }
    }
    plain += mark;
    index++;
  }
  flush();
  return result;
}
