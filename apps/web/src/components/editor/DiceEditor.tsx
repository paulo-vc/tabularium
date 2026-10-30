import { CUSTOM_DIE_FACES, type CustomDie, type SystemTemplate } from '@tabula/domain';
import { DicesIcon, PlusIcon, Trash2Icon } from 'lucide-react';
import { useId } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { ApplyChange } from './use-template-editor';

/** Cores fixas para um dado do sistema (ou nenhuma: a cor de quem rola). */
const COLORS = [
  { name: 'Dourado', value: '#d4a017' },
  { name: 'Roxo', value: '#5b21b6' },
  { name: 'Vermelho', value: '#b91c1c' },
  { name: 'Azul', value: '#1d4ed8' },
  { name: 'Verde', value: '#047857' },
  { name: 'Preto', value: '#1c1917' },
];

/** Valor do seletor "Comparar com" para nenhum dado (o Select não aceita valor vazio). */
const NO_RIVAL = '__nenhum__';

const numbered = (count: number) =>
  Array.from({ length: count }, (_, i) => ({ label: String(i + 1), value: i + 1 }));

/** Pontos de partida: dá para criar um dado do zero ou começar de um desses. */
const PRESETS: { name: string; dice: CustomDie[] }[] = [
  {
    name: 'Dado Fate (dF)',
    dice: [
      {
        id: 'F',
        name: 'Dado Fate',
        faces: [
          { label: '−', value: -1 },
          { label: '−', value: -1 },
          { label: '0', value: 0 },
          { label: '0', value: 0 },
          { label: '+', value: 1 },
          { label: '+', value: 1 },
        ],
      },
    ],
  },
  {
    name: 'Esperança e Medo (2d12)',
    dice: [
      {
        id: 'Esperanca',
        name: 'Esperança',
        color: '#d4a017',
        faces: numbered(12),
        duel: { against: 'Medo', win: 'com Esperança', tie: 'crítico' },
      },
      {
        id: 'Medo',
        name: 'Medo',
        color: '#5b21b6',
        faces: numbered(12),
        duel: { against: 'Esperanca', win: 'com Medo', tie: 'crítico' },
      },
    ],
  },
  { name: 'Em branco (6 faces)', dice: [{ id: 'X', name: 'Novo dado', faces: numbered(6) }] },
];

/** Um ID de notação livre ("X", "X2"…), sem repetir os que já existem. */
function freeId(base: string, taken: readonly CustomDie[]): string {
  const used = new Set(taken.map((die) => die.id.toLowerCase()));
  if (!used.has(base.toLowerCase())) return base;
  for (let n = 2; ; n++) if (!used.has(`${base}${n}`.toLowerCase())) return `${base}${n}`;
}

/**
 * Dados do sistema, na aba Informações do editor: cada um com nome, notação (`4dF`), faces
 * (o que aparece e quanto soma) e uma cor fixa opcional. Os erros aparecem no topo do editor,
 * como os do resto do sistema.
 */
