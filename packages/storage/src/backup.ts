import {
  CampaignSchema,
  CharacterSheetSchema,
  ChatMessageSchema,
  err,
  JournalEntrySchema,
  ok,
  RollEntrySchema,
  sniffAudioMime,
  sniffImageMime,
  StoredImageSchema,
  StoredTrackSchema,
  SystemTemplateSchema,
  type Issue,
  type Result,
} from '@tabula/domain';
import type { TabulaDatabase } from './database';

/**
 * Cópia de segurança do aparelho: todas as tabelas do banco num arquivo JSON. Restaurar
 * substitui o que está no aparelho pelo que está na cópia, inclusive a identidade (o ID do
 * aparelho e as chaves de Mestre). É assim que uma campanha muda de aparelho: o novo passa a
 * ser "o mesmo" Mestre e o mesmo jogador.
 *
 * Imagens e trilhas são opcionais (pesam): só as do próprio Mestre (galeria e biblioteca); as
 * recebidas voltam a baixar na sessão.
 */
export const BACKUP_FORMAT = 'tabula/backup';
export const BACKUP_VERSION = 1;

/** Cópias maiores que isso não são lidas (proteção contra arquivos enormes). */
export const MAX_BACKUP_BYTES = 512 * 1024 * 1024;

const DATA_TABLES = [
  'templates',
  'sheets',
  'settings',
  'campaigns',
  'sessionStates',
  'drafts',
  'secretValues',
  'rollLog',
  'gmKeys',
  'journal',
  'chat',
] as const;
const MEDIA_TABLES = ['images', 'tracks'] as const;
type TableName = (typeof DATA_TABLES)[number] | (typeof MEDIA_TABLES)[number];
const ALL_TABLES: readonly TableName[] = [...DATA_TABLES, ...MEDIA_TABLES];

export interface Backup {
  format: typeof BACKUP_FORMAT;
  version: typeof BACKUP_VERSION;
  /** Versão do banco que gerou a cópia: uma mais nova que a deste app não é restaurada. */
  databaseVersion: number;
  exportedAt: string;
  /** Tabelas na cópia. As ausentes (ex.: imagens e trilhas) ficam como estão ao restaurar. */
  tables: Partial<Record<TableName, unknown[]>>;
}

/** O que a cópia tem, para mostrar antes de restaurar. */
export interface BackupSummary {
  exportedAt: string;
  sheets: number;
  campaigns: number;
  templates: number;
  /** Imagens e trilhas da galeria e da biblioteca do Mestre. */
  media: number;
}

// Conteúdo binário (imagens, trilhas, estado das sessões) vai como base64 no JSON.
const BYTES = '$bytes';

function toBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary);
}

function fromBase64(text: string): Uint8Array {
  const binary = atob(text);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

const replacer = (_key: string, value: unknown) =>
  value instanceof Uint8Array ? { [BYTES]: toBase64(value) } : value;

const reviver = (_key: string, value: unknown) => {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const keys = Object.keys(value);
    const encoded = (value as Record<string, unknown>)[BYTES];
    if (keys.length === 1 && typeof encoded === 'string') return fromBase64(encoded);
  }
  return value;
};

/** Imagem ou trilha do próprio Mestre (as recebidas não entram na cópia). */
const isOwnMedia = (record: { origin?: unknown }) =>
  record.origin === 'galeria' || record.origin === 'biblioteca';

export async function createBackup(
  db: TabulaDatabase,
  { media, now = new Date() }: { media: boolean; now?: Date },
): Promise<string> {
  const tables: Backup['tables'] = {};
  await db.transaction('r', ALL_TABLES as unknown as string[], async () => {
    for (const name of DATA_TABLES) tables[name] = await db.table(name).toArray();
    if (media) {
      for (const name of MEDIA_TABLES) {
        tables[name] = (await db.table(name).toArray()).filter(isOwnMedia);
      }
    }
  });
  const backup: Backup = {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    databaseVersion: db.verno,
    exportedAt: now.toISOString(),
    tables,
  };
  return JSON.stringify(backup, replacer);
}

/** Quanto pesam as imagens e trilhas que entrariam na cópia (bytes). */
export async function ownMediaBytes(db: TabulaDatabase): Promise<number> {
  let total = 0;
  for (const name of MEDIA_TABLES) {
    for (const record of await db.table(name).toArray()) {
      if (isOwnMedia(record)) total += (record as { data: Uint8Array }).data.byteLength;
    }
  }
  return total;
}

const invalid = (message: string): Result<never, Issue> =>
  err({ code: 'copia-invalida', path: [], message });

/**
 * Lê e confere uma cópia. Fichas, campanhas e sistemas passam pelos mesmos schemas de
 * sempre; uma cópia de uma versão mais nova do app é recusada.
 */
