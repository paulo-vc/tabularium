import {
  defaultValue,
  type FieldDef,
  type FieldOf,
  type FieldValue,
  type PrimitiveValue,
} from '@tabula/domain';
import { CircleCheckIcon, CircleIcon } from 'lucide-react';
import { useId } from 'react';
import { cn } from '@/lib/utils';
import { FieldControl, NumberInput, PrimitiveInput, type Derived } from './fields';
import { formatNumber } from './format';
import { BonusMark, BonusNote } from './Bonuses';
import { CheckButton } from './roll-context';

export interface CompactFieldProps {
  field: FieldDef;
  value: FieldValue | undefined;
  derived: Derived;
  onChange: (value: FieldValue) => void;
  newItemId: () => string;
}

/** Valor calculado em destaque, com o dado de teste se for um modificador. */
function BigComputed({
  field,
  derived,
  size = 'lg',
}: {
  field: FieldOf<'computed'>;
  derived: Derived;
  size?: 'lg' | 'md';
}) {
  const text = derived?.ok ? formatNumber(derived.value, field.signed) : '—';
  return (
    <span className="inline-flex items-center gap-0.5">
      <output
        aria-label={field.label}
        title={derived && !derived.ok ? derived.error.message : `Calculado: ${field.formula}`}
        className={cn(
          'font-semibold tabular-nums',
          size === 'lg' ? 'text-2xl' : 'text-base',
          derived && !derived.ok && 'text-destructive',
        )}
      >
        {text}
      </output>
      {field.signed && derived?.ok && (
        <CheckButton label={field.label} modifier={derived.value} fieldId={field.id} />
      )}
      <BonusMark field={field} />
    </span>
  );
}

const currentOf = (field: FieldDef, value: FieldValue | undefined) => value ?? defaultValue(field);

/**
 * Bloco de valor (seções "compactas", como os atributos): o número em destaque e o rótulo
 * pequeno. Com um campo secundário, ele aparece embaixo, pequeno (ex.: o valor 16 sob o
 * modificador +3), e o rótulo do bloco passa a ser o dele ("Força").
 */
export function StatTile({
  main,
  secondary,
}: {
  main: CompactFieldProps;
  secondary?: CompactFieldProps | undefined;
}) {
  const id = useId();
  const title = secondary?.field.label ?? main.field.label;
  const { field } = main;

  const body = (() => {
    if (field.type === 'computed') return <BigComputed field={field} derived={main.derived} />;
    if (field.type === 'number') {
      const current = currentOf(field, main.value);
      return (
        <>
          <NumberInput
            id={`${id}-main`}
            field={field}
            label={field.label}
            value={current as PrimitiveValue}
            onChange={(value) => main.onChange(value as FieldValue)}
          />
          {/* Atributo que é a quantidade de dados (Ordem Paranormal): rola daqui mesmo. */}
          {field.rollsDice && <CheckButton label={field.label} modifier={0} fieldId={field.id} />}
          <BonusNote field={field} base={typeof current === 'number' ? current : undefined} />
        </>
      );
    }
    // Sim/não: só o marcador (o rótulo já está no topo do bloco).
    if (field.type === 'boolean') return <Toggle {...main} />;
    // Texto e escolha: só o controle (o rótulo já está no topo do bloco).
    if (field.type === 'text' || field.type === 'select' || field.type === 'dice') {
      return (
        <PrimitiveInput
          compact
          field={field}
          label={field.label}
          value={currentOf(field, main.value) as PrimitiveValue}
          onChange={(value) => main.onChange(value as FieldValue)}
        />
      );
    }
    // Outros tipos num bloco compacto: o controle normal.
    return <FieldControl {...main} />;
  })();

  if (field.emblem === 'escudo') {
    return (
      <div className="relative flex min-w-0 flex-col items-center px-2 pt-1 pb-3 text-center">
        <Shield />
        <span className="text-muted-foreground relative mt-1 text-[11px] font-medium tracking-wide uppercase">
          {title}
        </span>
        <div className="relative">{body}</div>
        {secondary && <SecondaryValue {...secondary} />}
      </div>
    );
  }
  return (
    <div className="bg-card flex min-w-0 flex-col items-center gap-1 rounded-lg border px-2 py-2 text-center">
      <span className="text-muted-foreground text-[11px] font-medium tracking-wide uppercase">
        {title}
      </span>
      {body}
      {secondary && <SecondaryValue {...secondary} />}
    </div>
  );
}

