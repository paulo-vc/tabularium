import type { FieldDef, SystemTemplate } from './schema';

/**
 * Modelos prontos para começar um sistema novo: já vêm com campos, fórmulas e seções que
 * funcionam, para quem cria mudar o que quiser em vez de partir do zero.
 */
export type StarterId = 'd20' | 'simples';

export interface Starter {
  id: StarterId;
  name: string;
  description: string;
}

export const STARTERS: readonly Starter[] = [
  {
    id: 'd20',
    name: 'Atributos e perícias (d20)',
    description:
      'Seis atributos com modificador, nível, bônus de proficiência, perícias que somam a proficiência quando marcadas, PV, CA e ataques. Testes com 1d20.',
  },
  {
    id: 'simples',
    name: 'Simples (2d6)',
    description:
      'Três atributos pequenos (de -1 a +3), vida, inventário e anotações. Testes com 2d6, como em muitos jogos narrativos.',
  },
];

const ATTRIBUTES = [
  ['for', 'Força'],
  ['des', 'Destreza'],
  ['con', 'Constituição'],
  ['int', 'Inteligência'],
  ['sab', 'Sabedoria'],
  ['car', 'Carisma'],
] as const;

const SKILLS = [
  ['atletismo', 'Atletismo', 'for'],
  ['furtividade', 'Furtividade', 'des'],
  ['percepcao', 'Percepção', 'sab'],
  ['persuasao', 'Persuasão', 'car'],
] as const;

function d20(): Pick<SystemTemplate, 'fields' | 'layouts' | 'checkDice' | 'initiative'> {
  const fields: FieldDef[] = [
    { id: 'nome', key: 'nome', label: 'Nome', type: 'text' },
    {
      id: 'nivel',
      key: 'nivel',
      label: 'Nível',
      type: 'number',
      default: 1,
      min: 1,
      max: 20,
      integer: true,
    },
    ...ATTRIBUTES.flatMap(([id, label]): FieldDef[] => [
      { id, key: id, label, type: 'number', default: 10, min: 1, max: 30, integer: true },
      {
        id: `${id}_mod`,
        key: `${id}_mod`,
        label: `Mod. ${label}`,
        type: 'computed',
        formula: `floor((@${id} - 10) / 2)`,
        signed: true,
      },
    ]),
    {
      id: 'bonus_prof',
      key: 'bonus_prof',
      label: 'Bônus de proficiência',
      type: 'computed',
      formula: 'ceil(@nivel / 4) + 1',
      signed: true,
    },
    ...SKILLS.flatMap(([id, label, attribute]): FieldDef[] => [
      { id: `prof_${id}`, key: `prof_${id}`, label: `Proficiente em ${label}`, type: 'boolean' },
      {
        id,
        key: id,
        label,
        type: 'computed',
        formula: `@${attribute}_mod + if(@prof_${id}, @bonus_prof, 0)`,
        signed: true,
      },
    ]),
    { id: 'pv', key: 'pv', label: 'Pontos de Vida', type: 'resource', default: 10 },
    {
      id: 'ca',
      key: 'ca',
      label: 'Classe de Armadura',
      type: 'computed',
      formula: '10 + @des_mod',
    },
    {
      id: 'iniciativa',
      key: 'iniciativa',
      label: 'Iniciativa',
      type: 'computed',
      formula: '@des_mod',
      signed: true,
    },
    {
      id: 'ataques',
      key: 'ataques',
      label: 'Ataques',
      type: 'list',
      itemFields: [
        { id: 'nome', key: 'nome', label: 'Arma', type: 'text' },
        { id: 'bonus', key: 'bonus', label: 'Bônus', type: 'number', default: 0, integer: true },
        { id: 'dano', key: 'dano', label: 'Dano', type: 'dice', default: '1d6' },
      ],
    },
    { id: 'anotacoes', key: 'anotacoes', label: 'Anotações', type: 'longtext' },
  ];
  return {
    checkDice: '1d20',
    initiative: 'iniciativa',
    fields,
    layouts: {
      full: [
        {
          kind: 'section',
          title: 'Personagem',
          columns: 2,
          children: [
            { kind: 'field', fieldId: 'nome' },
            { kind: 'field', fieldId: 'nivel' },
          ],
        },
        {
          kind: 'section',
          title: 'Atributos',
          columns: 3,
          display: 'compacto',
          children: ATTRIBUTES.map(([id]) => ({
            kind: 'field' as const,
            fieldId: `${id}_mod`,
            secondary: id,
          })),
        },
        {
          kind: 'section',
          title: 'Combate',
          columns: 3,
          children: [
            { kind: 'field', fieldId: 'pv' },
            { kind: 'field', fieldId: 'ca' },
            { kind: 'field', fieldId: 'iniciativa' },
            { kind: 'field', fieldId: 'bonus_prof' },
            { kind: 'field', fieldId: 'ataques' },
          ],
        },
        {
          kind: 'section',
          title: 'Perícias',
          columns: 2,
          children: SKILLS.flatMap(([id]) => [
            { kind: 'field' as const, fieldId: id },
            { kind: 'field' as const, fieldId: `prof_${id}` },
          ]),
        },
        {
          kind: 'section',
          title: 'Anotações',
          columns: 1,
          children: [{ kind: 'field', fieldId: 'anotacoes' }],
        },
      ],
    },
  };
}

