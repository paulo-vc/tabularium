import type { CompiledTemplate } from '../template/compile';
import type { DerivedValues } from './compute';
import type { SheetValues } from './schema';

/**
 * Quantos dados o teste de um campo rola (`checkDiceFrom`): o valor do campo de origem na
 * ficha, ou `undefined` (um dado só, como de costume).
 */
export function checkDiceCount(
  compiled: CompiledTemplate,
  values: SheetValues,
  derived: DerivedValues,
  fieldId: string,
): number | undefined {
  const field = compiled.fieldsById.get(fieldId);
  if (field?.type !== 'computed' || field.checkDiceFrom === undefined) return undefined;
  const source = compiled.fieldsById.get(field.checkDiceFrom);
  if (source?.type === 'computed') {
    const result = derived.computed[source.id];
    return result?.ok ? result.value : undefined;
  }
  if (source?.type === 'number') {
    const value = values[source.id] ?? source.default ?? 0;
    return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
  }
  return undefined;
}
