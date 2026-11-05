import { describe, expect, it } from 'vitest';
import {
  codexByCategory,
  findCodexPage,
  parseCodexText,
  parseInline,
  searchCodex,
  type CodexPage,
} from './schema';

const page = (id: string, title: string, category?: string, body = ''): CodexPage => ({
  id,
  title,
  body,
  ...(category ? { category } : {}),
});

describe('texto do códice', () => {
  it('títulos, parágrafos, listas e citação', () => {
    const blocks = parseCodexText(
      '# Fúria\nDura um minuto.\nTermina se você não atacar.\n\n- Vantagem em Força\n- Resistência\n\n1. Ação bônus\n2. Grite\n\n> Sangue e ferro.',
    );
    expect(blocks.map((block) => block.kind)).toEqual([
      'titulo',
      'paragrafo',
      'lista',
      'lista',
      'citacao',
    ]);
    expect(blocks[1]).toMatchObject({ kind: 'paragrafo', lines: [[{}], [{}]] });
    expect(blocks[2]).toMatchObject({ ordered: false, items: [[{}], [{}]] });
    expect(blocks[3]).toMatchObject({ ordered: true });
  });

  it('tabela com cabeçalho; linhas curtas ganham colunas vazias', () => {
    const [table] = parseCodexText('| Nível | Fúrias |\n|---|---|\n| 1 | 2 |\n| 3 |');
    expect(table).toMatchObject({
      kind: 'tabela',
      header: [[{ text: 'Nível' }], [{ text: 'Fúrias' }]],
      rows: [
        [[{ text: '1' }], [{ text: '2' }]],
        [[{ text: '3' }], []],
      ],
    });
  });

  it('negrito, itálico e links para outras páginas', () => {
    expect(parseInline('**Ação:** veja [[Fúria]] ou [[Ataque Extra|o ataque]], *rápido*')).toEqual([
      { kind: 'negrito', children: [{ kind: 'texto', text: 'Ação:' }] },
      { kind: 'texto', text: ' veja ' },
      { kind: 'link', title: 'Fúria', label: 'Fúria' },
      { kind: 'texto', text: ' ou ' },
      { kind: 'link', title: 'Ataque Extra', label: 'o ataque' },
      { kind: 'texto', text: ', ' },
      { kind: 'italico', children: [{ kind: 'texto', text: 'rápido' }] },
    ]);
  });

  it('marcas sem par e _ no meio de palavras ficam como texto', () => {
    expect(parseInline('2 * 3 e nome_do_campo **solto')).toEqual([
      { kind: 'texto', text: '2 * 3 e nome_do_campo **solto' },
    ]);
  });

  it('nunca gera HTML: o texto passa como está', () => {
    expect(parseInline('<img src=x onerror=alert(1)>')).toEqual([
      { kind: 'texto', text: '<img src=x onerror=alert(1)>' },
    ]);
  });
});

describe('páginas do códice', () => {
  const pages = [
    page('a', 'Fúria', 'Habilidades', 'Ganha vantagem.'),
    page('b', 'Agarrar', 'Regras'),
    page('c', 'Ataque Extra', 'Habilidades'),
    page('d', 'Sobre o sistema'),
  ];

  it('agrupa por categoria, na ordem em que aparecem', () => {
    expect(codexByCategory(pages).map((g) => [g.category, g.pages.length])).toEqual([
      ['Habilidades', 2],
      ['Regras', 1],
      ['Geral', 1],
    ]);
  });

  it('busca no título, na categoria e no texto, sem acentos', () => {
    expect(searchCodex(pages, 'furia').map((p) => p.id)).toEqual(['a']);
    expect(searchCodex(pages, 'vantagem').map((p) => p.id)).toEqual(['a']);
    expect(searchCodex(pages, 'habilidades extra').map((p) => p.id)).toEqual(['c']);
    expect(searchCodex(pages, '  ')).toHaveLength(4);
  });

  it('acha a página de um link pelo título', () => {
    expect(findCodexPage(pages, 'furia')?.id).toBe('a');
    expect(findCodexPage(pages, 'Nenhuma')).toBeUndefined();
  });
});
