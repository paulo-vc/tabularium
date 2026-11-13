import { z } from 'zod';
import { MAX_FORMULA_LENGTH } from '../formula';
import { BestiarySchema, CREATURE_STAT_LIMIT } from '../bestiary/schema';
import { CODEX_PAGE_LIMIT, CodexPageSchema } from '../codex/schema';
import { CustomDieSchema } from '../dice/custom';
import { SystemIconSchema } from './icon';
import {
  DescriptionSchema,
  FiniteNumberSchema,
  IdSchema,
  KeySchema,
  LabelSchema,
  LIMITS,
  SemVerSchema,
} from '../schema/primitives';

const FormulaSourceSchema = z.string().max(MAX_FORMULA_LENGTH);

const fieldBase = {
  /** ID estável: valores da ficha são indexados por ele. Renomear o rótulo não quebra fichas. */
  id: IdSchema,
  /** Apelido usado em fórmulas (`@key`). */
  key: KeySchema,
  label: LabelSchema,
  description: DescriptionSchema.optional(),
  /** `gm`: visível apenas para o Mestre durante a sessão. */
  visibility: z.enum(['all', 'gm']).optional(),
  /**
   * Só aparece quando um campo sim/não da ficha está marcado (`value: true`) ou desmarcado
   * (`false`): uma regra opcional que troca campos, como a Determinação no lugar de PE e
   * Sanidade. O valor continua guardado e nas fórmulas.
   */
  visibleWhen: z.object({ field: IdSchema, value: z.boolean() }).optional(),
  /** Desenho especial do valor na ficha: `escudo` (ex.: Defesa, Classe de Armadura). */
  emblem: z.enum(['escudo']).optional(),
};

/** Cores das barras de recurso (ex.: Vida vermelha, Sanidade violeta, Esforço laranja). */
export const BAR_COLORS = [
  'vermelho',
  'laranja',
  'ambar',
  'verde',
  'ciano',
  'cobalto',
  'violeta',
  'magenta',
] as const;
export type BarColor = (typeof BAR_COLORS)[number];

/**
 * Mostra um número (ou o valor atual de um recurso) como marcadores clicáveis, como as
 * bolinhas de uma ficha de papel: testes contra a morte, Esperança, espaços de magia.
 * Vale até `MAX_MARKS`; acima disso (ex.: um máximo calculado que cresceu), a ficha volta
 * ao campo numérico.
 */
export const FIELD_DISPLAYS = ['marcadores'] as const;
export const MAX_MARKS = 10;

/** Descansos da ficha: o curto e o longo. O que volta no curto também volta no longo. */
export const REST_KINDS = ['curto', 'longo'] as const;
export type RestKind = (typeof REST_KINDS)[number];

/**
 * O que um número ou recurso recupera num descanso. `amount`: `tudo` (o recurso enche; o
 * número volta ao padrão), `metade` (o recurso ganha metade do máximo, no mínimo 1) ou um
 * passo (ex.: -1 na exaustão). Sem `amount`, `tudo`.
 */
export const RestRecoverySchema = z.object({
  rest: z.enum(REST_KINDS),
  amount: z.union([z.enum(['tudo', 'metade']), z.number().int().min(-1000).max(1000)]).optional(),
});
export type RestRecovery = z.infer<typeof RestRecoverySchema>;

const NumberFieldSchema = z.object({
  ...fieldBase,
  type: z.literal('number'),
  default: FiniteNumberSchema.optional(),
  min: FiniteNumberSchema.optional(),
  max: FiniteNumberSchema.optional(),
  integer: z.boolean().optional(),
  display: z.enum(FIELD_DISPLAYS).optional(),
  /** O que volta num descanso (ex.: os testes contra a morte zeram). */
  /**
   * O valor é quantos dados do teste rolar, ficando com o maior (ex.: os atributos da Ordem
   * Paranormal: Agilidade 3 rola 3d20). Ganha o botão de rolar na ficha.
   */
  rollsDice: z.boolean().optional(),
  recover: RestRecoverySchema.optional(),
});

const TextFieldSchema = z.object({
  ...fieldBase,
  type: z.literal('text'),
  default: z.string().max(LIMITS.text).optional(),
});

const LongTextFieldSchema = z.object({
  ...fieldBase,
  type: z.literal('longtext'),
  default: z.string().max(LIMITS.text).optional(),
});

const BooleanFieldSchema = z.object({
  ...fieldBase,
  type: z.literal('boolean'),
  default: z.boolean().optional(),
});

