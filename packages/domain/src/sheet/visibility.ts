import type { CompiledTemplate } from '../template/compile';
import type { SheetValues } from './schema';
import { defaultValue } from './values';

/**
 * Campos escondidos pela condição (`visibleWhen`) com os valores atuais da ficha: a regra
 * opcional desligada some, e a que ela substitui aparece. O valor continua na ficha.
 */
export function conditionallyHidden(compiled: CompiledTemplate, values: SheetValues): Set<string> {
  const hidden = new Set<string>();
  for (const field of compiled.template.fields) {
    const when = field.visibleWhen;
    if (!when) continue;
    const target = compiled.fieldsById.get(when.field);
    if (!target) continue;
    const current = (values[target.id] ?? defaultValue(target)) === true;
    if (current !== when.value) hidden.add(field.id);
  }
  return hidden;
}
