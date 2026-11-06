import {
  CODEX_BODY_LIMIT,
  CODEX_PAGE_LIMIT,
  type CodexPage,
  type SystemTemplate,
} from '@tabula/domain';
import {
  ArrowDownIcon,
  ArrowUpIcon,
  BookOpenIcon,
  EyeOffIcon,
  PlusIcon,
  Trash2Icon,
} from 'lucide-react';
import { useId, useState } from 'react';
import { CodexText } from '@/components/codex/CodexText';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import type { ApplyChange } from './use-template-editor';

const HELP = [
  ['# Título', 'títulos (##, ### para menores)'],
  ['**negrito** *itálico*', 'destaque'],
  ['- item', 'lista (1. para numerada)'],
  ['| a | b |', 'tabela (2ª linha: |---|---|)'],
  ['> texto', 'citação'],
  ['[[Fúria]]', 'link para outra página'],
] as const;

const withPages = (template: SystemTemplate, codex: CodexPage[]): SystemTemplate => {
  if (codex.length > 0) return { ...template, codex };
  const { codex: _codex, ...rest } = template;
  return rest;
};

/**
 * Aba Códice do criador de sistemas: páginas de consulta para a mesa, com a formatação
 * simples do códice e a prévia ao lado.
 */
export function CodexEditor({ template, apply }: { template: SystemTemplate; apply: ApplyChange }) {
  const base = useId();
  const pages = template.codex ?? [];
  const [selectedId, setSelectedId] = useState<string | null>(pages[0]?.id ?? null);
  const [showPreview, setShowPreview] = useState(false);
  const selected = pages.find((page) => page.id === selectedId) ?? null;
  const categories = [...new Set(pages.map((page) => page.category?.trim()).filter(Boolean))];

  const update = (id: string, changes: Partial<CodexPage>, group?: string) =>
    apply(
      (t) =>
        withPages(
          t,
          (t.codex ?? []).map((page) => (page.id === id ? { ...page, ...changes } : page)),
        ),
      group,
    );
  const add = () => {
    const id = crypto.randomUUID();
    const taken = new Set(pages.map((page) => page.title.trim().toLowerCase()));
    let title = 'Nova página';
    for (let n = 2; taken.has(title.toLowerCase()); n++) title = `Nova página ${n}`;
    apply((t) =>
      withPages(t, [
        ...(t.codex ?? []),
        { id, title, body: '', ...(selected?.category ? { category: selected.category } : {}) },
      ]),
    );
    setSelectedId(id);
  };
  const move = (index: number, delta: -1 | 1) =>
    apply((t) => {
      const codex = [...(t.codex ?? [])];
      const [page] = codex.splice(index, 1);
      if (page) codex.splice(index + delta, 0, page);
      return withPages(t, codex);
    });
  const remove = (id: string) => {
    const index = pages.findIndex((page) => page.id === id);
    apply((t) =>
      withPages(
        t,
        (t.codex ?? []).filter((page) => page.id !== id),
      ),
    );
    setSelectedId(pages[index + 1]?.id ?? pages[index - 1]?.id ?? null);
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[16rem_minmax(0,1fr)]">
      <section aria-label="Páginas do códice" className="space-y-2">
        <p className="text-muted-foreground text-sm">
          Habilidades, regras, itens, magias: o que a mesa consulta durante o jogo. Vai junto com o
          sistema e os jogadores leem na campanha.
        </p>
        {pages.length > 0 && (
          <ol className="space-y-1">
            {pages.map((page, index) => (
              <li key={page.id} className="group flex items-center gap-0.5">
                <button
                  type="button"
                  aria-current={page.id === selectedId ? 'true' : undefined}
                  className={cn(
                    'hover:bg-accent flex min-w-0 flex-1 items-center gap-1.5 rounded-md px-2 py-1.5 text-left text-sm',
                    page.id === selectedId && 'bg-accent font-medium',
                  )}
                  onClick={() => setSelectedId(page.id)}
                >
                  <span className="min-w-0 flex-1 truncate">{page.title || 'Sem título'}</span>
                  {page.category && (
                    <span className="text-muted-foreground max-w-20 truncate text-xs">
                      {page.category}
                    </span>
                  )}
                  {page.gmOnly && (
                    <EyeOffIcon aria-label="Só o Mestre" className="size-3.5 shrink-0" />
                  )}
                </button>
                <Button
                  size="icon-sm"
                  variant="ghost"
                  aria-label={`Subir ${page.title}`}
                  disabled={index === 0}
                  onClick={() => move(index, -1)}
                >
                  <ArrowUpIcon />
                </Button>
                <Button
                  size="icon-sm"
                  variant="ghost"
                  aria-label={`Descer ${page.title}`}
                  disabled={index === pages.length - 1}
                  onClick={() => move(index, 1)}
                >
                  <ArrowDownIcon />
                </Button>
              </li>
            ))}
          </ol>
        )}
        <Button
          variant="outline"
          size="sm"
          disabled={pages.length >= CODEX_PAGE_LIMIT}
          onClick={add}
        >
          <PlusIcon /> Nova página
        </Button>
      </section>

      {selected ? (
        <section aria-label={`Página ${selected.title}`} className="min-w-0 space-y-3">
          <div className="grid gap-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
            <div className="space-y-1">
              <Label htmlFor={`${base}-titulo`}>Título</Label>
              <Input
                id={`${base}-titulo`}
                value={selected.title}
                maxLength={100}
                aria-invalid={!selected.title.trim()}
                onChange={(event) =>
                  update(selected.id, { title: event.target.value }, `titulo:${selected.id}`)
                }
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor={`${base}-categoria`}>Categoria</Label>
              <Input
                id={`${base}-categoria`}
                value={selected.category ?? ''}
                maxLength={40}
                list={`${base}-categorias`}
                placeholder="ex.: Habilidades"
                onChange={(event) =>
                  update(
                    selected.id,
                    { category: event.target.value || undefined },
                    `categoria:${selected.id}`,
                  )
                }
              />
              <datalist id={`${base}-categorias`}>
                {categories.map((category) => (
                  <option key={category} value={category} />
                ))}
              </datalist>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <div className="flex items-center gap-2">
              <Checkbox
                id={`${base}-mestre`}
                checked={selected.gmOnly === true}
                onCheckedChange={(value) =>
                  update(selected.id, { gmOnly: value === true ? true : undefined })
                }
              />
              <Label htmlFor={`${base}-mestre`} className="font-normal">
                Só o Mestre
              </Label>
            </div>
            <span className="text-muted-foreground text-xs">
              Esconde dos jogadores (quem abre o arquivo do sistema ainda vê).
            </span>
            <div className="ml-auto flex gap-1">
              <Button
                size="sm"
                variant={showPreview ? 'secondary' : 'ghost'}
                aria-pressed={showPreview}
                className="xl:hidden"
                onClick={() => setShowPreview(!showPreview)}
              >
                <BookOpenIcon /> Prévia
              </Button>
              <Button size="sm" variant="ghost" onClick={() => remove(selected.id)}>
                <Trash2Icon /> Apagar página
              </Button>
            </div>
          </div>
          <div className="grid gap-3 xl:grid-cols-2">
            <div className={cn('space-y-1', showPreview && 'max-xl:hidden')}>
              <Label htmlFor={`${base}-texto`} className="sr-only">
                Texto da página
              </Label>
              <Textarea
                id={`${base}-texto`}
                value={selected.body}
                rows={18}
                maxLength={CODEX_BODY_LIMIT}
                className="font-mono text-[13px] leading-relaxed"
                placeholder={
                  '# Fúria\n\nComo ação bônus, você entra em fúria por 1 minuto.\n\n- Vantagem em testes de Força\n- Veja também [[Ataque Extra]]'
                }
                onChange={(event) =>
                  update(selected.id, { body: event.target.value }, `texto:${selected.id}`)
                }
              />
              <ul className="text-muted-foreground grid gap-x-4 gap-y-0.5 text-xs sm:grid-cols-2">
                {HELP.map(([code, meaning]) => (
                  <li key={code}>
                    <code className="text-foreground font-mono">{code}</code> {meaning}
                  </li>
                ))}
              </ul>
            </div>
            <div
              aria-label="Prévia da página"
              className={cn('min-w-0 rounded-lg border p-4', !showPreview && 'max-xl:hidden')}
            >
              <p className="font-heading mb-3 text-2xl tracking-wide uppercase">{selected.title}</p>
              {selected.body.trim() ? (
                <CodexText
                  text={selected.body}
                  pages={pages}
                  onOpenPage={(page) => setSelectedId(page.id)}
                />
              ) : (
                <p className="text-muted-foreground text-sm">A prévia aparece aqui.</p>
              )}
            </div>
          </div>
        </section>
      ) : (
        <div className="text-muted-foreground flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed py-12 text-center text-sm">
          <BookOpenIcon className="size-6" />
          <p>Nenhuma página ainda.</p>
          <p className="max-w-sm">
            Comece por "Nova página": uma por habilidade, regra ou item. Uma página pode apontar
            para outra com [[Título]].
          </p>
        </div>
      )}
    </div>
  );
}
