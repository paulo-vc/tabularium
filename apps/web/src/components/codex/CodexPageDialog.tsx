import { findCodexPage, type CodexPage } from '@tabula/domain';
import { BookOpenIcon, XIcon } from 'lucide-react';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { CodexText } from './CodexText';

/** Uma página do códice numa janela, com os links levando às outras páginas ali mesmo. */
export function CodexPageDialog({
  page,
  pages,
  onClose,
}: {
  page: CodexPage | null;
  pages: readonly CodexPage[];
  onClose: () => void;
}) {
  // A página aberta por um link, enquanto a janela continua aberta.
  const [followed, setFollowed] = useState<CodexPage | null>(null);
  const shown = followed ?? page;
  const close = () => {
    setFollowed(null);
    onClose();
  };
  return (
    <Dialog open={shown !== null} onOpenChange={(open) => !open && close()}>
      {shown && (
        <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-heading text-2xl tracking-wide uppercase">
              {shown.title}
            </DialogTitle>
            <DialogDescription className="flex items-center gap-1.5">
              <BookOpenIcon className="size-3.5" /> Códice
              {shown.category && <span>· {shown.category}</span>}
            </DialogDescription>
          </DialogHeader>
          {shown.body.trim() ? (
            <CodexText text={shown.body} pages={pages} onOpenPage={setFollowed} />
          ) : (
            <p className="text-muted-foreground text-sm">Página em branco.</p>
          )}
        </DialogContent>
      )}
    </Dialog>
  );
}

/**
 * Condições como etiquetas. As que têm página no códice abrem a página ao toque; com
 * `onRemove`, cada uma ganha o X para tirar.
 */
export function ConditionTags({
  conditions,
  pages,
  rounds,
  onRemove,
  className,
}: {
  conditions: readonly string[];
  pages: readonly CodexPage[];
  /** Rodadas que faltam das condições com duração. */
  rounds?: Readonly<Record<string, number>> | undefined;
  onRemove?: ((condition: string) => void) | undefined;
  className?: string | undefined;
}) {
  const [open, setOpen] = useState<CodexPage | null>(null);
  if (conditions.length === 0) return null;
  return (
    <>
      <span className={cn('flex flex-wrap gap-1', className)}>
        {conditions.map((condition) => {
          const page = findCodexPage(pages, condition);
          return (
            <Badge
              key={condition}
              variant="secondary"
              className={cn('gap-0.5 font-normal', onRemove ? 'pr-0.5' : '', !page && 'px-1.5')}
            >
              {page ? (
                <button
                  type="button"
                  className="hover:underline"
                  title="Ver no códice"
                  aria-label={`${condition}: ver no códice`}
                  onClick={() => setOpen(page)}
                >
                  {condition}
                </button>
              ) : (
                condition
              )}
              {rounds?.[condition] !== undefined && (
                <span
                  className="text-muted-foreground font-mono"
                  title={`Faltam ${rounds[condition]} rodada(s)`}
                  aria-label={`faltam ${rounds[condition]} rodada(s)`}
                >
                  {rounds[condition]}
                </span>
              )}
              {onRemove && (
                <button
                  type="button"
                  aria-label={`Remover ${condition}`}
                  className="hover:bg-foreground/10 rounded-sm"
                  onClick={() => onRemove(condition)}
                >
                  <XIcon className="size-3" />
                </button>
              )}
            </Badge>
          );
        })}
      </span>
      <CodexPageDialog page={open} pages={pages} onClose={() => setOpen(null)} />
    </>
  );
}
