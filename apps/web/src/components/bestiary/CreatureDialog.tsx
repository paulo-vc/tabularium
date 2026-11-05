import {
  CREATURE_ATTACK_LIMIT,
  CREATURE_HP_MAX,
  CREATURE_STAT_LIMIT,
  CreatureSchema,
  creatureProblems,
  type Creature,
  type CreatureAttack,
  type CustomDie,
} from '@tabula/domain';
import { PlusIcon, Trash2Icon } from 'lucide-react';
import { useId, useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

/**
 * Criar ou editar uma criatura (do bestiário do sistema, no editor, ou do da campanha). A
 * criatura só sai daqui válida: formato, iniciativa e rolagens dos ataques com os dados do
 * sistema. `onSave` pode recusar (devolve a mensagem).
 */
export function CreatureDialog({
  creature,
  title,
  checkDice,
  dice,
  onSave,
  onClose,
}: {
  /** A criatura a editar (uma nova já vem em branco); `null` fecha a janela. */
  creature: Creature | null;
  title: string;
  checkDice?: string | undefined;
  dice?: readonly CustomDie[] | undefined;
  onSave: (creature: Creature) => Promise<string | null> | string | null;
  onClose: () => void;
}) {
  return (
    <Dialog open={creature !== null} onOpenChange={(open) => !open && onClose()}>
      {creature && (
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
          {/* Remonta para cada criatura: o formulário começa com os valores dela. */}
          <CreatureForm
            key={creature.id}
            creature={creature}
            title={title}
            checkDice={checkDice}
            dice={dice}
            onSave={onSave}
            onClose={onClose}
          />
        </DialogContent>
      )}
    </Dialog>
  );
}

function CreatureForm({
  creature,
  title,
  checkDice,
  dice,
  onSave,
  onClose,
}: {
  creature: Creature;
  title: string;
  checkDice?: string | undefined;
  dice?: readonly CustomDie[] | undefined;
  onSave: (creature: Creature) => Promise<string | null> | string | null;
  onClose: () => void;
}) {
  const base = useId();
  const [draft, setDraft] = useState(creature);
  const [hp, setHp] = useState(String(creature.hp));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const set = (changes: Partial<Creature>) => setDraft((current) => ({ ...current, ...changes }));
  const setAttack = (id: string, changes: Partial<CreatureAttack>) =>
    set({
      attacks: draft.attacks.map((attack) =>
        attack.id === id ? { ...attack, ...changes } : attack,
      ),
    });

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const hpValue = Number(hp);
    if (!Number.isInteger(hpValue) || hpValue < 1 || hpValue > CREATURE_HP_MAX) {
      setError(`PV: um número inteiro de 1 a ${CREATURE_HP_MAX}.`);
      return;
    }
    // Campos vazios saem do arquivo, em vez de irem como texto em branco.
    const cleaned: Creature = {
      id: draft.id,
      name: draft.name.trim(),
      hp: hpValue,
      stats: draft.stats.filter((stat) => stat.label.trim()),
      attacks: draft.attacks.map((attack) => ({
        id: attack.id,
        name: attack.name.trim(),
        ...(attack.roll?.trim() ? { roll: attack.roll.trim() } : {}),
        ...(attack.damage?.trim() ? { damage: attack.damage.trim() } : {}),
        ...(attack.notes?.trim() ? { notes: attack.notes.trim() } : {}),
      })),
      ...(draft.kind?.trim() ? { kind: draft.kind.trim() } : {}),
      ...(draft.initiative?.trim() ? { initiative: draft.initiative.trim() } : {}),
      ...(draft.text?.trim() ? { text: draft.text } : {}),
    };
    if (!cleaned.name) return setError('Dê um nome à criatura.');
    if (cleaned.attacks.some((attack) => !attack.name))
      return setError('Dê um nome a cada ataque.');
    const parsed = CreatureSchema.safeParse(cleaned);
    if (!parsed.success) return setError(parsed.error.issues[0]?.message ?? 'Criatura inválida.');
    const [problem] = creatureProblems(parsed.data, checkDice, dice);
    if (problem) return setError(problem.message);
    setSaving(true);
    try {
      const refused = await onSave(parsed.data);
      if (refused) setError(refused);
      else onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={(event) => void submit(event)} className="space-y-4">
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>
          Ataques com rolagem rolam pela ficha da criatura no combate. Iniciativa: um número (15),
          um modificador (+2, rola {checkDice ?? '1d20'}+2) ou uma rolagem.
        </DialogDescription>
      </DialogHeader>

      <div className="grid gap-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,2fr)_5rem_6rem]">
        <div className="space-y-1">
          <Label htmlFor={`${base}-nome`}>Nome</Label>
          <Input
            id={`${base}-nome`}
            value={draft.name}
            maxLength={100}
            onChange={(event) => set({ name: event.target.value })}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`${base}-tipo`}>Tipo</Label>
          <Input
            id={`${base}-tipo`}
            value={draft.kind ?? ''}
            maxLength={60}
            placeholder="ex.: Fera média, ND 1/4"
            onChange={(event) => set({ kind: event.target.value })}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`${base}-pv`}>PV</Label>
          <Input
            id={`${base}-pv`}
            inputMode="numeric"
            value={hp}
            className="tabular-nums"
            onChange={(event) => setHp(event.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`${base}-ini`}>Iniciativa</Label>
          <Input
            id={`${base}-ini`}
            value={draft.initiative ?? ''}
            maxLength={20}
            placeholder="+2"
            className="font-mono"
            onChange={(event) => set({ initiative: event.target.value })}
          />
        </div>
      </div>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Características</legend>
        <ul className="grid gap-2 sm:grid-cols-2">
          {draft.stats.map((stat, index) => (
            <li key={index} className="flex items-center gap-1.5">
              <Input
                aria-label={`Nome da característica ${index + 1}`}
                value={stat.label}
                maxLength={40}
                placeholder="ex.: CA"
                className="w-28 shrink-0"
                onChange={(event) =>
                  set({
                    stats: draft.stats.map((item, i) =>
                      i === index ? { ...item, label: event.target.value } : item,
                    ),
                  })
                }
              />
              <Input
                aria-label={`${stat.label || 'Característica'}: valor`}
                value={stat.value}
                maxLength={60}
                onChange={(event) =>
                  set({
                    stats: draft.stats.map((item, i) =>
                      i === index ? { ...item, value: event.target.value } : item,
                    ),
                  })
                }
              />
              <Button
                type="button"
                size="icon"
                variant="ghost"
                aria-label={`Tirar ${stat.label || 'a característica'}`}
                onClick={() => set({ stats: draft.stats.filter((_, i) => i !== index) })}
              >
                <Trash2Icon />
              </Button>
            </li>
          ))}
        </ul>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={draft.stats.length >= CREATURE_STAT_LIMIT}
          onClick={() => set({ stats: [...draft.stats, { label: '', value: '' }] })}
        >
          <PlusIcon /> Característica
        </Button>
      </fieldset>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Ataques</legend>
        {draft.attacks.length > 0 && (
          <ul className="space-y-2">
            {draft.attacks.map((attack, index) => (
              <li
                key={attack.id}
                className="grid grid-cols-2 gap-1.5 rounded-md border p-2 sm:grid-cols-[minmax(0,1.4fr)_6.5rem_6.5rem_minmax(0,1.4fr)_auto]"
              >
                <Input
                  aria-label={`Nome do ataque ${index + 1}`}
                  value={attack.name}
                  maxLength={100}
                  placeholder="Mordida"
                  className="col-span-2 sm:col-span-1"
                  onChange={(event) => setAttack(attack.id, { name: event.target.value })}
                />
                <Input
                  aria-label={`${attack.name || 'Ataque'}: acerto`}
                  value={attack.roll ?? ''}
                  maxLength={60}
                  placeholder="1d20+4"
                  className="font-mono"
                  onChange={(event) => setAttack(attack.id, { roll: event.target.value })}
                />
                <Input
                  aria-label={`${attack.name || 'Ataque'}: dano`}
                  value={attack.damage ?? ''}
                  maxLength={60}
                  placeholder="1d6+2"
                  className="font-mono"
                  onChange={(event) => setAttack(attack.id, { damage: event.target.value })}
                />
                <Input
                  aria-label={`${attack.name || 'Ataque'}: notas`}
                  value={attack.notes ?? ''}
                  maxLength={200}
                  placeholder="cortante, 1,5 m"
                  onChange={(event) => setAttack(attack.id, { notes: event.target.value })}
                />
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="justify-self-end"
                  aria-label={`Tirar ${attack.name || 'o ataque'}`}
                  onClick={() =>
                    set({ attacks: draft.attacks.filter((item) => item.id !== attack.id) })
                  }
                >
                  <Trash2Icon />
                </Button>
              </li>
            ))}
          </ul>
        )}
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={draft.attacks.length >= CREATURE_ATTACK_LIMIT}
          onClick={() =>
            set({
              attacks: [
                ...draft.attacks,
                { id: crypto.randomUUID(), name: '', roll: '', damage: '' },
              ],
            })
          }
        >
          <PlusIcon /> Ataque
        </Button>
      </fieldset>

      <div className="space-y-1">
        <Label htmlFor={`${base}-texto`}>Habilidades e notas</Label>
        <Textarea
          id={`${base}-texto`}
          value={draft.text ?? ''}
          rows={5}
          placeholder="**Táticas de Matilha.** Vantagem quando um aliado está perto do alvo."
          onChange={(event) => set({ text: event.target.value })}
        />
        <p className="text-muted-foreground text-xs">
          Aceita a formatação do códice: **negrito**, *itálico*, listas com "-" e tabelas.
        </p>
      </div>

      {error && (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      )}
      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit" disabled={saving}>
          Salvar criatura
        </Button>
      </DialogFooter>
    </form>
  );
}
