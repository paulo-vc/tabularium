import {
  BESTIARY_LIMIT,
  blankCreature,
  DEFAULT_CREATURE_STATS,
  type Campaign,
  type Creature,
  type SystemTemplate,
} from '@tabula/domain';
import {
  ChevronDownIcon,
  CopyPlusIcon,
  PencilIcon,
  PlusIcon,
  SkullIcon,
  Trash2Icon,
} from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import { useServices } from '@/app/services-context';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { CreatureCard } from './CreatureCard';
import { CreatureDialog } from './CreatureDialog';

/**
 * Bestiário do Mestre na campanha: as criaturas dele (criadas aqui ou copiadas do sistema e
 * ajustadas) e, abaixo, as que vêm com o sistema. No combate, as duas listas aparecem para
 * escolher.
 */
export function CampaignBestiary({
  campaign,
  template,
}: {
  campaign: Campaign;
  template: SystemTemplate | undefined;
}) {
  const { campaigns } = useServices();
  const own = campaign.bestiary ?? [];
  const fromSystem = template?.bestiary ?? [];
  const [editing, setEditing] = useState<Creature | null>(null);
  const full = own.length >= BESTIARY_LIMIT;

  const save = async (creature: Creature) => {
    const result = await campaigns.saveCreature(campaign.id, creature);
    return result.ok ? null : result.error.message;
  };
  const copy = async (creature: Creature) => {
    const copied = { ...creature, id: crypto.randomUUID() };
    const result = await campaigns.saveCreature(campaign.id, copied);
    if (result.ok) {
      toast.success(`${creature.name} copiado para a campanha`, {
        description: 'Agora dá para ajustar à vontade.',
      });
    } else toast.error('Não foi possível copiar', { description: result.error.message });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <SkullIcon className="size-5" />
          <h2>Bestiário</h2>
        </CardTitle>
        <CardDescription>
          Criaturas para o combate, com PV, ataques que rolam e habilidades. Só você vê.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <section className="space-y-2" aria-label="Criaturas da campanha">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-medium">Da campanha</h3>
            <Button
              size="sm"
              variant="outline"
              disabled={full}
              onClick={() =>
                setEditing(
                  blankCreature(
                    crypto.randomUUID(),
                    template?.creatureStats ?? DEFAULT_CREATURE_STATS,
                  ),
                )
              }
            >
              <PlusIcon /> Nova criatura
            </Button>
          </div>
          {own.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              Nenhuma ainda. Crie uma ou copie uma do sistema para ajustar (um chefe mais forte, um
              lobo com outro nome…).
            </p>
          ) : (
            <CreatureList
              creatures={own}
              actions={(creature) => (
                <>
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
                    aria-label={`Apagar ${creature.name}`}
                    onClick={() => void campaigns.removeCreature(campaign.id, creature.id)}
                  >
                    <Trash2Icon />
                  </Button>
                </>
              )}
            />
          )}
        </section>

        {fromSystem.length > 0 && (
          <section className="space-y-2" aria-label="Criaturas do sistema">
            <h3 className="flex items-center gap-2 text-sm font-medium">
              Do sistema <Badge variant="secondary">{template?.name}</Badge>
            </h3>
            <CreatureList
              creatures={fromSystem}
              actions={(creature) => (
                <Button
                  size="icon"
                  variant="ghost"
                  disabled={full}
                  aria-label={`Copiar ${creature.name} para a campanha`}
                  title="Copiar para a campanha (para ajustar)"
                  onClick={() => void copy(creature)}
                >
                  <CopyPlusIcon />
                </Button>
              )}
            />
          </section>
        )}
      </CardContent>

      <CreatureDialog
        creature={editing}
        title={
          editing && own.some((creature) => creature.id === editing.id)
            ? `Editar ${editing.name}`
            : 'Nova criatura'
        }
        checkDice={template?.checkDice}
        dice={template?.dice}
        onSave={save}
        onClose={() => setEditing(null)}
      />
    </Card>
  );
}

/** Lista de criaturas que abre a ficha de cada uma, com ações à direita. */
function CreatureList({
  creatures,
  actions,
}: {
  creatures: readonly Creature[];
  actions: (creature: Creature) => ReactNode;
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  return (
    <ul className="space-y-1.5">
      {creatures.map((creature) => {
        const open = openId === creature.id;
        return (
          <li key={creature.id} className="rounded-lg border">
            <div className="flex items-center gap-1 pr-1">
              <button
                type="button"
                aria-expanded={open}
                className="hover:bg-accent/50 flex min-w-0 flex-1 items-center gap-2 rounded-l-lg px-3 py-2 text-left"
                onClick={() => setOpenId(open ? null : creature.id)}
              >
                <ChevronDownIcon
                  className={cn(
                    'text-muted-foreground size-4 shrink-0 transition-transform',
                    !open && '-rotate-90',
                  )}
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{creature.name}</span>
                  {creature.kind && (
                    <span className="text-muted-foreground block truncate text-xs">
                      {creature.kind}
                    </span>
                  )}
                </span>
                <span className="text-muted-foreground tabular-nums text-sm">{creature.hp} PV</span>
              </button>
              {actions(creature)}
            </div>
            {open && (
              <CreatureCard creature={creature} header={false} className="border-t px-3 py-3" />
            )}
          </li>
        );
      })}
    </ul>
  );
}
