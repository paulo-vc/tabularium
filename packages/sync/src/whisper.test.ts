import type { ChatMessage } from '@tabula/domain';
import { describe, expect, it, vi } from 'vitest';
import { SessionClient } from './client';
import { SessionHost } from './host';
import { MemoryNetwork } from './memory-transport';
import { newSheet, TEMPLATE } from './test-helpers';
import { generateWhisperKeys, openWhisper, sealWhisper } from './whisper';

const CAMPAIGN = { id: 'campanha', gmId: 'mestre', gmName: 'Paulo', templateId: TEMPLATE.id };

const secret = (
  to: string,
  text = 'O Mestre não pode ler isto',
): ChatMessage & {
  to: string;
  toName: string;
} => ({
  id: crypto.randomUUID(),
  at: 1,
  authorId: 'ana',
  authorName: 'ana',
  kind: 'fala',
  text,
  to,
  toName: to,
});

function setUp() {
  const network = new MemoryNetwork();
  const host = new SessionHost(network.join(), CAMPAIGN);
  const atHost: ChatMessage[] = [];
  host.onChat((m) => atHost.push(m));
  host.start();
  const join = (userId: string, sheetId: string) => {
    const received: ChatMessage[] = [];
    let peers: string[] = [];
    const client = new SessionClient(
      network.join(),
      CAMPAIGN,
      { userId, displayName: userId },
      newSheet(sheetId, userId),
      undefined,
      {
        onChat: (messages) => received.push(...messages),
        onWhisperPeers: (list) => (peers = list.map((p) => p.userId)),
      },
    );
    client.start();
    return { client, received, peers: () => peers };
  };
  return { network, host, atHost, join };
}

describe('sussurro entre jogadores', () => {
  it('chega só a quem recebe; o Mestre repassa sem ver', async () => {
    const { network, atHost, join } = setUp();
    const ana = join('ana', 's1');
    const bia = join('bia', 's2');
    const caio = join('caio', 's3');
    await network.settle();
    expect(ana.peers()).toEqual(['bia', 'caio']);
    expect(bia.peers()).toEqual(['ana', 'caio']);

    const message = secret('bia');
    expect(await ana.client.whisper(message)).toBe(true);
    await network.settle();
    await vi.waitFor(() => expect(bia.received).toEqual([message]));
    expect(caio.received).toEqual([]);
    expect(atHost).toEqual([]);
  });

  it('quem sai deixa a lista; sem a pessoa online, não dá para sussurrar', async () => {
    const { network, join } = setUp();
    const ana = join('ana', 's1');
    const bia = join('bia', 's2');
    await network.settle();
    await bia.client.stop();
    await network.settle();
    expect(ana.peers()).toEqual([]);
    expect(await ana.client.whisper(secret('bia'))).toBe(false);
  });

  it('a cifra não leva o texto, e mudar quem manda ou o conteúdo invalida', async () => {
    const ana = generateWhisperKeys();
    const bia = generateWhisperKeys();
    const sealed = await sealWhisper(ana, bia.publicKey, secret('bia', 'senha da porta'));
    if (!sealed) throw new Error('não cifrou');
    expect(JSON.stringify(sealed)).not.toContain('senha');

    expect(await openWhisper(bia, ana.publicKey, sealed)).toMatchObject({
      text: 'senha da porta',
    });
    // Outro par de chaves (alguém que não é a Ana) não abre.
    expect(await openWhisper(bia, generateWhisperKeys().publicKey, sealed)).toBeNull();
    // Reatribuir a outra pessoa, ou mexer no conteúdo, também não.
    expect(await openWhisper(bia, ana.publicKey, { ...sealed, authorId: 'caio' })).toBeNull();
    const box = sealed.box.slice(0, -2) + (sealed.box.endsWith('AA') ? 'BB' : 'AA');
    expect(await openWhisper(bia, ana.publicKey, { ...sealed, box })).toBeNull();
  });
});
