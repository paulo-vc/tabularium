import { DEFAULT_DICE_COLOR, DEFAULT_MUSIC_VOLUME } from '@tabula/domain';
import { useLiveQuery } from 'dexie-react-hooks';
import { MonitorIcon, MoonIcon, PlayIcon, SunIcon, Trash2Icon } from 'lucide-react';
import { useEffect, useId, useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import {
  askNotificationPermission,
  notificationState,
  type NotificationState,
} from '@/lib/attention';
import { openExternal } from '@/lib/open-external';
import { setTheme, storedTheme, type ThemeChoice } from '@/lib/theme';
import { privacyUrl } from '@/app/updates';
import { cn } from '@/lib/utils';
import { useServices } from '@/app/services-context';
import { BackupSection } from '@/components/BackupSection';
import { useLiveSession } from '@/components/live/use-live-session';
import { useDisplayName } from '@/components/use-device';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

/** Cores dos dados 3D. A escolhida vai junto das suas rolagens: a mesa vê seus dados nela. */
const DICE_COLORS = [
  { name: 'Marfim', value: DEFAULT_DICE_COLOR },
  { name: 'Rubi', value: '#b91c1c' },
  { name: 'Safira', value: '#1d4ed8' },
  { name: 'Esmeralda', value: '#047857' },
  { name: 'Ametista', value: '#7e22ce' },
  { name: 'Ônix', value: '#1c1917' },
];

const THEMES: { id: ThemeChoice; name: string; icon: typeof SunIcon }[] = [
  { id: 'sistema', name: 'Do sistema', icon: MonitorIcon },
  { id: 'claro', name: 'Claro', icon: SunIcon },
  { id: 'escuro', name: 'Escuro', icon: MoonIcon },
];

const megabytes = (bytes: number) =>
  `${(bytes / (1024 * 1024)).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} MB`;

/** Preferências deste aparelho, num lugar só. Nada daqui sai do aparelho (só a cor dos dados). */
export function SettingsPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Configurações</h1>
        <p className="text-muted-foreground text-sm">Valem só neste aparelho.</p>
      </div>
      <ProfileSection />
      <BackupSection />
      <ThemeSection />
      <SoundSection />
      <DiceSection />
      <MusicSection />
      <StorageSection />
      <PrivacySection />
    </div>
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2>{title}</h2>
        </CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent className="space-y-4">{children}</CardContent>
    </Card>
  );
}

function Toggle({
  id,
  checked,
  onChange,
  children,
}: {
  id: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  children: ReactNode;
}) {
  return (
    <div className="flex items-start gap-2">
      <Checkbox
        id={id}
        checked={checked}
        className="mt-0.5"
        onCheckedChange={(value) => onChange(value === true)}
      />
      <Label htmlFor={id} className="block font-normal">
        {children}
      </Label>
    </div>
  );
}

const Hint = ({ children }: { children: ReactNode }) => (
  <span className="text-muted-foreground block text-xs">{children}</span>
);

function ProfileSection() {
  const { device } = useServices();
  const id = useId();
  const saved = useDisplayName();
  const [name, setName] = useState<string | null>(null);
  const value = name ?? saved ?? '';
  const save = async () => {
    const next = value.trim();
    if (!next || next === saved) return;
    await device.setDisplayName(next.slice(0, 100));
    toast.success('Nome salvo');
  };
  return (
    <Section
      title="Você"
      description="O nome que já vem preenchido ao criar uma campanha ou entrar numa. Nas campanhas em que você já está, vale o nome com que entrou."
    >
      <div className="space-y-1.5">
        <Label htmlFor={id}>Seu nome</Label>
        <div className="flex gap-2">
          <Input
            id={id}
            value={value}
            maxLength={100}
            onChange={(event) => setName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') void save();
            }}
          />
          <Button
            variant="outline"
            disabled={!value.trim() || value.trim() === saved}
            onClick={() => void save()}
          >
            Salvar
          </Button>
        </div>
      </div>
    </Section>
  );
}

function ThemeSection() {
  const [theme, setChoice] = useState<ThemeChoice>(storedTheme);
  return (
    <Section title="Aparência">
      <div role="radiogroup" aria-label="Tema" className="grid grid-cols-3 gap-2">
        {THEMES.map(({ id, name, icon: Icon }) => (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={theme === id}
            className={cn(
              'flex flex-col items-center gap-1.5 rounded-lg border px-3 py-3 text-sm transition-colors',
              theme === id ? 'border-primary bg-primary/5 font-medium' : 'hover:bg-accent',
            )}
            onClick={() => {
              setChoice(id);
              setTheme(id);
            }}
          >
            <Icon className="size-5" />
            {name}
          </button>
        ))}
      </div>
    </Section>
  );
}