function simple(): Pick<SystemTemplate, 'fields' | 'layouts' | 'checkDice'> {
  const attribute = (id: string, label: string): FieldDef => ({
    id,
    key: id,
    label,
    type: 'number',
    default: 0,
    min: -1,
    max: 3,
    integer: true,
  });
  return {
    checkDice: '2d6',
    fields: [
      { id: 'nome', key: 'nome', label: 'Nome', type: 'text' },
      { id: 'conceito', key: 'conceito', label: 'Conceito', type: 'text' },
      attribute('corpo', 'Corpo'),
      attribute('mente', 'Mente'),
      attribute('alma', 'Alma'),
      { id: 'vida', key: 'vida', label: 'Vida', type: 'resource', default: 6 },
      {
        id: 'inventario',
        key: 'inventario',
        label: 'Inventário',
        type: 'list',
        itemFields: [
          { id: 'nome', key: 'nome', label: 'Item', type: 'text' },
          { id: 'qtd', key: 'qtd', label: 'Qtd.', type: 'number', default: 1, integer: true },
        ],
      },
      { id: 'anotacoes', key: 'anotacoes', label: 'Anotações', type: 'longtext' },
    ],
    layouts: {
      full: [
        {
          kind: 'section',
          title: 'Personagem',
          columns: 2,
          children: [
            { kind: 'field', fieldId: 'nome' },
            { kind: 'field', fieldId: 'conceito' },
          ],
        },
        {
          kind: 'section',
          title: 'Atributos',
          columns: 3,
          children: [
            { kind: 'field', fieldId: 'corpo' },
            { kind: 'field', fieldId: 'mente' },
            { kind: 'field', fieldId: 'alma' },
          ],
        },
        {
          kind: 'section',
          title: 'Estado',
          columns: 1,
          children: [
            { kind: 'field', fieldId: 'vida' },
            { kind: 'field', fieldId: 'inventario' },
            { kind: 'field', fieldId: 'anotacoes' },
          ],
        },
      ],
    },
  };
}

/** Um sistema novo a partir de um modelo pronto. */
export function starterTemplate(
  starter: StarterId,
  input: { id: string; name: string; author?: string },
): SystemTemplate {
  return {
    id: input.id,
    version: '1.0.0',
    name: input.name,
    ...(input.author && { author: input.author }),
    language: 'pt-BR',
    source: 'local',
    ...(starter === 'd20' ? d20() : simple()),
  };
}
