import type { FieldValue, ResourceValue, SheetValues } from '@tabula/domain';
import { useState, type CSSProperties } from 'react';
import { cn } from '@/lib/utils';
import type { OneShotCharacter, OneShotPack, Square } from './pacote';

type Track = 'pv' | 'pd';
const TRACK_LABEL: Record<Track, string> = { pv: 'PV', pd: 'PD' };

/** Valor de um recurso, com o máximo do personagem se a ficha ainda não tiver. */
function resource(values: SheetValues, track: Track, max: number): ResourceValue {
  const value = values[track];
  if (value && typeof value === 'object' && !Array.isArray(value) && 'current' in value) {
    return { ...(value as ResourceValue), max: (value as ResourceValue).max ?? max };
  }
  return { current: max, max };
}

/**
 * Clicar no quadradinho `index`: marca até ele (gasta) ou, se já estava marcado, desmarca dele
 * em diante. Os quadradinhos marcados são os pontos perdidos, do primeiro em diante.
 */
export function clickSquare(value: ResourceValue, max: number, index: number): ResourceValue {
  const spent = Math.max(0, max - value.current);
  const next = index < spent ? index : index + 1;
  return { ...value, current: max - next };
}

/** O personagem escolhido na ficha (campo `personagem`). */
export function chosenCharacter(
  pack: OneShotPack,
  values: SheetValues,
): OneShotCharacter | undefined {
  return pack.personagens.find((c) => c.id === values['personagem']);
}

/**
 * Ficha de um personagem pronto: a imagem original (ou o histórico), com os quadradinhos de PV
 * e PD clicáveis por cima, e os mesmos contadores maiores embaixo, para o celular.
 */
export function OneShotSheet({
  character,
  values,
  onChange,
}: {
  character: OneShotCharacter;
  values: SheetValues;
  onChange: (fieldId: string, value: FieldValue) => void;
}) {
  const [page, setPage] = useState<'ficha' | 'historico'>('ficha');
  const style = { '--os-cor': character.cor } as CSSProperties;
  const tracks = (['pv', 'pd'] as const).map((track) => {
    const max = character[track];
    return { track, max, value: resource(values, track, max) };
  });

  return (
    <div className="os-ficha space-y-4" style={style}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1
            className="os-nome font-heading text-4xl tracking-wide uppercase"
            data-texto={character.nome}
          >
            {character.nome}
          </h1>
          <p className="text-muted-foreground text-sm tracking-widest uppercase">
            {character.classe} · {character.ocupacao} · Nível {character.nivel}
          </p>
        </div>
        <div role="tablist" aria-label="Páginas do personagem" className="flex gap-1">
          {(['ficha', 'historico'] as const).map((id) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={page === id}
              className={cn(
                'os-aba rounded-md px-3 py-1.5 text-sm font-medium tracking-wide uppercase transition-colors',
                page === id ? 'os-aba-ativa' : 'text-muted-foreground hover:text-foreground',
              )}
              onClick={() => setPage(id)}
            >
              {id === 'ficha' ? 'Ficha' : 'Histórico'}
            </button>
          ))}
        </div>
      </div>

      {/* A chave refaz o palco: cada página entra com a animação. */}
      <div key={page} className="os-palco relative overflow-hidden rounded-lg">
        <img
          src={page === 'ficha' ? character.ficha : character.historico}
          alt={page === 'ficha' ? `Ficha de ${character.nome}` : `Histórico de ${character.nome}`}
          className={cn('block w-full select-none', page === 'historico' && 'os-revela')}
          draggable={false}
        />
        {page === 'ficha' &&
          tracks.map(({ track, max, value }) => (
            <SquareOverlay
              key={track}
              squares={character.quadrados[track]}
              label={TRACK_LABEL[track]}
              spent={max - value.current}
              onClick={(index) => onChange(track, clickSquare(value, max, index))}
            />
          ))}
        <div aria-hidden className="os-varredura pointer-events-none absolute inset-0" />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {tracks.map(({ track, max, value }) => (
          <Tracker
            key={track}
            label={TRACK_LABEL[track]}
            max={max}
            value={value}
            onClick={(index) => onChange(track, clickSquare(value, max, index))}
          />
        ))}
      </div>
    </div>
  );
}

/** Os quadradinhos da própria imagem, clicáveis. */
function SquareOverlay({
  squares,
  label,
  spent,
  onClick,
}: {
  squares: readonly Square[];
  label: string;
  spent: number;
  onClick: (index: number) => void;
}) {
  return (
    <>
      {squares.map(([x, y, w, h], index) => (
        <button
          key={index}
          type="button"
          // Os contadores de baixo já têm os nomes acessíveis: estes são atalhos na imagem.
          tabIndex={-1}
          aria-hidden
          title={`${label} ${index + 1}`}
          className={cn('os-quadrado absolute', index < spent && 'os-quadrado-marcado')}
          style={{
            left: `${x * 100}%`,
            top: `${y * 100}%`,
            width: `${w * 100}%`,
            height: `${h * 100}%`,
          }}
          onClick={() => onClick(index)}
        />
      ))}
    </>
  );
}

/** PV ou PD em quadrados grandes, com o número. */
function Tracker({
  label,
  max,
  value,
  onClick,
}: {
  label: string;
  max: number;
  value: ResourceValue;
  onClick: (index: number) => void;
}) {
  const spent = Math.max(0, max - value.current);
  return (
    <div className="os-contador rounded-lg border p-3">
      <div className="mb-2 flex items-baseline justify-between">
        <span className="font-heading text-lg tracking-widest uppercase">{label}</span>
        <span className="font-mono text-sm" aria-live="polite">
          <span key={value.current} className="valor-mudou inline-block text-base font-semibold">
            {value.current}
          </span>{' '}
          / {max}
        </span>
      </div>
      <div
        className="flex flex-wrap gap-1.5"
        role="group"
        aria-label={`${label}: ${value.current} de ${max}`}
      >
        {Array.from({ length: max }, (_, index) => (
          <button
            key={index}
            type="button"
            aria-label={`${label} ${index + 1}${index < spent ? ' (perdido)' : ''}`}
            aria-pressed={index < spent}
            className={cn(
              'os-quadrado-grande size-7 rounded-sm pointer-coarse:size-9',
              index < spent && 'os-quadrado-marcado',
            )}
            onClick={() => onClick(index)}
          />
        ))}
      </div>
    </div>
  );
}
