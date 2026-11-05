import { findCodexPage, parseCodexText, type CodexInline, type CodexPage } from '@tabula/domain';
import { useMemo, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * Texto com a formatação do códice (títulos, listas, tabelas, negrito, links `[[Página]]`).
 * Vira elementos React, nunca HTML: o texto vem de arquivos de outras pessoas. Um link para
 * uma página que não existe (ou que este leitor não pode ver) fica como texto.
 */
export function CodexText({
  text,
  pages = [],
  onOpenPage,
  className,
}: {
  text: string;
  /** Páginas que os links podem abrir. */
  pages?: readonly CodexPage[] | undefined;
  onOpenPage?: ((page: CodexPage) => void) | undefined;
  className?: string | undefined;
}) {
  const blocks = useMemo(() => parseCodexText(text), [text]);
  const inline = (parts: CodexInline[]): ReactNode =>
    parts.map((part, index) => {
      switch (part.kind) {
        case 'texto':
          return part.text;
        case 'negrito':
          return (
            <strong key={index} className="text-foreground font-semibold">
              {inline(part.children)}
            </strong>
          );
        case 'italico':
          return <em key={index}>{inline(part.children)}</em>;
        case 'link': {
          const target = onOpenPage ? findCodexPage(pages, part.title) : undefined;
          if (!target || !onOpenPage) return part.label;
          return (
            <button
              key={index}
              type="button"
              className="text-primary underline underline-offset-2 hover:no-underline"
              onClick={() => onOpenPage(target)}
            >
              {part.label}
            </button>
          );
        }
      }
    });
  const lines = (items: CodexInline[][]) =>
    items.map((line, index) => (
      <span key={index}>
        {index > 0 && <br />}
        {inline(line)}
      </span>
    ));

  return (
    <div className={cn('space-y-3 text-sm leading-relaxed wrap-anywhere', className)}>
      {blocks.map((block, index) => {
        switch (block.kind) {
          case 'titulo': {
            const Tag = (['h3', 'h4', 'h5'] as const)[block.level - 1] ?? 'h3';
            return (
              <Tag
                key={index}
                className={cn(
                  'font-heading tracking-wide uppercase',
                  block.level === 1 && 'pt-1 text-lg',
                  block.level === 2 && 'pt-1 text-base',
                  block.level === 3 && 'text-muted-foreground text-sm',
                )}
              >
                {inline(block.content)}
              </Tag>
            );
          }
          case 'paragrafo':
            return <p key={index}>{lines(block.lines)}</p>;
          case 'citacao':
            return (
              <blockquote
                key={index}
                className="border-primary/60 text-muted-foreground border-l-2 pl-3 italic"
              >
                {lines(block.lines)}
              </blockquote>
            );
          case 'lista': {
            const List = block.ordered ? 'ol' : 'ul';
            return (
              <List
                key={index}
                className={cn('space-y-1 pl-5', block.ordered ? 'list-decimal' : 'list-disc')}
              >
                {block.items.map((item, itemIndex) => (
                  <li key={itemIndex}>{inline(item)}</li>
                ))}
              </List>
            );
          }
          case 'tabela':
            return (
              <div key={index} className="overflow-x-auto rounded-md border">
                <table className="w-full text-left text-sm">
                  <thead className="bg-muted/60">
                    <tr>
                      {block.header.map((cell, cellIndex) => (
                        <th key={cellIndex} className="px-2.5 py-1.5 font-medium">
                          {inline(cell)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {block.rows.map((row, rowIndex) => (
                      <tr key={rowIndex} className="border-t">
                        {row.map((cell, cellIndex) => (
                          <td key={cellIndex} className="px-2.5 py-1.5 align-top">
                            {inline(cell)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
        }
      })}
    </div>
  );
}
