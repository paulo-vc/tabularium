import {
  BONUS_KIND_LABELS,
  bonusEffects,
  defaultValue,
  listItemValue,
  type BonusEffect,
  type CharacterSheet,
  type CompiledTemplate,
  type DerivedValues,
  type FieldDef,
  type FieldValue,
  type LayoutNode,
  type ListItem,
  type ListItemFieldDef,
  type ResourceValue,
} from '@tabula/domain';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { formatNumber } from './format';
import { groupTabs } from './SheetLayout';

type SectionNode = Extract<LayoutNode, { kind: 'section' }>;

const signed = (value: number) => (value > 0 ? `+${value}` : String(value));

/** Bolinhas de marcadores (testes contra a morte, espaços de magia): ●●○. */
function Dots({ filled, total }: { filled: number; total: number }) {
  if (total <= 0) return <>—</>;
  return (
    <span aria-label={`${filled} de ${total}`} className="tracking-widest">
      {'●'.repeat(Math.max(0, Math.min(filled, total)))}
      {'○'.repeat(Math.max(0, total - filled))}
    </span>
  );
}

/** Texto de um valor simples (também de itens de lista). */
function primitiveText(field: FieldDef | ListItemFieldDef, value: FieldValue | undefined): string {
  switch (field.type) {
    case 'boolean':
      return value === true ? '●' : '○';
    case 'select': {
      const selected = Array.isArray(value) ? value : value ? [value] : [];
      return field.options
        .filter((option) => (selected as unknown[]).includes(option.value))
        .map((option) => option.label)
        .join(', ');
    }
    case 'number':
      return typeof value === 'number' ? formatNumber(value) : '';
    default:
      return typeof value === 'string' ? value : '';
  }
}

interface Context {
  compiled: CompiledTemplate;
  values: CharacterSheet['values'];
  derived: DerivedValues;
  effects: ReadonlyMap<string, BonusEffect>;
  hidden: ReadonlySet<string>;
}

/** O valor de um campo da ficha, pronto para o papel. */
function FieldValueText({ field, ctx }: { field: FieldDef; ctx: Context }): ReactNode {
  const value = ctx.values[field.id] ?? defaultValue(field);
  const effect = ctx.effects.get(field.id);
  switch (field.type) {
    case 'computed': {
      const result = ctx.derived.computed[field.id];
      return result?.ok ? formatNumber(result.value, field.signed) : '—';
    }
    case 'number': {
      if (typeof value !== 'number') return '—';
      if (field.display === 'marcadores' && field.max !== undefined) {
        return <Dots filled={value} total={field.max} />;
      }
      if (!effect) return formatNumber(value);
      // O valor final, com a base e o bônus ao lado: "12 (10 +2)".
      return (
        <>
          {formatNumber(value + effect.total)}
          <span className="ml-1 text-[10px] font-normal text-zinc-500">
            ({formatNumber(value)} {signed(effect.total)})
          </span>
        </>
      );
    }
    case 'resource': {
      const resource = value as ResourceValue;
      const formula = ctx.derived.resourceMax[field.id];
      const max =
        field.max !== undefined ? (formula?.ok ? formula.value : undefined) : resource.max;
      if (field.display === 'marcadores' && max !== undefined) {
        return <Dots filled={resource.current} total={max} />;
      }
      return (
        <>
          {formatNumber(resource.current)}
          {max !== undefined && <span className="text-zinc-500"> / {formatNumber(max)}</span>}
          {resource.temp ? <span className="text-zinc-500"> (+{resource.temp} temp.)</span> : null}
        </>
      );
    }
    case 'list':
      return null; // listas viram tabela (ver `ListTable`)
    default:
      return primitiveText(field, value) || '—';
  }
}

