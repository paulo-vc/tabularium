import { DEFAULT_DICE_COLOR, describeRoll, diceToShow, type RollEntry } from '@tabula/domain';
import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import type { DiceStage } from '@/lib/dice3d/stage';
import { useServices } from '@/app/services-context';

/** Quanto o resultado fica na tela depois que os dados param (ms). */
const HOLD_MS = 2200;

const prefersReducedMotion = () =>
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Dados 3D ligados neste aparelho (a preferência; ligada se nunca escolhida). Com eles, a
 * bandeja substitui o aviso das rolagens da mesa.
 */
export function useDiceTray(): { enabled: boolean; color: string } {
  const { sounds } = useServices();
  const settings = useLiveQuery(() => sounds.settings(), [sounds]);
  return {
    enabled: settings !== undefined && settings.dice3d !== false,
    color: settings?.diceColor ?? DEFAULT_DICE_COLOR,
  };
}

/**
 * A bandeja de dados: cada rolagem (deste aparelho ou da mesa) cai na tela em 3D e para na
 * face que o resultado já tem. Como cada participante recebe as mesmas rolagens, toda a mesa
 * vê os mesmos dados. A biblioteca 3D só carrega na primeira rolagem.
 */
export function DiceTray() {
  const { session } = useServices();
  const { enabled, color } = useDiceTray();
  /** `own`: rolada neste aparelho (o resultado já aparece num aviso, a bandeja só mostra os dados). */
  const [roll, setRoll] = useState<{ entry: RollEntry; own: boolean } | null>(null);
  const [visible, setVisible] = useState(false);
  const canvas = useRef<HTMLCanvasElement>(null);
  const stage = useRef<DiceStage | null | undefined>(undefined);
  const settings = useRef({ enabled, color });
  useEffect(() => {
    settings.current = { enabled, color };
  }, [enabled, color]);

  useEffect(() => {
    const show = (entry: RollEntry, own: boolean) => {
      if (!settings.current.enabled) return;
      setRoll({ entry, own });
      setVisible(true);
    };
    const stopOwn = session.onOwnRoll((entry) => show(entry, true));
    const stopTable = session.onRoll((entry) => show(entry, false));
    return () => {
      stopOwn();
      stopTable();
    };
  }, [session]);

  useEffect(() => {
    if (!roll) return;
    let cancelled = false;
    let hide: ReturnType<typeof setTimeout> | undefined;
    const { dice } = diceToShow(roll.entry.result);
    void (async () => {
      if (stage.current === undefined && canvas.current) {
        const { createDiceStage } = await import('@/lib/dice3d/stage');
        stage.current = canvas.current ? createDiceStage(canvas.current) : null;
      }
      if (cancelled) return;
      // Quem pede menos movimento no sistema vê os dados já parados, sem girar.
      if (stage.current && dice.length > 0) {
        await stage.current.roll(dice, settings.current.color, prefersReducedMotion());
      }
      if (!cancelled) hide = setTimeout(() => setVisible(false), HOLD_MS);
    })();
    return () => {
      cancelled = true;
      clearTimeout(hide);
    };
  }, [roll]);

  useEffect(() => () => stage.current?.dispose(), []);

  const entry = roll && !roll.own ? roll.entry : null;
  const shown = entry ? diceToShow(entry.result) : null;
  return (
    <div
      aria-hidden={!visible}
      className={cn(
        'pointer-events-none fixed inset-x-0 top-1/2 z-[44] flex -translate-y-1/2 flex-col items-center gap-1 px-4 transition-opacity duration-500',
        visible ? 'opacity-100' : 'opacity-0',
      )}
    >
      <canvas
        ref={canvas}
        aria-hidden
        className="h-44 w-full max-w-xl [mask-image:radial-gradient(closest-side,black_80%,transparent)] drop-shadow-[0_6px_10px_rgb(0_0_0/0.35)] sm:h-52"
      />
      {entry && (
        <div
          role="status"
          className="bg-background/90 max-w-full rounded-xl border px-4 py-1.5 text-center shadow-lg backdrop-blur"
        >
          <p className="text-sm">
            {entry.authorName}
            {entry.label && ` · ${entry.label}`}
            {entry.secret && ' (secreta)'}:{' '}
            <span className="text-lg font-bold tabular-nums">{entry.result.total}</span>
          </p>
          <p className="text-muted-foreground truncate text-xs">
            {describeRoll(entry.result)}
            {shown && shown.hidden > 0 && ` · +${shown.hidden} fora da bandeja`}
          </p>
        </div>
      )}
    </div>
  );
}
