import {
  conditionallyHidden,
  defaultValue,
  type CodexPage,
  type CompiledTemplate,
  type DerivedValues,
  type FieldDef,
  type FieldOf,
  type FieldValue,
  type BarColor,
  type ResourceValue,
  type RollMode,
  type SheetValues,
  supportsRollMode,
} from '@tabula/domain';
import {
  ChevronsUpDownIcon,
  DicesIcon,
  HeartIcon,
  PencilIcon,
  SwordIcon,
  TagIcon,
} from 'lucide-react';
import { useContext, useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { ConditionTags } from '@/components/codex/CodexPageDialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { NumberInput, PrimitiveInput } from './fields';
import { formatNumber, parseNumber } from './format';
import { Shield } from './compact';
import { markCount, Marks } from './Marks';
import { BonusContext } from './Bonuses';
import { CheckButton, RollContext, RollModeBar } from './roll-context';

/** Campos em destaque: os do card do Mestre (`gmSummary`) ou, sem ele, os recursos. */
export function vitalFields(compiled: CompiledTemplate, hidden?: ReadonlySet<string>): FieldDef[] {
  const ids = compiled.template.layouts.gmSummary;
  const fields = ids?.length
    ? ids.map((id) => compiled.fieldsById.get(id)).filter((f): f is FieldDef => Boolean(f))
    : compiled.template.fields.filter((f) => f.type === 'resource').slice(0, 4);
  return fields.filter((f) => !hidden?.has(f.id));
}

/** O painel edita esses tipos por completo; os demais (texto, lista…) continuam na ficha. */
const panelEdits = (field: FieldDef): boolean =>
  field.type === 'number' ||
  field.type === 'computed' ||
  field.type === 'resource' ||
  field.type === 'boolean' ||
  (field.type === 'select' && field.multiple === true);

/**
 * Campos que ficam só no painel fixo e saem das abas: mostrar e editar o mesmo valor em
 * dois lugares confunde e gasta espaço. Campos secretos ficam nas abas, onde aparecem
 * marcados como "só o Mestre vê".
 */
export function pinnedFieldIds(
  compiled: CompiledTemplate,
  hidden?: ReadonlySet<string>,
  secret?: ReadonlySet<string>,
): Set<string> {
  return new Set(
    vitalFields(compiled, hidden)
      .filter((field) => panelEdits(field) && !secret?.has(field.id))
      .map((field) => field.id),
  );
}

/**
 * Dano tira primeiro dos pontos temporários; cura não passa do máximo (se houver).
 * Ex.: PV 10/20 com 3 temporários, 5 de dano → 8/20, 0 temporários.
 */
export function applyToResource(
  value: ResourceValue,
  amount: number,
  kind: 'dano' | 'cura',
  max: number | undefined,
): ResourceValue {
  if (kind === 'cura') {
    const healed = value.current + amount;
    return { ...value, current: max === undefined ? healed : Math.min(max, healed) };
  }
  const temp = value.temp ?? 0;
  const absorbed = Math.min(temp, amount);
  const next: ResourceValue = { ...value, current: value.current - (amount - absorbed) };
  if (value.temp !== undefined) next.temp = temp - absorbed;
  return next;
}

const asNumber = (field: FieldDef, suffix: string, label: string): FieldOf<'number'> => ({
  id: `${field.id}-${suffix}`,
  key: field.key,
  label,
  type: 'number',
});

/** Ajuste exato de um recurso (atual, máximo digitado e temporários), aberto pelo número. */
function ResourceEditor({
  field,
  value,
  max,
  onChange,
}: {
  field: FieldOf<'resource'>;
  value: ResourceValue;
  max: number | undefined;
  onChange: (value: ResourceValue) => void;
}) {
  const id = useId();
  return (
    <div className="grid grid-cols-3 gap-2">
      <div className="space-y-1">
        <Label htmlFor={`${id}-atual`} className="text-xs">
          Atual
        </Label>
        <NumberInput
          compact
          id={`${id}-atual`}
          field={asNumber(field, 'atual', 'Atual')}
          value={value.current}
          onChange={(current) => onChange({ ...value, current: current as number })}
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor={`${id}-max`} className="text-xs">
          Máximo
        </Label>
        {field.max === undefined ? (
          <NumberInput
            compact
            id={`${id}-max`}
            field={asNumber(field, 'max', 'Máximo')}
            value={value.max ?? 0}
            onChange={(next) => onChange({ ...value, max: next as number })}
          />
        ) : (
          <output
            id={`${id}-max`}
            title={`Calculado: ${field.max}`}
            className="flex h-8 items-center text-sm font-semibold tabular-nums"
          >
            {max === undefined ? '—' : formatNumber(max)}
          </output>
        )}
      </div>
      <div className="space-y-1">
        <Label htmlFor={`${id}-temp`} className="text-xs">
          Temporários
        </Label>
        <NumberInput
          compact
          id={`${id}-temp`}
          field={{ ...asNumber(field, 'temp', 'Temporários'), min: 0 }}
          value={value.temp ?? 0}
          onChange={(temp) => {
            const { temp: _old, ...rest } = value;
            onChange((temp as number) > 0 ? { ...rest, temp: temp as number } : rest);
          }}
        />
      </div>
    </div>
  );
}

/** Matiz de cada cor de barra (o mesmo das cores de destaque). */
const BAR_HUE: Record<BarColor, number> = {
  vermelho: 25,
  laranja: 50,
  ambar: 78,
  verde: 152,
  ciano: 205,
  cobalto: 262,
  violeta: 300,
  magenta: 340,
};

/**
 * Cor da barra: a do recurso (Vida vermelha, Sanidade violeta…) ou, sem cor, de verde a
 * vermelho conforme esvazia. Escura o bastante para o número branco em cima.
 */
export function barColor(color: BarColor | undefined, percent: number): string {
  const hue = color ? BAR_HUE[color] : percent > 50 ? 152 : percent > 25 ? 70 : 25;
  return `oklch(0.5 0.15 ${hue})`;
}

/** Botão dentro da barra (« ‹ › »): grande para o dedo, discreto no meio do combate. */
function BarButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="relative h-full w-8 shrink-0 text-base text-white/80 [text-shadow:0_1px_2px_rgb(0_0_0/0.6)] hover:bg-black/20 hover:text-white active:bg-black/30 pointer-coarse:w-11"
    >
      {children}
    </button>
  );
}