/** Escudo atrás do valor (Defesa, Classe de Armadura): o número que protege. */
export function Shield({ className }: { className?: string | undefined }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 100 116"
      preserveAspectRatio="none"
      className={cn('text-primary absolute inset-0 size-full', className)}
    >
      <path
        d="M50 3 L95 18 V58 C95 88 74 106 50 113 C26 106 5 88 5 58 V18 Z"
        className="fill-card"
        stroke="currentColor"
        strokeOpacity="0.7"
        strokeWidth="2.5"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

/**
 * Seção em círculo (ex.: o pentágono de atributos): os blocos em volta de um centro com o
 * título, ligados por linhas, como na ficha impressa. De 3 a 8 blocos.
 */
export function CircleSection({
  title,
  tiles,
}: {
  title: string;
  tiles: readonly { main: CompactFieldProps; secondary?: CompactFieldProps | undefined }[];
}) {
  const n = tiles.length;
  const at = (index: number) => {
    const angle = -Math.PI / 2 + (index * 2 * Math.PI) / n;
    return { x: 50 + 37 * Math.cos(angle), y: 50 + 37 * Math.sin(angle) };
  };
  const points = tiles.map((_, index) => at(index));
  return (
    <div className="relative mx-auto aspect-square w-full max-w-[24rem]">
      <svg aria-hidden viewBox="0 0 100 100" className="text-border absolute inset-0 size-full">
        <polygon
          points={points.map((p) => `${p.x},${p.y}`).join(' ')}
          fill="none"
          stroke="currentColor"
          strokeWidth="0.8"
        />
        <circle
          cx="50"
          cy="50"
          r="13"
          className="fill-background"
          stroke="currentColor"
          strokeWidth="0.8"
        />
      </svg>
      <span
        aria-hidden
        className="font-heading text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center text-sm tracking-widest uppercase"
      >
        {title}
      </span>
      {tiles.map(({ main, secondary }, index) => {
        const p = at(index);
        return (
          <div
            key={main.field.id}
            className="absolute w-[30%] -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${p.x}%`, top: `${p.y}%` }}
          >
            <CircleTile main={main} secondary={secondary} />
          </div>
        );
      })}
    </div>
  );
}

/** Um bloco redondo do círculo: valor grande no meio, rótulo embaixo, dado para rolar. */
function CircleTile({
  main,
  secondary,
}: {
  main: CompactFieldProps;
  secondary?: CompactFieldProps | undefined;
}) {
  const { field } = main;
  const title = secondary?.field.label ?? field.label;
  const current = currentOf(field, main.value);
  return (
    <div className="flex flex-col items-center gap-0.5 text-center">
      <div className="border-primary/70 bg-card relative flex aspect-square w-[78%] max-w-24 flex-col items-center justify-center rounded-full border-2 shadow-[0_0_0_4px_var(--color-background)]">
        {field.type === 'computed' ? (
          <BigComputed field={field} derived={main.derived} />
        ) : field.type === 'number' ? (
          <div className="w-14 [&_input]:h-9 [&_input]:!border-transparent [&_input]:!bg-transparent [&_input]:p-0 [&_input]:text-center [&_input]:text-2xl [&_input]:font-semibold [&_input]:shadow-none">
            <NumberInput
              field={field}
              label={field.label}
              value={current as PrimitiveValue}
              onChange={(value) => main.onChange(value as FieldValue)}
            />
          </div>
        ) : (
          <FieldControl {...main} />
        )}
        {/* O valor secundário (o 16 do +3) num selo na borda de baixo, como na ficha impressa:
            o bloco não cresce e não invade o vizinho. */}
        {secondary && (
          <div className="absolute top-full left-1/2 -translate-x-1/2 -translate-y-1/2 [&_.w-16]:w-12 [&_input]:h-6 [&_input]:rounded-full [&_input]:!bg-card [&_input]:px-1 [&_input]:text-center [&_input]:text-xs">
            <SecondaryValue {...secondary} />
          </div>
        )}
      </div>
      <span
        className={cn(
          'text-muted-foreground mt-1 text-[11px] font-medium tracking-wide uppercase',
          secondary && 'mt-3.5',
        )}
      >
        {title}
      </span>
      {field.type === 'number' && field.rollsDice && (
        <CheckButton label={field.label} modifier={0} fieldId={field.id} />
      )}
    </div>
  );
}

/** Campo secundário, pequeno, embaixo do principal. */
export function SecondaryValue({ field, value, derived, onChange }: CompactFieldProps) {
  if (field.type === 'computed') return <BigComputed field={field} derived={derived} size="md" />;
  if (field.type === 'number') {
    const current = currentOf(field, value);
    return (
      <div className="flex flex-col items-center gap-0.5">
        <div className="w-16">
          <NumberInput
            compact
            field={field}
            label={field.label}
            value={current as PrimitiveValue}
            onChange={(next) => onChange(next as FieldValue)}
          />
        </div>
        <BonusNote field={field} base={typeof current === 'number' ? current : undefined} />
      </div>
    );
  }
  if (field.type === 'list' || field.type === 'resource') return null;
  return (
    <PrimitiveInput
      compact
      field={field}
      label={field.label}
      value={currentOf(field, value) as PrimitiveValue}
      onChange={(next) => onChange(next as FieldValue)}
    />
  );
}

/** Marcador redondo de sim/não (proficiência, preparado…), compacto e com rótulo acessível. */
function Toggle({ field, value, onChange }: CompactFieldProps) {
  const on = currentOf(field, value) === true;
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={on}
      aria-label={field.label}
      title={field.label}
      className={cn(
        // Em telas de toque, a área de toque cresce para 44 px sem mudar o desenho.
        'relative shrink-0 rounded-full p-0.5 pointer-coarse:after:absolute pointer-coarse:after:-inset-3',
        on ? 'text-primary' : 'text-muted-foreground/60 hover:text-muted-foreground',
      )}
      onClick={() => onChange(!on)}
    >
      {on ? <CircleCheckIcon className="size-4" /> : <CircleIcon className="size-4" />}
    </button>
  );
}

