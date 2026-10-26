import { roleOf } from '@tabula/domain';
import { useLiveQuery } from 'dexie-react-hooks';
import { DoorOpenIcon, LoaderCircleIcon, PlusIcon, UsersIcon } from 'lucide-react';
import { parseShortInviteCode } from '@tabula/sync';
import { useState, type FormEvent, type ReactElement } from 'react';
import { toast } from 'sonner';
import { Link, useLocation } from 'wouter';
import { INVITE_ROUTE, decodeInvite, encodeInvite } from '@/app/invite-link';
import { useServices } from '@/app/services-context';
import { SystemIcon } from '@/components/SystemIcon';
import { useDeviceId, useDisplayName } from '@/components/use-device';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardAction, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Textarea } from '@/components/ui/textarea';

export function CampaignsPage() {
  const { campaignRepository, catalog } = useServices();
  const templates = useLiveQuery(() => catalog.list(), [catalog]);
  const campaigns = useLiveQuery(() => campaignRepository.list(), [campaignRepository]);
  const deviceId = useDeviceId();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">Campanhas</h1>
        <div className="flex gap-2">
          <JoinDialog />
          <NewCampaignDialog />
        </div>
      </div>

      {campaigns?.length === 0 && (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed py-16 text-center">
          <UsersIcon className="text-muted-foreground size-10" />
          <p className="text-muted-foreground max-w-md">
            Crie uma campanha para mestrar, ou entre na de alguém com o convite que o Mestre enviou.
          </p>
        </div>
      )}

      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {campaigns?.map((campaign) => (
          <li key={campaign.id}>
            <Link
              href={`/campanhas/${campaign.id}`}
              className="block rounded-xl focus-visible:outline-2"
            >
              <Card className="hover:border-primary/50 h-full transition-colors">
                {campaign.cover && (
                  <img
                    src={campaign.cover.src}
                    alt=""
                    width={campaign.cover.width}
                    height={campaign.cover.height}
                    className="h-28 w-full object-cover"
                  />
                )}
                <CardHeader>
                  <CardTitle>{campaign.name}</CardTitle>
                  <CardDescription>
                    <span className="flex items-center gap-1.5">
                      <SystemIcon
                        icon={templates?.find((t) => t.id === campaign.templateRef.id)?.icon}
                        name={campaign.templateName}
                        className="size-4 text-[0.65rem]"
                      />
                      {campaign.templateName}
                    </span>
                    Mestre: {campaign.gmName}
                  </CardDescription>
                  {deviceId && (
                    <CardAction>
                      <Badge
                        variant={roleOf(campaign, deviceId) === 'mestre' ? 'default' : 'secondary'}
                      >
                        {roleOf(campaign, deviceId) === 'mestre' ? 'Mestre' : 'Jogador'}
                      </Badge>
                    </CardAction>
                  )}
                </CardHeader>
              </Card>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Criar campanha. `trigger`: outro botão para abrir (ex.: nas boas-vindas). */
export function NewCampaignDialog({ trigger }: { trigger?: ReactElement }) {
  const { catalog, campaigns } = useServices();
  const templates = useLiveQuery(() => catalog.list(), [catalog]);
  const savedName = useDisplayName();
  const [, navigate] = useLocation();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  // `null` enquanto o usuário não digitou: mostra o último nome usado.
  const [typedGmName, setGmName] = useState<string | null>(null);
  const gmName = typedGmName ?? savedName ?? '';
  const [templateId, setTemplateId] = useState('');
  const [busy, setBusy] = useState(false);

  const selected = templateId || templates?.[0]?.id || '';
  const canCreate = name.trim() !== '' && gmName.trim() !== '' && selected !== '' && !busy;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!canCreate) return;
    setBusy(true);
    try {
      const campaign = await campaigns.create({ name, templateId: selected, gmName });
      setOpen(false);
      setName('');
      navigate(`/campanhas/${campaign.id}`);
    } catch (error) {
      toast.error('Não foi possível criar a campanha', { description: String(error) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button>
            <PlusIcon /> Nova campanha
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={(event) => void submit(event)} className="space-y-4">
          <DialogHeader>
            <DialogTitle>Nova campanha</DialogTitle>
            <DialogDescription>
              Você será o Mestre. Todas as fichas da campanha usarão o sistema escolhido.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="campanha-nome">Nome da campanha</Label>
            <Input
              id="campanha-nome"
              value={name}
              maxLength={100}
              autoFocus
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="campanha-sistema">Sistema</Label>
            <Select value={selected} onValueChange={setTemplateId}>
              <SelectTrigger id="campanha-sistema" className="w-full">
                <SelectValue placeholder="Escolha um sistema" />
              </SelectTrigger>
              <SelectContent>
                {templates?.map((template) => (
                  <SelectItem key={template.id} value={template.id}>
                    {template.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="campanha-mestre">Seu nome (como os jogadores verão)</Label>
            <Input
              id="campanha-mestre"
              value={gmName}
              maxLength={100}
              onChange={(e) => setGmName(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={!canCreate}>
              Criar campanha
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Entrar com convite (link ou código curto). `trigger`: outro botão para abrir. */
export function JoinDialog({ trigger }: { trigger?: ReactElement }) {
  const [, navigate] = useLocation();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const { session } = useServices();
  const [searching, setSearching] = useState<AbortController | null>(null);

  const finish = (invite: Parameters<typeof encodeInvite>[0]) => {
    setOpen(false);
    setText('');
    navigate(`${INVITE_ROUTE}${encodeInvite(invite)}`);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const decoded = decodeInvite(text);
    if (decoded.ok) return finish(decoded.value);
    const code = parseShortInviteCode(text);
    if (!code) {
      setError(decoded.error.message);
      return;
    }
    // Código curto: o convite completo vem do Mestre, que precisa estar com a sessão aberta.
    const controller = new AbortController();
    setSearching(controller);
    const result = await session.fetchInvite(code, controller.signal);
    setSearching(null);
    if (result.ok) return finish(result.invite);
    if (result.reason === 'cancelado') return;
    setError(
      result.reason === 'falha-de-conexao'
        ? 'O Mestre foi encontrado, mas a conexão não abriu (rede restritiva). Peça o link do convite.'
        : 'O Mestre não foi encontrado. O código curto só funciona com a sessão do Mestre aberta; confira o código ou peça o link.',
    );
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        setError(null);
        if (!next) searching?.abort();
      }}
    >
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="outline">
            <DoorOpenIcon /> Entrar com convite
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={submit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>Entrar com convite</DialogTitle>
            <DialogDescription>
              Cole o link que o Mestre enviou, ou digite o código curto (ex.:
              K7QM-2XPA-9DFR-WB3N-5T6H).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="convite-texto">Convite</Label>
            <Textarea
              id="convite-texto"
              value={text}
              rows={3}
              disabled={searching !== null}
              autoFocus
              // Links não têm espaços: sem isso a caixa cresceria na horizontal para fora da tela.
              className="field-sizing-fixed break-all"
              aria-invalid={error !== null}
              aria-describedby={error ? 'convite-erro' : undefined}
              onChange={(e) => {
                setText(e.target.value);
                setError(null);
              }}
            />
            {error && (
              <p id="convite-erro" className="text-destructive text-sm">
                {error}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button type="submit" disabled={text.trim() === '' || searching !== null}>
              {searching ? (
                <>
                  <LoaderCircleIcon className="animate-spin" /> Procurando o Mestre…
                </>
              ) : (
                'Continuar'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
