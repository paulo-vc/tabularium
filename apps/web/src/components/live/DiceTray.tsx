import { DEFAULT_DICE_COLOR, describeRoll, diceToShow, type RollEntry } from '@tabula/domain';
import { useLiveQuery } from 'dexie-react-hooks';
import { EyeOffIcon } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import type { DiceStage } from '@/lib/dice3d/stage';
import { useServices } from '@/app/services-context';
import { onChatOpen, openRollHistory } from './ChatDock';
import { useLiveSession } from './use-live-session';

/** Quanto os dados ficam na tela depois que param (ms). */
const HOLD_MS = 2200;
/** Quanto cada resultado fica na coluna da direita (ms). */
const RESULT_MS = 7000;
/** Quantos resultados cabem na coluna (os mais antigos saem). */
const MAX_RESULTS = 3;

/**
 * Dados 3D ligados neste aparelho (a preferência; ligada se nunca escolhida). Com eles, os
 * resultados aparecem na coluna da bandeja, no lugar dos avisos.
 */
export function useDiceTray(): { enabled: boolean; color: string; motion: boolean } {
  const { sounds } = useServices();
  const settings = useLiveQuery(() => sounds.settings(), [sounds]);
  return {
    enabled: settings !== undefined && settings.dice3d !== false,
    color: settings?.diceColor ?? DEFAULT_DICE_COLOR,
    motion: settings?.diceMotion !== false,
  };
}

/**
 * A bandeja de dados, à direita da tela: cada rolagem (deste aparelho ou da mesa) cai em 3D
 * e para na face que o resultado já tem, e o resultado entra na coluna embaixo. Como cada
 * participante recebe as mesmas rolagens, toda a mesa vê os mesmos dados. Na sessão, tocar
 * num resultado abre o histórico de rolagens. A biblioteca 3D só carrega na primeira rolagem.
 */
export function DiceTray() {
  const { session } = useServices();
  const live = useLiveSession();
  const { enabled, color, motion } = useDiceTray();
  const [rolling, setRolling] = useState<RollEntry | null>(null);
  const [diceVisible, setDiceVisible] = useState(false);
  const [results, setResults] = useState<RollEntry[]>([]);
  /** Com o chat aberto (à direita, embaixo), a bandeja fica ao lado dele. */
  const [chatOpen, setChatOpen] = useState(false);
  useEffect(() => onChatOpen(setChatOpen), []);
  const canvas = useRef<HTMLCanvasElement>(null);
  const stage = useRef<DiceStage | null | undefined>(undefined);
  const settings = useRef({ enabled, color, motion });
  useEffect(() => {
    settings.current = { enabled, color, motion };
  }, [enabled, color, motion]);

  useEffect(() => {
    const timers = new Set<ReturnType<typeof setTimeout>>();
    const show = (entry: RollEntry) => {
      if (!settings.current.enabled) return;
      setRolling(entry);
      setDiceVisible(true);
      setResults((current) => [entry, ...current].slice(0, MAX_RESULTS));
      const timer = setTimeout(() => {
        timers.delete(timer);
        setResults((current) => current.filter((item) => item.id !== entry.id));
      }, RESULT_MS);
      timers.add(timer);
    };
    const stopOwn = session.onOwnRoll(show);
    const stopTable = session.onRoll(show);
    return () => {
      stopOwn();
      stopTable();
      for (const timer of timers) clearTimeout(timer);
    };
  }, [session]);

  useEffect(() => {
    if (!rolling) return;
    let cancelled = false;
    let hide: ReturnType<typeof setTimeout> | undefined;
    const { dice } = diceToShow(rolling.result);
    void (async () => {
      if (stage.current === undefined && canvas.current) {
        const { createDiceStage } = await import('@/lib/dice3d/stage');
        stage.current = canvas.current ? createDiceStage(canvas.current) : null;
      }
      if (cancelled) return;
      if (stage.current && dice.length > 0) {
        // Cada um rola com a própria cor; sem cor (versão antiga ou nunca escolhida), a deste aparelho.
        const color = rolling.diceColor ?? settings.current.color;
        await stage.current.roll(dice, color, !settings.current.motion);
      }
      if (!cancelled) hide = setTimeout(() => setDiceVisible(false), HOLD_MS);
    })();
    return () => {
      cancelled = true;
      clearTimeout(hide);
    };
  }, [rolling]);

  useEffect(() => () => stage.current?.dispose(), []);

  const inSession = live.kind !== 'nenhuma';
  return (
    <div
      className={cn(
        'pointer-events-none fixed top-16 right-4 z-[44] flex w-[min(20rem,calc(100vw-2rem))] flex-col items-end gap-2 transition-[right] duration-300',
        chatOpen && 'sm:right-[calc(min(26rem,100vw-2rem)+2rem)]',
      )}
    >
      <canvas
        ref={canvas}
        aria-hidden
        className={cn(
          'h-40 w-full [mask-image:radial-gradient(closest-side,black_80%,transparent)] drop-shadow-[0_6px_10px_rgb(0_0_0/0.35)] transition-opacity duration-500',
          diceVisible ? 'opacity-100' : 'opacity-0',
        )}
      />
      {results.length > 0 && (
        <ol aria-label="Últimas rolagens" className="flex w-full flex-col items-end gap-1.5">
          {results.map((entry) => (
            <ResultCard
              key={entry.id}
              entry={entry}
              onOpen={
                inSession
                  ? () => {
                      setResults([]);
                      openRollHistory();
                    }
                  : undefined
              }
            />
          ))}
        </ol>
      )}
    </div>
  );
}

function ResultCard({ entry, onOpen }: { entry: RollEntry; onOpen?: (() => void) | undefined }) {
  const hidden = diceToShow(entry.result).hidden;
  // Na ordem do texto: "Ana · Furtividade: 17" e a conta; na tela, o total fica à direita.
  const body = (
    <>
      <span className="min-w-0 truncate text-left text-sm">
        <span className="font-medium">{entry.authorName}</span>
        {entry.label && <span className="text-muted-foreground"> · {entry.label}</span>}
        <span className="sr-only">: </span>
      </span>
      <span className="row-span-2 flex items-center gap-1.5 self-center text-2xl font-bold tabular-nums">
        {entry.secret && (
          <EyeOffIcon aria-label="Secreta" className="text-muted-foreground size-4" />
        )}
        {entry.result.total}
      </span>
      <span className="text-muted-foreground min-w-0 truncate text-left font-mono text-xs">
        <span className="sr-only"> </span>
        {describeRoll(entry.result)}
        {hidden > 0 && ` · +${hidden} fora da bandeja`}
      </span>
    </>
  );
  const className =
    'bg-background/95 animate-in fade-in slide-in-from-right-4 grid w-full grid-cols-[1fr_auto] gap-x-3 rounded-xl border px-3 py-2 shadow-lg backdrop-blur duration-300';
  return (
    // No celular, só o mais recente (os outros cobririam a tela).
    <li role="status" className="pointer-events-auto w-full max-sm:[&:nth-child(n+2)]:hidden">
      {onOpen ? (
        <button
          type="button"
          title="Ver o histórico de rolagens"
          className={cn(className, 'hover:bg-accent transition-colors')}
          onClick={onOpen}
        >
          {body}
        </button>
      ) : (
        <div className={className}>{body}</div>
      )}
    </li>
  );
}
