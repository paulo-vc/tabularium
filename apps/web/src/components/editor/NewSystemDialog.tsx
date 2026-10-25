import { STARTERS } from '@tabula/domain';
import { useLiveQuery } from 'dexie-react-hooks';
import { PlusIcon } from 'lucide-react';
import { useId, useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import { useLocation } from 'wouter';
import { useServices } from '@/app/services-context';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const BLANK = '__branco';
const STARTER = 'modelo:';

/**
 * Começa um sistema novo: de um modelo pronto (o jeito mais fácil), em branco ou como cópia de
 * outro (ex.: uma variante do D&D).
 */
export function NewSystemDialog() {
  const { catalog, editor } = useServices();
  const templates = useLiveQuery(() => catalog.list(), [catalog]);
  const [, navigate] = useLocation();
  const base = useId();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [from, setFrom] = useState(`${STARTER}d20`);
  const starter = from.startsWith(STARTER)
    ? STARTERS.find((s) => s.id === from.slice(STARTER.length))
    : undefined;
  // Cópia leva o nome do original; em branco e modelos pedem um nome.
  const needsName = from === BLANK || starter !== undefined;
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (busy || (needsName && !name.trim())) return;
    setBusy(true);
    try {
      const draft = starter
        ? await editor.createFromStarter(starter.id, name.trim())
        : from === BLANK
          ? await editor.createBlank(name.trim())
          : await editor.createCopy(from);
      setOpen(false);
      navigate(`/sistemas/editor/${draft.id}`);
    } catch (error) {
      toast.error('Não foi possível criar o sistema', { description: String(error) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <PlusIcon /> Criar sistema
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={submit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>Criar sistema</DialogTitle>
            <DialogDescription>
              Um modelo pronto já vem com campos, fórmulas e seções que funcionam: é só mudar o que
              quiser. Ou comece do zero, ou de um sistema que você já tem.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor={`${base}-base`}>Começar</Label>
            <Select value={from} onValueChange={setFrom}>
              <SelectTrigger id={`${base}-base`} className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STARTERS.map((item) => (
                  <SelectItem key={item.id} value={`${STARTER}${item.id}`}>
                    Modelo: {item.name}
                  </SelectItem>
                ))}
                <SelectItem value={BLANK}>Em branco</SelectItem>
                {templates?.map((template) => (
                  <SelectItem key={template.id} value={template.id}>
                    Cópia de {template.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {starter && <p className="text-muted-foreground text-sm">{starter.description}</p>}
          {needsName && (
            <div className="space-y-1.5">
              <Label htmlFor={`${base}-nome`}>Nome do sistema</Label>
              <Input
                id={`${base}-nome`}
                value={name}
                maxLength={100}
                autoFocus
                placeholder="Ex.: Minha Fantasia"
                onChange={(event) => setName(event.target.value)}
              />
            </div>
          )}
          <DialogFooter>
            <Button type="submit" disabled={busy || (needsName && !name.trim())}>
              Começar a editar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
