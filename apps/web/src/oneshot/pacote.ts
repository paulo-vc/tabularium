import type { SystemTemplate } from '@tabula/domain';

/**
 * One-shot com personagens prontos: cada jogador escolhe um, e a ficha é a própria imagem
 * do personagem (com o histórico ao lado). Só o PV e o PD mudam, nos quadradinhos da imagem.
 *
 * Os pacotes ficam em `pacotes/<id>/` (fora do Git: costumam ter arte de terceiros) e o app
 * embute os que encontrar ali no build. Sem pacotes, nada disso aparece.
 */

/** Um quadradinho na imagem: x, y, largura e altura em fração da imagem (0 a 1). */
export type Square = readonly [number, number, number, number];

export interface OneShotCharacter {
  id: string;
  nome: string;
  classe: string;
  ocupacao: string;
  nivel: number;
  /** Cor do personagem nas animações (a da arte). */
  cor: string;
  /** URLs das imagens, já resolvidas pelo build. */
  ficha: string;
  historico: string;
  retrato: string;
  pv: number;
  pd: number;
  /**
   * Quadradinhos de PV e PD na imagem e, se o personagem tiver (o Executor), os espaços da
   * barra de Ímpeto, que ele preenche ao falhar num teste.
   */
  quadrados: { pv: readonly Square[]; pd: readonly Square[]; impeto?: readonly Square[] };
}

export interface OneShotPack {
  id: string;
  nome: string;
  descricao: string;
  personagens: readonly OneShotCharacter[];
  template: SystemTemplate;
}

type RawPack = Omit<OneShotPack, 'template' | 'personagens'> & {
  personagens: (Omit<OneShotCharacter, 'ficha' | 'historico' | 'retrato'> & {
    ficha: string;
    historico: string;
    retrato: string;
  })[];
};

const PREFIX = 'oneshot-';

/** O sistema da one-shot: escolha do personagem, PV e PD (o Mestre vê os três no resumo). */
export function packTemplate(pack: Omit<OneShotPack, 'template'>): SystemTemplate {
  return {
    id: `${PREFIX}${pack.id}`,
    version: '1.1.0',
    name: pack.nome,
    description: pack.descricao,
    author: 'Mesa local',
    language: 'pt-BR',
    source: 'builtin',
    style: 'sombrio',
    headingFont: 'serifa',
    fields: [
      {
        id: 'personagem',
        key: 'personagem',
        label: 'Personagem',
        type: 'select',
        options: pack.personagens.map((c) => ({ value: c.id, label: c.nome })),
      },
      { id: 'pv', key: 'pv', label: 'PV', type: 'resource', default: 10, color: 'vermelho' },
      { id: 'pd', key: 'pd', label: 'PD', type: 'resource', default: 10, color: 'cobalto' },
      // Espaços preenchidos da barra de Ímpeto (só quem tem a barra usa).
      { id: 'impeto', key: 'impeto', label: 'Ímpeto', type: 'number', default: 0, min: 0, max: 3 },
    ],
    layouts: {
      full: [
        {
          kind: 'section',
          title: 'Personagem',
          columns: 3,
          children: [
            { kind: 'field', fieldId: 'personagem' },
            { kind: 'field', fieldId: 'pv' },
            { kind: 'field', fieldId: 'pd' },
            { kind: 'field', fieldId: 'impeto' },
          ],
        },
      ],
      gmSummary: ['personagem', 'pv', 'pd', 'impeto'],
    },
  };
}

/** Monta um pacote a partir do `pacote.json` e das URLs das imagens da pasta dele. */
export function buildPack(raw: RawPack, urlOf: (file: string) => string | undefined): OneShotPack {
  const personagens = raw.personagens.map((c) => ({
    ...c,
    ficha: urlOf(c.ficha) ?? '',
    historico: urlOf(c.historico) ?? '',
    retrato: urlOf(c.retrato) ?? urlOf(c.ficha) ?? '',
  }));
  const base = { id: raw.id, nome: raw.nome, descricao: raw.descricao, personagens };
  return { ...base, template: packTemplate(base) };
}

const jsons = import.meta.glob<RawPack>('./pacotes/*/pacote.json', {
  eager: true,
  import: 'default',
});
const images = import.meta.glob<string>('./pacotes/*/*.{jpg,jpeg,png,webp}', {
  eager: true,
  query: '?url',
  import: 'default',
});

/** Os pacotes deste build. */
export const ONE_SHOT_PACKS: readonly OneShotPack[] = Object.entries(jsons).map(([path, raw]) => {
  const folder = path.slice(0, path.lastIndexOf('/') + 1);
  return buildPack(raw, (file) => images[folder + file]);
});

/** Os sistemas das one-shots, para entrar no catálogo junto dos embutidos. */
export const ONE_SHOT_TEMPLATES: readonly SystemTemplate[] = ONE_SHOT_PACKS.map((p) => p.template);

/** O pacote de um sistema, se ele for de uma one-shot deste build. */
export function oneShotPack(
  templateId: string | undefined,
  packs: readonly OneShotPack[] = ONE_SHOT_PACKS,
): OneShotPack | undefined {
  return packs.find((pack) => pack.template.id === templateId);
}
