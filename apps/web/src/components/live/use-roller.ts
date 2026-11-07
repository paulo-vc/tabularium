import { describeRoll, isCriticalRoll, type CompiledTemplate, type RollMode } from '@tabula/domain';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useServices } from '@/app/services-context';
import { useDiceTray } from './DiceTray';
import type { Roller } from '@/components/sheet/roll-context';

/**
 * Rolagens feitas pela ficha: entram no registro da sessão (se houver uma) e o resultado
 * aparece num aviso.
 */
export function useRoller(compiled: CompiledTemplate): Roller {
  const { session } = useServices();
  // Com os dados 3D, o resultado aparece na bandeja, à direita: sem aviso repetido.
  const { enabled: tray } = useDiceTray();
  const checkDice = compiled.template.checkDice ?? '1d20';
  const dice = compiled.template.dice;
  const [mode, setMode] = useState<RollMode>('normal');
  return useMemo(
    () => ({
      checkDice,
      dice,
      mode,
      setMode,
      roll: (label, expression) => {
        void session.roll({ label, expression, dice }).then((result) => {
          if (result.ok) {
            if (tray) return;
            toast(`${label}: ${result.value.result.total}`, {
              description: describeRoll(result.value.result),
            });
          } else {
            toast.error('Não foi possível rolar', { description: result.error.message });
          }
        });
      },
      rollAll: (title, rolls) => {
        void (async () => {
          const results = [];
          let critical = false;
          for (const [index, roll] of rolls.entries()) {
            // No crítico da primeira (o 20 natural do ataque), as seguintes rolam o dobro de dados.
            const crit = critical && roll.critical !== undefined;
            const name = crit ? `${roll.name} crítico` : roll.name;
            const result = await session.roll({
              label: `${title}: ${name}`,
              expression: crit ? (roll.critical ?? roll.expression) : roll.expression,
              dice,
            });
            if (!result.ok) {
              toast.error('Não foi possível rolar', { description: result.error.message });
              return;
            }
            if (index === 0) critical = isCriticalRoll(result.value.result);
            results.push({ name, entry: result.value });
          }
          if (tray) return;
          // "Espada longa: ataque 17 · dano 9", com a conta de cada um embaixo.
          toast(
            `${title}: ${results.map((r) => `${r.name} ${r.entry.result.total}`).join(' · ')}`,
            {
              description: results.map((r) => describeRoll(r.entry.result)).join(' | '),
            },
          );
        })();
      },
    }),
    [session, checkDice, dice, tray, mode],
  );
}