export function readBackup(text: string, databaseVersion: number): Result<Backup, Issue> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text, reviver);
  } catch {
    return invalid('O arquivo não é uma cópia de segurança do Tabularium.');
  }
  const backup = parsed as Partial<Backup> | null;
  if (backup?.format !== BACKUP_FORMAT || typeof backup.tables !== 'object' || !backup.tables) {
    return invalid('O arquivo não é uma cópia de segurança do Tabularium.');
  }
  if (backup.version !== BACKUP_VERSION || (backup.databaseVersion ?? 0) > databaseVersion) {
    return invalid('Esta cópia é de uma versão mais nova do Tabularium. Atualize o app.');
  }
  for (const [name, records] of Object.entries(backup.tables)) {
    if (!ALL_TABLES.includes(name as TableName) || !Array.isArray(records)) {
      return invalid('A cópia está incompleta ou foi alterada.');
    }
    if (records.some((record) => !record || typeof record !== 'object')) {
      return invalid('A cópia está incompleta ou foi alterada.');
    }
  }
  for (const [name, records] of Object.entries(backup.tables)) {
    const valid = RECORD_CHECKS[name as TableName];
    if (records.some((record) => !valid(record as Row))) {
      return invalid('A cópia está incompleta ou foi alterada.');
    }
  }
  return ok(backup as Backup);
}

type Row = Record<string, unknown>;

const isText = (value: unknown) => typeof value === 'string' && value.length > 0;
/** Registro de uma campanha: `campaignId` e `id` de texto, mais o que cada tabela pede. */
const inCampaign = (record: Row) => isText(record.campaignId) && isText(record.id);
const bytes = (record: Row) => (record.data instanceof Uint8Array ? record.data : null);

/**
 * O que cada tabela da cópia precisa ter para ser restaurada. Fichas, campanhas, sistemas,
 * diário, chat e rolagens passam pelos mesmos schemas de quando chegam pela sessão; imagens e
 * trilhas conferem o tipo pelos primeiros bytes. Uma cópia é escolhida pela própria pessoa,
 * mas pode ter vindo de outro lugar: nada entra no banco sem conferência.
 */
const RECORD_CHECKS: Record<TableName, (record: Row) => boolean> = {
  templates: (record) => SystemTemplateSchema.safeParse(record).success,
  sheets: (record) => CharacterSheetSchema.safeParse(record).success,
  campaigns: (record) => CampaignSchema.safeParse(record).success,
  settings: (record) => isText(record.key),
  drafts: (record) => isText(record.id),
  sessionStates: (record) =>
    isText(record.campaignId) && isText(record.key) && record.state instanceof Uint8Array,
  secretValues: (record) =>
    isText(record.campaignId) &&
    isText(record.sheetId) &&
    typeof record.values === 'object' &&
    record.values !== null,
  gmKeys: (record) => isText(record.campaignId) && isText(record.secretKey),
  journal: (record) => inCampaign(record) && JournalEntrySchema.safeParse(record.entry).success,
  chat: (record) => inCampaign(record) && ChatMessageSchema.safeParse(record.message).success,
  rollLog: (record) => inCampaign(record) && RollEntrySchema.safeParse(record.entry).success,
  images: (record) => {
    const data = bytes(record);
    const meta = StoredImageSchema.safeParse(record.meta);
    return (
      inCampaign(record) &&
      data !== null &&
      meta.success &&
      meta.data.size === data.byteLength &&
      sniffImageMime(data) === meta.data.mime
    );
  },
  tracks: (record) => {
    const data = bytes(record);
    const meta = StoredTrackSchema.safeParse(record.meta);
    return (
      inCampaign(record) &&
      data !== null &&
      meta.success &&
      meta.data.size === data.byteLength &&
      sniffAudioMime(data) === meta.data.mime
    );
  },
};

export function summarize(backup: Backup): BackupSummary {
  const count = (name: TableName) => backup.tables[name]?.length ?? 0;
  return {
    exportedAt: backup.exportedAt,
    sheets: count('sheets'),
    campaigns: count('campaigns'),
    templates: count('templates'),
    media: count('images') + count('tracks'),
  };
}

/** Substitui o conteúdo do aparelho pelo da cópia (tudo ou nada). */
export async function restoreBackup(db: TabulaDatabase, backup: Backup): Promise<void> {
  const present = ALL_TABLES.filter((name) => backup.tables[name] !== undefined);
  await db.transaction('rw', present as unknown as string[], async () => {
    for (const name of present) {
      const table = db.table(name);
      await table.clear();
      await table.bulkPut(backup.tables[name] as unknown[]);
    }
  });
}
