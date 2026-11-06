import {
  BESTIARY_LIMIT,
  blankCreature,
  CREATURE_STAT_LIMIT,
  DEFAULT_CREATURE_STATS,
  type Creature,
  type SystemTemplate,
} from '@tabula/domain';
import { CopyIcon, PencilIcon, PlusIcon, SkullIcon, Trash2Icon } from 'lucide-react';
import { useId, useState } from 'react';
import { CreatureDialog } from '@/components/bestiary/CreatureDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { ApplyChange } from './use-template-editor';

const withCreatures = (template: SystemTemplate, bestiary: Creature[]): SystemTemplate => {
  if (bestiary.length > 0) return { ...template, bestiary };
  const { bestiary: _bestiary, ...rest } = template;
  return rest;
};

const parseLabels = (text: string) =>
  [
    ...new Set(
      text
        .split(',')
        .map((label) => label.trim())
        .filter(Boolean),
    ),
  ]
    .map((label) => label.slice(0, 40))
    .slice(0, CREATURE_STAT_LIMIT);

/**
 * Aba Bestiário do criador de sistemas: as características que toda criatura do sistema
 * tem (CA, Deslocamento…) e as criaturas prontas que vêm com ele.
 */
export function BestiaryEditor({
  template,
  apply,
}: {
  template: SystemTemplate;
  apply: ApplyChange;
}) {
  const base = useId();
  const creatures = template.bestiary ?? [];
  const statLabels = template.creatureStats ?? DEFAULT_CREATURE_STATS;
  const [labels, setLabels] = useState(statLabels.join(', '));
  const [editing, setEditing] = useState<Creature | null>(null);

  const commitLabels = () => {
    const parsed = parseLabels(labels);
    setLabels(parsed.join(', '));
    apply((t) => {
      if (parsed.length === 0) {
        const { creatureStats: _stats, ...rest } = t;
        return rest;
      }
      return { ...t, creatureStats: parsed };
    });
  };
  const save = (creature: Creature) => {
    apply((t) => {
      const list = t.bestiary ?? [];
      return withCreatures(
        t,
        list.some((item) => item.id === creature.id)
          ? list.map((item) => (item.id === creature.id ? creature : item))
          : [...list, creature],
      );
    });
    return null;
  };

  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <Label htmlFor={`${base}-caracteristicas`}>Características das criaturas</Label>
        <Input
          id={`${base}-caracteristicas`}
          value={labels}
          placeholder={DEFAULT_CREATURE_STATS.join(', ')}
          onChange={(event) => setLabels(event.target.value)}
          onBlur={commitLabels}
          onKeyDown={(event) => {
            if (event.key === 'Enter') commitLabels();
          }}
        />
        <p className="text-muted-foreground text-xs">
          Separadas por vírgula (ex.: CA, Deslocamento, ND). Toda criatura nova, aqui ou no
          bestiário de uma campanha, começa com elas. PV, iniciativa e ataques já vêm sempre.
        </p>
      </div>

      <section className="space-y-2" aria-label="Criaturas do sistema">
        <p className="text-muted-foreground text-sm">
          Criaturas prontas que vêm com o sistema. O Mestre as usa no combate ou copia para a
          campanha e ajusta. Os jogadores não veem o bestiário.
        </p>
        {creatures.length === 0 ? (
          <div className="text-muted-foreground flex flex-col items-center gap-2 rounded-lg border border-dashed py-10 text-center text-sm">
            <SkullIcon className="size-6" />
            <p>Nenhuma criatura ainda.</p>
          </div>
        ) : (
          <ul className="grid gap-2 md:grid-cols-2">
            {creatures.map((creature) => (
              <li key={creature.id} className="flex items-center gap-2 rounded-lg border px-3 py-2">
                <SkullIcon className="text-muted-foreground size-4 shrink-0" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{creature.name}</span>
                  <span className="text-muted-foreground block truncate text-xs">
                    {creature.hp} PV
                    {creature.attacks.length > 0 &&
                      ` · ${creature.attacks.map((attack) => attack.name).join(', ')}`}
                  </span>
                </span>
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label={`Editar ${creature.name}`}
                  onClick={() => setEditing(creature)}
                >
                  <PencilIcon />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label={`Duplicar ${creature.name}`}
                  disabled={creatures.length >= BESTIARY_LIMIT}
                  onClick={() =>
                    setEditing({
                      ...creature,
                      id: crypto.randomUUID(),
                      name: `${creature.name} (cópia)`.slice(0, 100),
                    })
                  }
                >
                  <CopyIcon />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label={`Apagar ${creature.name}`}
                  onClick={() =>
                    apply((t) =>
                      withCreatures(
                        t,
                        (t.bestiary ?? []).filter((item) => item.id !== creature.id),
                      ),
                    )
                  }
                >
                  <Trash2Icon />
                </Button>
              </li>
            ))}
          </ul>
        )}
        <Button
          variant="outline"
          size="sm"
          disabled={creatures.length >= BESTIARY_LIMIT}
          onClick={() => setEditing(blankCreature(crypto.randomUUID(), statLabels))}
        >
          <PlusIcon /> Nova criatura
        </Button>
      </section>

      <CreatureDialog
        creature={editing}
        title={
          editing && creatures.some((item) => item.id === editing.id)
            ? `Editar ${editing.name}`
            : 'Nova criatura'
        }
        checkDice={template.checkDice}
        dice={template.dice}
        onSave={save}
        onClose={() => setEditing(null)}
      />
    </div>
  );
}
