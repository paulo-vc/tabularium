import {
  restChanges,
  restFields,
  type CompiledTemplate,
  type DerivedValues,
  type FieldValue,
  type RestKind,
  type SheetValues,
} from '@tabula/domain';
import { ArrowRightIcon, MoonIcon } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const REST_LABELS: Record<RestKind, string> = { curto: 'Descanso curto', longo: 'Descanso longo' };

/**
 * "Descansar": recupera o que o sistema manda (`recover` nos campos), depois de mostrar o que
 * vai mudar. Some quando o sistema não marca nada para recuperar.
 */
export function RestButton({
  compiled,
  values,
  derived,
  onChange,
}: {
  compiled: CompiledTemplate;
  values: SheetValues;
  derived: DerivedValues;
  onChange: (fieldId: string, value: FieldValue) => void;
}) {
  const [open, setOpen] = useState(false);
  const kinds = (['curto', 'longo'] as const).filter(
    (kind) => restFields(compiled, kind).length > 0,
  );
  const [chosen, setChosen] = useState<RestKind | null>(null);
  if (kinds.length === 0) return null;
  const rest = chosen && kinds.includes(chosen) ? chosen : (kinds.at(-1) as RestKind);
  const changes = open ? restChanges(compiled, values, derived, rest) : [];

  const apply = () => {
    for (const change of changes) onChange(change.fieldId, change.value);
    setOpen(false);
    toast(`${REST_LABELS[rest]} feito`, {
      description: changes.map((c) => `${c.label}: ${c.to}`).join(' · '),
    });
  };

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen(true)}
        title="Descanso curto ou longo"
      >
        <MoonIcon /> <span className="max-sm:sr-only">Descansar</span>
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Descansar</DialogTitle>
            <DialogDescription>Recupera o que o sistema manda. Confira antes.</DialogDescription>
          </DialogHeader>
          {kinds.length > 1 && (
            <div role="group" aria-label="Tipo de descanso" className="flex gap-1">
              {kinds.map((kind) => (
                <Button
                  key={kind}
                  type="button"
                  size="sm"
                  variant={rest === kind ? 'default' : 'outline'}
                  aria-pressed={rest === kind}
                  className="flex-1"
                  onClick={() => setChosen(kind)}
                >
                  {REST_LABELS[kind]}
                </Button>
              ))}
            </div>
          )}
          {changes.length > 0 ? (
            <ul aria-label="O que muda" className="divide-y rounded-md border text-sm">
              {changes.map((change) => (
                <li key={change.fieldId} className="flex items-center gap-2 px-3 py-2">
                  <span className="min-w-0 flex-1">{change.label}</span>
                  <span className="text-muted-foreground font-mono">{change.from}</span>
                  <ArrowRightIcon className="text-muted-foreground size-3.5" aria-label="para" />
                  <span className="font-mono font-semibold">{change.to}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground text-sm">Nada a recuperar: está tudo cheio.</p>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={apply} disabled={changes.length === 0}>
              <MoonIcon /> {REST_LABELS[rest]}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
