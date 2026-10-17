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
  gmDb = new TabulaDatabase(`ui-bonus-mestre-${crypto.randomUUID()}`);
  playerDb = new TabulaDatabase(`ui-bonus-jogador-${crypto.randomUUID()}`);
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

/** Espera a interface, processando a rede simulada a cada tentativa. */
const until = (assertion: () => void | Promise<void>) =>
  waitFor(
    async () => {
      await network.settle();
      await assertion();
    },
    { timeout: 4000 },
  );

function renderApp(services: Services, hash: string) {
  window.location.hash = hash;
  const user = userEvent.setup();
  render(<App services={services} />);
  return user;
}

describe('bônus de itens, maldições e bênçãos', () => {
  /** Adiciona um bônus pela seção "Bônus e efeitos" (aba Combate do D&D). */
  async function addBonus(
    user: ReturnType<typeof userEvent.setup>,
    name: string,
    search: string,
    field: string,
    value: string,
  ) {
    await user.click(screen.getByRole('tab', { name: 'Combate' }));
    const section = await screen.findByRole('group', { name: 'Bônus e efeitos' });
    await user.click(within(section).getByRole('button', { name: 'Adicionar bônus' }));
    const dialog = await screen.findByRole('dialog', { name: 'Novo bônus' });
    await user.type(within(dialog).getByLabelText('Nome'), name);
    await user.click(within(dialog).getByRole('combobox', { name: 'Campo 1' }));
    await user.type(within(dialog).getByLabelText('Buscar campo'), search);
    await user.click(within(dialog).getByRole('option', { name: field }));
    await user.clear(within(dialog).getByLabelText('Valor 1'));
    await user.type(within(dialog).getByLabelText('Valor 1'), value);
    await user.click(within(dialog).getByRole('button', { name: 'Salvar' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    return section;
  }

  it('a jogadora põe +2 de Força por um item; o modificador acompanha, e desligar volta', async () => {
    const sheet = await player.sheets.create({ name: 'Lia', templateId: 'dnd5e-srd' });
    const user = renderApp(player, `#/fichas/${sheet.id}`);
    // Força 10: modificador 0.
    expect(await screen.findByRole('status', { name: 'Mod. Força' })).toHaveTextContent(/^0$/);
    // No D&D, os bônus ficam numa seção da aba Combate, não num botão no topo.
    expect(screen.queryByRole('button', { name: 'Bônus' })).not.toBeInTheDocument();

    const section = await addBonus(user, 'Cinto de Força', 'forca', 'Força', '2');
    const list = await within(section).findByRole('list', { name: 'Bônus da ficha' });
    expect(list).toHaveTextContent('Cinto de Força');
    expect(list).toHaveTextContent('Força +2');

    // Força 12 com o cinto: modificador +1, e o campo mostra o valor com bônus.
    await user.click(screen.getByRole('tab', { name: 'Principal' }));
    await waitFor(() =>
      expect(screen.getByRole('status', { name: 'Mod. Força' })).toHaveTextContent('+1'),
    );
    expect(screen.getByRole('button', { name: /^Força com bônus: 12/ })).toBeInTheDocument();

    // Desligar o bônus volta ao valor de antes.
    await user.click(screen.getByRole('tab', { name: 'Combate' }));
    await user.click(await screen.findByRole('checkbox', { name: 'Cinto de Força ativo' }));
    await user.click(screen.getByRole('tab', { name: 'Principal' }));
    await waitFor(() =>
      expect(screen.getByRole('status', { name: 'Mod. Força' })).toHaveTextContent(/^0$/),
    );
    expect((await player.sheetRepository.get(sheet.id))?.bonuses).toEqual([
      expect.objectContaining({ name: 'Cinto de Força', active: false }),
    ]);
  });

  it('um bônus numa perícia muda só aquela perícia', async () => {
    const sheet = await player.sheets.create({ name: 'Lia', templateId: 'dnd5e-srd' });
    const user = renderApp(player, `#/fichas/${sheet.id}`);
    await screen.findByRole('status', { name: 'Mod. Força' });
    await addBonus(user, 'Luvas do Ladrão', 'furt', 'Furtividade (Des)', '2');

    await user.click(screen.getByRole('tab', { name: 'Principal' }));
    await waitFor(() =>
      expect(screen.getByRole('status', { name: 'Furtividade (Des)' })).toHaveTextContent('+2'),
    );
    expect(screen.getByRole('status', { name: 'Acrobacia (Des)' })).toHaveTextContent(/^0$/);
    expect(screen.getByRole('status', { name: 'Prestidigitação (Des)' })).toHaveTextContent(/^0$/);
  });

  it('a busca de campo ignora acentos e agrupa pelas seções da ficha', async () => {
    const sheet = await player.sheets.create({ name: 'Lia', templateId: 'dnd5e-srd' });
    const user = renderApp(player, `#/fichas/${sheet.id}`);
    await user.click(await screen.findByRole('tab', { name: 'Combate' }));
    const section = await screen.findByRole('group', { name: 'Bônus e efeitos' });
    await user.click(within(section).getByRole('button', { name: 'Adicionar bônus' }));
    const dialog = await screen.findByRole('dialog', { name: 'Novo bônus' });
    await user.click(within(dialog).getByRole('combobox', { name: 'Campo 1' }));
    await user.type(within(dialog).getByLabelText('Buscar campo'), 'percepcao');
    const fields = within(dialog).getByRole('listbox', { name: 'Campos' });
    expect(within(fields).getByRole('group', { name: 'Perícias' })).toHaveTextContent(
      'Percepção (Sab)',
    );
    // Marcadores (testes contra a morte) não são alvo de bônus.
    await user.clear(within(dialog).getByLabelText('Buscar campo'));
    await user.type(within(dialog).getByLabelText('Buscar campo'), 'morte');
    expect(within(dialog).getByText('Nenhum campo com esse nome.')).toBeInTheDocument();
  });

  it('num sistema sem aba de bônus, eles ficam num botão no topo da ficha', async () => {
    await player.files.installTemplate({
      id: 'simples',
      version: '1.0.0',
      name: 'Sistema Simples',
      source: 'local',
      fields: [{ id: 'forca', key: 'forca', label: 'Força', type: 'number', default: 10 }],
      layouts: { full: [{ kind: 'field', fieldId: 'forca' }] },
    });
    const sheet = await player.sheets.create({ name: 'Lia', templateId: 'simples' });
    const user = renderApp(player, `#/fichas/${sheet.id}`);
    await user.click(await screen.findByRole('button', { name: 'Bônus' }));
    const dialog = await screen.findByRole('dialog', { name: 'Bônus e efeitos' });
    expect(within(dialog).getByRole('button', { name: 'Adicionar bônus' })).toBeInTheDocument();
    expect(screen.queryByRole('group', { name: 'Bônus e efeitos' })).not.toBeInTheDocument();
  });

  it('o Mestre aplica uma maldição na ficha da jogadora, que chega na hora', async () => {
    const campaign = await gm.campaigns.create({
      name: 'A Mina Perdida',
      templateId: 'dnd5e-srd',
      gmName: 'Paulo',
    });
    await player.campaigns.join(inviteFor(campaign), 'Ana');
    const created = await player.campaigns.createLinkedSheet(campaign.id, 'Lia');
    if (!created.ok) throw new Error(created.error.message);
    await gm.session.startAsGameMaster(campaign.id);
    await player.session.joinAsPlayer(campaign.id);
    await until(() => {
      const snapshot = gm.session.getSnapshot();
      expect(snapshot.kind === 'mestre' && snapshot.players[0]?.sheet).toBeTruthy();
    });

    const curse = {
      id: 'maldicao',
      name: 'Maldição da lua',
      kind: 'maldicao' as const,
      active: true,
      targets: [{ fieldId: 'for', value: -4 }],
    };
    const result = await gm.session.setPlayerBonuses(campaign.id, created.value.id, [curse]);
    expect(result.ok).toBe(true);

    await until(async () => {
      expect((await player.sheetRepository.get(created.value.id))?.bonuses).toEqual([curse]);
    });
    // Força 6: modificador −2, no card do Mestre também.
    renderApp(gm, `#/campanhas/${campaign.id}/jogadores/${created.value.id}`);
    expect(await screen.findByRole('status', { name: 'Mod. Força' })).toHaveTextContent('−2');
  });

  it('bônus em campo que não existe no sistema é descartado ao chegar', async () => {
    const campaign = await gm.campaigns.create({
      name: 'A Mina Perdida',
      templateId: 'dnd5e-srd',
      gmName: 'Paulo',
    });
    await player.campaigns.join(inviteFor(campaign), 'Ana');
    const created = await player.campaigns.createLinkedSheet(campaign.id, 'Lia');
    if (!created.ok) throw new Error(created.error.message);
    await gm.session.startAsGameMaster(campaign.id);
    await player.session.joinAsPlayer(campaign.id);
    await until(() => {
      const snapshot = gm.session.getSnapshot();
      expect(snapshot.kind === 'mestre' && snapshot.players[0]?.sheet).toBeTruthy();
    });

    await gm.session.setPlayerBonuses(campaign.id, created.value.id, [
      {
        id: 'b',
        name: 'Estranho',
        kind: 'outro',
        active: true,
        targets: [
          { fieldId: 'campo_fantasma', value: 3 },
          { fieldId: 'for', value: 1 },
        ],
      },
    ]);
    await until(async () => {
      expect((await player.sheetRepository.get(created.value.id))?.bonuses).toEqual([
        expect.objectContaining({ targets: [{ fieldId: 'for', value: 1 }] }),
      ]);
    });
  });
});