const SelectOptionSchema = z.object({
  value: IdSchema,
  label: LabelSchema,
  /** Valor da opção em fórmulas (`@tamanho` vale o número da opção marcada; soma, se múltipla). */
  number: FiniteNumberSchema.optional(),
});

const SelectFieldSchema = z.object({
  ...fieldBase,
  type: z.literal('select'),
  options: z.array(SelectOptionSchema).min(1).max(LIMITS.selectOptions),
  multiple: z.boolean().optional(),
  default: z.union([IdSchema, z.array(IdSchema).max(LIMITS.selectOptions)]).optional(),
});

/** Expressão de dados, ex.: "1d8+3". A rolagem é implementada numa fase futura. */
const DiceFieldSchema = z.object({
  ...fieldBase,
  type: z.literal('dice'),
  default: z.string().max(LIMITS.label).optional(),
});

/** Recurso consumível com valor atual e máximo: HP, mana, sanidade, espaços de magia… */
const ResourceFieldSchema = z.object({
  ...fieldBase,
  type: z.literal('resource'),
  /** Fórmula do máximo. Se ausente, o máximo é digitado na ficha. */
  max: FormulaSourceSchema.optional(),
  /** Valor inicial (atual e, se não houver fórmula, também do máximo). */
  default: FiniteNumberSchema.optional(),
  display: z.enum(FIELD_DISPLAYS).optional(),
  /** O que volta num descanso (ex.: os PV enchem no descanso longo). */
  /** Cor da barra (sem ela, a barra muda de verde a vermelho conforme esvazia). */
  color: z.enum(BAR_COLORS).optional(),
  recover: RestRecoverySchema.optional(),
});

/** Campo derivado: nunca é armazenado na ficha, é sempre calculado. */
const ComputedFieldSchema = z.object({
  ...fieldBase,
  type: z.literal('computed'),
  formula: FormulaSourceSchema,
  /** Exibe o sinal também em positivos (ex.: "+3"), como em modificadores. */
  signed: z.boolean().optional(),
  /**
   * Quantos dados do teste rolar: o valor deste outro campo (ex.: o atributo, na Ordem
   * Paranormal). Fica o maior; com 0 ou menos, rola dois e fica o menor. Sem isso, um dado.
   */
  checkDiceFrom: IdSchema.optional(),
});

/** Campos permitidos dentro de itens de lista (sem fórmulas nem listas aninhadas). */
const ListItemFieldSchema = z.discriminatedUnion('type', [
  NumberFieldSchema,
  TextFieldSchema,
  LongTextFieldSchema,
  BooleanFieldSchema,
  SelectFieldSchema,
  DiceFieldSchema,
]);

/** Lista de itens com a mesma estrutura: inventário, perícias, magias, ataques… */
const ListFieldSchema = z.object({
  ...fieldBase,
  type: z.literal('list'),
  itemFields: z.array(ListItemFieldSchema).min(1).max(LIMITS.listItemFields),
  maxItems: z.number().int().min(1).max(LIMITS.listItems).optional(),
  /**
   * Lista de ataques: o campo de número que é o bônus de ataque e, opcional, o de dados que é
   * o dano. Com isso, cada item ganha "Atacar" (o dado dos testes + o bônus) e "Ataque e dano".
   */
  attack: z.object({ bonus: IdSchema, damage: IdSchema.optional() }).optional(),
  /**
   * `cartoes`: cada item é um cartão com os textos longos sempre abertos (habilidades, poderes,
   * rituais com descrição). Sem isso, o texto longo abre por item e a linha fica curta.
   */
  display: z.enum(['cartoes']).optional(),
});

export const FieldDefSchema = z.discriminatedUnion('type', [
  NumberFieldSchema,
  TextFieldSchema,
  LongTextFieldSchema,
  BooleanFieldSchema,
  SelectFieldSchema,
  DiceFieldSchema,
  ResourceFieldSchema,
  ComputedFieldSchema,
  ListFieldSchema,
]);

export type FieldDef = z.infer<typeof FieldDefSchema>;
export type ListItemFieldDef = z.infer<typeof ListItemFieldSchema>;
export type FieldType = FieldDef['type'];
export type FieldOf<T extends FieldType> = Extract<FieldDef, { type: T }>;

/** Tipos cujo valor pode ser usado em fórmulas. */
export const NUMERIC_FIELD_TYPES = ['number', 'boolean', 'resource', 'computed', 'select'] as const;

/** Tipos de campo de item de lista que valem um número em `sum()`/`count()`. */
export const NUMERIC_ITEM_FIELD_TYPES = ['number', 'boolean', 'select'] as const;