function ResourceVital({
  field,
  value,
  max,
  onChange,
  className,
}: {
  className?: string | undefined;
  field: FieldOf<'resource'>;
  value: ResourceValue;
  max: number | undefined;
  onChange: (value: ResourceValue) => void;
}) {
  const [amount, setAmount] = useState('');
  const parsed = parseNumber(amount);
  const valid = parsed !== null && parsed > 0;
  const percent = max && max > 0 ? Math.max(0, Math.min(100, (value.current / max) * 100)) : 0;
  const apply = (kind: 'dano' | 'cura') => {
    if (!valid) return;
    onChange(applyToResource(value, parsed, kind, max));
    setAmount('');
  };

  return (
    <div className={cn('min-w-56 flex-1 space-y-1 xl:min-w-0 xl:flex-none', className)}>
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
          {field.label}
        </span>
        {value.temp ? (
          <span className="text-xs text-sky-400 tabular-nums">
            +{formatNumber(value.temp)} temp.
          </span>
        ) : null}
      </div>
      {/* A barra é o controle: « −5, ‹ −1, o valor (abre o ajuste exato), › +1, » +5. */}
      <div className="bg-muted relative flex h-8 items-center overflow-hidden rounded-md border pointer-coarse:h-11">
        {/* O medidor fica só no preenchimento: dentro de um meter, os botões sumiriam do leitor de tela. */}
        <div
          role="meter"
          aria-label={`${field.label}: ${formatNumber(value.current)}${max !== undefined ? ` de ${formatNumber(max)}` : ''}`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(percent)}
          className="absolute inset-0 origin-left transition-transform motion-reduce:transition-none"
          style={{
            transform: `scaleX(${percent / 100})`,
            background: barColor(field.color, percent),
          }}
        />
        <BarButton
          label={`Tirar 5 de ${field.label}`}
          onClick={() => onChange(applyToResource(value, 5, 'dano', max))}
        >
          «
        </BarButton>
        <BarButton
          label={`Tirar 1 de ${field.label}`}
          onClick={() => onChange(applyToResource(value, 1, 'dano', max))}
        >
          ‹
        </BarButton>
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              aria-label={`Ajustar ${field.label}`}
              title="Ajustar valores"
              className="relative flex-1 self-stretch font-mono text-sm font-semibold text-white tabular-nums [text-shadow:0_1px_2px_rgb(0_0_0/0.6)] outline-none focus-visible:ring-2 focus-visible:ring-white/70"
            >
              {formatNumber(value.current)}
              {max !== undefined && (
                <span className="font-normal opacity-80"> / {formatNumber(max)}</span>
              )}
            </button>
          </PopoverTrigger>
          <PopoverContent align="center" aria-label={`Ajustar ${field.label}`}>
            <ResourceEditor field={field} value={value} max={max} onChange={onChange} />
          </PopoverContent>
        </Popover>
        <BarButton
          label={`Somar 1 a ${field.label}`}
          onClick={() => onChange(applyToResource(value, 1, 'cura', max))}
        >
          ›
        </BarButton>
        <BarButton
          label={`Somar 5 a ${field.label}`}
          onClick={() => onChange(applyToResource(value, 5, 'cura', max))}
        >
          »
        </BarButton>
      </div>
      <form
        className="flex items-center gap-1"
        onSubmit={(event) => {
          event.preventDefault();
          apply('dano');
        }}
      >
        <Input
          aria-label={`Quanto de ${field.label}`}
          inputMode="numeric"
          placeholder="Qtd."
          value={amount}
          className="h-8 w-16 text-center"
          onChange={(event) => setAmount(event.target.value)}
        />
        <Button type="submit" size="sm" variant="outline" disabled={!valid}>
          <SwordIcon /> Dano
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={!valid}
          onClick={() => apply('cura')}
        >
          <HeartIcon /> Cura
        </Button>
      </form>
    </div>
  );
}

