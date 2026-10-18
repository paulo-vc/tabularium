import { inviteFor, type SystemTemplate } from '@tabula/domain';
import { TabulaDatabase } from '@tabula/storage';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from './App';
import { createServices, type Services } from './app/services';

let db: TabulaDatabase;
let services: Services;

beforeEach(() => {
  window.location.hash = '';
  db = new TabulaDatabase(`ui-imprimir-${crypto.randomUUID()}`);
  services = createServices(db);
});

afterEach(async () => {
  cleanup();
  vi.restoreAllMocks();
  db.close();
  await db.delete();
});

const TEMPLATE: SystemTemplate = {
  id: 'papel',
  version: '1.0.0',
  name: 'Sistema de Papel',
  source: 'local',
  fields: [
    { id: 'forca', key: 'forca', label: 'Força', type: 'number', default: 10 },
    { id: 'segredo', key: 'segredo', label: 'Segredo', type: 'text', visibility: 'gm' },
    { id: 'historia', key: 'historia', label: 'História', type: 'longtext' },
    {
      id: 'itens',
      key: 'itens',
      label: 'Itens',
      type: 'list',
      itemFields: [
        { id: 'nome', key: 'nome', label: 'Item', type: 'text' },
        { id: 'qtd', key: 'qtd', label: 'Qtd.', type: 'number', default: 1 },
      ],
    },
  ],
  layouts: {
    full: [
      {
        kind: 'section',
        title: 'Atributos',
        columns: 2,
        children: [{ kind: 'field', fieldId: 'forca' }],
      },
      {
        kind: 'section',
        title: 'Segredos',
        columns: 1,
        children: [{ kind: 'field', fieldId: 'segredo' }],
      },
      {
        kind: 'section',
        title: 'Bagagem',
        columns: 1,
        children: [{ kind: 'field', fieldId: 'itens' }],
      },
      {
        kind: 'section',
        title: 'História',
        columns: 1,
        children: [{ kind: 'field', fieldId: 'historia' }],
      },
    ],
  },
};

async function sheetWithData() {
  await services.files.installTemplate(TEMPLATE);
  const sheet = await services.sheets.create({ name: 'Lia', templateId: 'papel' });
  await services.sheets.setValue(sheet.id, 'forca', 16);
  await services.sheets.setValue(sheet.id, 'itens', [
    { id: 'i1', values: { nome: 'Corda', qtd: 2 } },
  ]);
  await services.sheets.setBonuses(sheet.id, [
    {
      id: 'b1',
      name: 'Cinto de Força',
      kind: 'item',
      active: true,
      targets: [{ fieldId: 'forca', value: 2 }],
    },
  ]);
  return sheet;
}

describe('imprimir a ficha', () => {
  it('o menu da ficha leva à folha, que imprime pelo navegador', async () => {
    const sheet = await sheetWithData();
    window.location.hash = `#/fichas/${sheet.id}`;
    const user = userEvent.setup();
    render(<App services={services} />);
    await user.click(await screen.findByRole('button', { name: 'Ações da ficha' }));
    await user.click(await screen.findByRole('menuitem', { name: 'Imprimir ou PDF' }));

    const page = await screen.findByRole('article', { name: 'Ficha de Lia para imprimir' });
    const print = vi.spyOn(window, 'print').mockImplementation(() => undefined);
    await user.click(screen.getByRole('button', { name: 'Imprimir ou salvar PDF' }));
    expect(print).toHaveBeenCalled();
    expect(within(page).getByRole('heading', { name: 'Lia' })).toBeInTheDocument();
  });

  it('a folha traz os valores com bônus, as listas em tabela e os bônus ativos', async () => {
    const sheet = await sheetWithData();
    window.location.hash = `#/fichas/${sheet.id}/imprimir`;
    render(<App services={services} />);
    const page = await screen.findByRole('article', { name: 'Ficha de Lia para imprimir' });

    // Força 16 com +2: o valor final e a base ao lado.
    expect(page).toHaveTextContent('18(16 +2)');
    const table = within(page).getByRole('table');
    expect(within(table).getByRole('columnheader', { name: 'Item' })).toBeInTheDocument();
    expect(within(table).getByRole('row', { name: 'Corda 2' })).toBeInTheDocument();
    expect(page).toHaveTextContent('Cinto de Força (item): Força +2');
    expect(within(page).getByRole('heading', { name: 'História' })).toBeInTheDocument();
  });

  it('numa ficha de jogador de campanha, os campos secretos do Mestre não saem', async () => {
    const gm = createServices(new TabulaDatabase(`ui-imprimir-mestre-${crypto.randomUUID()}`));
    await gm.files.installTemplate(TEMPLATE);
    await services.files.installTemplate(TEMPLATE);
    const campaign = await gm.campaigns.create({
      name: 'Mesa',
      templateId: 'papel',
      gmName: 'Paulo',
    });
    await services.campaigns.join(inviteFor(campaign), 'Ana');
    const created = await services.campaigns.createLinkedSheet(campaign.id, 'Lia');
    if (!created.ok) throw new Error(created.error.message);

    window.location.hash = `#/fichas/${created.value.id}/imprimir`;
    render(<App services={services} />);
    const page = await screen.findByRole('article', { name: 'Ficha de Lia para imprimir' });
    expect(page).toHaveTextContent('Atributos');
    expect(page).not.toHaveTextContent('Segredo');
  });
});
