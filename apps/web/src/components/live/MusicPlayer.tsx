import { DEFAULT_MUSIC_VOLUME, type MusicState } from '@tabula/domain';
import { useLiveQuery } from 'dexie-react-hooks';
import { LoaderCircleIcon, MusicIcon, PlayIcon, Volume2Icon, VolumeXIcon } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { useServices } from '@/app/services-context';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useLiveSession } from './use-live-session';

/** O tocador da música da mesa (um só no app), para o painel do Mestre ler o ponto atual. */
let currentAudio: HTMLAudioElement | null = null;

/** Em que ponto (segundos) a música está tocando neste aparelho agora. */
export function currentMusicPosition(): number | undefined {
  return currentAudio && Number.isFinite(currentAudio.currentTime)
    ? currentAudio.currentTime
    : undefined;
}

/** Endereço local (object URL) da trilha guardada neste aparelho. */
function useTrackUrl(campaignId: string | null, hash: string | null) {
  const { music } = useServices();
  const track = useLiveQuery(
    async () => (campaignId && hash ? await music.byHash(campaignId, hash) : undefined),
    [music, campaignId, hash],
  );
  const url = useMemo(
    () =>
      track
        ? URL.createObjectURL(
            new Blob([track.data as Uint8Array<ArrayBuffer>], { type: track.meta.mime }),
          )
        : undefined,
    [track],
  );
  useEffect(() => () => (url ? URL.revokeObjectURL(url) : undefined), [url]);
  return url;
}

/**
 * A música da mesa, em qualquer tela: toca para o Mestre e para os jogadores, com um selo no
 * canto (título, volume deste aparelho). Navegadores podem bloquear o áudio até um toque na
 * página: aí o selo mostra "Tocar".
 */
export function MusicPlayer() {
  const live = useLiveSession();
  const { sounds } = useServices();
  const settings = useLiveQuery(() => sounds.settings(), [sounds]);
  const volume = settings?.musicVolume ?? DEFAULT_MUSIC_VOLUME;
  const audio = useRef<HTMLAudioElement>(null);
  const [blocked, setBlocked] = useState(false);
  /** O arquivo não toca neste aparelho (ex.: sem o codec de MP3 no Linux). */
  const [broken, setBroken] = useState<string | null>(null);

  // O que tocar: para o Mestre, o que ele mandou; para o jogador, quando a trilha chegou.
  const campaignId = live.kind === 'nenhuma' ? null : live.campaignId;
  let state: MusicState | null = null;
  let since: number | null = null;
  let downloading: { received: number; total: number } | null = null;
  if (live.kind === 'mestre') state = live.music;
  if (live.kind === 'jogador' && live.music) {
    if (live.music.ready) {
      state = live.music.state;
      since = live.music.since;
    } else {
      downloading = { received: live.music.received ?? 0, total: live.music.total ?? 1 };
    }
  }
  const pending = live.kind === 'jogador' ? live.music?.state : undefined;
  const url = useTrackUrl(campaignId, state?.track.hash ?? null);

  useEffect(() => {
    currentAudio = audio.current;
    return () => {
      currentAudio = null;
    };
  }, []);

  useEffect(() => {
    if (audio.current) audio.current.volume = volume;
  }, [volume]);

  // Aplica o estado mandado pelo Mestre: ponto, repetir, tocar ou pausar. O objeto do estado
  // só muda quando o Mestre manda um novo.
  useEffect(() => {
    const element = audio.current;
    if (!element) return;
    if (!state || !url) {
      element.pause();
      return;
    }
    element.loop = state.loop;
    if (element.src !== url) element.src = url;
    // O jogador começa de onde a mesa está (o estado chegou há um tempo).
    const elapsed = state.playing && since !== null ? (Date.now() - since) / 1000 : 0;
    const target = state.position + elapsed;
    if (Math.abs(element.currentTime - target) > 1) element.currentTime = target;
    if (state.playing) {
      // `play()` falha quando o navegador bloqueia o áudio até um toque na página.
      void Promise.resolve(element.play()).then(
        () => setBlocked(false),
        () => setBlocked(true),
      );
    } else {
      element.pause();
    }
  }, [state, since, url]);

  const title = state?.track.title ?? pending?.track.title;
  const visible = live.kind !== 'nenhuma' && (state !== null || downloading !== null);

  return (
    <>
      {/* O tocador fica sempre montado: trocar de tela não interrompe a música. */}
      <audio ref={audio} preload="auto" onError={() => setBroken(url ?? null)} />
      {visible && title && (
        <div
          role="region"
          aria-label="Música da mesa"
          className="bg-background fixed bottom-4 left-4 z-40 flex max-w-[calc(100vw-8rem)] items-center gap-1 rounded-full border py-1 pr-1 pl-3 text-sm shadow-lg"
        >
          {downloading ? (
            <LoaderCircleIcon className="text-muted-foreground size-4 shrink-0 animate-spin" />
          ) : (
            <MusicIcon
              className={cn('size-4 shrink-0', state?.playing && 'text-primary animate-pulse')}
            />
          )}
          <span className="min-w-0 truncate">
            {title}
            {downloading && (
              <span className="text-muted-foreground">
                {' '}
                · baixando {Math.round((downloading.received / downloading.total) * 100)}%
              </span>
            )}
            {state && !state.playing && <span className="text-muted-foreground"> · pausada</span>}
            {broken !== null && broken === url && (
              <span className="text-destructive"> · não deu para tocar este arquivo aqui</span>
            )}
          </span>
          {blocked && state?.playing && broken !== url && (
            <Button
              size="sm"
              variant="secondary"
              className="h-7 rounded-full"
              onClick={() => {
                void audio.current?.play().then(() => setBlocked(false));
              }}
            >
              <PlayIcon /> Tocar
            </Button>
          )}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                className="size-7 rounded-full"
                aria-label="Volume da música"
              >
                {volume === 0 ? <VolumeXIcon /> : <Volume2Icon />}
              </Button>
            </PopoverTrigger>
            <PopoverContent side="top" align="start" className="w-56 space-y-2">
              <label htmlFor="volume-musica" className="text-sm font-medium">
                Volume da música
              </label>
              <input
                id="volume-musica"
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
              <p className="text-muted-foreground text-xs">Só neste aparelho.</p>
            </PopoverContent>
          </Popover>
        </div>
      )}
    </>
  );
}
