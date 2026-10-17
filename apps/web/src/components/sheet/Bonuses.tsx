import {
  BONUS_KIND_LABELS,
  BONUS_KINDS,
  BONUS_LIMIT,
  BONUS_TARGET_LIMIT,
  BonusSchema,
  bonusEffects,
  type Bonus,
  type BonusEffect,
  type BonusKind,
  type CompiledTemplate,
  type FieldDef,
  type LayoutNode,
} from '@tabula/domain';
import {
  CheckIcon,
  ChevronsUpDownIcon,
  PencilIcon,
  PlusIcon,
  SearchIcon,
  SparklesIcon,
  Trash2Icon,
  XIcon,
} from 'lucide-react';
import {
  createContext,
  useContext,
  useId,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from 'react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { formatNumber } from './format';

// ---------- Efeito dos bônus nos campos ----------

/** Efeito dos bônus ativos da ficha aberta, por campo. Sem provedor, nenhum. */
export const BonusContext = createContext<ReadonlyMap<string, BonusEffect>>(new Map());

export function useBonusEffects(bonuses: readonly Bonus[] | undefined) {
  return useMemo(() => bonusEffects(bonuses), [bonuses]);
}

const signed = (value: number) => (value > 0 ? `+${value}` : String(value));

/** "+2 Cinto de Força (item) · −1 Maldição da lua (maldição)". */
function describeSources(effect: BonusEffect) {
  return effect.sources
    .map((s) => `${signed(s.value)} ${s.name} (${BONUS_KIND_LABELS[s.kind].toLowerCase()})`)
    .join(' · ');
}

const tone = (total: number) =>
  total > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive';

/**
 * Bônus num campo de número: o valor digitado é a base; aqui aparece o valor final, com as
 * origens ao passar o mouse (ex.: "18 com bônus").
 */
export function BonusNote({ field, base }: { field: FieldDef; base: number | undefined }) {
  const effect = useContext(BonusContext).get(field.id);
  if (!effect || base === undefined) return null;
  return (
    <Tooltip>
      <TooltipTrigger
        type="button"
        aria-label={`${field.label} com bônus: ${formatNumber(base + effect.total)} (${describeSources(effect)})`}
        className={cn('inline-flex items-center gap-1 text-xs font-medium', tone(effect.total))}
      >
        <SparklesIcon className="size-3" />
        {formatNumber(base + effect.total)} com bônus
      </TooltipTrigger>
      <TooltipContent className="max-w-64">{describeSources(effect)}</TooltipContent>
    </Tooltip>
  );
}

/** Marca num campo calculado: o resultado já inclui o bônus; a marca mostra de onde vem. */
export function BonusMark({ field }: { field: FieldDef }) {
  const effect = useContext(BonusContext).get(field.id);
  if (!effect) return null;
  return (
    <Tooltip>
      <TooltipTrigger
        type="button"
        aria-label={`${field.label} inclui bônus: ${describeSources(effect)}`}
        className={cn('inline-flex items-center text-xs font-medium', tone(effect.total))}
      >
        <SparklesIcon className="size-3" />
        {signed(effect.total)}
      </TooltipTrigger>
      <TooltipContent className="max-w-64">Inclui: {describeSources(effect)}</TooltipContent>
    </Tooltip>
  );
}

// ---------- Edição dos bônus ----------

/** Quem edita os bônus da ficha aberta (o dono, ou o Mestre pela sessão). */
export interface BonusEditor {
  compiled: CompiledTemplate;
  bonuses: readonly Bonus[];
  onChange: (bonuses: Bonus[]) => void;
  newId: () => string;
}

/** Sem provedor, a ficha não mostra a seção de bônus (ex.: a prévia do criador). */
export const BonusEditorContext = createContext<BonusEditor | null>(null);

interface TargetGroup {
  title: string;
  fields: FieldDef[];
}

/**
 * Campos que podem receber bônus, agrupados pelas seções da própria ficha (Atributos,
 * Perícias…): números e calculados, à vista de quem edita. Marcadores (testes contra a
 * morte, exaustão) ficam de fora: não fazem sentido como bônus.
 */
export function bonusTargetGroups(compiled: CompiledTemplate): TargetGroup[] {
  const eligible = (field: FieldDef | undefined): field is FieldDef =>
    field !== undefined &&
    (field.type === 'number' || field.type === 'computed') &&
    field.visibility !== 'gm' &&
    !(field.type === 'number' && field.display === 'marcadores');
  const groups: TargetGroup[] = [];
  const placed = new Set<string>();
  const walk = (nodes: readonly LayoutNode[], title: string) => {
    for (const node of nodes) {
      if (node.kind === 'section') {
        walk(node.children, node.title);
        continue;
      }
      for (const id of [node.fieldId, node.secondary]) {
        const field = id === undefined ? undefined : compiled.fieldsById.get(id);
        if (!eligible(field) || placed.has(field.id)) continue;
        placed.add(field.id);
        let group = groups.find((g) => g.title === title);
        if (!group) {
          group = { title, fields: [] };
          groups.push(group);
        }
        group.fields.push(field);
      }
    }
  };
  walk(compiled.template.layouts.full, 'Geral');
  const others = compiled.template.fields.filter((f) => eligible(f) && !placed.has(f.id));
  if (others.length > 0) groups.push({ title: 'Outros campos', fields: others });
  return groups;
}

/** Busca sem acento e sem maiúsculas: "furt" acha "Furtividade", "forca" acha "Força". */
const normalize = (text: string) =>
  text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();

/**
 * Escolha do campo: um botão que abre, logo abaixo, uma lista com busca agrupada pelas
 * seções da ficha. Abre dentro do formulário (não numa camada à parte): no diálogo, fica à
 * frente e o foco do teclado funciona.
 */
function FieldPicker({
  groups,
  value,
  label,
  open,
  onOpenChange,
}: {
  groups: TargetGroup[];
  value: string;
  label: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const selected = groups.flatMap((g) => g.fields).find((f) => f.id === value);
  return (
    <Button
      type="button"
      variant="outline"
      role="combobox"
      aria-expanded={open}
      aria-label={label}
      className={cn(
        'h-9 min-w-0 flex-1 justify-between font-normal',
        !selected && 'text-muted-foreground',
      )}
      onClick={() => onOpenChange(!open)}
    >
      <span className="truncate">{selected?.label ?? 'Escolha o campo…'}</span>
      <ChevronsUpDownIcon className="opacity-50" />
    </Button>
  );
}

/** A lista aberta do `FieldPicker`: busca (sem acento) e os campos por seção. */
function FieldList({
  groups,
  value,
  onPick,
}: {
  groups: TargetGroup[];
  value: string;
  onPick: (fieldId: string) => void;
}) {
  const [query, setQuery] = useState('');
  const wanted = normalize(query.trim());
  const shown = groups
    .map((group) => ({
      ...group,
      fields: group.fields.filter(
        (f) => !wanted || normalize(`${f.label} ${group.title}`).includes(wanted),
      ),
    }))
    .filter((group) => group.fields.length > 0);
  const first = shown[0]?.fields[0];
  return (
    <div className="bg-popover rounded-md border shadow-sm">
      <div className="flex items-center gap-2 border-b px-3">
        <SearchIcon className="text-muted-foreground size-4 shrink-0" />
        <input
          autoFocus
          value={query}
          placeholder="Buscar campo (ex.: furtividade, força)…"
          aria-label="Buscar campo"
          className="placeholder:text-muted-foreground h-9 w-full bg-transparent text-sm outline-none"
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            // Enter escolhe o primeiro resultado (sem enviar o formulário).
            if (event.key !== 'Enter') return;
            event.preventDefault();
            if (first) onPick(first.id);
          }}
        />
      </div>
      <div role="listbox" aria-label="Campos" className="max-h-56 overflow-y-auto p-1">
        {shown.length === 0 && (
          <p className="text-muted-foreground px-2 py-6 text-center text-sm">
            Nenhum campo com esse nome.
          </p>
        )}
        {shown.map((group) => (
          <div key={group.title} role="group" aria-label={group.title} className="pb-1">
            <p className="text-muted-foreground px-2 pt-2 pb-1 text-xs font-medium">
              {group.title}
            </p>
            {group.fields.map((field) => (
              <button
                key={field.id}
                type="button"
                role="option"
                aria-selected={field.id === value}
                className="hover:bg-accent focus-visible:bg-accent flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm outline-none"
                onClick={() => onPick(field.id)}
              >
                <CheckIcon className={cn('size-4 shrink-0', field.id !== value && 'invisible')} />
                {field.label}
              </button>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/** Uma linha da lista: ligar/desligar, nome, o que muda, editar e remover. */
function BonusRow({
  bonus,
  labelOf,
  onToggle,
  onEdit,
  onRemove,
}: {
  bonus: Bonus;
  labelOf: (fieldId: string) => string;
  onToggle: (active: boolean) => void;
  onEdit: () => void;
  onRemove: () => void;
}) {
  return (
    <li className="flex items-center gap-3 rounded-md border px-3 py-2">
      <Checkbox
        checked={bonus.active}
        aria-label={`${bonus.name} ativo`}
        onCheckedChange={(checked) => onToggle(checked === true)}
      />
      <div className={cn('min-w-0 flex-1', !bonus.active && 'opacity-50')}>
        <p className="truncate text-sm font-medium">
          {bonus.name}
          <span className="text-muted-foreground ml-2 text-xs font-normal">
            {BONUS_KIND_LABELS[bonus.kind]}
          </span>
        </p>
        <p className="flex flex-wrap gap-1.5 pt-0.5">
          {bonus.targets.map((t) => (
            <Badge key={t.fieldId} variant="secondary" className="font-normal">
              {labelOf(t.fieldId)}{' '}
              <span className={cn('font-semibold tabular-nums', tone(t.value))}>
                {signed(t.value)}
              </span>
            </Badge>
          ))}
        </p>
      </div>
      <Button
        size="icon"
        variant="ghost"
        className="size-8"
        aria-label={`Editar ${bonus.name}`}
        onClick={onEdit}
      >
        <PencilIcon />
      </Button>
      <Button
        size="icon"
        variant="ghost"
        className="size-8"
        aria-label={`Remover ${bonus.name}`}
        onClick={onRemove}
      >
        <Trash2Icon />
      </Button>
    </li>
  );
}

/** A lista de bônus, o botão "Adicionar" e o diálogo de adicionar ou editar. */
function BonusManager({
  editor,
  children,
}: {
  editor: BonusEditor;
  children: (parts: { add: ReactNode; list: ReactNode }) => ReactNode;
}) {
  const { compiled, bonuses, onChange, newId } = editor;
  // O formulário continua montado enquanto o diálogo fecha (sem piscar outro conteúdo).
  const [form, setForm] = useState<{ bonus: Bonus; isNew: boolean } | null>(null);
  const [open, setOpen] = useState(false);
  const edit = (bonus: Bonus, isNew: boolean) => {
    setForm({ bonus, isNew });
    setOpen(true);
  };
  const labelOf = (fieldId: string) => compiled.fieldsById.get(fieldId)?.label ?? fieldId;
  const replace = (bonus: Bonus) => onChange(bonuses.map((b) => (b.id === bonus.id ? bonus : b)));
  const save = (bonus: Bonus) => {
    onChange(
      bonuses.some((b) => b.id === bonus.id)
        ? bonuses.map((b) => (b.id === bonus.id ? bonus : b))
        : [...bonuses, bonus],
    );
    setOpen(false);
  };

  const add = (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={bonuses.length >= BONUS_LIMIT}
      aria-label="Adicionar bônus"
      onClick={() =>
        edit(
          {
            id: newId(),
            name: '',
            kind: 'item',
            active: true,
            targets: [{ fieldId: '', value: 1 }],
          },
          true,
        )
      }
    >
      <PlusIcon /> Adicionar
    </Button>
  );
  const list =
    bonuses.length === 0 ? (
      <p className="text-muted-foreground text-sm">
        Itens mágicos, maldições e bênçãos que mudam um valor da ficha: +2 em Atletismo, +1 no bônus
        de proficiência, −2 em Sabedoria…
      </p>
    ) : (
      <ul aria-label="Bônus da ficha" className="space-y-2">
        {bonuses.map((bonus) => (
          <BonusRow
            key={bonus.id}
            bonus={bonus}
            labelOf={labelOf}
            onToggle={(active) => replace({ ...bonus, active })}
            onEdit={() => edit(bonus, false)}
            onRemove={() => onChange(bonuses.filter((b) => b.id !== bonus.id))}
          />
        ))}
      </ul>
    );

  return (
    <>
      {children({ add, list })}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{form?.isNew === false ? 'Editar bônus' : 'Novo bônus'}</DialogTitle>
            <DialogDescription>
              Escolha o que muda. Valores negativos são penalidades.
            </DialogDescription>
          </DialogHeader>
          {form && (
            <BonusForm
              key={form.bonus.id}
              compiled={compiled}
              initial={form.bonus}
              onSave={save}
              onCancel={() => setOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

/** Seção "Bônus e efeitos" dentro da ficha (na aba definida pelo sistema). */
export function BonusSection() {
  const editor = useContext(BonusEditorContext);
  if (!editor) return null;
  return (
    <BonusManager editor={editor}>
      {({ add, list }) => (
        <Card
          role="group"
          aria-label="Bônus e efeitos"
          size={editor.bonuses.length ? 'default' : 'sm'}
        >
          <CardHeader className="flex items-center justify-between gap-2">
            <CardTitle>
              <h2>Bônus e efeitos</h2>
            </CardTitle>
            {add}
          </CardHeader>
          <CardContent>{list}</CardContent>
        </Card>
      )}
    </BonusManager>
  );
}

/**
 * Botão "Bônus" no topo da ficha, para sistemas que não reservam uma aba para os bônus: a
 * mesma lista, num diálogo.
 */
export function BonusesButton({ editor }: { editor: BonusEditor }) {
  const [open, setOpen] = useState(false);
  const active = editor.bonuses.filter((b) => b.active).length;
  return (
    <>
      <Button
        variant="outline"
        size="sm"
        aria-label={active > 0 ? `Bônus (${active} ${active === 1 ? 'ativo' : 'ativos'})` : 'Bônus'}
        onClick={() => setOpen(true)}
      >
        <SparklesIcon /> Bônus
        {active > 0 && (
          <Badge variant="secondary" className="tabular-nums">
            {active}
          </Badge>
        )}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
          <BonusManager editor={editor}>
            {({ add, list }) => (
              <>
                <DialogHeader className="flex-row items-center justify-between gap-2 pr-8">
                  <DialogTitle>Bônus e efeitos</DialogTitle>
                  {add}
                </DialogHeader>
                {list}
              </>
            )}
          </BonusManager>
        </DialogContent>
      </Dialog>
    </>
  );
}

function BonusForm({
  compiled,
  initial,
  onSave,
  onCancel,
}: {
  compiled: CompiledTemplate;
  initial: Bonus;
  onSave: (bonus: Bonus) => void;
  onCancel: () => void;
}) {
  const base = useId();
  const [name, setName] = useState(initial.name);
  const [kind, setKind] = useState<BonusKind>(initial.kind);
  const [targets, setTargets] = useState(
    initial.targets.map((t) => ({ fieldId: t.fieldId, value: String(t.value) })),
  );
  const groups = useMemo(() => bonusTargetGroups(compiled), [compiled]);
  // Qual linha está com a lista de campos aberta (uma por vez).
  const [picking, setPicking] = useState<number | null>(null);
  const candidate: Bonus = {
    ...initial,
    name: name.trim(),
    kind,
    // Aceita o sinal de menos tipográfico (−2), comum em teclados de celular.
    targets: targets.map((t) => ({
      fieldId: t.fieldId,
      value: Number(t.value.trim().replace('−', '-')),
    })),
  };
  const valid =
    BonusSchema.safeParse(candidate).success &&
    candidate.targets.every((t) => compiled.fieldsById.has(t.fieldId));

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (valid) onSave(candidate);
  };
  const setTarget = (index: number, change: Partial<{ fieldId: string; value: string }>) =>
    setTargets((current) => current.map((t, i) => (i === index ? { ...t, ...change } : t)));

  return (
    <form onSubmit={submit} className="space-y-5" aria-label="Bônus">
      <div className="space-y-1.5">
        <Label htmlFor={`${base}-nome`}>Nome</Label>
        <Input
          id={`${base}-nome`}
          value={name}
          maxLength={100}
          placeholder="ex.: Luvas do Ladrão"
          autoFocus
          onChange={(event) => setName(event.target.value)}
        />
      </div>

      <div className="space-y-1.5">
        <span className="text-sm font-medium">Origem</span>
        <div role="radiogroup" aria-label="Origem" className="flex flex-wrap gap-1.5">
          {BONUS_KINDS.map((k) => (
            <Button
              key={k}
              type="button"
              size="sm"
              role="radio"
              aria-checked={kind === k}
              variant={kind === k ? 'secondary' : 'ghost'}
              className={cn(kind === k && 'ring-primary ring-1')}
              onClick={() => setKind(k)}
            >
              {BONUS_KIND_LABELS[k]}
            </Button>
          ))}
        </div>
      </div>

      <fieldset className="space-y-2">
        <legend className="mb-1.5 text-sm font-medium">O que muda</legend>
        {targets.map((target, index) => (
          <div key={index} className="space-y-2">
            <div className="flex items-center gap-2">
              <FieldPicker
                groups={groups}
                label={`Campo ${index + 1}`}
                value={target.fieldId}
                open={picking === index}
                onOpenChange={(open) => setPicking(open ? index : null)}
              />
              <Input
                aria-label={`Valor ${index + 1}`}
                inputMode="numeric"
                value={target.value}
                className="h-9 w-16 text-center tabular-nums"
                onChange={(event) => setTarget(index, { value: event.target.value })}
              />
              {targets.length > 1 && (
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="size-8"
                  aria-label={`Tirar o campo ${index + 1}`}
                  onClick={() => {
                    setTargets((current) => current.filter((_, i) => i !== index));
                    setPicking(null);
                  }}
                >
                  <XIcon />
                </Button>
              )}
            </div>
            {picking === index && (
              <FieldList
                groups={groups}
                value={target.fieldId}
                onPick={(fieldId) => {
                  setTarget(index, { fieldId });
                  setPicking(null);
                }}
              />
            )}
          </div>
        ))}
        {targets.length < BONUS_TARGET_LIMIT && (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="text-muted-foreground"
            onClick={() => {
              setTargets((current) => [...current, { fieldId: '', value: '1' }]);
              setPicking(targets.length);
            }}
          >
            <PlusIcon /> Mudar outro campo também
          </Button>
        )}
      </fieldset>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={!valid}>
          Salvar
        </Button>
      </div>
    </form>
  );
}
