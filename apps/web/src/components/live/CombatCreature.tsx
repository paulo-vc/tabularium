import {
  EFFECT_LIMIT,
  EFFECT_MAX_LENGTH,
  WOUND_LABELS,
  woundCondition,
  type ActiveEffect,
  type Creature,
  type CreatureAttack,
  type WoundCondition,
} from '@tabula/domain';
import { HeartIcon, PlusIcon, SwordIcon, TagIcon } from 'lucide-react';
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

/**
 * Marcar condições num participante (Mestre): as do códice do sistema num toque e qualquer
 * outra digitada ("Abençoado", "Concentrado em Bênção").
 */
/** Durações que o Mestre escolhe antes de marcar (em rodadas; `null` = até tirar). */
const DURATIONS = [null, 1, 2, 3, 10] as const;

const roundsLabel = (rounds: number) => (rounds === 1 ? '1 rodada' : `${rounds} rodadas`);

export function CombatantConditions({
  name,
  effects,
  suggestions,
  onChange,
}: {
  name: string;
  /** As condições que valem agora. */
  effects: readonly ActiveEffect[];
  /** As condições do códice do sistema. */
  suggestions: readonly string[];
  onChange: (effects: ActiveEffect[]) => void;
}) {
  const base = useId();
  const [other, setOther] = useState('');
  const [duration, setDuration] = useState<number | null>(null);
  const active = new Map(effects.map((effect) => [conditionKey(effect.name), effect]));
  const mark = (condition: string): ActiveEffect =>
    duration === null ? { name: condition } : { name: condition, rounds: duration };
  const toggle = (condition: string) =>
    onChange(
      active.has(conditionKey(condition))
        ? effects.filter((effect) => conditionKey(effect.name) !== conditionKey(condition))
        : [...effects, mark(condition)],
    );
  // As digitadas, que não estão entre as sugestões, também aparecem para desmarcar.
  const options = [
    ...suggestions,
    ...effects
      .map((effect) => effect.name)
      .filter((effect) => !suggestions.some((s) => conditionKey(s) === conditionKey(effect))),
  ];
  const full = effects.length >= EFFECT_LIMIT;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          size="icon"
          variant="ghost"
          aria-label={`Condições de ${name}`}
          title="Condições (a mesa vê)"
        >
          <TagIcon />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 space-y-2" aria-label={`Condições de ${name}`}>
        <p className="text-sm">
          <span className="font-medium">{name}</span>{' '}
          <span className="text-muted-foreground">· a mesa vê as condições</span>
        </p>
        <div role="group" aria-label="Duração" className="flex flex-wrap items-center gap-1">
          <span className="text-muted-foreground mr-1 text-xs">Duração</span>
          {DURATIONS.map((option) => (
            <Button
              key={option ?? 'livre'}
              type="button"
              size="sm"
              variant={duration === option ? 'secondary' : 'ghost'}
              aria-pressed={duration === option}
              className="h-6 px-1.5 text-xs"
              onClick={() => setDuration(option)}
            >
              {option === null ? 'Até tirar' : option === 1 ? '1 rodada' : option}
            </Button>
          ))}
        </div>
        {options.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {options.map((condition) => {
              const current = active.get(conditionKey(condition));
              return (
                <Button
                  key={condition}
                  type="button"
                  size="sm"
                  variant={current ? 'default' : 'outline'}
                  aria-pressed={current !== undefined}
                  disabled={!current && full}
                  className="h-7 px-2 text-xs"
                  onClick={() => toggle(condition)}
                >
                  {condition}
                  {current?.rounds !== undefined && (
                    <span className="font-mono opacity-75" aria-label={roundsLabel(current.rounds)}>
                      {current.rounds}
                    </span>
                  )}
                </Button>
              );
            })}
          </div>
        )}
        <form
          className="flex items-center gap-1"
          onSubmit={(event: FormEvent) => {
            event.preventDefault();
            if (!other.trim() || full) return;
            onChange([...effects, mark(other)]);
            setOther('');
          }}
        >
          <Label htmlFor={`${base}-outra`} className="sr-only">
            Outra condição
          </Label>
          <Input
            id={`${base}-outra`}
            value={other}
            maxLength={EFFECT_MAX_LENGTH}
            placeholder="Outra condição"
            className="h-8"
            onChange={(event) => setOther(event.target.value)}
          />
          <Button type="submit" size="sm" variant="outline" disabled={!other.trim() || full}>
            <PlusIcon /> Marcar
          </Button>
        </form>
        {duration !== null && (
          <p className="text-muted-foreground text-xs">
            Some sozinha quando termina a {duration === 1 ? 'próxima vez' : `${duration}ª vez`} de{' '}
            {name}.
          </p>
        )}
      </PopoverContent>
    </Popover>
  );
}

const conditionKey = (text: string) =>
  text.trim().normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
