import {
  compileTemplate,
  type CompiledTemplate,
  type SystemTemplate,
  type TemplateRepository,
} from '@tabula/domain';

/**
 * Todos os sistemas disponíveis: os nativos (embutidos no app) e os instalados pelo
 * usuário. Nativos têm prioridade e não podem ser substituídos. Os aposentados (que já foram
 * nativos) só entram quando alguém pede por eles: aí são instalados como da comunidade.
 */
export class TemplateCatalog {
  private readonly compiled = new Map<string, CompiledTemplate>();

  constructor(
    private readonly installed: TemplateRepository,
    private readonly builtins: readonly SystemTemplate[],
    private readonly retired: readonly SystemTemplate[] = [],
  ) {}

  isBuiltin(id: string): boolean {
    return this.builtins.some((template) => template.id === id);
  }

  async get(id: string): Promise<SystemTemplate | undefined> {
    return (
      this.builtins.find((template) => template.id === id) ??
      (await this.installed.get(id)) ??
      // Ficha, campanha ou cópia de quando o sistema vinha no app: abre como antes. Sem
      // gravar aqui (o `get` roda dentro de consultas ao vivo); quem instala é `adoptRetired`.
      this.retired.find((template) => template.id === id)
    );
  }

  /**
   * Instala, como da comunidade, os aposentados que ainda estão em uso (pelos ids de
   * sistema das fichas e campanhas). Daí em diante aparecem em Sistemas e recebem as versões
   * novas pelo repositório. Roda ao abrir o app (a restauração de uma cópia recarrega).
   */
  async adoptRetired(inUse: Iterable<string>): Promise<void> {
    const ids = new Set(inUse);
    for (const template of this.retired) {
      if (ids.has(template.id) && !(await this.installed.get(template.id))) {
        await this.installed.save(template);
      }
    }
  }

  /** Remove um sistema instalado. Fichas que o usam não são apagadas. */
  async remove(id: string): Promise<void> {
    if (this.isBuiltin(id)) throw new Error('Sistemas nativos não podem ser removidos');
    await this.installed.delete(id);
  }

  /** Nativos primeiro, depois os instalados por nome. */
  async list(): Promise<SystemTemplate[]> {
    const installed = await this.installed.list();
    return [...this.builtins, ...installed.filter((t) => !this.isBuiltin(t.id))];
  }

  /**
   * Template compilado, em cache por id e versão: o conteúdo de uma versão publicada não
   * muda. Templates do catálogo já foram validados ao entrar (nativos nos testes,
   * instalados pelo repositório); falhar aqui é um bug.
   */
  compile(template: SystemTemplate): CompiledTemplate {
    const key = `${template.id}@${template.version}`;
    const cached = this.compiled.get(key);
    if (cached) return cached;
    const result = compileTemplate(template);
    if (!result.ok) {
      throw new Error(`Template inválido no catálogo (${key}): ${result.error[0]?.message}`);
    }
    this.compiled.set(key, result.value);
    return result.value;
  }
}