export function DiceEditor({ template, apply }: { template: SystemTemplate; apply: ApplyChange }) {
  const dice = template.dice ?? [];
  const setDice = (next: CustomDie[], label: string) =>
    apply((t) => {
      const { dice: _old, ...rest } = t;
      return next.length > 0 ? { ...rest, dice: next } : rest;
    }, label);
  const update = (index: number, change: (die: CustomDie) => CustomDie) =>
    setDice(
      dice.map((die, i) => (i === index ? change(die) : die)),
      'dados',
    );
  const add = (preset: CustomDie[]) => {
    const added = [...dice];
    const renamed = new Map<string, string>();
    for (const die of preset) {
      const id = freeId(die.id, added);
      renamed.set(die.id, id);
      added.push({ ...die, id });
    }
    // Os dados de um modelo se comparam entre si: a comparação acompanha a notação nova.
    setDice(
      added.map((die) =>
        die.duel && renamed.has(die.duel.against) && preset.some((p) => p.id === die.duel?.against)
          ? { ...die, duel: { ...die.duel, against: renamed.get(die.duel.against) as string } }
          : die,
      ),
      'novo dado',
    );
  };
  /**
   * Liga (ou desliga) a comparação de um dado com outro. O outro ganha a comparação de volta,
   * se ainda não tiver uma: assim "com Esperança" e "com Medo" saem de uma escolha só.
   */
  const setRival = (index: number, rivalId: string | null) => {
    const die = dice[index];
    if (!die) return;
    const next = dice.map((d, i): CustomDie => {
      if (i === index) {
        if (rivalId === null) {
          const { duel: _duel, ...rest } = d;
          return rest;
        }
        return { ...d, duel: { win: d.duel?.win ?? `com ${d.name}`, ...d.duel, against: rivalId } };
      }
      if (rivalId !== null && d.id === rivalId && !d.duel) {
        return {
          ...d,
          duel: { against: die.id, win: `com ${d.name}`, tie: die.duel?.tie ?? 'crítico' },
        };
      }
      return d;
    });
    if (rivalId !== null && !next[index]?.duel?.tie) {
      const self = next[index];
      if (self?.duel) next[index] = { ...self, duel: { ...self.duel, tie: 'crítico' } };
    }
    setDice(next, 'comparação de dados');
  };

  return (
    <section aria-labelledby="dados-do-sistema" className="space-y-3 border-t pt-4">
      <div className="space-y-1">
        <h3 id="dados-do-sistema" className="flex items-center gap-2 text-sm font-medium">
          <DicesIcon className="size-4" /> Dados do sistema
        </h3>
        <p className="text-muted-foreground text-xs">
          Dados com faces próprias. Rola-se com a quantidade, <code>d</code> e a notação: com a
          notação F, <code>4dF</code>. Valem na ficha, no chat e nos dados 3D.
        </p>
      </div>

      {dice.map((die, index) => (
        <DieCard
          key={index}
          die={die}
          others={dice.filter((_, i) => i !== index)}
          onRival={(rivalId) => setRival(index, rivalId)}
          onChange={(change) => update(index, change)}
          onRemove={() =>
            setDice(
              dice.filter((_, i) => i !== index),
              'remover dado',
            )
          }
        />
      ))}

      <div className="flex flex-wrap gap-2">
        {PRESETS.map((preset) => (
          <Button
            key={preset.name}
            type="button"
            size="sm"
            variant="outline"
            onClick={() => add(preset.dice)}
          >
            <PlusIcon /> {preset.name}
          </Button>
        ))}
      </div>
    </section>
  );
}

