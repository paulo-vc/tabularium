import type { SystemTemplate } from '@tabula/domain';
import { TabulaDatabase } from '@tabula/storage';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { App } from './App';
import { createServices, type Services } from './app/services';

let db: TabulaDatabase;
let services: Services;

beforeEach(() => {
  window.location.hash = '';
  db = new TabulaDatabase(`ui-tema-${crypto.randomUUID()}`);
  services = createServices(db, { dieRoller: () => 7 });
});

afterEach(async () => {
  cleanup();
  db.close();
  await db.delete();
});

/** Como a Ordem Paranormal: atributos em círculo que rolam dados, Vida vermelha, Defesa. */
const TEMPLATE: SystemTemplate = {
  id: 'ordem',
  version: '1.0.0',
  name: 'Ordem',
  source: 'local',
  checkDice: '1d20',
  fields: [
    { id: 'agi', key: 'agi', label: 'Agilidade', type: 'number', default: 3, rollsDice: true },
    { id: 'for', key: 'for', label: 'Força', type: 'number', default: 1, rollsDice: true },
    { id: 'vig', key: 'vig', label: 'Vigor', type: 'number', default: 0, rollsDice: true },
    { id: 'pv', key: 'pv', label: 'Vida', type: 'resource', default: 20, color: 'vermelho' },
    {
      id: 'defesa',
      key: 'defesa',
      label: 'Defesa',
      type: 'computed',
      formula: '10 + @agi',
      emblem: 'escudo',
    },
  ],
  layouts: {
    full: [
      {
        kind: 'section',
        title: 'Atributos',
        columns: 3,
        display: 'circulo',
        children: [
          { kind: 'field', fieldId: 'agi' },
          { kind: 'field', fieldId: 'for' },
          { kind: 'field', fieldId: 'vig' },
        ],
      },
    ],
    gmSummary: ['pv', 'defesa'],
  },
};

async function openSheet() {
  await services.files.installTemplate(TEMPLATE);
  const sheet = await services.sheets.create({ name: 'Soul', templateId: 'ordem' });
  window.location.hash = `#/fichas/${sheet.id}`;
  const user = userEvent.setup();
  render(<App services={services} />);
  return { user, id: sheet.id };
}

describe('ficha com o visual do sistema', () => {
  it('os atributos rolam tantos d20 quanto o valor; com 0, dois e fica o menor', async () => {
    await openSheet();
    expect(await screen.findByRole('button', { name: 'Rolar Agilidade' })).toHaveAttribute(
      'title',
      'Rolar 3d20kh1',
    );
    expect(screen.getByRole('button', { name: 'Rolar Força' })).toHaveAttribute(
      'title',
      'Rolar 1d20',
    );
    expect(screen.getByRole('button', { name: 'Rolar Vigor' })).toHaveAttribute(
      'title',
      'Rolar 2d20kl1',
    );
    // O título aparece no cabeçalho da seção e no meio do círculo.
    expect(screen.getAllByText('Atributos')).toHaveLength(2);
  });

  it('a barra tira e soma 5 com « e »', async () => {
    const { user, id } = await openSheet();
    await user.click(await screen.findByRole('button', { name: 'Tirar 5 de Vida' }));
    await user.click(screen.getByRole('button', { name: 'Tirar 5 de Vida' }));
    await user.click(screen.getByRole('button', { name: 'Somar 5 a Vida' }));
    await waitFor(async () =>
      expect((await services.sheetRepository.get(id))?.values['pv']).toMatchObject({
        current: 15,
      }),
    );
  });
});
