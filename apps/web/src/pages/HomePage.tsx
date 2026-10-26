import { useLiveQuery } from 'dexie-react-hooks';
import { FileUpIcon, ScrollTextIcon, UsersIcon, SparklesIcon } from 'lucide-react';
import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { Welcome, welcomeSeen } from './Welcome';
import { useServices } from '@/app/services-context';
import { NewSheetDialog } from '@/components/NewSheetDialog';
import { CharacterPortrait } from '@/components/sheet/Portrait';
import { useImport } from '@/components/use-import';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BackupReminder } from '@/components/BackupSection';
import { SystemIcon } from '@/components/SystemIcon';

/** Cria a ficha de exemplo e a abre. */
function ExampleButton() {
  const { sheets } = useServices();
  const [, navigate] = useLocation();
  return (
    <Button
      variant="link"
      onClick={() =>
        void sheets.createExample().then((sheet) => sheet && navigate(`/fichas/${sheet.id}`))
      }
    >
      <SparklesIcon /> Ver uma ficha de exemplo
    </Button>
  );
}

const dateFormat = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' });

export function HomePage() {
  const { catalog, sheetRepository, campaignRepository } = useServices();
  const sheets = useLiveQuery(() => sheetRepository.list(), [sheetRepository]);
  const campaigns = useLiveQuery(() => campaignRepository.list(), [campaignRepository]);
  const [skipped, setSkipped] = useState(welcomeSeen);
  const templates = useLiveQuery(() => catalog.list(), [catalog]);
  const importFile = useImport();
  const templateOf = (id: string) => templates?.find((t) => t.id === id);
  const templateName = (id: string) => templateOf(id)?.name ?? id;

  // Primeira vez: aparelho vazio e as boas-vindas ainda não vistas.
  if (!skipped && sheets?.length === 0 && campaigns?.length === 0) {
    return <Welcome onSkip={() => setSkipped(true)} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">Minhas fichas</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={importFile}>
            <FileUpIcon /> Importar
          </Button>
          <NewSheetDialog />
        </div>
      </div>

      <BackupReminder />

      {sheets?.length === 0 && (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed py-16 text-center">
          <ScrollTextIcon className="text-muted-foreground size-10" />
          {/* Quem só mestra chega aqui ao abrir o app: o caminho para as campanhas fica à mão. */}
          <p className="text-muted-foreground">
            {campaigns && campaigns.length > 0
              ? 'Você ainda não tem fichas. Para mestrar, abra a campanha:'
              : 'Você ainda não tem fichas. Crie uma nova ou importe um arquivo.'}
          </p>
          {campaigns && campaigns.length > 0 && (
            <div className="flex flex-wrap justify-center gap-2">
              {campaigns.slice(0, 3).map((campaign) => (
                <Button key={campaign.id} variant="outline" asChild>
                  <Link href={`/campanhas/${campaign.id}`}>
                    <UsersIcon /> {campaign.name}
                  </Link>
                </Button>
              ))}
            </div>
          )}
          <ExampleButton />
        </div>
      )}

      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {sheets?.map((sheet) => (
          <li key={sheet.id}>
            <Link href={`/fichas/${sheet.id}`} className="block rounded-xl focus-visible:outline-2">
              <Card className="hover:border-primary/50 h-full transition-colors">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3">
                    <CharacterPortrait
                      portrait={sheet.portrait}
                      name={sheet.name}
                      className="size-10"
                    />
                    <span className="min-w-0 truncate">{sheet.name}</span>
                  </CardTitle>
                  <CardDescription>
                    <span className="flex items-center gap-1.5">
                      <SystemIcon
                        icon={templateOf(sheet.templateRef.id)?.icon}
                        name={templateName(sheet.templateRef.id)}
                        className="size-4 text-[0.65rem]"
                      />
                      {templateName(sheet.templateRef.id)}
                    </span>
                    Alterada em {dateFormat.format(sheet.updatedAt)}
                  </CardDescription>
                </CardHeader>
              </Card>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
