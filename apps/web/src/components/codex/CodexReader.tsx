import { codexByCategory, searchCodex, type CodexPage } from '@tabula/domain';
import { ArrowLeftIcon, BookOpenIcon, EyeOffIcon, SearchIcon } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { CodexText } from './CodexText';

/**
 * Leitura do códice de um sistema: as páginas por categoria, com busca, e a página aberta ao
 * lado (no celular, uma de cada vez). As páginas "só o Mestre" chegam aqui já filtradas por
 * quem chama.
 */
export function CodexReader({ pages }: { pages: readonly CodexPage[] }) {
  const [query, setQuery] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);
  const found = useMemo(() => searchCodex(pages, query), [pages, query]);
  const groups = useMemo(() => codexByCategory(found), [found]);
  const open = pages.find((page) => page.id === openId) ?? null;
  // Em telas largas, sempre há uma página aberta (a primeira, de início).
  const shown = open ?? pages[0] ?? null;

  if (pages.length === 0) {
    return (
      <div className="text-muted-foreground flex flex-col items-center gap-2 rounded-lg border border-dashed py-12 text-center text-sm">
        <BookOpenIcon className="size-6" />
        <p>Este sistema ainda não tem códice.</p>
        <p className="max-w-sm">
          Quem cria o sistema escreve as páginas (habilidades, regras, itens) na aba Códice do
          criador de sistemas.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[16rem_minmax(0,1fr)]">
      <nav aria-label="Páginas do códice" className={cn('space-y-3', open && 'max-lg:hidden')}>
        <div className="relative">
          <SearchIcon className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
          <Input
            type="search"
            aria-label="Buscar no códice"
            placeholder="Buscar no códice"
            value={query}
            className="pl-8"
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        {groups.length === 0 && (
          <p className="text-muted-foreground text-sm">Nada encontrado para "{query}".</p>
        )}
        {groups.map((group) => (
          <section key={group.category} className="space-y-1">
            <h3 className="text-muted-foreground px-2 text-xs font-medium tracking-wide uppercase">
              {group.category}
            </h3>
            <ul>
              {group.pages.map((page) => (
                <li key={page.id}>
                  <button
                    type="button"
                    aria-current={shown?.id === page.id ? 'page' : undefined}
                    className={cn(
                      'hover:bg-accent flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm pointer-coarse:py-2.5',
                      shown?.id === page.id && 'lg:bg-accent lg:font-medium',
                    )}
                    onClick={() => setOpenId(page.id)}
                  >
                    <span className="min-w-0 flex-1 truncate">{page.title}</span>
                    {page.gmOnly && (
                      <EyeOffIcon
                        aria-label="Só o Mestre"
                        className="text-muted-foreground size-3.5 shrink-0"
                      />
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </nav>

      {shown && (
        <article
          aria-label={shown.title}
          className={cn('min-w-0 rounded-lg border p-4 sm:p-5', !open && 'max-lg:hidden')}
        >
          <button
            type="button"
            className="text-muted-foreground hover:text-foreground mb-3 flex items-center gap-1 text-sm lg:hidden"
            onClick={() => setOpenId(null)}
          >
            <ArrowLeftIcon className="size-4" /> Todas as páginas
          </button>
          <header className="mb-3 flex flex-wrap items-center gap-2">
            <h2 className="font-heading text-2xl tracking-wide uppercase">{shown.title}</h2>
            {shown.category && <Badge variant="secondary">{shown.category}</Badge>}
            {shown.gmOnly && (
              <Badge variant="outline">
                <EyeOffIcon /> Só o Mestre
              </Badge>
            )}
          </header>
          {shown.body.trim() ? (
            <CodexText text={shown.body} pages={pages} onOpenPage={(page) => setOpenId(page.id)} />
          ) : (
            <p className="text-muted-foreground text-sm">Página em branco.</p>
          )}
        </article>
      )}
    </div>
  );
}