// ---------- Layout ----------

/**
 * Como a seção é desenhada na ficha:
 * - `padrao`: campos com rótulo em grade;
 * - `compacto`: blocos de valor (ex.: atributos), número grande e rótulo pequeno;
 * - `linhas`: cada grupo de `columns` campos vira uma linha (ex.: perícias: proficiência,
 *   nome e total numa linha só);
 * - `circulo`: os blocos em volta de um círculo, como o pentágono de atributos da Ordem
 *   Paranormal (de 3 a 8 campos; com mais, vira `compacto`).
 */
export const SECTION_DISPLAYS = ['padrao', 'compacto', 'linhas', 'circulo'] as const;
export type SectionDisplay = (typeof SECTION_DISPLAYS)[number];

export type LayoutNode =
  | {
      kind: 'section';
      title: string;
      columns: 1 | 2 | 3 | 4;
      children: LayoutNode[];
      /** Aba da ficha em que a seção aparece (só nas seções de primeiro nível). */
      tab?: string | undefined;
      display?: SectionDisplay | undefined;
      /**
       * `metade`: em telas largas, a seção ocupa meia página e fica ao lado da seguinte,
       * como os blocos de uma ficha de papel (só nas seções de primeiro nível).
       */
      width?: 'metade' | undefined;
    }
  | {
      kind: 'field';
      fieldId: string;
      span?: 1 | 2 | 3 | 4 | undefined;
      /** Campo mostrado junto, pequeno (ex.: o valor do atributo junto do modificador). */
      secondary?: string | undefined;
    };

const ColumnsSchema = z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]);

export const LayoutNodeSchema: z.ZodType<LayoutNode> = z.lazy(() =>
  z.discriminatedUnion('kind', [
    z.object({
      kind: z.literal('section'),
      title: LabelSchema,
      columns: ColumnsSchema,
      children: z.array(LayoutNodeSchema).max(LIMITS.layoutNodes),
      tab: z.string().trim().min(1).max(40).optional(),
      display: z.enum(SECTION_DISPLAYS).optional(),
      width: z.literal('metade').optional(),
    }),
    z.object({
      kind: z.literal('field'),
      fieldId: IdSchema,
      span: ColumnsSchema.optional(),
      secondary: IdSchema.optional(),
    }),
  ]),
);

const LayoutSchema = z.array(LayoutNodeSchema).max(LIMITS.layoutNodes);

// ---------- Template ----------

/** Estilos de ficha: o visual do tipo de jogo (medieval, terror). */
export const SHEET_STYLES = ['medieval', 'sombrio'] as const;
export type SheetStyle = (typeof SHEET_STYLES)[number];
export const SHEET_STYLE_LABELS: Record<SheetStyle | 'liso', string> = {
  liso: 'Liso (o do app)',
  medieval: 'Medieval (molduras e ornamentos)',
  sombrio: 'Sombrio (terror, dossiê)',
};

/** Fonte dos títulos na ficha do sistema: a condensada do app, uma serifada ou de máquina. */
export const HEADING_FONTS = ['condensada', 'serifa', 'maquina'] as const;
export type HeadingFont = (typeof HEADING_FONTS)[number];
export const HEADING_FONT_LABELS: Record<HeadingFont, string> = {
  condensada: 'Condensada (a do app)',
  serifa: 'Serifada (livro antigo)',
  maquina: 'Máquina de escrever (dossiê)',
};

/**
 * Cor de destaque da ficha e da campanha do sistema (botões, abas, foco), entre tons que o app
 * já ajusta para os dois temas. Sem cor, vale o cobalto do app.
 */
export const SYSTEM_ACCENTS = [
  'cobalto',
  'violeta',
  'magenta',
  'vermelho',
  'laranja',
  'ambar',
  'verde',
  'ciano',
] as const;
export type SystemAccent = (typeof SYSTEM_ACCENTS)[number];
export const ACCENT_LABELS: Record<SystemAccent, string> = {
  cobalto: 'Cobalto',
  violeta: 'Violeta',
  magenta: 'Magenta',
  vermelho: 'Vermelho',
  laranja: 'Laranja',
  ambar: 'Âmbar',
  verde: 'Verde',
  ciano: 'Ciano',
};

/** De onde o template veio: embutido no app, repositório da comunidade ou criado localmente. */
export const TemplateSourceSchema = z.enum(['builtin', 'community', 'local']);
export type TemplateSource = z.infer<typeof TemplateSourceSchema>;

