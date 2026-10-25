import { NUMERIC_FIELD_TYPES, NUMERIC_ITEM_FIELD_TYPES, type FieldDef } from '@tabula/domain';
import { useRef } from 'react';
import { Textarea } from '@/components/ui/textarea';

const isNumeric = (field: FieldDef) =>
  (NUMERIC_FIELD_TYPES as readonly string[]).includes(field.type);

/** Referências que podem entrar numa fórmula, para inserir com um clique. */
function references(fields: readonly FieldDef[], selfId: string): string[] {
  return fields.flatMap((field) => {
    if (field.id === selfId) return [];
    if (field.type === 'list') {
      return field.itemFields
        .filter((item) => (NUMERIC_ITEM_FIELD_TYPES as readonly string[]).includes(item.type))
        .map((item) => `sum(@${field.key}.${item.key})`)
        .concat(`count(@${field.key})`);
    }
    if (!isNumeric(field)) return [];
    return field.type === 'resource' ? [`@${field.key}`, `@${field.key}.max`] : [`@${field.key}`];
  });
}

/**
 * Fórmulas prontas para os casos mais comuns. `A` e `B` viram os primeiros campos do sistema
 * (ex.: `@for`), para o exemplo já sair perto do que se quer.
 */
const EXAMPLES: { name: string; formula: string }[] = [
  { name: 'Modificador (d20)', formula: 'floor((A - 10) / 2)' },
  { name: 'Soma de dois', formula: 'A + B' },
  { name: 'Soma se marcado', formula: 'A + if(B, 2, 0)' },
  { name: 'Cresce com o nível', formula: 'ceil(A / 4) + 1' },
  { name: 'Metade, para cima', formula: 'ceil(A / 2)' },
  { name: 'Nunca abaixo de 0', formula: 'max(0, A)' },
];

export function FormulaInput({
  id,
  value,
  onChange,
  fields,
  selfId,
  invalid,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  fields: readonly FieldDef[];
  selfId: string;
  invalid: boolean;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  /** Insere no cursor (ou no fim) e devolve o foco ao campo. */
  const insert = (text: string) => {
    const element = ref.current;
    const start = element?.selectionStart ?? value.length;
    const end = element?.selectionEnd ?? value.length;
    const before = value.slice(0, start);
    const spacer = before && !/[\s(]$/.test(before) ? ' ' : '';
    const next = `${before}${spacer}${text}${value.slice(end)}`;
    onChange(next);
    requestAnimationFrame(() => {
      const caret = start + spacer.length + text.length;
      element?.focus();
      element?.setSelectionRange(caret, caret);
    });
  };

  const available = references(fields, selfId);
  const fill = (formula: string) =>
    formula
      .replace(/\bA\b/g, available[0] ?? '@valor')
      .replace(/\bB\b/g, available[1] ?? available[0] ?? '@outro');

  return (
    <div className="space-y-2">
      <Textarea
        id={id}
        ref={ref}
        value={value}
        rows={2}
        spellCheck={false}
        aria-invalid={invalid}
        className="font-mono text-sm"
        onChange={(event) => onChange(event.target.value)}
      />
      {available.length > 0 && (
        <div className="space-y-1">
          <p className="text-muted-foreground text-xs">Clique para inserir:</p>
          <div className="flex max-h-28 flex-wrap gap-1 overflow-y-auto">
            {available.map((reference) => (
              <button
                key={reference}
                type="button"
                className="bg-muted hover:bg-accent rounded px-1.5 py-0.5 font-mono text-xs"
                onClick={() => insert(reference)}
              >
                {reference}
              </button>
            ))}
          </div>
        </div>
      )}
      <div className="space-y-1">
        <p className="text-muted-foreground text-xs">Exemplos (clique para usar e ajuste):</p>
        <div className="flex flex-wrap gap-1">
          {EXAMPLES.map((example) => {
            const formula = fill(example.formula);
            return (
              <button
                key={example.name}
                type="button"
                title={formula}
                className="hover:bg-accent rounded border px-1.5 py-0.5 text-xs"
                onClick={() => {
                  onChange(formula);
                  requestAnimationFrame(() => ref.current?.focus());
                }}
              >
                {example.name}
              </button>
            );
          })}
        </div>
      </div>
      <details className="text-muted-foreground text-xs">
        <summary className="cursor-pointer">Como escrever fórmulas</summary>
        <ul className="mt-1 list-disc space-y-0.5 pl-4">
          <li>
            <code>+ - * / %</code>, parênteses e comparações (<code>{'>= == !='}</code>, valem 1 ou
            0).
          </li>
          <li>
            <code>floor</code>, <code>ceil</code>, <code>round</code>, <code>abs</code>,{' '}
            <code>min</code>, <code>max</code>, <code>clamp(x, mín, máx)</code>.
          </li>
          <li>
            <code>if(condição, se sim, se não)</code>. Ex.: <code>if(@nivel &gt;= 5, 3, 2)</code>.
          </li>
          <li>
            Listas: <code>sum(@itens.peso * @itens.qtd)</code>, <code>count(@itens)</code>.
          </li>
          <li>
            Escolhas: <code>is(@condicoes, &quot;caido&quot;)</code> vale 1 se a opção estiver
            marcada.
          </li>
          <li>
            Modificador de D&amp;D: <code>floor((@for - 10) / 2)</code>.
          </li>
        </ul>
      </details>
    </div>
  );
}
