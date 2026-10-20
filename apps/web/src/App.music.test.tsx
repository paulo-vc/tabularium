import { inviteFor } from '@tabula/domain';
import { TabulaDatabase } from '@tabula/storage';
import { MemoryNetwork } from '@tabula/sync';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { App } from './App';
import { createServices, type Services } from './app/services';

let network: MemoryNetwork;
let gmDb: TabulaDatabase;
let playerDb: TabulaDatabase;
let gm: Services;
let player: Services;

beforeEach(() => {
  window.location.hash = '';
  network = new MemoryNetwork();
  gmDb = new TabulaDatabase(`ui-musica-mestre-${crypto.randomUUID()}`);
  playerDb = new TabulaDatabase(`ui-musica-jogador-${crypto.randomUUID()}`);
  const createTransport = () => network.join();
  gm = createServices(gmDb, { createTransport });
  player = createServices(playerDb, { createTransport });
});

afterEach(async () => {
  cleanup();
  await gm.session.stop();
  await player.session.stop();
  await network.settle();
  for (const db of [gmDb, playerDb]) {
    db.close();
    await db.delete();
  }
});

/** "MP3" de teste: marca ID3 e o resto pseudoaleatório (o conteúdo não importa). */
function fakeMp3(size = 600_000): Uint8Array<ArrayBuffer> {
  const bytes = new Uint8Array(size);
  let x = 7;
  for (let i = 0; i < size; i++) bytes[i] = (x = (x * 1103515245 + 12345) & 0x7fffffff) & 0xff;
  bytes.set([0x49, 0x44, 0x33], 0);
  return bytes;
}

const until = (assertion: () => void | Promise<void>) =>
  waitFor(
    async () => {
      await network.settle();
      await assertion();
    },
    { timeout: 4000 },
  );

async function setUpTable() {
  const campaign = await gm.campaigns.create({
    name: 'A Mina Perdida',
    templateId: 'dnd5e-srd',
    gmName: 'Paulo',
  });
  await player.campaigns.join(inviteFor(campaign), 'Ana');
  const created = await player.campaigns.createLinkedSheet(campaign.id, 'Lia');
  if (!created.ok) throw new Error(created.error.message);
  return { campaign };
}

const playerMusic = () => {
  const snapshot = player.session.getSnapshot();
  return snapshot.kind === 'jogador' ? snapshot.music : undefined;
};

describe('música do Mestre', () => {
  it('o Mestre adiciona uma trilha e toca; a jogadora recebe, guarda e acompanha a pausa', async () => {
    const { campaign } = await setUpTable();
    window.location.hash = `#/campanhas/${campaign.id}`;
    const user = userEvent.setup();
    render(<App services={gm} />);
    await user.click(await screen.findByRole('button', { name: 'Iniciar sessão' }));
    await player.session.joinAsPlayer(campaign.id);
    await until(() => expect(playerMusic()).toBeNull());

    await user.click(screen.getByRole('tab', { name: /Música/ }));
    await user.upload(
      screen.getByLabelText('Arquivo da trilha'),
      new File([fakeMp3()], 'Taverna_do_Javali.mp3', { type: 'audio/mpeg' }),
    );
    const list = await screen.findByRole('list', { name: 'Trilhas' });
    expect(list).toHaveTextContent('Taverna do Javali');

    await user.click(within(list).getByRole('button', { name: 'Tocar Taverna do Javali' }));
    const now = await screen.findByRole('region', { name: 'Tocando agora' });
    expect(now).toHaveTextContent('Tocando para a mesa');

    // A jogadora baixa a trilha, guarda e passa a tocar.
    await until(() =>
      expect(playerMusic()).toMatchObject({
        ready: true,
        state: { playing: true, loop: true, track: { title: 'Taverna do Javali' } },
      }),
    );
    expect(
      await player.music.byHash(campaign.id, playerMusic()?.state.track.hash ?? ''),
    ).toBeDefined();

    // Pausar chega à mesa; parar também.
    await user.click(within(now).getByRole('button', { name: 'Pausar' }));
    await until(() => expect(playerMusic()).toMatchObject({ state: { playing: false } }));
    await user.click(screen.getByRole('button', { name: 'Parar a música' }));
    await until(() => expect(playerMusic()).toBeNull());
  });

  it('a jogadora vê o que toca no canto da tela, e a música para sem o Mestre', async () => {
    const { campaign } = await setUpTable();
    await gm.session.startAsGameMaster(campaign.id);
    const added = await gm.music.add(
      campaign.id,
      new File([fakeMp3(300_000)], 'Suspense.mp3', { type: 'audio/mpeg' }),
    );
    if (!added.ok) throw new Error(added.error.message);
    await player.session.joinAsPlayer(campaign.id);
    await until(() => expect(playerMusic()).toBeNull());
    await gm.session.playTrack(campaign.id, added.value.id);

    window.location.hash = '#/';
    render(<App services={player} />);
    await until(() => {
      expect(screen.getByRole('region', { name: 'Música da mesa' })).toHaveTextContent('Suspense');
    });
    const region = screen.getByRole('region', { name: 'Música da mesa' });
    expect(within(region).getByRole('button', { name: 'Volume da música' })).toBeInTheDocument();

    await gm.session.stop();
    await until(() => expect(screen.queryByRole('region', { name: 'Música da mesa' })).toBeNull());
  });

  it('arquivo que não é áudio é recusado', async () => {
    const { campaign } = await setUpTable();
    const result = await gm.music.add(
      campaign.id,
      new File(['<svg xmlns="http://www.w3.org/2000/svg"/>'], 'falso.mp3', { type: 'audio/mpeg' }),
    );
    expect(result.ok).toBe(false);
    expect(await gm.music.list(campaign.id)).toEqual([]);
  });
});
