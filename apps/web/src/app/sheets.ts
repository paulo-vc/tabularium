import {
  checkCompatibility,
  createSheet,
  migrateSheet,
  err,
  ok,
  PORTRAIT_MAX_CHARS,
  PORTRAIT_MAX_SIDE,
  PortraitSchema,
  type Issue,
  type Result,
  type Bonus,
  type CharacterSheet,
  type CompiledTemplate,
  type DeviceRepository,
  type FieldValue,
  type SheetRepository,
} from '@tabula/domain';
import { embedImage, type ImageProcessor } from '@/lib/image-processing';
import type { TemplateCatalog } from './catalog';

export interface Clock {
  now(): number;
}

export interface IdGenerator {
  newId(): string;
}

/** Estado de uma ficha aberta, já reconciliada com o template disponível. */
export type OpenedSheet =
  | { status: 'pronta'; sheet: CharacterSheet; compiled: CompiledTemplate }
  /** O template mudou de versão MAJOR: a migração precisa de confirmação do usuário. */
  | { status: 'atualizacao-pendente'; sheet: CharacterSheet; compiled: CompiledTemplate }
  | { status: 'template-ausente'; sheet: CharacterSheet }
  | { status: 'nao-encontrada' };

/** Casos de uso das fichas. */
/** Sistema da ficha de exemplo. */
const EXAMPLE_TEMPLATE = 'dnd5e-srd';

export class SheetService {
  constructor(
    private readonly sheets: SheetRepository,
    private readonly catalog: TemplateCatalog,
    private readonly device: DeviceRepository,
    private readonly clock: Clock,
    private readonly ids: IdGenerator,
    private readonly processImage: ImageProcessor,
  ) {}

  async create(input: { name: string; templateId: string }): Promise<CharacterSheet> {
    const template = await this.catalog.get(input.templateId);
    if (!template) throw new Error(`Sistema não encontrado: ${input.templateId}`);
    const sheet = createSheet(this.catalog.compile(template), {
      id: this.ids.newId(),
      name: input.name.trim(),
      ownerId: await this.device.getDeviceId(),
      now: this.clock.now(),
    });
    await this.sheets.save(sheet);
    return sheet;
  }

  /**
   * Carrega a ficha e a reconcilia com o template instalado. Atualizações compatíveis
   * (mesma versão MAJOR) são aplicadas automaticamente, sem perda de dados.
   */
  /**
   * Ficha de exemplo, já preenchida (D&D 5e): um anão guerreiro de nível 3, para quem abre o
   * app pela primeira vez ver como uma ficha funciona. `undefined` sem o sistema.
   */
  async createExample(): Promise<CharacterSheet | undefined> {
    const template = await this.catalog.get(EXAMPLE_TEMPLATE);
    if (!template) return undefined;
    const sheet = await this.create({ name: 'Thorin (exemplo)', templateId: EXAMPLE_TEMPLATE });
    const item = (values: Record<string, string | number | boolean>) => ({
      id: this.ids.newId(),
      values,
    });
    const values: Record<string, FieldValue> = {
      nome: 'Thorin',
      classe: 'Guerreiro',
      nivel: 3,
      raca: 'Anão da montanha',
      antecedente: 'Soldado',
      alinhamento: 'lb',
      for: 16,
      des: 12,
      con: 15,
      int: 10,
      sab: 13,
      car: 8,
      prof_salv_for: true,
      prof_salv_con: true,
      prof_atletismo: true,
      prof_intimidacao: true,
      prof_percepcao: true,
      ca: 16,
      hp: { current: 31, max: 31 },
      dados_vida: '3d10',
      dados_vida_restantes: { current: 3, max: 3 },
      ataques: [
        item({ nome: 'Machado de batalha', bonus: 5, dano: '1d8+3', tipo: 'Cortante' }),
        item({ nome: 'Machadinha (arremesso)', bonus: 5, dano: '1d6+3', tipo: 'Cortante' }),
      ],
      equipamento: [
        item({ nome: 'Cota de malha', qtd: 1, peso: 27, equipado: true }),
        item({ nome: 'Escudo', qtd: 1, peso: 3, bonus_ca: 2, equipado: true }),
        item({ nome: 'Machadinha', qtd: 2, peso: 1 }),
        item({ nome: 'Mochila de aventureiro', qtd: 1, peso: 15 }),
      ],
      po: 15,
      personalidade: 'Fala pouco e cumpre o que promete. Desconfia de magia que não entende.',
      ideais: 'Lealdade. Quem luta ao meu lado é da família.',
      anotacoes:
        'Ficha de exemplo: mude o que quiser, role pelos botões ao lado dos valores ou apague-a no menu da ficha.',
    };
    const filled = { ...sheet, values: { ...sheet.values, ...values } };
    await this.sheets.save(filled);
    return filled;
  }

