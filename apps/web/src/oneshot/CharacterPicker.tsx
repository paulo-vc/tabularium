import { useEffect, useState, type CSSProperties } from 'react';
import { cn } from '@/lib/utils';
import type { OneShotCharacter, OneShotPack } from './pacote';

/** Quanto dura a revelação do escolhido antes de seguir para a ficha. */
const REVEAL_MS = 1400;

/**
 * Escolha do personagem da one-shot: os retratos entram um a um no escuro, acendem na cor do
 * personagem ao passar o mouse, e o escolhido toma a tela antes de abrir a ficha.
 */
export function CharacterPicker({
  pack,
  taken = [],
  onPick,
}: {
  pack: OneShotPack;
  /** Personagens que outros jogadores já escolheram (aparecem apagados). */
  taken?: readonly string[];
  onPick: (character: OneShotCharacter) => void | Promise<void>;
}) {
  const [chosen, setChosen] = useState<OneShotCharacter | null>(null);
  const reduced =
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  useEffect(() => {
    if (!chosen) return;
    const timer = setTimeout(() => void onPick(chosen), reduced ? 0 : REVEAL_MS);
    return () => clearTimeout(timer);
  }, [chosen, onPick, reduced]);

  return (
    <section aria-label="Escolha seu personagem" className="os-escolha space-y-5">
      <div className="space-y-1 text-center">
        <p className="text-muted-foreground text-xs tracking-[0.3em] uppercase">{pack.nome}</p>
        <h2
          className="os-nome font-heading text-3xl tracking-wide uppercase"
          data-texto="Quem é você?"
        >
          Quem é você?
        </h2>
        <p className="text-muted-foreground mx-auto max-w-xl text-sm">{pack.descricao}</p>
      </div>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {pack.personagens.map((character, index) => {
          const busy = taken.includes(character.id);
          return (
            <li
              key={character.id}
              className="os-carta-entra"
              style={{ animationDelay: `${index * 110}ms` }}
            >
              <button
                type="button"
                disabled={busy || chosen !== null}
                aria-label={`${character.nome}: ${character.classe}, ${character.ocupacao}${busy ? ' (já escolhido)' : ''}`}
                className={cn(
                  'os-carta group relative block aspect-[3/5] w-full overflow-hidden rounded-lg border text-left',
                  chosen?.id === character.id && 'os-carta-escolhida',
                  chosen && chosen.id !== character.id && 'os-carta-some',
                  busy && 'opacity-35 grayscale',
                )}
                style={{ '--os-cor': character.cor } as CSSProperties}
                onClick={() => setChosen(character)}
              >
                <img
                  src={character.retrato}
                  alt=""
                  className="os-carta-retrato absolute inset-0 size-full object-cover object-top"
                  draggable={false}
                />
                <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/80 to-transparent p-3 pt-10">
                  <span className="os-carta-nome font-heading block text-xl tracking-wide uppercase">
                    {character.nome}
                  </span>
                  <span className="block text-[11px] tracking-widest text-white/70 uppercase">
                    {character.classe} · {character.ocupacao}
                  </span>
                  <span className="mt-1 block font-mono text-xs text-white/80">
                    PV {character.pv} · PD {character.pd}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      {chosen && (
        <div
          role="status"
          className="os-revelacao pointer-events-none fixed inset-0 z-50 grid place-items-center"
          style={{ '--os-cor': chosen.cor } as CSSProperties}
        >
          <p
            className="os-nome font-heading text-6xl tracking-wide uppercase"
            data-texto={chosen.nome}
          >
            {chosen.nome}
          </p>
        </div>
      )}
    </section>
  );
}
