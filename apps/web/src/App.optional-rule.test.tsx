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
  db = new TabulaDatabase(`ui-regra-${crypto.randomUUID()}`);
  services = createServices(db);
});

afterEach(async () => {
  cleanup();
  db.close();
  await db.delete();
});

/** PE e Sanidade, ou Determinação no lugar dos dois (regra opcional). */
const TEMPLATE: SystemTemplate = {
  id: 'regra-opcional',
  version: '1.0.0',
  name: 'Regra opcional',
  source: 'local',
  fields: [
    { id: 'usa_pd', key: 'usa_pd', label: 'Usar Determinação', type: 'boolean' },
    { id: 'pv', key: 'pv', label: 'Pontos de Vida', type: 'resource', default: 10 },
    {
      id: 'san',
      key: 'san',
      label: 'Sanidade',
      type: 'resource',
      default: 12,
      visibleWhen: { field: 'usa_pd', value: false },
    },
    {
      id: 'san_extra',
      key: 'san_extra',
      label: 'Sanidade extra',
      type: 'number',
      visibleWhen: { field: 'usa_pd', value: false },
    },
    {
      id: 'pd',
      key: 'pd',
      label: 'Determinação',
      type: 'resource',
      default: 7,
      visibleWhen: { field: 'usa_pd', value: true },
    },
  ],
  layouts: {
    full: [
      {
        kind: 'section',
        title: 'Agente',
        columns: 2,
        children: [
          { kind: 'field', fieldId: 'usa_pd' },
          { kind: 'field', fieldId: 'san_extra' },
        ],
      },
    ],
    gmSummary: ['pv', 'san', 'pd'],
  },
};

describe('regra opcional na ficha', () => {
  it('marcar a regra troca Sanidade por Determinação, no painel e nas seções', async () => {
    await services.files.installTemplate(TEMPLATE);
    const sheet = await services.sheets.create({ name: 'Arthur', templateId: 'regra-opcional' });
    window.location.hash = `#/fichas/${sheet.id}`;
    const user = userEvent.setup();
    render(<App services={services} />);

    expect(await screen.findByText('Sanidade')).toBeInTheDocument();
    expect(screen.getByLabelText('Sanidade extra')).toBeInTheDocument();
    expect(screen.queryByText('Determinação')).not.toBeInTheDocument();

    await user.click(screen.getByRole('checkbox', { name: 'Usar Determinação' }));
    expect(await screen.findByText('Determinação')).toBeInTheDocument();
    expect(screen.queryByText('Sanidade')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Sanidade extra')).not.toBeInTheDocument();
  });
});