export const SystemTemplateSchema = z.object({
  id: IdSchema,
  version: SemVerSchema,
  name: LabelSchema,
  description: DescriptionSchema.optional(),
  author: LabelSchema.optional(),
  /** Licença do conteúdo (ex.: "CC-BY-4.0"). Obrigatória para publicar na comunidade. */
  license: LabelSchema.optional(),
  /** Idioma principal (ex.: "pt-BR"). */
  language: z
    .string()
    .regex(/^[a-z]{2,3}(-[A-Z]{2})?$/)
    .optional(),
  tags: z.array(z.string().trim().min(1).max(30)).max(LIMITS.tags).optional(),
  source: TemplateSourceSchema,
  /**
   * Dado rolado nos testes (botão de rolar dos modificadores): "1d20" se ausente; "2d12"
   * em sistemas de dados de dualidade, "3d6" em outros…
   */
  checkDice: z.string().max(LIMITS.label).optional(),
  /** Dados com faces próprias (ex.: o dado Fate, `4dF`). Valem nas rolagens deste sistema. */
  dice: z.array(CustomDieSchema).max(12).optional(),
  /**
   * Campo numérico que é o modificador de iniciativa (ex.: "Iniciativa" no D&D, "Percepção"
   * no Lendas d20). Com ele, o jogador rola a iniciativa pela ficha (`checkDice` + o valor) e
   * o resultado entra na ordem de turno. Sem ele, o Mestre digita as iniciativas.
   */
  initiative: IdSchema.optional(),
  /**
   * Aba da ficha em que aparece a seção "Bônus e efeitos" (itens, maldições, bênçãos), no fim
   * dela. Sem isso, os bônus ficam num botão no topo da ficha.
   */
  bonusTab: z.string().trim().min(1).max(40).optional(),
  /** Ícone do sistema (imagem pequena, embutida), nas listas de sistemas, fichas e campanhas. */
  icon: SystemIconSchema.optional(),
  /**
   * Nos testes, o menor resultado é o melhor (rolar abaixo do valor, como no 1d100 do Chamado
   * de Cthulhu): a vantagem fica com o menor dado, e o crítico é a face 1.
   */
  lowerIsBetter: z.boolean().optional(),
  /** Cor de destaque da ficha e da campanha (ex.: laranja na Ordem Paranormal). */
  accent: z.enum(SYSTEM_ACCENTS).optional(),
  /** Fonte dos títulos da ficha e da campanha (ex.: máquina de escrever no Chamado de Cthulhu). */
  headingFont: z.enum(HEADING_FONTS).optional(),
  /**
   * Estilo da ficha e da campanha: `medieval` (molduras douradas, ornamentos, como pergaminho)
   * ou `sombrio` (granulado e sombras, como um dossiê de terror). Sem isso, o painel liso.
   */
  style: z.enum(SHEET_STYLES).optional(),
  /** Versão mínima do app capaz de abrir este template. */
  minAppVersion: SemVerSchema.optional(),
  /** Códice: páginas de consulta (habilidades, regras, itens…), lidas por toda a mesa. */
  codex: z.array(CodexPageSchema).max(CODEX_PAGE_LIMIT).optional(),
  /** Criaturas prontas do sistema, para o Mestre usar no combate ou copiar para a campanha. */
  bestiary: BestiarySchema.optional(),
  /** Características de uma criatura nova (ex.: "CA", "Deslocamento"); sem isso, as padrão. */
  creatureStats: z.array(z.string().trim().min(1).max(40)).max(CREATURE_STAT_LIMIT).optional(),
  fields: z.array(FieldDefSchema).min(1).max(LIMITS.fields),
  layouts: z.object({
    /** Ficha completa. */
    full: LayoutSchema,
    /** Reservado para uma variante de telas pequenas. O app ainda não usa: o grid de `full` já se adapta. */
    compact: LayoutSchema.optional(),
    /** Campos exibidos no card do jogador no painel do Mestre (HP, mana, condições…). */
    gmSummary: z.array(IdSchema).max(LIMITS.gmSummary).optional(),
    /**
     * Seções (pelo título) sempre à vista no painel lateral da ficha, junto de PV e defesa
     * (ex.: os atributos). Em telas menores, ficam acima das abas.
     */
    side: z.array(LabelSchema).max(6).optional(),
  }),
});

export type SystemTemplate = z.infer<typeof SystemTemplateSchema>;

/** Referência de uma ficha (ou campanha) ao template em que se baseia. */
export const TemplateRefSchema = z.object({
  id: IdSchema,
  version: SemVerSchema,
  source: TemplateSourceSchema,
});
export type TemplateRef = z.infer<typeof TemplateRefSchema>;
