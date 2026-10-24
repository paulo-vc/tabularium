import { TabulaDatabase } from '@tabula/storage';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { App } from './App';
import { createServices, type Services } from './app/services';

let db: TabulaDatabase;
let services: Services;

beforeEach(() => {
  // Primeira vez de verdade: sem as marcas que o setup dos testes põe.
  localStorage.clear();
  window.location.hash = '#/';
  db = new TabulaDatabase(`ui-boas-vindas-${crypto.randomUUID()}`);
  services = createServices(db);
});

afterEach(async () => {
  cleanup();
  db.close();
  await db.delete();
});

function renderApp() {
  const user = userEvent.setup();
  render(<App services={services} />);
  return user;
}

describe('primeira experiência', () => {
  it('o aparelho vazio abre nas boas-vindas, com os três caminhos', async () => {
    const user = renderApp();
    expect(
      await screen.findByRole('heading', { name: 'Boas-vindas ao Tabularium' }),
    ).toBeInTheDocument();
    for (const path of ['Vou mestrar', 'Vou jogar', 'Só quero uma ficha']) {
      expect(screen.getByRole('button', { name: new RegExp(path) })).toBeInTheDocument();
    }
    await user.click(screen.getByRole('button', { name: /Vou mestrar/ }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByLabelText('Nome da campanha')).toBeInTheDocument();
  });

  it('a ficha de exemplo abre já preenchida', async () => {
    const user = renderApp();
    await user.click(await screen.findByRole('button', { name: /Ver uma ficha de exemplo/ }));
    expect(await screen.findByDisplayValue('Thorin (exemplo)')).toBeInTheDocument();
    const [sheet] = await services.sheetRepository.list();
    expect(sheet?.values).toMatchObject({ classe: 'Guerreiro', nivel: 3, for: 16 });
    expect(sheet?.values.ataques).toHaveLength(2);
  });

  it('"Pular" mostra a tela de sempre, e as boas-vindas não voltam', async () => {
    const user = renderApp();
    await user.click(await screen.findByRole('button', { name: 'Pular' }));
    expect(await screen.findByRole('heading', { name: 'Minhas fichas' })).toBeInTheDocument();
    cleanup();
    renderApp();
    expect(await screen.findByRole('heading', { name: 'Minhas fichas' })).toBeInTheDocument();
  });

  it('com fichas no aparelho, não há boas-vindas', async () => {
    await services.sheets.create({ name: 'Lia', templateId: 'dnd5e-srd' });
    renderApp();
    expect(await screen.findByRole('heading', { name: 'Minhas fichas' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Boas-vindas ao Tabularium' })).toBeNull();
  });

  it('a dica do Mestre aparece na campanha e, fechada, não volta', async () => {
    const campaign = await services.campaigns.create({
      name: 'A Mina Perdida',
      templateId: 'dnd5e-srd',
      gmName: 'Paulo',
    });
    window.location.hash = `#/campanhas/${campaign.id}`;
    const user = renderApp();
    const tip = await screen.findByRole('complementary', { name: 'Como funciona a mesa' });
    expect(tip).toHaveTextContent('Iniciar sessão');
    await user.click(within(tip).getByRole('button', { name: /fechar a dica/ }));
    await waitFor(() =>
      expect(screen.queryByRole('complementary', { name: 'Como funciona a mesa' })).toBeNull(),
    );
    cleanup();
    renderApp();
    await screen.findByRole('heading', { name: 'A Mina Perdida' });
    expect(screen.queryByRole('complementary', { name: 'Como funciona a mesa' })).toBeNull();
  });
});