function DieCard({
  die,
  others,
  onRival,
  onChange,
  onRemove,
}: {
  die: CustomDie;
  /** Os outros dados do sistema, com quem este pode se comparar. */
  others: readonly CustomDie[];
  onRival: (rivalId: string | null) => void;
  onChange: (change: (die: CustomDie) => CustomDie) => void;
  onRemove: () => void;
}) {
  const base = useId();
  const resize = (count: number) =>
    onChange((d) => ({
      ...d,
      faces: Array.from(
        { length: count },
        (_, i) => d.faces[i] ?? { label: String(i + 1), value: i + 1 },
      ),
    }));

  return (
    <div role="group" aria-label={`Dado ${die.name}`} className="space-y-3 rounded-lg border p-3">
      <div className="grid gap-3 sm:grid-cols-[1fr_8rem_8rem_auto] sm:items-end">
        <div className="space-y-1.5">
          <Label htmlFor={`${base}-nome`}>Nome</Label>
          <Input
            id={`${base}-nome`}
            value={die.name}
            maxLength={100}
            onChange={(event) => onChange((d) => ({ ...d, name: event.target.value }))}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`${base}-id`}>Notação</Label>
          <div className="flex items-center gap-1">
            <span className="text-muted-foreground font-mono text-sm">d</span>
            <Input
              id={`${base}-id`}
              value={die.id}
              maxLength={16}
              className="font-mono"
              onChange={(event) =>
                onChange((d) => ({ ...d, id: event.target.value.replace(/[^A-Za-z0-9]/g, '') }))
              }
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`${base}-faces`}>Faces</Label>
          <Select value={String(die.faces.length)} onValueChange={(value) => resize(Number(value))}>
            <SelectTrigger id={`${base}-faces`} className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CUSTOM_DIE_FACES.map((count) => (
                <SelectItem key={count} value={String(count)}>
                  {count}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          aria-label={`Remover o dado ${die.name}`}
          onClick={onRemove}
        >
          <Trash2Icon />
        </Button>
      </div>

      <div className="space-y-1.5">
        <p id={`${base}-cor`} className="text-sm font-medium">
          Cor
        </p>
        <div role="radiogroup" aria-labelledby={`${base}-cor`} className="flex flex-wrap gap-2">
          <button
            type="button"
            role="radio"
            aria-checked={die.color === undefined}
            className={cn(
              'h-7 rounded-full border px-3 text-xs',
              die.color === undefined && 'ring-primary ring-offset-background ring-2 ring-offset-2',
            )}
            onClick={() =>
              onChange((d) => {
                const { color: _color, ...rest } = d;
                return rest;
              })
            }
          >
            A de quem rola
          </button>
          {COLORS.map(({ name, value }) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={die.color === value}
              aria-label={name}
              title={name}
              className={cn(
                'size-7 rounded-full border',
                die.color === value && 'ring-primary ring-offset-background ring-2 ring-offset-2',
              )}
              style={{ backgroundColor: value }}
              onClick={() => onChange((d) => ({ ...d, color: value }))}
            />
          ))}
        </div>
      </div>

      {others.length > 0 && (
        <div className="space-y-2">
          <div className="grid gap-3 sm:grid-cols-[minmax(0,12rem)_1fr_1fr] sm:items-end">
            <div className="space-y-1.5">
              <Label htmlFor={`${base}-rival`}>Comparar com</Label>
              <Select
                value={die.duel?.against ?? NO_RIVAL}
                onValueChange={(value) => onRival(value === NO_RIVAL ? null : value)}
              >
                <SelectTrigger id={`${base}-rival`} className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_RIVAL}>Nenhum</SelectItem>
                  {others.map((other) => (
                    <SelectItem key={other.id} value={other.id}>
                      {other.name} (d{other.id})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {die.duel && (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor={`${base}-vence`}>Se este vencer</Label>
                  <Input
                    id={`${base}-vence`}
                    value={die.duel.win}
                    maxLength={40}
                    onChange={(event) =>
                      onChange((d) =>
                        d.duel ? { ...d, duel: { ...d.duel, win: event.target.value } } : d,
                      )
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor={`${base}-empate`}>Se empatar</Label>
                  <Input
                    id={`${base}-empate`}
                    value={die.duel.tie ?? ''}
                    maxLength={40}
                    placeholder="Nada"
                    onChange={(event) =>
                      onChange((d) => {
                        if (!d.duel) return d;
                        const { tie: _tie, ...duel } = d.duel;
                        return {
                          ...d,
                          duel: event.target.value ? { ...duel, tie: event.target.value } : duel,
                        };
                      })
                    }
                  />
                </div>
              </>
            )}
          </div>
          <p className="text-muted-foreground text-xs">
            Rolados juntos, um de cada, o maior dá o resultado da rolagem, como na dualidade ("com
            Esperança" ou "com Medo").
          </p>
        </div>
      )}

      <fieldset className="space-y-1.5">
        <legend className="text-sm font-medium">Faces: o que aparece e quanto soma</legend>
        <ol className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {die.faces.map((face, index) => (
            <li key={index} className="flex items-center gap-1.5">
              <span className="text-muted-foreground w-5 text-right text-xs tabular-nums">
                {index + 1}
              </span>
              <Input
                aria-label={`Face ${index + 1}: o que aparece`}
                value={face.label}
                maxLength={3}
                className="w-14 text-center"
                onChange={(event) =>
                  onChange((d) => ({
                    ...d,
                    faces: d.faces.map((f, i) =>
                      i === index ? { ...f, label: event.target.value } : f,
                    ),
                  }))
                }
              />
              <Input
                aria-label={`Face ${index + 1}: quanto soma`}
                type="number"
                value={face.value}
                className="w-16 text-center"
                onChange={(event) =>
                  onChange((d) => ({
                    ...d,
                    faces: d.faces.map((f, i) =>
                      i === index
                        ? { ...f, value: Math.trunc(Number(event.target.value)) || 0 }
                        : f,
                    ),
                  }))
                }
              />
            </li>
          ))}
        </ol>
      </fieldset>
    </div>
  );
}