/** Bloco pequeno do painel: rótulo em cima, valor (ou controle) embaixo. */
function Tile({
  label,
  emblem,
  children,
}: {
  label: string;
  emblem?: 'escudo' | undefined;
  children: ReactNode;
}) {
  if (emblem === 'escudo') {
    return (
      <div className="relative flex min-w-20 shrink-0 flex-col items-center gap-0.5 px-3 pt-1 pb-3">
        <Shield />
        <span className="text-muted-foreground relative line-clamp-2 max-w-24 text-center text-[11px] leading-tight">
          {label}
        </span>
        <div className="relative">{children}</div>
      </div>
    );
  }
  return (
    <div className="flex min-w-16 shrink-0 flex-col items-center gap-0.5 rounded-md border px-2.5 py-1">
      <span
        className="text-muted-foreground line-clamp-2 max-w-24 text-center text-[11px] leading-tight"
        title={label}
      >
        {label}
      </span>
      {children}
    </div>
  );
}

function selected(field: FieldOf<'select'>, value: FieldValue | undefined): string[] {
  const current = value ?? defaultValue(field);
  return Array.isArray(current)
    ? (current as string[])
    : typeof current === 'string' && current
      ? [current]
      : [];
}

/** Condições (seleção múltipla): só as ativas à vista; as outras, a um clique. */
function MultiSelectVital({
  field,
  value,
  pages,
  onChange,
}: {
  field: FieldOf<'select'>;
  value: FieldValue | undefined;
  /** Códice do sistema: a opção com página de mesmo nome (ex.: "Caído") abre a página. */
  pages: readonly CodexPage[];
  onChange: (value: FieldValue) => void;
}) {
  const active = selected(field, value);
  const shown = field.options.filter((option) => active.includes(option.value));
  return (
    <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label={field.label}>
      <ConditionTags
        conditions={shown.map((option) => option.label)}
        pages={pages}
        onRemove={(label) =>
          onChange(
            active.filter((v) => v !== shown.find((option) => option.label === label)?.value),
          )
        }
      />
      <Popover>
        <PopoverTrigger asChild>
          <Button type="button" size="sm" variant="ghost" className="h-6 px-2 text-xs">
            <PencilIcon /> {field.label}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-80" aria-label={field.label}>
          <PrimitiveInput
            field={field}
            label={field.label}
            value={active}
            onChange={(next) => onChange(next as FieldValue)}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}

/**
 * Painel fixo no topo da ficha: o que muda a cada turno (PV, CA, condições…) fica sempre à
 * vista e editável aqui mesmo, com dano e cura em um toque, mesmo rolando a ficha. Esses
 * campos saem das abas (ver `pinnedFieldIds`).
 */
export function SheetVitals({
  compiled,
  values,
  derived,
  onChange,
  hiddenFieldIds,
}: {
  compiled: CompiledTemplate;
  values: SheetValues;
  derived: DerivedValues;
  onChange: (fieldId: string, value: FieldValue) => void;
  hiddenFieldIds?: ReadonlySet<string> | undefined;
}) {
  const byCondition = conditionallyHidden(compiled, values);
  const fields = vitalFields(compiled, hiddenFieldIds).filter((f) => !byCondition.has(f.id));
  const codexPages = useMemo(
    () => (compiled.template.codex ?? []).filter((page) => !page.gmOnly),
    [compiled.template.codex],
  );
  if (fields.length === 0) return null;

  const resourceMax = (field: FieldOf<'resource'>, value: ResourceValue) => {
    const computed = derived.resourceMax[field.id];
    return field.max === undefined ? value.max : computed?.ok ? computed.value : undefined;
  };
  const resourceValue = (field: FieldOf<'resource'>) =>
    (values[field.id] ?? defaultValue(field)) as ResourceValue;
  const asMarks = (field: FieldOf<'resource'>) =>
    field.display === 'marcadores' ? markCount(resourceMax(field, resourceValue(field))) : null;

  const bars = fields.filter(
    (f): f is FieldOf<'resource'> => f.type === 'resource' && asMarks(f) === null,
  );
  const states = fields.filter((f) => f.type === 'select' || f.type === 'boolean');
  const placed = new Set<string>([...bars, ...states].map((f) => f.id));
  const tiles = fields.filter((f) => !placed.has(f.id));

  const tile = (field: FieldDef) => {
    const raw = values[field.id] ?? defaultValue(field);
    switch (field.type) {
      case 'computed': {
        const result = derived.computed[field.id];
        return (
          <span className="flex items-center text-lg font-semibold tabular-nums">
            <span title={result && !result.ok ? result.error.message : undefined}>
              {result?.ok ? formatNumber(result.value, field.signed) : '—'}
            </span>
            {field.signed && result?.ok && (
              <CheckButton label={field.label} modifier={result.value} fieldId={field.id} />
            )}
          </span>
        );
      }
      case 'resource': {
        const value = resourceValue(field);
        return (
          <Marks
            size="sm"
            label={field.label}
            value={value.current}
            count={asMarks(field) ?? 0}
            onChange={(current) => onChange(field.id, { ...value, current })}
          />
        );
      }
      case 'number': {
        const count = field.display === 'marcadores' ? markCount(field.max) : null;
        if (count !== null) {
          return (
            <Marks
              size="sm"
              label={field.label}
              value={typeof raw === 'number' ? raw : 0}
              count={count}
              onChange={(next) => onChange(field.id, next)}
            />
          );
        }
        return (
          <div className="w-14 [&_input]:h-7 [&_input]:border-transparent [&_input]:bg-transparent [&_input]:text-center [&_input]:text-lg [&_input]:font-semibold [&_input]:shadow-none [&_input:hover]:border-input [&_input:focus]:border-input">
            <NumberInput
              compact
              field={field}
              label={field.label}
              value={typeof raw === 'number' ? raw : 0}
              onChange={(next) => onChange(field.id, next)}
            />
          </div>
        );
      }
      default:
        return (
          <span className="text-lg font-semibold">
            {typeof raw === 'string' && raw ? raw : '—'}
          </span>
        );
    }
  };

  // A seleção múltipla do painel (ex.: Condições) também vai para a barra do celular.
  const conditions = states.find(
    (f): f is FieldOf<'select'> => f.type === 'select' && f.multiple === true,
  );

  return (
    <>
      <section
        aria-label="Resumo do personagem"
        className="bg-background/95 z-[5] -mx-4 border-b px-4 py-3 backdrop-blur md:sticky md:top-14 xl:top-20 xl:mx-0 xl:max-h-[calc(100dvh-6rem)] xl:overflow-y-auto xl:rounded-xl xl:border xl:p-4"
      >
        <div className="flex flex-wrap items-center gap-x-4 gap-y-3 xl:flex-col xl:items-stretch">
          {bars.map((field, index) => {
            const value = resourceValue(field);
            return (
              <ResourceVital
                className={index < 2 ? 'max-md:hidden' : undefined}
                key={field.id}
                field={field}
                value={value}
                max={resourceMax(field, value)}
                onChange={(next) => onChange(field.id, next)}
              />
            );
          })}
          {/* No celular, os números ficam numa linha só, com rolagem lateral: o painel fixo
            não pode tomar a tela. */}
          <div className="-mx-1 flex max-w-full gap-2 overflow-x-auto px-1 pb-1 sm:flex-wrap sm:overflow-visible sm:pb-0 xl:mx-0 xl:grid xl:grid-cols-2 xl:px-0 xl:[&>*]:min-w-0">
            {tiles.map((field) => (
              <Tile key={field.id} label={field.label} emblem={field.emblem}>
                {tile(field)}
              </Tile>
            ))}
          </div>
        </div>
        {/* Sem estados nem vantagem (sistema sem d20), a linha some. */}
        <div
          className="mt-2 flex flex-wrap items-center gap-1.5 empty:hidden xl:mt-4 xl:border-t xl:pt-3"
          aria-label="Estados"
        >
          {states.map((field) => {
            if (field.type === 'boolean') {
              const on = (values[field.id] ?? defaultValue(field)) === true;
              return (
                <Badge key={field.id} asChild variant={on ? 'default' : 'outline'}>
                  <button type="button" aria-pressed={on} onClick={() => onChange(field.id, !on)}>
                    {field.label}
                  </button>
                </Badge>
              );
            }
            if (field.type !== 'select') return null;
            if (field.multiple) {
              return (
                <MultiSelectVital
                  key={field.id}
                  field={field}
                  value={values[field.id]}
                  pages={codexPages}
                  onChange={(next) => onChange(field.id, next)}
                />
              );
            }
            const labels = field.options
              .filter((o) => selected(field, values[field.id]).includes(o.value))
              .map((o) => o.label);
            return labels.map((label) => (
              <Badge key={`${field.id}-${label}`} variant="secondary">
                {label}
              </Badge>
            ));
          })}
          <ActiveBonuses compiled={compiled} />
          <RollModeBar className="ml-auto max-md:hidden" />
        </div>
      </section>
      {/* Fora da seção: o desfoque dela prenderia a barra fixa dentro do painel. */}
      <ThumbBar
        bars={bars}
        conditions={conditions}
        resourceValue={resourceValue}
        resourceMax={resourceMax}
        values={values}
        pages={codexPages}
        onChange={onChange}
      />
    </>
  );
}

/** Dados da rolagem rápida da barra do celular. */
const QUICK_DICE = ['1d20', '1d12', '1d10', '1d8', '1d6', '1d4'] as const;
const NEXT_MODE: Record<RollMode, RollMode> = {
  normal: 'vantagem',
  vantagem: 'desvantagem',
  desvantagem: 'normal',
};
const MODE_SHORT: Record<RollMode, string> = {
  normal: 'Normal',
  vantagem: 'Vant.',
  desvantagem: 'Desv.',
};

/**
 * No celular, o que mais se usa no jogo fica embaixo, ao alcance do polegar: os primeiros
 * recursos (dano e cura), as condições, uma rolagem rápida e a vantagem. Reserva a altura
 * em `--barra-polegar`, para o chat e a música subirem acima dela.
 */
function ThumbBar({
  bars,
  conditions,
  resourceValue,
  resourceMax,
  values,
  pages,
  onChange,
}: {
  bars: readonly FieldOf<'resource'>[];
  conditions: FieldOf<'select'> | undefined;
  resourceValue: (field: FieldOf<'resource'>) => ResourceValue;
  resourceMax: (field: FieldOf<'resource'>, value: ResourceValue) => number | undefined;
  values: SheetValues;
  pages: readonly CodexPage[];
  onChange: (fieldId: string, value: FieldValue) => void;
}) {
  const roller = useContext(RollContext);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const root = document.documentElement;
    const element = ref.current;
    if (!element) return;
    const update = () => root.style.setProperty('--barra-polegar', `${element.offsetHeight}px`);
    const observer = new ResizeObserver(update);
    observer.observe(element);
    update();
    return () => {
      observer.disconnect();
      root.style.removeProperty('--barra-polegar');
    };
  }, []);
  const shown = bars.slice(0, 2);
  const active = conditions ? selected(conditions, values[conditions.id]) : [];
  const modes = roller && supportsRollMode(roller.checkDice);
  const slot =
    'flex h-12 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-md px-1 text-[11px] leading-tight hover:bg-muted';
  return (
    <div
      ref={ref}
      role="toolbar"
      aria-label="Ações rápidas"
      className="bg-background/95 fixed inset-x-0 bottom-0 z-30 flex gap-1 border-t px-2 pt-1 pb-[max(0.25rem,env(safe-area-inset-bottom))] backdrop-blur md:hidden print:hidden"
    >
      {shown.map((field) => {
        const value = resourceValue(field);
        const max = resourceMax(field, value);
        const percent = max && max > 0 ? (value.current / max) * 100 : 100;
        return (
          <Popover key={field.id}>
            <PopoverTrigger asChild>
              <button type="button" className={slot} aria-label={`${field.label}: ajustar`}>
                <span className="text-muted-foreground max-w-full truncate">{field.label}</span>
                <span
                  className={cn(
                    'text-sm font-semibold tabular-nums',
                    percent <= 25 ? 'text-red-500' : percent <= 50 && 'text-amber-500',
                  )}
                >
                  {formatNumber(value.current)}
                  {max !== undefined && (
                    <span className="text-muted-foreground font-normal">/{formatNumber(max)}</span>
                  )}
                </span>
              </button>
            </PopoverTrigger>
            <PopoverContent side="top" align="start" className="w-[min(22rem,calc(100vw-1rem))]">
              <ResourceVital
                field={field}
                value={value}
                max={max}
                onChange={(next) => onChange(field.id, next)}
              />
            </PopoverContent>
          </Popover>
        );
      })}
      {conditions && (
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              className={slot}
              aria-label={`${conditions.label}: ${active.length}`}
            >
              <TagIcon className="size-4" />
              <span className="max-w-full truncate">
                {conditions.label}
                {active.length > 0 && <span className="text-primary"> {active.length}</span>}
              </span>
            </button>
          </PopoverTrigger>
          <PopoverContent side="top" className="w-[min(22rem,calc(100vw-1rem))] space-y-2">
            <MultiSelectVital
              field={conditions}
              value={values[conditions.id]}
              pages={pages}
              onChange={(next) => onChange(conditions.id, next)}
            />
            <PrimitiveInput
              field={conditions}
              label={conditions.label}
              value={active}
              onChange={(next) => onChange(conditions.id, next as FieldValue)}
            />
          </PopoverContent>
        </Popover>
      )}
      {roller && (
        <Popover>
          <PopoverTrigger asChild>
            <button type="button" className={slot} aria-label="Rolar dados">
              <DicesIcon className="size-4" />
              <span>Rolar</span>
            </button>
          </PopoverTrigger>
          <PopoverContent side="top" align="end" className="w-auto">
            <div className="grid grid-cols-3 gap-1" role="group" aria-label="Rolagem rápida">
              {QUICK_DICE.map((dice) => (
                <Button
                  key={dice}
                  type="button"
                  variant="outline"
                  className="h-11 font-mono"
                  onClick={() => roller.roll(dice.slice(1), dice)}
                >
                  {dice.slice(1)}
                </Button>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      )}
      {modes && (
        <button
          type="button"
          className={cn(slot, roller.mode !== 'normal' && 'text-primary')}
          aria-label={`Próximo teste: ${roller.mode}. Trocar`}
          onClick={() => roller.setMode(NEXT_MODE[roller.mode])}
        >
          <ChevronsUpDownIcon className="size-4" />
          <span>{MODE_SHORT[roller.mode]}</span>
        </button>
      )}
    </div>
  );
}

/**
 * Bônus ativos (itens, maldições, bênçãos) à vista junto das condições: o campo e o total,
 * verde quando ajuda e vermelho quando atrapalha; de onde vem cada parte, ao passar o mouse.
 */
function ActiveBonuses({ compiled }: { compiled: CompiledTemplate }) {
  const effects = useContext(BonusContext);
  if (effects.size === 0) return null;
  return (
    <span className="flex flex-wrap gap-1" aria-label="Bônus ativos">
      {[...effects].map(([fieldId, effect]) => {
        const field = compiled.fieldsById.get(fieldId);
        if (!field || effect.total === 0) return null;
        const sign = effect.total > 0 ? '+' : '−';
        return (
          <Badge
            key={fieldId}
            variant="outline"
            className={cn(
              'font-normal tabular-nums',
              effect.total > 0
                ? 'border-emerald-500/40 text-emerald-700 dark:text-emerald-300'
                : 'border-red-500/40 text-red-700 dark:text-red-300',
            )}
            title={effect.sources
              .map((source) => `${source.name}: ${source.value > 0 ? '+' : ''}${source.value}`)
              .join(' · ')}
          >
            {field.label} {sign}
            {Math.abs(effect.total)}
          </Badge>
        );
      })}
    </span>
  );
}