function SoundSection() {
  const { sounds } = useServices();
  const base = useId();
  const settings = useLiveQuery(() => sounds.settings(), [sounds]);
  const [notifications, setNotifications] = useState<NotificationState>(notificationState);
  if (!settings) return null;
  return (
    <Section
      title="Sons e avisos"
      description="Avisos curtos na sessão: sua vez no combate, rolagens da mesa, mensagens e sussurros do chat."
    >
      <Toggle
        id={`${base}-ligados`}
        checked={settings.enabled}
        onChange={(enabled) => void sounds.update({ enabled })}
      >
        Tocar sons
      </Toggle>
      <div className="space-y-1.5">
        <Label htmlFor={`${base}-volume`}>Volume dos avisos</Label>
        <div className="flex items-center gap-2">
          <input
            id={`${base}-volume`}
            type="range"
            min={0}
            max={100}
            step={5}
            value={Math.round(settings.volume * 100)}
            disabled={!settings.enabled}
            className="accent-primary flex-1"
            onChange={(event) => void sounds.update({ volume: Number(event.target.value) / 100 })}
          />
          <Button
            size="sm"
            variant="outline"
            onClick={() => void sounds.test()}
            aria-label="Testar o som"
          >
            <PlayIcon /> Testar
          </Button>
        </div>
      </div>
      <OutsideApp
        state={notifications}
        onAsk={() => void askNotificationPermission().then(setNotifications)}
      />
    </Section>
  );
}

/** Como o app avisa a vez quando está em outra janela ou aba. */
function OutsideApp({ state, onAsk }: { state: NotificationState; onAsk: () => void }) {
  if (state === 'indisponivel') return null;
  return (
    <div className="space-y-1.5 border-t pt-4">
      <h3 className="text-sm font-medium">Fora do app</h3>
      <p className="text-muted-foreground text-sm">
        {state === 'desktop'
          ? 'Na sua vez, o título da janela e o ícone na barra de tarefas piscam.'
          : state === 'granted'
            ? 'Na sua vez, o título da aba pisca e chega uma notificação do sistema.'
            : state === 'denied'
              ? 'Na sua vez, o título da aba pisca. As notificações estão bloqueadas: libere nas configurações do site.'
              : 'Na sua vez, o título da aba pisca. Ative as notificações para receber o aviso mesmo em outra janela.'}
      </p>
      {state === 'default' && (
        <Button size="sm" variant="outline" onClick={onAsk}>
          Ativar notificações
        </Button>
      )}
    </div>
  );
}

function DiceSection() {
  const { sounds } = useServices();
  const base = useId();
  const settings = useLiveQuery(() => sounds.settings(), [sounds]);
  if (!settings) return null;
  const on = settings.dice3d !== false;
  return (
    <Section
      title="Dados 3D"
      description="As rolagens caem na tela em 3D, à direita, e param na face sorteada."
    >
      <Toggle
        id={`${base}-dados`}
        checked={on}
        onChange={(dice3d) => void sounds.update({ dice3d })}
      >
        Dados 3D nas rolagens
        <Hint>Desligado, o resultado aparece num aviso embaixo.</Hint>
      </Toggle>
      {on && (
        <>
          <div className="space-y-1.5">
            <p id={`${base}-cor`} className="text-sm font-medium">
              Cor dos seus dados
            </p>
            <div role="radiogroup" aria-labelledby={`${base}-cor`} className="flex gap-2">
              {DICE_COLORS.map(({ name, value }) => {
                const chosen = (settings.diceColor ?? DEFAULT_DICE_COLOR) === value;
                return (
                  <button
                    key={value}
                    type="button"
                    role="radio"
                    aria-checked={chosen}
                    aria-label={name}
                    title={name}
                    className={cn(
                      'size-8 rounded-full border shadow-sm transition-transform hover:scale-110',
                      chosen && 'ring-primary ring-offset-background ring-2 ring-offset-2',
                    )}
                    style={{ backgroundColor: value }}
                    onClick={() => void sounds.update({ diceColor: value })}
                  />
                );
              })}
            </div>
            <Hint>Na sessão, a mesa vê seus dados nesta cor.</Hint>
          </div>
          <Toggle
            id={`${base}-girar`}
            checked={settings.diceMotion !== false}
            onChange={(diceMotion) => void sounds.update({ diceMotion })}
          >
            Animar os dados
            <Hint>Desligado, eles aparecem já parados.</Hint>
          </Toggle>
        </>
      )}
    </Section>
  );
}

