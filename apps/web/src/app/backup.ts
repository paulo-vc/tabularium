import { err, type Issue, type Result } from '@tabula/domain';
import {
  createBackup,
  MAX_BACKUP_BYTES,
  ownMediaBytes,
  readBackup,
  restoreBackup,
  summarize,
  type Backup,
  type BackupSummary,
  type TabulaDatabase,
} from '@tabula/storage';
import type { ExportFile } from './files';
import type { LiveSessionManager } from './live-session';
import type { Clock } from './sheets';

/** Quando foi a última cópia (ou restauração) neste aparelho. */
const LAST_BACKUP_KEY = 'ultimaCopia';
/** Até quando o lembrete de fazer a cópia fica escondido ("Agora não"). */
const SNOOZE_KEY = 'lembreteCopia';

/** Depois de quanto tempo sem cópia o app lembra de fazer uma. */
export const BACKUP_REMINDER_MS = 30 * 24 * 60 * 60 * 1000;

export interface InspectedBackup {
  backup: Backup;
  summary: BackupSummary;
}

/**
 * Cópia de segurança do aparelho inteiro (ver `@tabula/storage`, `backup.ts`). Restaurar
 * substitui tudo, inclusive a identidade: é como o Mestre leva as campanhas para outro
 * aparelho.
 */
export class BackupService {
  constructor(
    private readonly db: TabulaDatabase,
    private readonly session: LiveSessionManager,
    private readonly clock: Clock,
  ) {}

  /** Gera o arquivo da cópia. `media`: inclui as imagens e trilhas do Mestre. */
  async create(media: boolean): Promise<ExportFile> {
    const now = new Date(this.clock.now());
    const content = await createBackup(this.db, { media, now });
    await this.db.settings.put({ key: LAST_BACKUP_KEY, value: now.getTime() });
    const date = now.toISOString().slice(0, 10);
    return { filename: `tabularium-copia-${date}.json`, content };
  }

  /** Quanto as imagens e trilhas do Mestre somariam à cópia (bytes). */
  mediaBytes(): Promise<number> {
    return ownMediaBytes(this.db);
  }

  async lastBackupAt(): Promise<number | undefined> {
    const value = (await this.db.settings.get(LAST_BACKUP_KEY))?.value;
    return typeof value === 'number' ? value : undefined;
  }

  /**
   * Lembrar de fazer a cópia? Só quando há algo a perder (fichas ou campanhas), a última
   * cópia tem mais de um mês (ou nunca houve) e o lembrete não foi adiado.
   */
  async shouldRemind(): Promise<boolean> {
    const now = this.clock.now();
    const snoozed = (await this.db.settings.get(SNOOZE_KEY))?.value;
    if (typeof snoozed === 'number' && snoozed > now) return false;
    const last = await this.lastBackupAt();
    if (last !== undefined && now - last < BACKUP_REMINDER_MS) return false;
    return (await this.db.sheets.count()) + (await this.db.campaigns.count()) > 0;
  }

  /** "Agora não": o lembrete volta depois de um mês. */
  async snoozeReminder(): Promise<void> {
    await this.db.settings.put({ key: SNOOZE_KEY, value: this.clock.now() + BACKUP_REMINDER_MS });
  }

  /** Lê o arquivo escolhido e diz o que ele tem (sem restaurar ainda). */
  async inspect(file: File): Promise<Result<InspectedBackup, Issue>> {
    if (file.size > MAX_BACKUP_BYTES) {
      return err({
        code: 'copia-grande-demais',
        path: [],
        message: 'O arquivo é grande demais para uma cópia do Tabularium.',
      });
    }
    const read = readBackup(await file.text(), this.db.verno);
    if (!read.ok) return read;
    return { ok: true, value: { backup: read.value, summary: summarize(read.value) } };
  }

  /**
   * Substitui o conteúdo do aparelho pela cópia. Encerra a sessão antes; depois, quem chama
   * recarrega o app (a identidade e os dados em memória mudaram).
   */
  async restore(backup: Backup): Promise<void> {
    await this.session.stop();
    await restoreBackup(this.db, backup);
    await this.db.settings.put({ key: LAST_BACKUP_KEY, value: Date.parse(backup.exportedAt) });
  }
}
