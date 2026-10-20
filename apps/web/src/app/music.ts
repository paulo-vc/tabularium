import {
  err,
  MAX_TRACK_BYTES,
  ok,
  sniffAudioMime,
  type Issue,
  type Result,
  type StoredTrack,
  type TrackRepository,
  type TrackWithData,
} from '@tabula/domain';
import { hashBytes } from '@tabula/sync';
import type { Clock, IdGenerator } from './sheets';

const invalid = (message: string): Result<never, Issue> =>
  err({ code: 'trilha-invalida', path: [], message });

/** "Taverna do Javali.mp3" → "Taverna do Javali". */
const titleOf = (fileName: string) =>
  fileName
    .replace(/\.[^.]+$/, '')
    .replace(/[_-]+/g, ' ')
    .trim()
    .slice(0, 100) || 'Trilha';

/** Biblioteca de trilhas da campanha (do Mestre), para tocar na mesa. */
export class MusicService {
  constructor(
    private readonly tracks: TrackRepository,
    private readonly clock: Clock,
    private readonly ids: IdGenerator,
  ) {}

  /** Das mais recentes para as mais antigas (só os dados, sem o conteúdo). */
  list(campaignId: string): Promise<StoredTrack[]> {
    return this.tracks.list(campaignId, 'biblioteca');
  }

  get(campaignId: string, trackId: string): Promise<TrackWithData | undefined> {
    return this.tracks.get(campaignId, trackId);
  }

  /** Trilha pelo conteúdo (o jogador a guarda ao recebê-la). */
  byHash(campaignId: string, hash: string): Promise<TrackWithData | undefined> {
    return this.tracks.findByHash(campaignId, hash);
  }

  /**
   * Guarda uma trilha na biblioteca. Vai aos jogadores como está (sem conversão): só MP3 ou
   * OGG, conferidos pelos primeiros bytes, e até 8 MB.
   */
  async add(campaignId: string, file: File): Promise<Result<StoredTrack, Issue>> {
    if (file.size > MAX_TRACK_BYTES) {
      return invalid('A trilha é grande demais (até 8 MB). Use um MP3 mais curto ou mais leve.');
    }
    const data = Uint8Array.from(new Uint8Array(await file.arrayBuffer()));
    const mime = sniffAudioMime(data);
    if (!mime) return invalid('Use um arquivo de áudio MP3 ou OGG.');
    const meta: StoredTrack = {
      id: this.ids.newId(),
      origin: 'biblioteca',
      hash: hashBytes(data),
      mime,
      size: data.byteLength,
      title: titleOf(file.name),
      createdAt: this.clock.now(),
    };
    await this.tracks.save(campaignId, { meta, data });
    return ok(meta);
  }

  async rename(campaignId: string, trackId: string, title: string): Promise<void> {
    const track = await this.tracks.get(campaignId, trackId);
    const next = title.trim().slice(0, 100);
    if (!track || !next) return;
    await this.tracks.save(campaignId, { meta: { ...track.meta, title: next }, data: track.data });
  }

  async delete(campaignId: string, trackId: string): Promise<void> {
    await this.tracks.delete(campaignId, trackId);
  }
}
