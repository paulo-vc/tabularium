import { MAX_IMPORT_BYTES, type Issue, type SystemTemplate } from '@tabula/domain';
import { FileUpIcon, LoaderCircleIcon, TriangleAlertIcon } from 'lucide-react';
import { useId, useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import { useLocation } from 'wouter';
import { pickFile } from '@/lib/browser-files';
import { useServices } from '@/app/services-context';
import { describeIssue } from '@/components/editor/issues';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

/** Quantos problemas a janela lista (o resto vira "+N"). */
const SHOWN_ISSUES = 8;

/**
 * Problemas do arquivo, com o lugar de cada um ("Força › fórmula: …"). Os caminhos vêm do
 * envelope (`payload.fields.3…`); o sistema puro também cai aqui, já embrulhado.
 */
function describe(text: string, issues: readonly Issue[]): string[] {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    raw = undefined;
  }
  const object = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const template = (object.payload ?? object.template ?? object) as Partial<SystemTemplate>;
  const safe = { fields: [], ...template } as SystemTemplate;
  return issues.map((issue) => {
    const [root, ...rest] = issue.path;
    const path = root === 'payload' || root === 'template' ? rest : issue.path;
    return describeIssue(safe, { ...issue, path });
  });
}

/**
 * Importar sistema: escolher o arquivo ou colar o JSON. Aceita o arquivo exportado pelo app
 * e o sistema puro (só o template). Os problemas aparecem listados, com o lugar de cada um.
 */
export function ImportSystemDialog() {
  const { files } = useServices();
  const [, navigate] = useLocation();
  const id = useId();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [problems, setProblems] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const install = async (content: string) => {
    setBusy(true);
    setProblems([]);
    try {
      const result = await files.import(content);
      if (!result.ok) {
        setProblems(describe(content, result.issues));
        return;
      }
      setOpen(false);
      setText('');
      if (result.kind === 'template') {
        toast.success(`Sistema "${result.template.name}" instalado`);
        navigate('/sistemas');
      } else {
        toast.success(`Ficha "${result.sheet.name}" importada`);
        navigate(`/fichas/${result.sheet.id}`);
      }
    } finally {
      setBusy(false);
    }
  };

  const chooseFile = async () => {
    const file = await pickFile();
    if (!file) return;
    if (file.size > MAX_IMPORT_BYTES) {
      setProblems(['O arquivo é grande demais (o limite é de 2 MB).']);
      return;
    }
    const content = await file.text();
    setText(content);
    await install(content);
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (text.trim()) void install(text);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        setProblems([]);
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline">
          <FileUpIcon /> Importar sistema
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <form onSubmit={submit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>Importar sistema</DialogTitle>
            <DialogDescription>
              O arquivo exportado pelo Tabularium ou só o JSON do sistema (o template). Escolha o
              arquivo ou cole o conteúdo.
            </DialogDescription>
          </DialogHeader>
          <Button type="button" variant="outline" disabled={busy} onClick={() => void chooseFile()}>
            <FileUpIcon /> Escolher arquivo…
          </Button>
          <div className="space-y-2">
            <Label htmlFor={`${id}-json`}>Ou cole o JSON</Label>
            <Textarea
              id={`${id}-json`}
              value={text}
              rows={8}
              spellCheck={false}
              className="field-sizing-fixed font-mono text-xs"
              placeholder='{ "id": "meu-sistema", "name": "Meu Sistema", "fields": [ … ] }'
              aria-invalid={problems.length > 0}
              aria-describedby={problems.length > 0 ? `${id}-problemas` : undefined}
              onChange={(event) => {
                setText(event.target.value);
                setProblems([]);
              }}
            />
          </div>
          {problems.length > 0 && (
            <div
              id={`${id}-problemas`}
              role="alert"
              className="border-destructive/40 bg-destructive/5 space-y-1.5 rounded-lg border p-3 text-sm"
            >
              <p className="text-destructive flex items-center gap-2 font-medium">
                <TriangleAlertIcon className="size-4" />
                {problems.length === 1
                  ? 'Um problema impede a importação:'
                  : `${problems.length} problemas impedem a importação:`}
              </p>
              <ul className="text-muted-foreground list-disc space-y-1 pl-5">
                {problems.slice(0, SHOWN_ISSUES).map((problem, index) => (
                  <li key={index} className="break-words">
                    {problem}
                  </li>
                ))}
              </ul>
              {problems.length > SHOWN_ISSUES && (
                <p className="text-muted-foreground text-xs">
                  E mais {problems.length - SHOWN_ISSUES}. Corrija estes e tente de novo.
                </p>
              )}
            </div>
          )}
          <DialogFooter>
            <Button type="submit" disabled={busy || text.trim() === ''}>
              {busy && <LoaderCircleIcon className="animate-spin" />} Importar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
