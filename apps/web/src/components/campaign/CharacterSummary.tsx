import {
  defaultValue,
  type CharacterSheet,
  type CompiledTemplate,
  type DerivedValues,
  type FieldOf,
  type ResourceValue,
} from '@tabula/domain';
import { CharacterPortrait } from '@/components/sheet/Portrait';
import { barColor, vitalFields } from '@/components/sheet/SheetVitals';
import { formatNumber } from '@/components/sheet/format';

/**
 * O personagem do jogador na campanha, de relance: retrato, nome e os recursos (PV,
 * Sanidade…) nas cores do sistema, como no painel da ficha, só para ler.
 */
export function CharacterSummary({
  sheet,
  compiled,
  derived,
}: {
  sheet: CharacterSheet;
  compiled: CompiledTemplate;
  derived: DerivedValues;
}) {
  const resources = vitalFields(compiled)
    .filter((field): field is FieldOf<'resource'> => field.type === 'resource')
    .slice(0, 3);
  return (
    <div className="flex items-center gap-4">
      <CharacterPortrait portrait={sheet.portrait} name={sheet.name} className="size-16 text-2xl" />
      <div className="min-w-0 flex-1 space-y-2">
        <p className="font-heading truncate text-2xl tracking-wide uppercase">{sheet.name}</p>
        {resources.map((field) => {
          const value = (sheet.values[field.id] ?? defaultValue(field)) as ResourceValue;
          const computed = derived.resourceMax[field.id];
          const max =
            field.max === undefined ? value.max : computed?.ok ? computed.value : undefined;
          const percent =
            max && max > 0 ? Math.max(0, Math.min(100, (value.current / max) * 100)) : 0;
          return (
            <div key={field.id} className="flex items-center gap-2 text-xs">
              <span className="text-muted-foreground w-32 truncate uppercase" title={field.label}>
                {field.label}
              </span>
              <div
                role="meter"
                aria-label={`${field.label}: ${formatNumber(value.current)}${max !== undefined ? ` de ${formatNumber(max)}` : ''}`}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(percent)}
                className="bg-muted relative h-4 flex-1 overflow-hidden rounded"
              >
                <div
                  className="absolute inset-0 origin-left"
                  style={{
                    transform: `scaleX(${percent / 100})`,
                    background: barColor(field.color, percent),
                  }}
                />
              </div>
              <span className="w-14 text-right font-mono tabular-nums">
                {formatNumber(value.current)}
                {max !== undefined && (
                  <span className="text-muted-foreground">/{formatNumber(max)}</span>
                )}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