function MusicSection() {
  const { sounds, session } = useServices();
  const base = useId();
  const settings = useLiveQuery(() => sounds.settings(), [sounds]);
  if (!settings) return null;
  const volume = settings.musicVolume ?? DEFAULT_MUSIC_VOLUME;
  return (
    <Section title="Música da mesa" description="A trilha que o Mestre toca na sessão.">
      <div className="space-y-1.5">
        <Label htmlFor={`${base}-volume`}>Volume da música</Label>
        <input
          id={`${base}-volume`}
          type="range"
          min={0}
          max={100}
          step={5}
          value={Math.round(volume * 100)}
          className="accent-primary w-full"
          onChange={(event) =>
            void sounds.update({ musicVolume: Number(event.target.value) / 100 })
          }
        />
      </div>
      <Toggle
        id={`${base}-baixar`}
        checked={settings.downloadMusic !== false}
        onChange={(on) =>
          void sounds.update({ downloadMusic: on }).then(() => {
            if (on) session.fetchMusic();
          })
        }
      >
        Baixar músicas neste aparelho
        <Hint>Desligue no 4G para economizar dados: aparece só o título do que toca.</Hint>
      </Toggle>
    </Section>
  );
}

/** O essencial da política de privacidade, com o link para a completa. */
function PrivacySection() {
  return (
    <Section
      title="Privacidade"
      description="Sem conta, sem servidor próprio, sem anúncios e sem rastreamento."
    >
      <ul className="text-muted-foreground list-disc space-y-1.5 pl-5 text-sm">
        <li>Tudo o que você cria fica neste aparelho.</li>
        <li>
          Na sessão, os aparelhos da mesa se falam direto, numa conexão cifrada. Para se acharem,
          usam serviços públicos (relays Nostr e servidores STUN), e os participantes veem o
          endereço de internet uns dos outros.
        </li>
        <li>Sussurros entre jogadores são cifrados de ponta a ponta: o Mestre não lê.</li>
        <li>O app só fala com o GitHub para ver atualizações e o catálogo da comunidade.</li>
      </ul>
      <a
        href={privacyUrl}
        className="text-primary inline-block text-sm underline-offset-2 hover:underline"
        onClick={(event) => {
          event.preventDefault();
          void openExternal(privacyUrl);
        }}
      >
        Ler a política de privacidade completa
      </a>
    </Section>
  );
}

function StorageSection() {
  const { music } = useServices();
  const live = useLiveSession();
  const received = useLiveQuery(() => music.receivedBytes(), [music]);
  const [usage, setUsage] = useState<number | null>(null);
  useEffect(() => {
    void navigator.storage
      ?.estimate?.()
      .then((estimate) => setUsage(estimate.usage ?? null))
      .catch(() => setUsage(null));
  }, [received]);
  // A trilha que está tocando fica (apagar a pararia no meio).
  const playing = live.kind === 'jogador' ? live.music?.state.track.hash : undefined;
  return (
    <Section
      title="Armazenamento"
      description="Fichas, campanhas e o que o Mestre mandou ficam guardados neste aparelho."
    >
      {usage !== null && (
        <p className="text-sm">
          O app ocupa <span className="font-medium tabular-nums">{megabytes(usage)}</span> neste
          aparelho.
        </p>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border px-3 py-2.5">
        <div className="text-sm">
          <p className="font-medium">Músicas recebidas</p>
          <p className="text-muted-foreground">
            {received === undefined
              ? '…'
              : received === 0
                ? 'Nenhuma guardada.'
                : `${megabytes(received)}. Voltam a baixar se o Mestre tocar de novo.`}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          disabled={!received}
          onClick={() =>
            void music
              .clearReceived(playing ? [playing] : [])
              .then(() => toast.success('Músicas apagadas'))
          }
        >
          <Trash2Icon /> Apagar
        </Button>
      </div>
    </Section>
  );
}
