import 'fake-indexeddb/auto';
import {
  compileTemplate,
  createCampaign,
  createSheet,
  type CharacterSheet,
  type SystemTemplate,
} from '@tabula/domain';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createBackup, readBackup, restoreBackup, summarize } from './backup';
import { TabulaDatabase } from './database';
import {
  DexieCampaignRepository,
  DexieDeviceRepository,
  DexieGmKeyRepository,
  DexieSheetRepository,
  DexieTemplateRepository,
  DexieTrackRepository,
} from './repositories';

const TEMPLATE: SystemTemplate = {
  id: 'meu-sistema',
  version: '1.0.0',
  name: 'Meu Sistema',
  source: 'local',
  fields: [{ id: 'vida', key: 'vida', label: 'Vida', type: 'resource', default: 10 }],
  layouts: { full: [{ kind: 'field', fieldId: 'vida' }] },
};

function sheet(id: string): CharacterSheet {
  const compiled = compileTemplate(TEMPLATE);
  if (!compiled.ok) throw new Error('template de teste inválido');
  return createSheet(compiled.value, { id, name: `Ficha ${id}`, ownerId: 'u1', now: 1 });
}

const mp3 = (size: number) => {
  const data = new Uint8Array(size);
  data.set([0x49, 0x44, 0x33], 0);
  return data;
};
const track = (id: string, origin: 'biblioteca' | 'recebida') => ({
  meta: {
    id,
    hash: (id === 'minha' ? 'a' : id === 'recebida' ? 'b' : 'c').repeat(64),
    mime: 'audio/mpeg' as const,
    size: 50,
    title: id,
    origin,
    createdAt: 1,
  },
  data: mp3(50),
});

let old: TabulaDatabase;
let fresh: TabulaDatabase;

beforeEach(() => {
  old = new TabulaDatabase(`copia-antigo-${crypto.randomUUID()}`);
  fresh = new TabulaDatabase(`copia-novo-${crypto.randomUUID()}`);
});

afterEach(async () => {
  await old.delete();
  await fresh.delete();
});

/** O aparelho antigo: o Mestre de uma campanha, com uma ficha e trilhas. */
async function fillOldDevice() {
  const deviceId = await new DexieDeviceRepository(old).getDeviceId();
  await new DexieTemplateRepository(old).save(TEMPLATE);
  await new DexieSheetRepository(old).save(sheet('lia'));
  await new DexieCampaignRepository(old).save(
    createCampaign({
      id: 'c1',
      name: 'A Mina Perdida',
      gm: { userId: deviceId, displayName: 'Paulo' },
      template: TEMPLATE,
      secret: 'segredo-de-22-caracter',
      now: 1,
    }),
  );
  await new DexieGmKeyRepository(old).save({ campaignId: 'c1', secretKey: 'A'.repeat(43) });
  const tracks = new DexieTrackRepository(old);
  await tracks.save('c1', track('minha', 'biblioteca'));
  await tracks.save('c1', track('recebida', 'recebida'));
  return deviceId;
}

describe('cópia de segurança', () => {
  it('o aparelho novo assume tudo: identidade, chave do Mestre, fichas e campanha', async () => {
    const deviceId = await fillOldDevice();
    // O aparelho novo já tinha um ID e uma ficha própria: a restauração substitui.
    await new DexieDeviceRepository(fresh).getDeviceId();
    await new DexieSheetRepository(fresh).save(sheet('rascunho'));

    const text = await createBackup(old, { media: true });
    const read = readBackup(text, fresh.verno);
    if (!read.ok) throw new Error(read.error.message);
    expect(summarize(read.value)).toMatchObject({
      sheets: 1,
      campaigns: 1,
      templates: 1,
      media: 1,
    });
    await restoreBackup(fresh, read.value);

    expect(await new DexieDeviceRepository(fresh).getDeviceId()).toBe(deviceId);
    expect((await new DexieSheetRepository(fresh).list()).map((s) => s.id)).toEqual(['lia']);
    expect((await new DexieCampaignRepository(fresh).get('c1'))?.gmId).toBe(deviceId);
    expect(await new DexieGmKeyRepository(fresh).get('c1')).toEqual({
      campaignId: 'c1',
      secretKey: 'A'.repeat(43),
    });
    // A trilha do Mestre vem inteira; a recebida não (volta a baixar na sessão).
    const tracks = new DexieTrackRepository(fresh);
    const mine = await tracks.get('c1', 'minha');
    expect(mine?.data).toEqual(mp3(50));
    expect(await tracks.get('c1', 'recebida')).toBeUndefined();
  });

  it('sem imagens e trilhas, as do aparelho ficam como estavam', async () => {
    await fillOldDevice();
    await new DexieTrackRepository(fresh).save('c9', track('daqui', 'biblioteca'));
    const read = readBackup(await createBackup(old, { media: false }), fresh.verno);
    if (!read.ok) throw new Error(read.error.message);
    expect(summarize(read.value).media).toBe(0);
    await restoreBackup(fresh, read.value);
    expect(await new DexieTrackRepository(fresh).get('c9', 'daqui')).toBeDefined();
  });

  it('recusa o que não é cópia, cópia alterada e cópia de versão mais nova', async () => {
    await fillOldDevice();
    const text = await createBackup(old, { media: false });
    expect(readBackup('{"format":"outro"}', fresh.verno).ok).toBe(false);
    expect(readBackup('não é json', fresh.verno).ok).toBe(false);

    const altered = JSON.parse(text) as { tables: { sheets: { name: unknown }[] } };
    (altered.tables.sheets[0] as { name: unknown }).name = 42;
    expect(readBackup(JSON.stringify(altered), fresh.verno).ok).toBe(false);

    const newer = readBackup(text, fresh.verno - 1);
    expect(newer.ok).toBe(false);
    if (!newer.ok) expect(newer.error.message).toContain('versão mais nova');
  });
});