  async open(id: string): Promise<OpenedSheet> {
    const sheet = await this.sheets.get(id);
    if (!sheet) return { status: 'nao-encontrada' };
    const template = await this.catalog.get(sheet.templateRef.id);
    if (!template) return { status: 'template-ausente', sheet };
    const compiled = this.catalog.compile(template);

    const compatibility = checkCompatibility(sheet.templateRef, template);
    if (compatibility.kind === 'atualizacao') {
      if (compatibility.breaking) return { status: 'atualizacao-pendente', sheet, compiled };
      return { status: 'pronta', sheet: await this.migrate(sheet, compiled), compiled };
    }
    return { status: 'pronta', sheet, compiled };
  }

  async migrate(sheet: CharacterSheet, compiled: CompiledTemplate): Promise<CharacterSheet> {
    const { sheet: migrated } = migrateSheet(sheet, compiled, this.clock.now());
    await this.sheets.save(migrated);
    return migrated;
  }

  async setValue(id: string, fieldId: string, value: FieldValue): Promise<void> {
    await this.sheets.update(id, { values: { [fieldId]: value }, updatedAt: this.clock.now() });
  }

  /**
   * Usa a imagem escolhida como retrato do personagem: reduzida no aparelho (lado maior até
   * 384 px, WebP) e guardada na própria ficha, para ir junto ao Mestre e na exportação.
   */
  async setPortrait(id: string, file: Blob): Promise<Result<void, Issue>> {
    let embedded;
    try {
      embedded = await embedImage(this.processImage, file, {
        maxSide: PORTRAIT_MAX_SIDE,
        maxChars: PORTRAIT_MAX_CHARS,
      });
    } catch (error) {
      return invalidPortrait(
        error instanceof Error ? error.message : 'Não foi possível usar a imagem.',
      );
    }
    const portrait = PortraitSchema.safeParse(embedded);
    if (!portrait.success)
      return invalidPortrait('Não foi possível usar esta imagem. Tente outra.');
    await this.sheets.update(id, { portrait: portrait.data, updatedAt: this.clock.now() });
    return ok(undefined);
  }

  async removePortrait(id: string): Promise<void> {
    await this.sheets.update(id, { portrait: null, updatedAt: this.clock.now() });
  }

  /** Troca os bônus da ficha (a lista inteira). */
  async setBonuses(id: string, bonuses: Bonus[]): Promise<void> {
    await this.sheets.update(id, { bonuses, updatedAt: this.clock.now() });
  }

  async rename(id: string, name: string): Promise<void> {
    await this.sheets.update(id, { name: name.trim(), updatedAt: this.clock.now() });
  }

  async duplicate(id: string): Promise<CharacterSheet | undefined> {
    const sheet = await this.sheets.get(id);
    if (!sheet) return undefined;
    const now = this.clock.now();
    const copy: CharacterSheet = {
      ...structuredClone(sheet),
      id: this.ids.newId(),
      name: copyName(sheet.name),
      createdAt: now,
      updatedAt: now,
    };
    await this.sheets.save(copy);
    return copy;
  }

  delete(id: string): Promise<void> {
    return this.sheets.delete(id);
  }
}

/** "Thorin" → "Thorin (cópia)", respeitando o limite de tamanho do nome. */
export function copyName(name: string): string {
  const suffix = ' (cópia)';
  return name.slice(0, 100 - suffix.length) + suffix;
}

const invalidPortrait = (message: string): { ok: false; error: Issue } =>
  err({ code: 'retrato-invalido', path: ['portrait'], message });
