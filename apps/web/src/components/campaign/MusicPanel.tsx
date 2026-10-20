import { useLiveQuery } from 'dexie-react-hooks';
import {
  LoaderCircleIcon,
  MusicIcon,
  PauseIcon,
  PlayIcon,
  PlusIcon,
  Repeat1Icon,
  RepeatIcon,
  SquareIcon,
  Trash2Icon,
} from 'lucide-react';
import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useServices } from '@/app/services-context';
import { currentMusicPosition } from '@/components/live/MusicPlayer';
import { useLiveSession } from '@/components/live/use-live-session';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const ACCEPT = 'audio/mpeg,audio/ogg,.mp3,.ogg';

const megabytes = (bytes: number) =>
  `${(bytes / (1024 * 1024)).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} MB`;

/**
 * Música do Mestre: a biblioteca de trilhas da campanha e o que toca na mesa. A trilha vai aos
 * jogadores pela sessão (em partes, só a que está tocando) e fica guardada no aparelho deles.
 */
export function MusicPanel({ campaignId }: { campaignId: string }) {
  const { music, session } = useServices();
  const live = useLiveSession();
  const tracks = useLiveQuery(() => music.list(campaignId), [music, campaignId]);
  const input = useRef<HTMLInputElement>(null);
  const [adding, setAdding] = useState(false);
  const active = live.kind === 'mestre' && live.campaignId === campaignId;
  const now = active ? live.music : null;

  const add = async (file: File | undefined) => {
    if (!file) return;
    setAdding(true);
    try {
      const result = await music.add(campaignId, file);
      if (!result.ok) {
        toast.error('Não foi possível usar o arquivo', { description: result.error.message });
      }
    } finally {
      setAdding(false);
      if (input.current) input.current.value = '';
    }
  };
  const play = async (trackId: string) => {
    const result = await session.playTrack(campaignId, trackId);
    if (!result.ok) toast.error('Não foi possível tocar', { description: result.error.message });
  };
  const position = () => currentMusicPosition() ?? now?.position ?? 0;

  return (
    <Card>
      <CardHeader className="flex items-center justify-between gap-2">
        <div className="space-y-1.5">
          <CardTitle>
            <h2>Música</h2>
          </CardTitle>
          <CardDescription>
            Trilhas para a mesa: taverna, combate, suspense… Cada jogador ajusta o próprio volume.
          </CardDescription>
        </div>
        <input
          ref={input}
          type="file"
          accept={ACCEPT}
          aria-label="Arquivo da trilha"
          className="sr-only"
          tabIndex={-1}
          onChange={(event) => void add(event.target.files?.[0])}
        />
        <Button
          size="sm"
          variant="outline"
          className="shrink-0"
          disabled={adding}
          aria-label="Adicionar trilha"
          onClick={() => input.current?.click()}
        >
          {adding ? <LoaderCircleIcon className="animate-spin" /> : <PlusIcon />} Adicionar
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {now && (
          <section
            aria-label="Tocando agora"
            className="bg-primary/5 border-primary/30 flex flex-wrap items-center gap-2 rounded-lg border px-3 py-2"
          >
            <MusicIcon className={cn('text-primary size-4', now.playing && 'animate-pulse')} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{now.track.title}</p>
              <p className="text-muted-foreground text-xs">
                {now.playing ? 'Tocando para a mesa' : 'Pausada'}
              </p>
            </div>
            <Button
              size="icon"
              variant="ghost"
              className="size-8"
              aria-label={now.playing ? 'Pausar' : 'Continuar'}
              onClick={() =>
                void session.updateMusic(campaignId, {
                  playing: !now.playing,
                  position: position(),
                })
              }
            >
              {now.playing ? <PauseIcon /> : <PlayIcon />}
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className={cn('size-8', now.loop && 'text-primary')}
              aria-pressed={now.loop}
              aria-label="Repetir"
              title={now.loop ? 'Repetindo' : 'Tocar uma vez'}
              onClick={() =>
                void session.updateMusic(campaignId, { loop: !now.loop, position: position() })
              }
            >
              {now.loop ? <RepeatIcon /> : <Repeat1Icon />}
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="size-8"
              aria-label="Parar a música"
              onClick={() => session.stopMusic(campaignId)}
            >
              <SquareIcon />
            </Button>
          </section>
        )}

        {tracks === undefined ? null : tracks.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            Nenhuma trilha ainda. Adicione arquivos MP3 ou OGG (até 15 MB cada).
          </p>
        ) : (
          <ul aria-label="Trilhas" className="divide-y rounded-lg border">
            {tracks.map((track) => {
              const current = now?.track.hash === track.hash;
              return (
                <li key={track.id} className="flex items-center gap-2 px-3 py-2">
                  <div className="min-w-0 flex-1">
                    <p className={cn('truncate text-sm', current && 'font-medium')}>
                      {track.title}
                    </p>
                    <p className="text-muted-foreground text-xs">{megabytes(track.size)}</p>
                  </div>
                  <Button
                    size="sm"
                    variant={current ? 'secondary' : 'outline'}
                    disabled={!active}
                    title={active ? undefined : 'Abra a sessão para tocar para a mesa'}
                    aria-label={`Tocar ${track.title}`}
                    onClick={() => void play(track.id)}
                  >
                    <PlayIcon /> {current ? 'Do começo' : 'Tocar'}
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="size-8"
                    aria-label={`Apagar ${track.title}`}
                    onClick={() => {
                      if (current) session.stopMusic(campaignId);
                      void music.delete(campaignId, track.id);
                    }}
                  >
                    <Trash2Icon />
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
        {!active && tracks && tracks.length > 0 && (
          <p className="text-muted-foreground text-xs">Abra a sessão para tocar para a mesa.</p>
        )}
      </CardContent>
    </Card>
  );
}
