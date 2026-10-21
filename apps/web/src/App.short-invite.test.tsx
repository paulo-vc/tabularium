import { inviteFor } from '@tabula/domain';
import { TabulaDatabase } from '@tabula/storage';
import { MemoryNetwork, shortInviteCode } from '@tabula/sync';
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
  gmDb = new TabulaDatabase(`ui-curto-mestre-${crypto.randomUUID()}`);
  playerDb = new TabulaDatabase(`ui-curto-jogador-${crypto.randomUUID()}`);
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

const until = (assertion: () => void) =>
  waitFor(
    async () => {
      await network.settle();
      assertion();
    },
    { timeout: 4000 },
  );

describe('convite curto', () => {
  it('a jogadora digita o código curto e chega ao convite, com a sessão do Mestre aberta', async () => {
    const campaign = await gm.campaigns.create({
      name: 'A Mina Perdida',
      templateId: 'dnd5e-srd',
      gmName: 'Paulo',
    });
    const code = shortInviteCode(inviteFor(campaign));
    if (!code) throw new Error('sem código curto');
    await gm.session.startAsGameMaster(campaign.id);

    window.location.hash = '#/campanhas';
    const user = userEvent.setup();
    render(<App services={player} />);
    await user.click(await screen.findByRole('button', { name: 'Entrar com convite' }));
    const dialog = await screen.findByRole('dialog');
    // Digitado como alguém ditando: minúsculas e espaços.
    await user.type(
      within(dialog).getByLabelText('Convite'),
      code.toLowerCase().replace(/-/g, ' '),
    );
    await user.click(within(dialog).getByRole('button', { name: 'Continuar' }));

    await until(() => {
      expect(screen.getByRole('button', { name: 'Entrar na campanha' })).toBeInTheDocument();
    });
    expect(screen.getByText(/A Mina Perdida/)).toBeInTheDocument();
  });
});
