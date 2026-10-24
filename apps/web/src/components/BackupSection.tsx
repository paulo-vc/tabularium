import { useLiveQuery } from 'dexie-react-hooks';
import { DownloadIcon, LoaderCircleIcon, ShieldCheckIcon, UploadIcon, XIcon } from 'lucide-react';
import { useEffect, useId, useState } from 'react';
import { toast } from 'sonner';
import { Link } from 'wouter';
import { downloadFile, pickFile } from '@/lib/browser-files';
import type { InspectedBackup } from '@/app/backup';
import { useServices } from '@/app/services-context';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

const day = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long' });
const dateTime = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long', timeStyle: 'short' });

const megabytes = (bytes: number) =>
  `${(bytes / (1024 * 1024)).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} MB`;

const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;

/** "1 campanha e 2 fichas", sem o que a cópia não tem. */
function describeContents({ summary }: InspectedBackup): string {
  const parts = [
    summary.campaigns && plural(summary.campaigns, 'campanha', 'campanhas'),
    summary.sheets && plural(summary.sheets, 'ficha', 'fichas'),
    summary.templates && plural(summary.templates, 'sistema criado', 'sistemas criados'),
    summary.media && plural(summary.media, 'imagem ou música', 'imagens e músicas'),
  ].filter((part): part is string => Boolean(part));
  if (parts.length === 0) return 'só as preferências, sem fichas nem campanhas';
  return parts.length === 1
    ? (parts[0] as string)
    : `${parts.slice(0, -1).join(', ')} e ${parts.at(-1) as string}`;
}

/** Cópia de segurança, nas Configurações: fazer a cópia e restaurar uma. */
export function BackupSection() {
  const { backup } = useServices();
  const id = useId();
  const last = useLiveQuery(() => backup.lastBackupAt(), [backup]);
  const mediaBytes = useLiveQuery(() => backup.mediaBytes(), [backup]);
  const [media, setMedia] = useState(true);
  const [busy, setBusy] = useState(false);
  const [toRestore, setToRestore] = useState<InspectedBackup | null>(null);

  const create = async () => {
    setBusy(true);
    try {
      const file = await backup.create(media && (mediaBytes ?? 0) > 0);
      downloadFile(file);
      toast.success('Cópia feita', { description: `Arquivo ${file.filename}.` });
    } catch (error) {
      console.error('Falha ao fazer a cópia', error);
      toast.error('Não foi possível fazer a cópia');
    } finally {
      setBusy(false);
    }
  };

  const choose = async () => {
    const file = await pickFile();
    if (!file) return;
    const inspected = await backup.inspect(file);
    if (!inspected.ok) {
      toast.error('Não foi possível ler a cópia', { description: inspected.error.message });
      return;
    }
    setToRestore(inspected.value);
  };

  const restore = async (inspected: InspectedBackup) => {
    setBusy(true);
    try {
      await backup.restore(inspected.backup);
      // A identidade e os dados mudaram: o app recomeça a partir da cópia.
      window.location.hash = '#/';
      window.location.reload();
    } catch (error) {
      console.error('Falha ao restaurar', error);
      toast.error('Não foi possível restaurar a cópia', {
        description: 'Nada foi alterado neste aparelho.',
      });
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2>Cópia de segurança</h2>
        </CardTitle>
        <CardDescription>
          Tudo o que está neste aparelho num arquivo: fichas, campanhas, sistemas, diário e as suas
          preferências. Para não perder nada e para levar tudo a outro computador ou celular.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="flex items-center gap-2 text-sm">
          <ShieldCheckIcon className="text-muted-foreground size-4 shrink-0" />
          {last === undefined
            ? 'Nenhuma cópia feita neste aparelho ainda.'
            : `Última cópia: ${day.format(last)}.`}
        </p>
        {mediaBytes !== undefined && mediaBytes > 0 && (
          <div className="flex items-start gap-2">
            <Checkbox
              id={`${id}-midia`}
              checked={media}
              className="mt-0.5"
              onCheckedChange={(value) => setMedia(value === true)}
            />
            <Label htmlFor={`${id}-midia`} className="block font-normal">
              Incluir as suas imagens e músicas ({megabytes(mediaBytes)})
              <span className="text-muted-foreground block text-xs">
                As da galeria e da biblioteca do Mestre. As recebidas voltam a baixar na sessão.
              </span>
            </Label>
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          <Button disabled={busy} onClick={() => void create()}>
            {busy ? <LoaderCircleIcon className="animate-spin" /> : <DownloadIcon />} Fazer cópia
          </Button>
          <Button variant="outline" disabled={busy} onClick={() => void choose()}>
            <UploadIcon /> Restaurar uma cópia…
          </Button>
        </div>
        <p className="text-muted-foreground text-xs">
          A cópia leva a chave de Mestre das suas campanhas: quem tiver o arquivo pode abrir a
          sessão como você. Guarde-a só com você.
        </p>
      </CardContent>

      <AlertDialog open={toRestore !== null} onOpenChange={(open) => !open && setToRestore(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restaurar esta cópia?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                {toRestore && (
                  <p>
                    Cópia de {dateTime.format(Date.parse(toRestore.summary.exportedAt))}:{' '}
                    {describeContents(toRestore)}.
                  </p>
                )}
                <p>
                  <strong>Tudo o que está neste aparelho será substituído</strong> pelo que está na
                  cópia, inclusive quem você é nas campanhas. Se aqui tiver algo que não está na
                  cópia, faça uma cópia deste aparelho antes.
                </p>
                <p>Depois, use um aparelho por vez: os dois seriam a mesma pessoa na mesa.</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={busy}
              onClick={(event) => {
                event.preventDefault();
                if (toRestore) void restore(toRestore);
              }}
            >
              {busy && <LoaderCircleIcon className="animate-spin" />} Restaurar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

/** Lembrete discreto, na tela inicial, quando faz tempo sem cópia (ou nunca houve). */
export function BackupReminder() {
  const { backup } = useServices();
  const [show, setShow] = useState(false);
  useEffect(() => {
    let active = true;
    // Só um lembrete: se a consulta falhar (ex.: o app fechando), simplesmente não aparece.
    backup.shouldRemind().then(
      (value) => active && setShow(value),
      () => undefined,
    );
    return () => {
      active = false;
    };
  }, [backup]);
  if (!show) return null;
  return (
    <div
      role="note"
      className="bg-muted/50 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border px-3 py-2 text-sm"
    >
      <ShieldCheckIcon className="text-muted-foreground size-4 shrink-0" />
      <span className="min-w-0 flex-1">
        Faça uma cópia de segurança: se este aparelho se perder ou for limpo, as fichas e campanhas
        vão junto.
      </span>
      <Button size="sm" variant="outline" asChild>
        <Link href="/configuracoes">Fazer cópia</Link>
      </Button>
      <Button
        size="icon"
        variant="ghost"
        className="size-7"
        aria-label="Lembrar depois"
        title="Lembrar daqui a um mês"
        onClick={() => {
          setShow(false);
          void backup.snoozeReminder();
        }}
      >
        <XIcon />
      </Button>
    </div>
  );
}
