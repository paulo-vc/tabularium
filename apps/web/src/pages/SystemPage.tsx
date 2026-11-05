import { roleOf, type Creature, type SystemTemplate } from '@tabula/domain';
import { useLiveQuery } from 'dexie-react-hooks';
import { ArrowLeftIcon, BookOpenIcon, SkullIcon, TriangleAlertIcon } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'wouter';
import { useServices } from '@/app/services-context';
import { CreatureCard } from '@/components/bestiary/CreatureCard';
import { CodexReader } from '@/components/codex/CodexReader';
import { SystemIcon } from '@/components/SystemIcon';
import { useDeviceId } from '@/components/use-device';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type Tab = 'codice' | 'bestiario';

/**
 * Quem vê o que é do Mestre num sistema (páginas "só o Mestre" e o bestiário): quem o criou
 * neste aparelho e quem mestra uma campanha dele. Não é segredo de verdade: só evita que o
 * jogador leia sem querer.
 */
export function useSeesGmContent(template: SystemTemplate | undefined): boolean {
  const { campaignRepository } = useServices();
  const deviceId = useDeviceId();
  const mastering = useLiveQuery(async () => {
    if (!template || deviceId === undefined) return false;
    const campaigns = await campaignRepository.list();
    return campaigns.some(
      (campaign) =>
        campaign.templateRef.id === template.id && roleOf(campaign, deviceId) === 'mestre',
    );
  }, [campaignRepository, template, deviceId]);
  return template?.source === 'local' || mastering === true;
}

/** O códice do sistema da campanha, com a volta para a campanha (o jogador consulta na mesa). */
export function CampaignCodexPage({ campaignId }: { campaignId: string }) {
  const { campaignRepository } = useServices();
  const campaign = useLiveQuery(
    async () => (await campaignRepository.get(campaignId)) ?? null,
    [campaignRepository, campaignId],
  );
  if (campaign === undefined) return null;
  if (campaign === null) {
    return (
      <div className="mx-auto max-w-lg space-y-4 py-16 text-center">
        <TriangleAlertIcon className="text-muted-foreground mx-auto size-10" />
        <h1 className="text-xl font-semibold">Campanha não encontrada</h1>
        <Button variant="outline" asChild>
          <Link href="/campanhas">Voltar às campanhas</Link>
        </Button>
      </div>
    );
  }
  return (
    <SystemPage
      id={campaign.templateRef.id}
      back={{ href: `/campanhas/${campaign.id}`, label: `Voltar a ${campaign.name}` }}
    />
  );
}

/** Um sistema por dentro: o códice e, para o Mestre, o bestiário. */
export function SystemPage({
  id,
  back = { href: '/sistemas', label: 'Voltar aos sistemas' },
}: {
  id: string;
  back?: { href: string; label: string };
}) {
  const { catalog } = useServices();
  const template = useLiveQuery(async () => (await catalog.get(id)) ?? null, [catalog, id]);
  const seesGm = useSeesGmContent(template ?? undefined);
  const [tab, setTab] = useState<Tab>('codice');

  if (template === undefined) return null;
  if (template === null) {
    return (
      <div className="mx-auto max-w-lg space-y-4 py-16 text-center">
        <TriangleAlertIcon className="text-muted-foreground mx-auto size-10" />
        <h1 className="text-xl font-semibold">Sistema não instalado</h1>
        <Button variant="outline" asChild>
          <Link href={back.href}>{back.label}</Link>
        </Button>
      </div>
    );
  }

  const pages = (template.codex ?? []).filter((page) => seesGm || !page.gmOnly);
  const bestiary = template.bestiary ?? [];
  const tabs: { id: Tab; label: string; icon: typeof BookOpenIcon; count: number }[] = [
    { id: 'codice', label: 'Códice', icon: BookOpenIcon, count: pages.length },
    ...(seesGm
      ? [{ id: 'bestiario' as const, label: 'Bestiário', icon: SkullIcon, count: bestiary.length }]
      : []),
  ];
  const current = seesGm ? tab : 'codice';

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Link
          href={back.href}
          aria-label={back.label}
          className="text-muted-foreground hover:text-foreground pointer-coarse:-m-2.5 pointer-coarse:p-2.5"
        >
          <ArrowLeftIcon className="size-5" />
        </Link>
        <SystemIcon icon={template.icon} name={template.name} className="size-8" />
        <h1 className="min-w-0 flex-1 truncate text-2xl font-bold">{template.name}</h1>
      </div>

      {tabs.length > 1 && (
        <div role="tablist" aria-label="Partes do sistema" className="flex gap-1 border-b">
          {tabs.map((item) => (
            <button
              key={item.id}
              role="tab"
              type="button"
              aria-selected={current === item.id}
              className={cn(
                '-mb-px flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium',
                current === item.id
                  ? 'border-primary text-foreground'
                  : 'text-muted-foreground hover:text-foreground border-transparent',
              )}
              onClick={() => setTab(item.id)}
            >
              <item.icon className="size-4" /> {item.label}
              <span className="text-muted-foreground tabular-nums text-xs">{item.count}</span>
            </button>
          ))}
        </div>
      )}

      {current === 'codice' ? (
        <CodexReader key={template.id} pages={pages} />
      ) : (
        <SystemBestiary creatures={bestiary} />
      )}
    </div>
  );
}

function SystemBestiary({ creatures }: { creatures: readonly Creature[] }) {
  const [openId, setOpenId] = useState<string | null>(null);
  if (creatures.length === 0) {
    return (
      <div className="text-muted-foreground flex flex-col items-center gap-2 rounded-lg border border-dashed py-12 text-center text-sm">
        <SkullIcon className="size-6" />
        <p>Este sistema não traz criaturas.</p>
        <p className="max-w-sm">
          Cada campanha tem o próprio bestiário, na tela da campanha, onde o Mestre cria as dele.
        </p>
      </div>
    );
  }
  return (
    <div className="space-y-3">
      <p className="text-muted-foreground text-sm">
        Criaturas que vêm com o sistema. Na campanha, você as coloca no combate ou copia para o
        bestiário da campanha e ajusta.
      </p>
      <ul className="grid gap-2 md:grid-cols-2">
        {creatures.map((creature) => {
          const open = openId === creature.id;
          return (
            <li key={creature.id} className={cn('rounded-lg border', open && 'md:col-span-2')}>
              <button
                type="button"
                aria-expanded={open}
                className="hover:bg-accent/50 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left"
                onClick={() => setOpenId(open ? null : creature.id)}
              >
                <SkullIcon className="text-muted-foreground size-4 shrink-0" />
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
              {open && (
                <CreatureCard creature={creature} header={false} className="border-t px-3 py-3" />
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
