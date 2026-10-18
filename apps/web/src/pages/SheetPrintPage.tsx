import { computeDerived, type CompiledTemplate } from '@tabula/domain';
import { useLiveQuery } from 'dexie-react-hooks';
import { ArrowLeftIcon, PrinterIcon } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Link } from 'wouter';
import { useServices } from '@/app/services-context';
import { PrintSheet } from '@/components/sheet/PrintSheet';
import { useDeviceId } from '@/components/use-device';
import { Button } from '@/components/ui/button';

/**
 * Ficha para imprimir ou salvar em PDF. Na tela, uma prévia da folha; na impressão, só a
 * folha (o resto do app some pelo CSS de impressão).
 */
export function SheetPrintPage({ id }: { id: string }) {
  const services = useServices();
  const [compiled, setCompiled] = useState<CompiledTemplate | null | undefined>(undefined);
  useEffect(() => {
    services.sheets.open(id).then(
      (opened) => setCompiled(opened.status === 'pronta' ? opened.compiled : null),
      (error: unknown) => {
        toast.error('Erro ao abrir a ficha', { description: String(error) });
        setCompiled(null);
      },
    );
  }, [services, id]);
  const sheet = useLiveQuery(() => services.sheetRepository.get(id), [services, id]);
  const deviceId = useDeviceId();
  const isPlayerSheet = useLiveQuery(
    async () => (deviceId ? services.campaigns.isPlayerSheet(id, deviceId) : undefined),
    [services, id, deviceId],
  );
  // Como na tela: na ficha de jogador numa campanha, os campos secretos são do Mestre.
  const hidden = useMemo(
    () =>
      new Set(
        compiled && isPlayerSheet !== false
          ? compiled.template.fields.filter((f) => f.visibility === 'gm').map((f) => f.id)
          : [],
      ),
    [compiled, isPlayerSheet],
  );
  const derived = useMemo(
    () => (compiled && sheet ? computeDerived(compiled, sheet.values, sheet.bonuses) : undefined),
    [compiled, sheet],
  );

  if (compiled === undefined || sheet === undefined) return null;
  if (compiled === null || sheet === null || !derived) {
    return (
      <div className="py-16 text-center">
        <p className="text-muted-foreground">Esta ficha não pode ser impressa agora.</p>
        <Button variant="outline" className="mt-4" asChild>
          <Link href={`/fichas/${id}`}>Voltar à ficha</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 print:hidden">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/fichas/${id}`} aria-label="Voltar à ficha">
            <ArrowLeftIcon />
          </Link>
        </Button>
        <h1 className="text-xl font-semibold">Imprimir ficha</h1>
        <p className="text-muted-foreground w-full text-sm sm:order-last">
          Para PDF, escolha "Salvar como PDF" como impressora.
        </p>
        <Button className="ml-auto" onClick={() => window.print()}>
          <PrinterIcon /> Imprimir ou salvar PDF
        </Button>
      </div>
      <PrintSheet compiled={compiled} sheet={sheet} derived={derived} hidden={hidden} />
    </div>
  );
}