/** Uma lista como tabela; textos longos ficam numa linha própria, embaixo do item. */
function ListTable({ field, ctx }: { field: Extract<FieldDef, { type: 'list' }>; ctx: Context }) {
  const items = (ctx.values[field.id] ?? []) as ListItem[];
  if (items.length === 0) return <p className="text-zinc-400 italic">Nenhum item.</p>;
  const inline = field.itemFields.filter((f) => f.type !== 'longtext');
  const long = field.itemFields.filter((f) => f.type === 'longtext');
  return (
    <table className="w-full border-collapse text-left">
      <thead>
        <tr>
          {inline.map((f) => (
            <th
              key={f.id}
              className="border-b border-zinc-300 py-1 pr-2 text-[10px] font-medium uppercase text-zinc-500"
            >
              {f.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {items.flatMap((item) => {
          const rows = [
            <tr key={item.id} className="align-top">
              {inline.map((f) => (
                <td key={f.id} className="border-b border-zinc-200 py-1 pr-2">
                  {primitiveText(f, listItemValue(f, item))}
                </td>
              ))}
            </tr>,
          ];
          const texts = long
            .map((f) => ({ field: f, text: String(listItemValue(f, item) ?? '').trim() }))
            .filter((t) => t.text);
          if (texts.length > 0) {
            rows.push(
              <tr key={`${item.id}-texto`}>
                <td
                  colSpan={inline.length}
                  className="border-b border-zinc-200 pb-1.5 text-zinc-600 whitespace-pre-wrap"
                >
                  {texts.map((t) => t.text).join('\n')}
                </td>
              </tr>,
            );
          }
          return rows;
        })}
      </tbody>
    </table>
  );
}

const COLUMNS: Record<number, string> = {
  1: 'grid-cols-1',
  2: 'grid-cols-2',
  3: 'grid-cols-3',
  4: 'grid-cols-4',
};

function Section({ section, ctx, depth }: { section: SectionNode; ctx: Context; depth: number }) {
  const fieldOf = (id: string | undefined) =>
    id === undefined || ctx.hidden.has(id) ? undefined : ctx.compiled.fieldsById.get(id);
  const nodes = section.children.filter(
    (node) => node.kind === 'section' || fieldOf(node.fieldId) !== undefined,
  );
  if (nodes.length === 0) return null;
  const Title = depth === 0 ? 'h3' : 'h4';

  const cell = (node: Extract<LayoutNode, { kind: 'field' }>) => {
    const field = fieldOf(node.fieldId);
    if (!field) return null;
    const secondary = fieldOf(node.secondary);
    if (field.type === 'list') {
      return (
        <div key={field.id} className="col-span-full">
          {nodes.length > 1 && (
            <p className="mb-0.5 text-[10px] font-medium uppercase text-zinc-500">{field.label}</p>
          )}
          <ListTable field={field} ctx={ctx} />
        </div>
      );
    }
    if (field.type === 'longtext') {
      const text = String(ctx.values[field.id] ?? '').trim();
      return (
        <div key={field.id} className="col-span-full">
          <p className="text-[10px] font-medium uppercase text-zinc-500">{field.label}</p>
          {text ? (
            <p className="whitespace-pre-wrap">{text}</p>
          ) : (
            // No papel, um texto vazio vira linhas para escrever à mão.
            <div aria-hidden className="space-y-4 pt-3">
              <div className="border-b border-zinc-300" />
              <div className="border-b border-zinc-300" />
            </div>
          )}
        </div>
      );
    }
    if (section.display === 'compacto') {
      return (
        <div key={field.id} className="rounded border border-zinc-300 px-1 py-1 text-center">
          <p className="text-[9px] font-medium uppercase text-zinc-500">
            {secondary?.label ?? field.label}
          </p>
          <p className="text-base font-semibold">
            <FieldValueText field={field} ctx={ctx} />
          </p>
          {secondary && (
            <p className="text-[11px] text-zinc-600">
              <FieldValueText field={secondary} ctx={ctx} />
            </p>
          )}
        </div>
      );
    }
    return (
      <div key={field.id} className="flex flex-col">
        <span className="text-[10px] font-medium uppercase text-zinc-500">{field.label}</span>
        <span className="font-semibold tabular-nums">
          <FieldValueText field={field} ctx={ctx} />
          {secondary && (
            <span className="ml-1 font-normal text-zinc-500">
              (<FieldValueText field={secondary} ctx={ctx} />)
            </span>
          )}
        </span>
      </div>
    );
  };

  // Linhas (perícias, resistências): cada `columns` campos formam uma linha, como na tela.
  // Marcadores de sim/não (proficiente, especialista) viram bolinhas antes do nome.
  if (section.display === 'linhas') {
    const rows: FieldDef[][] = [];
    let row: FieldDef[] = [];
    let positions = 0;
    const nested: SectionNode[] = [];
    for (const node of section.children) {
      if (node.kind === 'section') {
        nested.push(node);
        continue;
      }
      const field = fieldOf(node.fieldId);
      if (field) row.push(field);
      if (++positions === section.columns) {
        if (row.length > 0) rows.push(row);
        row = [];
        positions = 0;
      }
    }
    if (row.length > 0) rows.push(row);
    return (
      <section className="space-y-1">
        <Title className={cn('font-semibold text-zinc-800', depth === 0 ? 'text-sm' : 'text-xs')}>
          {section.title}
        </Title>
        <div className="columns-2 gap-6">
          {rows.map((cells) => {
            const marks = cells.filter((f) => f.type === 'boolean');
            const values = cells.filter((f) => f.type !== 'boolean');
            const main = values[0] ?? marks[0];
            if (!main) return null;
            return (
              <div
                key={cells.map((f) => f.id).join('-')}
                className="flex break-inside-avoid items-baseline gap-2 border-b border-dotted border-zinc-300 py-0.5"
              >
                {marks.length > 0 && (
                  <span
                    className="text-[10px] tracking-wider"
                    title={marks.map((m) => m.label).join(', ')}
                  >
                    {marks.map((m) => (ctx.values[m.id] === true ? '●' : '○')).join('')}
                  </span>
                )}
                <span className="min-w-0 flex-1 truncate text-zinc-700">{main.label}</span>
                {values.map((f) => (
                  <span key={f.id} className="font-semibold tabular-nums">
                    <FieldValueText field={f} ctx={ctx} />
                  </span>
                ))}
              </div>
            );
          })}
        </div>
        {nested.map((node, index) => (
          <Section key={index} section={node} ctx={ctx} depth={depth + 1} />
        ))}
      </section>
    );
  }

  // No papel, até três colunas (os blocos compactos, até seis).
  const columns = Math.min(section.columns, section.display === 'compacto' ? 6 : 3);
  return (
    <section className="break-inside-avoid space-y-1">
      <Title className={cn('font-semibold text-zinc-800', depth === 0 ? 'text-sm' : 'text-xs')}>
        {section.title}
      </Title>
      <div
        className={cn(
          'grid gap-x-4 gap-y-2',
          section.display === 'compacto' ? 'grid-cols-6 gap-2' : COLUMNS[columns],
        )}
      >
        {nodes.map((node, index) =>
          node.kind === 'section' ? (
            <div key={index} className="col-span-full">
              <Section section={node} ctx={ctx} depth={depth + 1} />
            </div>
          ) : (
            cell(node)
          ),
        )}
      </div>
    </section>
  );
}

/**
 * A ficha para o papel (ou PDF): todas as abas em sequência, só leitura, com cores fixas
 * (sai igual com o app no tema escuro). Valores com bônus mostram a base ao lado.
 */
export function PrintSheet({
  compiled,
  sheet,
  derived,
  hidden,
}: {
  compiled: CompiledTemplate;
  sheet: CharacterSheet;
  derived: DerivedValues;
  hidden: ReadonlySet<string>;
}) {
  const ctx: Context = {
    compiled,
    values: sheet.values,
    derived,
    effects: bonusEffects(sheet.bonuses),
    hidden,
  };
  const tabs = groupTabs(compiled.template.layouts.full);
  const active = (sheet.bonuses ?? []).filter((b) => b.active);
  const labelOf = (id: string) => compiled.fieldsById.get(id)?.label ?? id;
  return (
    <article
      aria-label={`Ficha de ${sheet.name} para imprimir`}
      className="mx-auto max-w-[210mm] space-y-4 bg-white p-8 text-[12px] leading-snug text-zinc-900 shadow-lg print:max-w-none print:p-0 print:shadow-none"
    >
      <header className="flex items-center gap-4 border-b-2 border-zinc-800 pb-3">
        {sheet.portrait && (
          <img
            src={sheet.portrait.src}
            alt=""
            className="size-16 rounded-full object-cover object-top"
          />
        )}
        <div>
          <h1 className="font-brand text-2xl font-semibold">{sheet.name}</h1>
          <p className="text-zinc-500">{compiled.template.name}</p>
        </div>
      </header>

      {tabs.map((tab) => (
        <div key={tab.name} className="space-y-3">
          {tabs.length > 1 && (
            <h2 className="border-b border-zinc-300 pb-0.5 text-[11px] font-semibold tracking-widest text-zinc-500 uppercase">
              {tab.name}
            </h2>
          )}
          {tab.nodes.map((node, index) =>
            node.kind === 'section' ? (
              <Section key={index} section={node} ctx={ctx} depth={0} />
            ) : null,
          )}
        </div>
      ))}

      {active.length > 0 && (
        <section className="break-inside-avoid space-y-1">
          <h3 className="text-sm font-semibold text-zinc-800">Bônus e efeitos</h3>
          <ul className="space-y-0.5">
            {active.map((bonus) => (
              <li key={bonus.id}>
                <span className="font-medium">{bonus.name}</span>{' '}
                <span className="text-zinc-500">
                  ({BONUS_KIND_LABELS[bonus.kind].toLowerCase()})
                </span>
                {': '}
                {bonus.targets.map((t) => `${labelOf(t.fieldId)} ${signed(t.value)}`).join(', ')}
              </li>
            ))}
          </ul>
        </section>
      )}
    </article>
  );
}
