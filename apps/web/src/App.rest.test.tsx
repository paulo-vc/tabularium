import type { SystemTemplate } from '@tabula/domain';
import { TabulaDatabase } from '@tabula/storage';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { App } from './App';
import { createServices, type Services } from './app/services';

let db: TabulaDatabase;
let services: Services;

beforeEach(() => {
  window.location.hash = '';
  db = new TabulaDatabase(`ui-descanso-${crypto.randomUUID()}`);
  services = createServices(db);
});

afterEach(async () => {
  cleanup();
  db.close();
  await db.delete();
});

const TEMPLATE: SystemTemplate = {
  id: 'descanso',
  version: '1.0.0',
  name: 'Sistema com Descanso',
  source: 'local',
  fields: [
    {
      id: 'pv',
      key: 'pv',
      label: 'PV',
      type: 'resource',
      default: 20,
      recover: { rest: 'longo' },
    },
    {
      id: 'foco',
      key: 'foco',
      label: 'Foco',
      type: 'resource',
      default: 3,
      recover: { rest: 'curto' },
    },
  ],
  layouts: {
    full: [
      { kind: 'field', fieldId: 'pv' },
      { kind: 'field', fieldId: 'foco' },
    ],
  },
};

async function openSheet() {
  await services.files.installTemplate(TEMPLATE);
  const sheet = await services.sheets.create({ name: 'Lia', templateId: 'descanso' });
  await services.sheets.setValue(sheet.id, 'pv', { current: 5, max: 20 });
  await services.sheets.setValue(sheet.id, 'foco', { current: 0, max: 3 });
  window.location.hash = `#/fichas/${sheet.id}`;
  const user = userEvent.setup();
  render(<App services={services} />);
  return { user, id: sheet.id };
}

describe('descanso na ficha', () => {
  it('mostra o que muda em cada descanso e recupera ao confirmar', async () => {
    const { user, id } = await openSheet();
    await user.click(await screen.findByRole('button', { name: 'Descansar' }));
    const dialog = await screen.findByRole('dialog', { name: 'Descansar' });

    // O longo (padrão) enche os dois; o curto, só o Foco.
    const changes = () => within(dialog).getByRole('list', { name: 'O que muda' });
    expect(changes()).toHaveTextContent('PV');
    expect(changes()).toHaveTextContent('Foco');
    await user.click(within(dialog).getByRole('button', { name: 'Descanso curto' }));
    expect(changes()).not.toHaveTextContent('PV');

    await user.click(within(dialog).getByRole('button', { name: 'Descanso longo' }));
    await user.click(
      within(dialog)
        .getAllByRole('button', { name: /Descanso longo/ })
        .at(-1) as HTMLElement,
    );
    await waitFor(async () => {
      const sheet = await services.sheetRepository.get(id);
      expect(sheet?.values['pv']).toEqual({ current: 20, max: 20 });
      expect(sheet?.values['foco']).toEqual({ current: 3, max: 3 });
    });
  });
});

describe('painel da ficha', () => {
  it('−1 e +1 mudam o recurso sem digitar, sem passar do máximo', async () => {
    const { user, id } = await openSheet();
    await user.click(await screen.findByRole('button', { name: 'Tirar 1 de PV' }));
    await user.click(screen.getByRole('button', { name: 'Tirar 1 de PV' }));
    await waitFor(async () =>
      expect((await services.sheetRepository.get(id))?.values['pv']).toEqual({
        current: 3,
        max: 20,
      }),
    );
    for (let i = 0; i < 4; i++) {
      await user.click(screen.getByRole('button', { name: 'Somar 1 a Foco' }));
    }
    await waitFor(async () =>
      expect((await services.sheetRepository.get(id))?.values['foco']).toEqual({
        current: 3,
        max: 3,
      }),
    );
  });
});
