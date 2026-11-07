import type { CompiledTemplate } from '../template/compile';
import type { FieldDef, FieldOf, RestKind, RestRecovery } from '../template/schema';
import type { DerivedValues } from './compute';
import type { FieldValue, ResourceValue, SheetValues } from './schema';
import { defaultValue } from './values';

/** O que um descanso muda num campo: de quanto para quanto, e o valor novo para gravar. */
export interface RestChange {
  fieldId: string;
  label: string;
  from: number;
  to: number;
  value: FieldValue;
}

/** O campo recupera neste descanso? O que volta no curto também volta no longo. */
const appliesTo = (recover: RestRecovery | undefined, rest: RestKind) =>
  recover !== undefined && (recover.rest === 'curto' || rest === 'longo');

const finite = (value: unknown): number | undefined =>
  typeof value === 'number' && Number.isFinite(value) ? value : undefined;

/** Os campos que o sistema faz recuperar neste descanso (para mostrar o botão só se houver). */
export function restFields(compiled: CompiledTemplate, rest: RestKind): FieldDef[] {
  return compiled.template.fields.filter(
    (field) =>
      (field.type === 'number' || field.type === 'resource') && appliesTo(field.recover, rest),
  );
}

function resourceChange(
  field: FieldOf<'resource'>,
  values: SheetValues,
  derived: DerivedValues,
): RestChange | null {
  const value = (values[field.id] ?? defaultValue(field)) as ResourceValue;
  const computed = derived.resourceMax[field.id];
  const max =
    field.max === undefined ? finite(value.max) : computed?.ok ? computed.value : undefined;
  if (max === undefined) return null;
  const amount = field.recover?.amount ?? 'tudo';
  const from = value.current;
  // Acima do máximo (regra da casa, efeito temporário), o descanso não mexe.
  if (from >= max && amount !== 'tudo') return null;
  const to =
    amount === 'tudo'
      ? Math.max(from, max)
      : Math.min(
          max,
          Math.max(0, from + (amount === 'metade' ? Math.max(1, Math.floor(max / 2)) : amount)),
        );
  if (to === from) return null;
  return { fieldId: field.id, label: field.label, from, to, value: { ...value, current: to } };
}

function numberChange(field: FieldOf<'number'>, values: SheetValues): RestChange | null {
  const from = finite(values[field.id]) ?? field.default ?? 0;
  const amount = field.recover?.amount ?? 'tudo';
  let to = typeof amount === 'number' ? from + amount : (field.default ?? 0);
  if (typeof amount === 'number') {
    if (field.min !== undefined) to = Math.max(field.min, to);
    if (field.max !== undefined) to = Math.min(field.max, to);
  }
  return to === from ? null : { fieldId: field.id, label: field.label, from, to, value: to };
}

/**
 * O que muda na ficha com um descanso: cada número ou recurso marcado com `recover` volta
 * como o sistema manda. Só entram os que mudam de fato.
 */
export function restChanges(
  compiled: CompiledTemplate,
  values: SheetValues,
  derived: DerivedValues,
  rest: RestKind,
): RestChange[] {
  const changes: RestChange[] = [];
  for (const field of restFields(compiled, rest)) {
    const change =
      field.type === 'resource'
        ? resourceChange(field, values, derived)
        : field.type === 'number'
          ? numberChange(field, values)
          : null;
    if (change) changes.push(change);
  }
  return changes;
}
