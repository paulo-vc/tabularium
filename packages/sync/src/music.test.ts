import type { MusicState, TrackInfo } from '@tabula/domain';
import { describe, expect, it } from 'vitest';
import { SessionClient } from './client';
import { hashBytes } from './file-transfer';
import { SessionHost } from './host';
import { generateGmKeyPair } from './identity';
import { MemoryNetwork } from './memory-transport';
import { encodeMusic, encodeTrackPart } from './protocol';
import { newSheet, TEMPLATE } from './test-helpers';

const gm = generateGmKeyPair();
const CAMPAIGN = { id: 'campanha', gmId: 'mestre', gmName: 'Paulo', templateId: TEMPLATE.id };

/** "MP3" de ~1 MB (4 partes): marca ID3 e o resto pseudoaleatório. */
function fakeMp3(size = 1_000_000, seed = 7): Uint8Array {
  const bytes = new Uint8Array(size);
  let x = seed;
  for (let i = 0; i < size; i++) bytes[i] = (x = (x * 1103515245 + 12345) & 0x7fffffff) & 0xff;
  bytes.set([0x49, 0x44, 0x33], 0);
  return bytes;
}

const trackFor = (data: Uint8Array, title = 'Taverna'): TrackInfo => ({
  hash: hashBytes(data),
  mime: 'audio/mpeg',
  size: data.byteLength,
  title,
});
const playing = (track: TrackInfo, position = 0): MusicState => ({
  track,
  playing: true,
  loop: true,
  position,
});

function startHost(network: MemoryNetwork) {
  const host = new SessionHost(network.join(), { ...CAMPAIGN, identity: gm });
  host.start();
  return host;
}

function startPlayer(network: MemoryNetwork, userId = 'ana', sheetId = 's1') {
  const seen: (MusicState | null)[] = [];
  const tracks: { hash: string; data: Uint8Array }[] = [];
  const progress: number[] = [];
  const transport = network.join();
  const client = new SessionClient(
    transport,
    { id: CAMPAIGN.id, gmId: CAMPAIGN.gmId, gmKey: gm.publicKey },
    { userId, displayName: userId },
    newSheet(sheetId, userId),
    undefined,
    {
      onMusic: (music) => seen.push(music),
      onTrack: (hash, data) => tracks.push({ hash, data }),
      onTrackProgress: (_hash, received) => progress.push(received),
    },
  );
  client.start();
  return { client, seen, tracks, progress, transport };
}

describe('música na sessão', () => {
  it('o Mestre toca; quem não tem a trilha pede e a recebe inteira e conferida', async () => {
    const network = new MemoryNetwork();
    const host = startHost(network);
    const { client, seen, tracks, progress } = startPlayer(network);
    await network.settle();

    const data = fakeMp3();
    const track = trackFor(data);
    host.setMusic(playing(track), data);
    await network.settle();
    expect(seen.at(-1)).toMatchObject({ playing: true, loop: true, track: { title: 'Taverna' } });

    client.requestTrack(track.hash);
    await network.settle();
    expect(tracks).toHaveLength(1);
    expect(tracks[0]?.data).toEqual(data);
    // O progresso conta as partes que chegaram antes da última.
    expect(progress).toEqual([1, 2, 3]);

    // Pausar manda o ponto em que parou; parar desliga.
    host.setMusic({ ...playing(track, 42), playing: false }, data);
    host.setMusic(null);
    await network.settle();
    expect(seen.slice(-2)).toEqual([{ ...playing(track, 42), playing: false }, null]);
  });

  it('quem entra depois ouve a música que está tocando', async () => {
    const network = new MemoryNetwork();
    const host = startHost(network);
    const data = fakeMp3(300_000);
    host.setMusic(playing(trackFor(data), 10), data);
    const { seen } = startPlayer(network);
    await network.settle();
    expect(seen.at(-1)).toMatchObject({ position: 10, track: { size: 300_000 } });
  });

  it('o Mestre só entrega a trilha que está tocando, e no máximo 3 vezes por jogador', async () => {
    const network = new MemoryNetwork();
    const host = startHost(network);
    const { client, tracks } = startPlayer(network);
    await network.settle();
    const data = fakeMp3(300_000);
    host.setMusic(playing(trackFor(data)), data);
    await network.settle();

    // Pedir outra trilha (ex.: da biblioteca do Mestre) não baixa nada.
    client.requestTrack(hashBytes(fakeMp3(300_000, 99)));
    for (let i = 0; i < 5; i++) client.requestTrack(hashBytes(data));
    await network.settle();
    expect(tracks).toHaveLength(1); // a primeira completa; as repetidas param no limite
  });

  it('partes adulteradas ou de quem não é o Mestre não formam a trilha', async () => {
    const network = new MemoryNetwork();
    const host = startHost(network);
    const { client, tracks } = startPlayer(network);
    const intruder = startPlayer(network, 'bia', 's2');
    await network.settle();
    const data = fakeMp3(300_000);
    const track = trackFor(data);
    host.setMusic(playing(track), data);
    await network.settle();

    // A jogadora pede, mas é a intrusa que manda as partes (adulteradas).
    client.requestTrack(track.hash);
    const forged = data.slice();
    forged[100] = (forged[100] ?? 0) ^ 0xff;
    for (const peer of network.peersOf(intruder.transport)) {
      intruder.transport.send(peer, encodeMusic(playing(trackFor(forged, 'Falsa'))));
      intruder.transport.send(peer, encodeTrackPart(track.hash, 0, 2, forged.subarray(0, 262144)));
    }
    await network.settle();
    expect(tracks).toHaveLength(1);
    expect(tracks[0]?.data).toEqual(data);
  });

  it('arquivo que não é áudio (mesmo com o hash certo) é recusado', async () => {
    const network = new MemoryNetwork();
    const host = startHost(network);
    const { client, tracks } = startPlayer(network);
    await network.settle();
    const notAudio = new Uint8Array(1000).fill(0x3c); // "<<<<": não é MP3 nem OGG
    host.setMusic(playing({ ...trackFor(notAudio), mime: 'audio/mpeg' }), notAudio);
    await network.settle();
    client.requestTrack(hashBytes(notAudio));
    await network.settle();
    expect(tracks).toEqual([]);
  });
});
