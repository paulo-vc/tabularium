import { inviteFor, type SystemTemplate } from '@tabula/domain';
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
  gmDb = new TabulaDatabase(`ui-bestiario-mestre-${crypto.randomUUID()}`);
  playerDb = new TabulaDatabase(`ui-bestiario-jogador-${crypto.randomUUID()}`);
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

function renderApp(services: Services, hash: string) {
  window.location.hash = hash;
  const user = userEvent.setup();
  render(<App services={services} />);
  return user;
}

async function setUpTable(templateId = 'dnd5e-srd') {
  const campaign = await gm.campaigns.create({
    name: 'A Mina Perdida',
    templateId,
    gmName: 'Paulo',
  });
  await player.campaigns.join(inviteFor(campaign), 'Ana');
  if (templateId === 'dnd5e-srd') {
    const created = await player.campaigns.createLinkedSheet(campaign.id, 'Lia');
    if (!created.ok) throw new Error(created.error.message);
  }
  return campaign;
}

describe('bestiário e criaturas no combate', () => {
  it('o goblin do sistema entra com PV; o dano muda o estado que os jogadores veem', async () => {
    const campaign = await setUpTable();
    const user = renderApp(gm, `#/campanhas/${campaign.id}`);
    await user.click(await screen.findByRole('button', { name: 'Iniciar sessão' }));
    await player.session.joinAsPlayer(campaign.id);
    await user.click(await screen.findByRole('button', { name: 'Iniciar combate' }));

    await user.click(screen.getByRole('combobox', { name: 'Do bestiário' }));
    await user.click(await screen.findByRole('option', { name: 'Goblin · 7 PV' }));
    expect(screen.getByRole('textbox', { name: 'Criatura' })).toHaveValue('Goblin');
    expect(screen.getByRole('textbox', { name: 'PV' })).toHaveValue('7');
    await user.click(screen.getByRole('button', { name: 'Adicionar' }));

    const hp = await screen.findByRole('button', { name: /PV de Goblin: 7 de 7/ });
    await user.click(hp);
    await user.type(screen.getByRole('textbox', { name: 'Quanto' }), '5{Enter}');
    expect(
      await screen.findByRole('button', { name: /PV de Goblin: 2 de 7 \(Muito ferida\)/ }),
    ).toBeInTheDocument();

    // O jogador recebe o estado, nunca o PV nem a ficha da criatura.
    await until(() => {
      const snapshot = player.session.getSnapshot();
      const goblin =
        snapshot.kind === 'jogador'
          ? snapshot.initiative?.combatants.find((c) => c.name === 'Goblin')
          : undefined;
      expect(goblin).toMatchObject({ condition: 'muito-ferida' });
      expect(goblin).not.toHaveProperty('hp');
      expect(goblin).not.toHaveProperty('creature');
    });

    // A ficha abre pelo combate, com os ataques do bestiário.
    await user.click(screen.getByRole('button', { name: 'Ficha de Goblin' }));
    const sheet = await screen.findByRole('dialog', { name: 'Goblin' });
    expect(
      within(sheet).getByRole('button', { name: 'Rolar o acerto de Cimitarra (1d20+4)' }),
    ).toBeInTheDocument();
    expect(within(sheet).getByText(/2 de 7 PV/)).toBeInTheDocument();
  });

  it('o Mestre marca condições do códice; a mesa vê e abre a página', async () => {
    const campaign = await setUpTable();
    const user = renderApp(gm, `#/campanhas/${campaign.id}`);
    await user.click(await screen.findByRole('button', { name: 'Iniciar sessão' }));
    await player.session.joinAsPlayer(campaign.id);
    await user.click(await screen.findByRole('button', { name: 'Iniciar combate' }));
    await user.type(screen.getByRole('textbox', { name: 'Criatura' }), 'Orc');
    await user.type(screen.getByRole('textbox', { name: 'Iniciativa' }), '12');
    await user.click(screen.getByRole('button', { name: 'Adicionar' }));

    await user.click(await screen.findByRole('button', { name: 'Condições de Orc' }));
    const picker = await screen.findByRole('dialog', { name: 'Condições de Orc' });
    await user.click(within(picker).getByRole('button', { name: 'Caído' }));
    await user.type(
      within(picker).getByRole('textbox', { name: 'Outra condição' }),
      'Marcado{Enter}',
    );
    await user.keyboard('{Escape}');

    await until(() => {
      const snapshot = player.session.getSnapshot();
      const orc =
        snapshot.kind === 'jogador'
          ? snapshot.initiative?.combatants.find((c) => c.name === 'Orc')
          : undefined;
      expect(orc?.effects).toEqual(['Caído', 'Marcado']);
    });

    // "Caído" tem página no códice do D&D; "Marcado" é só uma etiqueta.
    await user.click(await screen.findByRole('button', { name: 'Caído: ver no códice' }));
    const page = await screen.findByRole('dialog', { name: 'Caído' });
    expect(page).toHaveTextContent('rastejando');
    await user.keyboard('{Escape}');
    expect(
      screen.queryByRole('button', { name: 'Marcado: ver no códice' }),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Remover Marcado' }));
    await until(() => {
      const snapshot = player.session.getSnapshot();
      const orc =
        snapshot.kind === 'jogador'
          ? snapshot.initiative?.combatants.find((c) => c.name === 'Orc')
          : undefined;
      expect(orc?.effects).toEqual(['Caído']);
    });
  });

  it('o Mestre copia uma criatura do sistema para a campanha e a ajusta', async () => {
    const campaign = await setUpTable();
    const user = renderApp(gm, `#/campanhas/${campaign.id}`);
    await user.click(await screen.findByRole('tab', { name: /Bestiário/ }));
    await user.click(await screen.findByRole('button', { name: 'Copiar Lobo para a campanha' }));
    const own = await screen.findByRole('region', { name: 'Criaturas da campanha' });
    await user.click(await within(own).findByRole('button', { name: 'Editar Lobo' }));

    const dialog = await screen.findByRole('dialog', { name: 'Editar Lobo' });
    await user.clear(within(dialog).getByRole('textbox', { name: 'Nome' }));
    await user.type(within(dialog).getByRole('textbox', { name: 'Nome' }), 'Lobo Alfa');
    await user.clear(within(dialog).getByRole('textbox', { name: 'PV' }));
    await user.type(within(dialog).getByRole('textbox', { name: 'PV' }), '30');
    await user.click(within(dialog).getByRole('button', { name: 'Salvar criatura' }));

    await waitFor(async () =>
      expect((await gm.campaignRepository.get(campaign.id))?.bestiary).toEqual([
        expect.objectContaining({ name: 'Lobo Alfa', hp: 30 }),
      ]),
    );
  });

  it('recusa um ataque que não rola, com a mensagem na janela', async () => {
    const campaign = await setUpTable();
    const user = renderApp(gm, `#/campanhas/${campaign.id}`);
    await user.click(await screen.findByRole('tab', { name: /Bestiário/ }));
    await user.click(await screen.findByRole('button', { name: 'Nova criatura' }));
    const dialog = await screen.findByRole('dialog', { name: 'Nova criatura' });
    await user.click(within(dialog).getByRole('button', { name: 'Ataque' }));
    await user.type(within(dialog).getByRole('textbox', { name: 'Nome do ataque 1' }), 'Mordida');
    await user.type(within(dialog).getByRole('textbox', { name: 'Mordida: dano' }), '2d4+x');
    await user.click(within(dialog).getByRole('button', { name: 'Salvar criatura' }));
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('Mordida');
    expect((await gm.campaignRepository.get(campaign.id))?.bestiary).toBeUndefined();
  });
});

describe('códice do sistema', () => {
  const homebrew: SystemTemplate = {
    id: 'laminas',
    version: '1.0.0',
    name: 'Lâminas do Norte',
    source: 'local',
    fields: [{ id: 'nome', key: 'nome', label: 'Nome', type: 'text' }],
    layouts: { full: [{ kind: 'field', fieldId: 'nome' }] },
    codex: [
      {
        id: 'furia',
        title: 'Fúria',
        category: 'Habilidades',
        body: '# Fúria\n\nComo **ação bônus**. Veja [[Ataque Extra]].',
      },
      { id: 'extra', title: 'Ataque Extra', category: 'Habilidades', body: 'Dois ataques.' },
      { id: 'segredo', title: 'O Traidor', body: 'É o ferreiro.', gmOnly: true },
    ],
  };

  it('o jogador lê o códice pela campanha, sem as páginas do Mestre', async () => {
    await gm.files.installTemplate(homebrew);
    // No jogador, o sistema chega pela sessão, como da comunidade.
    await player.files.installTemplate({ ...homebrew, source: 'community' });
    const campaign = await setUpTable('laminas');
    const user = renderApp(player, `#/campanhas/${campaign.id}`);

    await user.click(await screen.findByRole('link', { name: 'Códice do sistema' }));
    const pages = await screen.findByRole('navigation', { name: 'Páginas do códice' });
    expect(within(pages).getByRole('button', { name: 'Fúria' })).toBeInTheDocument();
    expect(within(pages).queryByRole('button', { name: /O Traidor/ })).not.toBeInTheDocument();

    // O link leva à outra página.
    await user.click(
      within(screen.getByRole('article', { name: 'Fúria' })).getByRole('button', {
        name: 'Ataque Extra',
      }),
    );
    expect(await screen.findByRole('article', { name: 'Ataque Extra' })).toHaveTextContent(
      'Dois ataques.',
    );

    await user.type(screen.getByRole('searchbox', { name: 'Buscar no códice' }), 'traidor');
    expect(screen.getByText(/Nada encontrado/)).toBeInTheDocument();
  });

  it('o Mestre vê também as páginas só dele', async () => {
    await gm.files.installTemplate(homebrew);
    const campaign = await setUpTable('laminas');
    const user = renderApp(gm, `#/campanhas/${campaign.id}`);
    await user.click(await screen.findByRole('tab', { name: /Códice/ }));
    const pages = await screen.findByRole('navigation', { name: 'Páginas do códice' });
    expect(within(pages).getByRole('button', { name: /O Traidor/ })).toBeInTheDocument();
  });
});