/**
 * Uma linha de uma seção em "linhas" (ex.: uma perícia). Os marcadores de sim/não vêm
 * primeiro; o nome da linha é o do campo principal (o último número ou calculado), que
 * fica à direita com o dado de teste; outros campos aparecem compactos no meio.
 */
/** A linha tem treino: um sim/não marcado, ou uma escolha além da primeira (o "destreinado"). */
export function isTrainedRow(cells: readonly CompactFieldProps[]): boolean | null {
  const marks = cells.filter(
    (cell) =>
      cell.field.type === 'boolean' || (cell.field.type === 'select' && !cell.field.multiple),
  );
  if (marks.length === 0) return null;
  return marks.some(({ field, value }) => {
    const current = value ?? defaultValue(field);
    if (field.type === 'boolean') return current === true;
    if (field.type !== 'select') return false;
    return typeof current === 'string' && current !== '' && current !== field.options[0]?.value;
  });
}

/** Partes de uma linha: marcadores, o principal (último número ou calculado) e o resto. */
function lineParts(cells: readonly CompactFieldProps[]) {
  const mainIndex = cells.findLastIndex(
    (cell) => cell.field.type === 'computed' || cell.field.type === 'number',
  );
  return {
    main: mainIndex >= 0 ? cells[mainIndex] : undefined,
    toggles: cells.filter((cell) => cell.field.type === 'boolean'),
    others: cells.filter((cell, index) => index !== mainIndex && cell.field.type !== 'boolean'),
  };
}

/** Nome curto da coluna: o que vem depois do " — " ("Acrobacia — grau" → "Grau"). */
const columnName = (label: string) => {
  const part = label.includes(' — ') ? label.split(' — ').at(-1) : label.split(' ')[0];
  const text = (part ?? label).trim();
  return text.charAt(0).toUpperCase() + text.slice(1);
};

/** Abreviações de coluna de marcador; as outras ficam com as 4 primeiras letras. */
const SHORT: Record<string, string> = {
  proficiência: 'Prof.',
  especialização: 'Esp.',
  especialista: 'Esp.',
  treinada: 'Trein.',
  treinado: 'Trein.',
  marcada: 'Marc.',
};
const shortColumnName = (label: string) => {
  const name = columnName(label);
  return SHORT[name.toLowerCase()] ?? (name.length > 5 ? `${name.slice(0, 4)}.` : name);
};

/** Cabeçalho das colunas de uma seção em linhas, a partir da primeira linha. */
export function FieldLineHeader({
  cells,
  name = 'Perícia',
}: {
  cells: CompactFieldProps[];
  name?: string;
}) {
  const { main, toggles, others } = lineParts(cells);
  return (
    <div
      aria-hidden
      className="text-muted-foreground flex items-center gap-2 border-b pb-1 text-[11px] tracking-wide uppercase"
    >
      {toggles.map((cell) => (
        // Mesma largura do marcador na linha: a abreviação inteira, sem reticências.
        <span key={cell.field.id} className="w-10 shrink-0 text-center tracking-normal">
          {shortColumnName(cell.field.label)}
        </span>
      ))}
      <span className="min-w-0 flex-1">{name}</span>
      {others.map((cell) => (
        <span key={cell.field.id} className={cn(cell.field.type === 'select' ? 'w-36' : 'w-16')}>
          {columnName(cell.field.label)}
        </span>
      ))}
      {main && <span className="w-20 text-right">Total</span>}
    </div>
  );
}

export function FieldLine({ cells }: { cells: CompactFieldProps[] }) {
  const { main, toggles, others } = lineParts(cells);
  const name = main?.field.label ?? cells[0]?.field.label ?? '';
  const trained = isTrainedRow(cells) === true;

  return (
    <div className="flex min-h-9 items-center gap-2 border-b py-1 last:border-b-0">
      {toggles.map((cell) => (
        <span key={cell.field.id} className="flex w-10 shrink-0 justify-center">
          <Toggle {...cell} />
        </span>
      ))}
      <span
        className={cn('min-w-0 flex-1 truncate text-sm', trained && 'text-primary font-medium')}
      >
        {name}
      </span>
      {others.map((cell) => (
        <div key={cell.field.id} className={cn(cell.field.type === 'select' ? 'w-36' : 'w-16')}>
          <SecondaryValue {...cell} />
        </div>
      ))}
      {main && (
        <div className="flex min-w-20 justify-end">
          {main.field.type === 'computed' ? (
            <BigComputed field={main.field} derived={main.derived} size="md" />
          ) : (
            <SecondaryValue {...main} />
          )}
        </div>
      )}
    </div>
  );
}
