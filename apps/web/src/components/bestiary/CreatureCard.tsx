import type { Creature, CreatureAttack } from '@tabula/domain';
import { DicesIcon, HeartIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CodexText } from '@/components/codex/CodexText';
import { cn } from '@/lib/utils';

/**
 * Bloco de estatísticas de uma criatura: PV, iniciativa, características, ataques e
 * habilidades. Com `onRoll`, os ataques rolam (acerto e dano) pelo próprio bloco.
 */
export function CreatureCard({
  creature,
  onRoll,
  header = true,
  className,
}: {
  creature: Creature;
  onRoll?:
    ((attack: CreatureAttack, kind: 'acerto' | 'dano', expression: string) => void) | undefined;
  /** Nome e tipo no topo; sem eles, quando a lista em volta já os mostra. */
  header?: boolean;
  className?: string | undefined;
}) {
  const stats = creature.stats.filter((stat) => stat.value.trim());
  return (
    <div className={cn('space-y-3', className)}>
      {header && (
        <div>
          <p className="font-heading text-xl tracking-wide uppercase">{creature.name}</p>
          {creature.kind && <p className="text-muted-foreground text-sm italic">{creature.kind}</p>}
        </div>
      )}
      <dl className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
        <div className="flex items-center gap-1.5">
          <HeartIcon className="text-destructive size-3.5" aria-hidden />
          <dt className="text-muted-foreground">PV</dt>
          <dd className="tabular-nums font-medium">{creature.hp}</dd>
        </div>
        {creature.initiative && (
          <div className="flex gap-1.5">
            <dt className="text-muted-foreground">Iniciativa</dt>
            <dd className="tabular-nums font-medium">{creature.initiative}</dd>
          </div>
        )}
      </dl>
      {stats.length > 0 && (
        <dl className="grid grid-cols-[repeat(auto-fill,minmax(7.5rem,1fr))] gap-1.5 text-sm">
          {stats.map((stat, index) => (
            <div key={index} className="bg-muted/50 rounded-md px-2 py-1">
              <dt className="text-muted-foreground text-xs">{stat.label}</dt>
              <dd className="font-medium wrap-anywhere">{stat.value}</dd>
            </div>
          ))}
        </dl>
      )}
      {creature.attacks.length > 0 && (
        <section className="space-y-1.5">
          <h3 className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
            Ataques
          </h3>
          <ul className="space-y-1.5">
            {creature.attacks.map((attack) => (
              <li
                key={attack.id}
                className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-md border px-2.5 py-1.5 text-sm"
              >
                <span className="font-medium">{attack.name}</span>
                {attack.notes && (
                  <span className="text-muted-foreground min-w-0 flex-1 text-xs">
                    {attack.notes}
                  </span>
                )}
                <span className="ml-auto flex gap-1">
                  {attack.roll &&
                    (onRoll ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 font-mono"
                        aria-label={`Rolar o acerto de ${attack.name} (${attack.roll})`}
                        onClick={() => onRoll(attack, 'acerto', attack.roll ?? '')}
                      >
                        <DicesIcon /> {attack.roll}
                      </Button>
                    ) : (
                      <span className="font-mono text-xs">{attack.roll}</span>
                    ))}
                  {attack.damage &&
                    (onRoll ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 font-mono"
                        aria-label={`Rolar o dano de ${attack.name} (${attack.damage})`}
                        onClick={() => onRoll(attack, 'dano', attack.damage ?? '')}
                      >
                        Dano {attack.damage}
                      </Button>
                    ) : (
                      <span className="font-mono text-xs">dano {attack.damage}</span>
                    ))}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
      {creature.text?.trim() && <CodexText text={creature.text} />}
    </div>
  );
}
