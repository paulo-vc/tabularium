import type { SystemTemplate } from '@tabula/domain';
import { TabulaDatabase } from '@tabula/storage';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { App } from './App';
import { createServices, type Services } from './app/services';

let db: TabulaDatabase;
let services: Services;

beforeEach(() => {
  window.location.hash = '';
  db = new TabulaDatabase(`ui-dados-${crypto.randomUUID()}`);
  services = createServices(db, { dieRoller: () => 7 });
});

afterEach(async () => {
  cleanup();
  db.close();
  await db.delete();
});

/** Como na Ordem Paranormal: a perícia rola tantos d20 quanto o atributo. */
const TEMPLATE: SystemTemplate = {
  id: 'dados-atributo',
  version: '1.0.0',
  name: 'Dados pelo atributo',
  source: 'local',
  checkDice: '1d20',
  fields: [
    { id: 'agi', key: 'agi', label: 'Agilidade', type: 'number', default: 3 },
    { id: 'treino', key: 'treino', label: 'Treino', type: 'number', default: 5 },
    {
      id: 'acrobacia',
      key: 'acrobacia',
      label: 'Acrobacia',
      type: 'computed',
      formula: '@treino',
      signed: true,
      checkDiceFrom: 'agi',
    },
  ],
  layouts: {
    full: [
      {
        kind: 'section',
        title: 'Agente',
        columns: 3,
        children: [
          { kind: 'field', fieldId: 'agi' },
          { kind: 'field', fieldId: 'treino' },
          { kind: 'field', fieldId: 'acrobacia' },
        ],
      },
    ],
  },
};

describe('teste pelos dados do atributo', () => {
  it('rola tantos d20 quanto o atributo e acompanha quando ele muda', async () => {
    await services.files.installTemplate(TEMPLATE);
    const sheet = await services.sheets.create({ name: 'Arthur', templateId: 'dados-atributo' });
    window.location.hash = `#/fichas/${sheet.id}`;
    const user = userEvent.setup();
    render(<App services={services} />);

    const roll = await screen.findByRole('button', { name: 'Rolar Acrobacia' });
    expect(roll).toHaveAttribute('title', 'Rolar 3d20kh1+5');

    const agility = screen.getByRole('textbox', { name: 'Agilidade' });
    await user.clear(agility);
    await user.type(agility, '0');
    expect(screen.getByRole('button', { name: 'Rolar Acrobacia' })).toHaveAttribute(
      'title',
      'Rolar 2d20kl1+5',
    );
  });
});
