import { useLiveQuery } from 'dexie-react-hooks';
import { PlayIcon, Volume2Icon, VolumeXIcon } from 'lucide-react';
import { useId, useState } from 'react';
import {
  askNotificationPermission,
  notificationState,
  type NotificationState,
} from '@/lib/attention';
import { DEFAULT_DICE_COLOR } from '@tabula/domain';
import { cn } from '@/lib/utils';
import { useServices } from '@/app/services-context';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

/** Cores dos dados 3D. A escolhida vai junto das suas rolagens: a mesa vê seus dados nela. */
const DICE_COLORS = [
  { name: 'Marfim', value: DEFAULT_DICE_COLOR },
  { name: 'Rubi', value: '#b91c1c' },
  { name: 'Safira', value: '#1d4ed8' },
  { name: 'Esmeralda', value: '#047857' },
  { name: 'Ametista', value: '#7e22ce' },
  { name: 'Ônix', value: '#1c1917' },
];

/** Botão no cabeçalho com as preferências de som (e dos dados) deste aparelho. */
export function SoundSettingsButton() {
  const { sounds } = useServices();
  const base = useId();
  const settings = useLiveQuery(() => sounds.settings(), [sounds]);
  const muted = settings ? !settings.enabled || settings.volume === 0 : false;
  const [notifications, setNotifications] = useState<NotificationState>(notificationState);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="size-8 shrink-0"
          aria-label={muted ? 'Sons desligados' : 'Sons'}
          title="Sons"
        >
          {muted ? <VolumeXIcon /> : <Volume2Icon />}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 space-y-4">
        <div>
          <h2 className="text-sm font-semibold">Sons, avisos e dados</h2>
          <p className="text-muted-foreground text-xs">
            Avisos curtos na sessão: sua vez no combate, rolagens da mesa, mensagens e sussurros do
            chat.
          </p>
        </div>
        {settings && (
          <>
            <div className="flex items-center gap-2">
              <Checkbox
                id={`${base}-ligados`}
                checked={settings.enabled}
                onCheckedChange={(checked) => void sounds.update({ enabled: checked === true })}
              />
              <Label htmlFor={`${base}-ligados`} className="font-normal">
                Tocar sons
              </Label>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`${base}-volume`}>Volume</Label>
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
                  onChange={(event) =>
                    void sounds.update({ volume: Number(event.target.value) / 100 })
                  }
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
            <div className="space-y-2 border-t pt-3">
              <div className="flex items-center gap-2">
                <Checkbox
                  id={`${base}-dados`}
                  checked={settings.dice3d !== false}
                  onCheckedChange={(checked) => void sounds.update({ dice3d: checked === true })}
                />
                <Label htmlFor={`${base}-dados`} className="font-normal">
                  Dados 3D nas rolagens
                </Label>
              </div>
              {settings.dice3d !== false && (
                <div className="space-y-1 pl-6">
                  <div role="radiogroup" aria-label="Cor dos dados" className="flex gap-1.5">
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
                            'size-6 rounded-full border shadow-sm transition-transform hover:scale-110',
                            chosen && 'ring-primary ring-offset-background ring-2 ring-offset-2',
                          )}
                          style={{ backgroundColor: value }}
                          onClick={() => void sounds.update({ diceColor: value })}
                        />
                      );
                    })}
                  </div>
                  <p className="text-muted-foreground text-xs">
                    Na sessão, a mesa vê seus dados nesta cor.
                  </p>
                </div>
              )}
            </div>
          </>
        )}
        <OutsideApp
          state={notifications}
          onAsk={() => void askNotificationPermission().then(setNotifications)}
        />
      </PopoverContent>
    </Popover>
  );
}

/** Como o app avisa a vez quando está em outra janela ou aba. */
function OutsideApp({ state, onAsk }: { state: NotificationState; onAsk: () => void }) {
  if (state === 'indisponivel') return null;
  return (
    <div className="space-y-1.5 border-t pt-3">
      <h3 className="text-sm font-medium">Fora do app</h3>
      <p className="text-muted-foreground text-xs">
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
