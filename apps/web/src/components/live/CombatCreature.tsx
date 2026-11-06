import {
  WOUND_LABELS,
  woundCondition,
  type Creature,
  type CreatureAttack,
  type WoundCondition,
} from '@tabula/domain';
import { HeartIcon, SwordIcon } from 'lucide-react';
import { useId, useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import { useServices } from '@/app/services-context';
import { CreatureCard } from '@/components/bestiary/CreatureCard';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { useDiceTray } from './DiceTray';

const CONDITION_STYLE: Record<WoundCondition, string> = {
  ilesa: 'text-emerald-600 dark:text-emerald-400',
  ferida: 'text-amber-600 dark:text-amber-400',
  'muito-ferida': 'text-red-600 dark:text-red-400',
  caida: 'text-muted-foreground line-through',
};

/** Estado da criatura para os jogadores ("Ferida"), na cor do estado. */
export function ConditionBadge({ condition }: { condition: WoundCondition }) {
  return (
    <Badge variant="outline" className={cn('font-normal', CONDITION_STYLE[condition])}>
      {WOUND_LABELS[condition]}
    </Badge>
  );
}

/** PV de uma criatura no combate (Mestre): o número na cor do estado; toque para dano ou cura. */
export function CombatantHp({
  name,
  hp,
  onDamage,
}: {
  name: string;
  hp: { value: number; max: number };
  /** Positivo: dano; negativo: cura. */
  onDamage: (amount: number) => void;
}) {
  const base = useId();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const parsed = Number(amount.trim());
  const valid = amount.trim() !== '' && Number.isInteger(parsed) && parsed > 0;
  const condition = woundCondition(hp.value, hp.max);
  const apply = (sign: 1 | -1) => {
    if (!valid) return;
    onDamage(sign * parsed);
    setAmount('');
    setOpen(false);
  };
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`PV de ${name}: ${hp.value} de ${hp.max} (${WOUND_LABELS[condition]}). Dano ou cura`}
          title="Dano ou cura"
          className={cn(
            'hover:bg-muted shrink-0 rounded px-1 text-sm font-semibold tabular-nums',
            CONDITION_STYLE[condition],
          )}
        >
          {hp.value}
          <span className="text-muted-foreground font-normal">/{hp.max}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-60 space-y-2" aria-label={`PV de ${name}`}>
        <p className="text-sm">
          <span className="font-medium">{name}</span>{' '}
          <span className="text-muted-foreground">
            {hp.value} de {hp.max} PV · {WOUND_LABELS[condition]}
          </span>
        </p>
        <form
          className="flex items-center gap-1"
          onSubmit={(event: FormEvent) => {
            event.preventDefault();
            apply(1);
          }}
        >
          <Label htmlFor={`${base}-qtd`} className="sr-only">
            Quanto
          </Label>
          <Input
            id={`${base}-qtd`}
            autoFocus
            inputMode="numeric"
            placeholder="Qtd."
            value={amount}
            className="h-8 w-16 text-center"
            onChange={(event) => setAmount(event.target.value)}
          />
          <Button type="submit" size="sm" variant="outline" disabled={!valid}>
            <SwordIcon /> Dano
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={!valid}
            onClick={() => apply(-1)}
          >
            <HeartIcon /> Cura
          </Button>
        </form>
      </PopoverContent>
    </Popover>
  );
}

/**
 * Ficha da criatura no combate: o bloco de estatísticas, com os ataques rolando em nome dela
 * ("Goblin 1: Cimitarra"). Em segredo, só o Mestre vê o resultado.
 */
export function CreatureSheetDialog({
  name,
  creature,
  hp,
  onClose,
}: {
  /** Nome no combate ("Goblin 2"). */
  name: string;
  creature: Creature | null;
  hp?: { value: number; max: number } | undefined;
  onClose: () => void;
}) {
  const { session } = useServices();
  const { enabled: tray } = useDiceTray();
  const base = useId();
  const [secret, setSecret] = useState(false);
  const roll = async (attack: CreatureAttack, kind: 'acerto' | 'dano', expression: string) => {
    const label = `${name}: ${attack.name}${kind === 'dano' ? ' (dano)' : ''}`;
    const result = await session.roll({ label, expression, secret });
    if (!result.ok) {
      toast.error('Não foi possível rolar', { description: result.error.message });
    } else if (!tray) {
      toast(`${label}: ${result.value.result.total}`, { description: expression });
    }
  };
  return (
    <Dialog open={creature !== null} onOpenChange={(open) => !open && onClose()}>
      {creature && (
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{name}</DialogTitle>
            <DialogDescription>
              {[creature.kind, hp && `${hp.value} de ${hp.max} PV`].filter(Boolean).join(' · ')}
            </DialogDescription>
            <p className="text-muted-foreground text-xs">Os ataques rolam em nome da criatura.</p>
          </DialogHeader>
          <CreatureCard
            creature={creature}
            header={false}
            onRoll={(...args) => void roll(...args)}
          />
          <div className="flex items-center gap-2 border-t pt-3">
            <Checkbox
              id={`${base}-segredo`}
              checked={secret}
              onCheckedChange={(value) => setSecret(value === true)}
            />
            <Label htmlFor={`${base}-segredo`} className="font-normal">
              Rolar em segredo (só você vê)
            </Label>
          </div>
        </DialogContent>
      )}
    </Dialog>
  );
}
