import type { SystemTemplate } from '@tabula/domain';
import { TabulaDatabase } from '@tabula/storage';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { App } from './App';
import { createServices, type Services } from './app/services';

let db: TabulaDatabase;
let services: Services;

beforeEach(() => {
  window.location.hash = '';
  db = new TabulaDatabase(`ui-jogo-${crypto.randomUUID()}`);
  services = createServices(db, { dieRoller: () => 7 });
});

afterEach(async () => {
  cleanup();
  db.close();
  await db.delete();
});

/** Perícias com treino (como no D&D), um recurso e Força para receber bônus. */
const TEMPLATE: SystemTemplate = {
  id: 'jogo',
  version: '1.0.0',
  name: 'Ficha de jogo',
  source: 'local',
  checkDice: '1d100',
  lowerIsBetter: true,
  fields: [
    { id: 'pv', key: 'pv', label: 'PV', type: 'resource', default: 10 },
    { id: 'forca', key: 'forca', label: 'Força', type: 'number', default: 10 },
    { id: 'p_furt', key: 'p_furt', label: 'Treino em Furtividade', type: 'boolean' },
    {
      id: 'furtividade',
      key: 'furtividade',
      label: 'Furtividade',
      type: 'computed',
      formula: '20',
      signed: true,
    },
    { id: 'p_luta', key: 'p_luta', label: 'Treino em Luta', type: 'boolean', default: true },
    { id: 'luta', key: 'luta', label: 'Luta', type: 'computed', formula: '40', signed: true },
  ],
  layouts: {
    full: [
      {
        kind: 'section',
        title: 'Perícias',
        columns: 2,
        display: 'linhas',
        children: [
          { kind: 'field', fieldId: 'p_furt' },
          { kind: 'field', fieldId: 'furtividade' },
          { kind: 'field', fieldId: 'p_luta' },
          { kind: 'field', fieldId: 'luta' },
        ],
      },
      { kind: 'field', fieldId: 'forca' },
    ],
  },
};

async function openSheet() {
  await services.files.installTemplate(TEMPLATE);
  const sheet = await services.sheets.create({ name: 'Harvey', templateId: 'jogo' });
  await services.sheets.setBonuses(sheet.id, [
    {
      id: 'b1',
      name: 'Maldição do ídolo',
      kind: 'maldicao',
      active: true,
      targets: [{ fieldId: 'forca', value: -2 }],
    },
  ]);
  window.location.hash = `#/fichas/${sheet.id}`;
  const user = userEvent.setup();
  render(<App services={services} />);
  return user;
}

describe('ficha em modo de jogo', () => {
  it('"Só treinadas" esconde as perícias sem treino', async () => {
    const user = await openSheet();
    const skills = await screen.findByRole('button', { name: 'Só treinadas' });
    expect(screen.getByText('Furtividade')).toBeInTheDocument();
    await user.click(skills);
    expect(skills).toHaveAttribute('aria-pressed', 'true');
    expect(screen.queryByText('Furtividade')).not.toBeInTheDocument();
    expect(screen.getByText('Luta')).toBeInTheDocument();
  });

  it('os bônus ativos aparecem no painel, em vermelho quando atrapalham', async () => {
    await openSheet();
    const active = await screen.findByLabelText('Bônus ativos');
    const chip = within(active).getByText(/Força/);
    expect(chip).toHaveTextContent('Força −2');
    expect(chip).toHaveAttribute('title', 'Maldição do ídolo: -2');
  });

  it('com o menor melhor, a vantagem fica com o menor dado', async () => {
    const user = await openSheet();
    await user.click(await screen.findByRole('button', { name: 'Vantagem' }));
    expect(screen.getByRole('button', { name: 'Rolar Luta' })).toHaveAttribute(
      'title',
      'Rolar 2d100kl1+40',
    );
  });
});
