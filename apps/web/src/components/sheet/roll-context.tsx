import {
  checkExpression,
  criticalDamage,
  listItemValue,
  parseDice,
  supportsRollMode,
  type CustomDie,
  type RollMode,
  type FieldOf,
  type ListItem,
} from '@tabula/domain';
import { DicesIcon, SwordIcon, SwordsIcon } from 'lucide-react';
import { createContext, useContext } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/** Uma rolagem de um grupo. `critical`: a expressão no lugar desta se a primeira for crítico. */
export interface GroupRoll {
  name: string;
  expression: string;
  critical?: string | undefined;
}

/** Quem rola os dados da ficha (a sessão ao vivo, ou só um aviso fora dela). */
export interface Roller {
  roll: (label: string, expression: string) => void;
  /**
   * Várias rolagens de uma vez, num aviso só (ex.: "Espada longa": ataque e dano). Cada uma
   * entra no registro como "<title>: <name>".
   */
  rollAll: (title: string, rolls: readonly GroupRoll[]) => void;
  /** Dado dos testes do sistema ("1d20", "2d12"…). */
  checkDice: string;
  /** Como sai o próximo teste ou ataque; volta a "normal" depois dele. */
  mode: RollMode;
  setMode: (mode: RollMode) => void;
  /** Quantos dados o teste do campo rola (ex.: o atributo); sem isso, um. */
  checkCount?: ((fieldId: string) => number | undefined) | undefined;
  /** Dados do sistema (`4dF`), aceitos nas expressões. */
  dice?: readonly CustomDie[] | undefined;
}

/** Sem provedor, a ficha não mostra botões de rolar (ex.: cards resumidos). */
export const RollContext = createContext<Roller | null>(null);

/** Botão de rolar uma expressão de dados. Some se a expressão for inválida. */
export function RollButton({ label, expression }: { label: string; expression: string }) {
  const roller = useContext(RollContext);
  if (!roller || !parseDice(expression, roller.dice).ok) return null;
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="shrink-0"
      aria-label={`Rolar ${label}`}
      title={`Rolar ${expression}`}
      onClick={() => roller.roll(label, expression)}
    >
      <DicesIcon />
    </Button>
  );
}

/** Botão de teste: o dado do sistema mais o modificador (ex.: 1d20+5), com vantagem se escolhida. */
export function CheckButton({
  label,
  modifier,
  fieldId,
}: {
  label: string;
  modifier: number;
  /** O campo do teste: o sistema pode rolar vários dados por ele (`checkDiceFrom`). */
  fieldId?: string | undefined;
}) {
  const roller = useContext(RollContext);
  if (!roller) return null;
  const count = fieldId === undefined ? undefined : roller.checkCount?.(fieldId);
  const expression = checkExpression(roller.checkDice, modifier, roller.mode, count);
  if (!parseDice(expression, roller.dice).ok) return null;
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className={cn('shrink-0', roller.mode !== 'normal' && 'text-primary')}
      aria-label={`Rolar ${label}`}
      title={`Rolar ${expression}`}
      onClick={() => {
        roller.roll(label, expression);
        roller.setMode('normal');
      }}
    >
      <DicesIcon />
    </Button>
  );
}

/** No celular, só o começo do nome aparece ("Vant"); o leitor de tela lê o nome inteiro. */
const MODES: readonly { mode: RollMode; label: string; rest: string; hint: string }[] = [
  { mode: 'normal', label: 'Normal', rest: '', hint: 'Um dado' },
  { mode: 'vantagem', label: 'Vant', rest: 'agem', hint: 'Dois dados, fica o maior' },
  { mode: 'desvantagem', label: 'Desv', rest: 'antagem', hint: 'Dois dados, fica o menor' },
];

/**
 * Vantagem ou desvantagem no próximo teste ou ataque da ficha. Só aparece quando o sistema
 * rola os testes com um dado só ("1d20").
 */
export function RollModeBar({ className }: { className?: string | undefined }) {
  const roller = useContext(RollContext);
  if (!roller || !supportsRollMode(roller.checkDice)) return null;
  return (
    <div
      role="group"
      aria-label="Próximo teste ou ataque"
      title="Vale para o próximo teste ou ataque"
      className={cn('bg-muted/50 flex shrink-0 items-center gap-0.5 rounded-md p-0.5', className)}
    >
      {MODES.map(({ mode, label, rest, hint }) => (
        <Button
          key={mode}
          type="button"
          size="sm"
          variant={roller.mode === mode ? (mode === 'normal' ? 'secondary' : 'default') : 'ghost'}
          aria-pressed={roller.mode === mode}
          title={hint}
          className="h-7 gap-0 px-1.5 text-xs sm:px-2"
          onClick={() => roller.setMode(mode)}
        >
          {label}
          {rest && <span className="max-sm:sr-only">{rest}</span>}
        </Button>
      ))}
    </div>
  );
}

/**
 * Botões de ataque de um item de uma lista de ataques (`attack` no sistema): "Ataque" rola o
 * dado dos testes + o bônus; "Ataque + dano" rola os dois, num aviso só.
 */
export function AttackButtons({
  field,
  item,
  name,
}: {
  field: FieldOf<'list'>;
  item: ListItem;
  /** Nome do item (ex.: "Espada longa"), para o registro e o aviso. */
  name: string;
}) {
  const roller = useContext(RollContext);
  const attack = field.attack;
  if (!roller || !attack) return null;
  const bonusField = field.itemFields.find((f) => f.id === attack.bonus);
  const damageField = field.itemFields.find((f) => f.id === attack.damage);
  const bonus = bonusField ? Number(listItemValue(bonusField, item)) || 0 : 0;
  const hit = checkExpression(roller.checkDice, bonus, roller.mode);
  const damage = damageField ? String(listItemValue(damageField, item) ?? '') : '';
  const hasDamage = damage.trim() !== '' && parseDice(damage, roller.dice).ok;
  return (
    <div className="flex shrink-0 gap-1">
      <Button
        type="button"
        variant="outline"
        size="sm"
        className={cn('h-8', roller.mode !== 'normal' && 'border-primary text-primary')}
        aria-label={`Atacar com ${name}`}
        title={`Rolar ${hit}`}
        onClick={() => {
          roller.rollAll(name, [{ name: 'ataque', expression: hit }]);
          roller.setMode('normal');
        }}
      >
        <SwordIcon /> Ataque
      </Button>
      {hasDamage && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={cn('h-8', roller.mode !== 'normal' && 'border-primary text-primary')}
          aria-label={`Atacar com ${name} e rolar o dano`}
          title={`Rolar ${hit} e ${damage}`}
          onClick={() => {
            roller.rollAll(name, [
              { name: 'ataque', expression: hit },
              {
                name: 'dano',
                expression: damage,
                // Crítico (o 20 natural no d20): o dobro de dados no dano.
                ...(supportsRollMode(roller.checkDice) && {
                  critical: criticalDamage(damage, roller.dice),
                }),
              },
            ]);
            roller.setMode('normal');
          }}
        >
          <SwordsIcon /> Ataque + dano
        </Button>
      )}
    </div>
  );
}
