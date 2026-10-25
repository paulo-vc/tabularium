import { TabulaDatabase } from '@tabula/storage';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { App } from './App';
import { createServices, type Services } from './app/services';

let db: TabulaDatabase;
let services: Services;

beforeEach(() => {
  window.location.hash = '#/sistemas';
  db = new TabulaDatabase(`ui-importar-sistema-${crypto.randomUUID()}`);
  services = createServices(db);
});

afterEach(async () => {
  cleanup();
  db.close();
  await db.delete();
});

/** Um sistema escrito à mão: só o template, sem o envelope de exportação nem `source`. */
const BARE = {
  id: 'fate-acelerado',
  version: '1.0.0',
  name: 'Fate Acelerado',
  fields: [{ id: 'vida', key: 'vida', label: 'Vida', type: 'resource', default: 3 }],
  layouts: { full: [{ kind: 'field', fieldId: 'vida' }] },
};

async function openDialog() {
  const user = userEvent.setup();
  render(<App services={services} />);
  await user.click(await screen.findByRole('button', { name: 'Importar sistema' }));
  return { user, dialog: await screen.findByRole('dialog') };
}

describe('importar sistema', () => {
  it('colando o JSON do sistema puro, ele é instalado', async () => {
    const { user, dialog } = await openDialog();
    await user.click(within(dialog).getByLabelText('Ou cole o JSON'));
    await user.paste(JSON.stringify(BARE));
    await user.click(within(dialog).getByRole('button', { name: 'Importar' }));
    expect(await screen.findByText('Fate Acelerado')).toBeInTheDocument();
    expect(await services.catalog.get('fate-acelerado')).toMatchObject({ source: 'local' });
  });

  it('com problemas, lista cada um em português e com o lugar, sem fechar a janela', async () => {
    const { user, dialog } = await openDialog();
    await user.click(within(dialog).getByLabelText('Ou cole o JSON'));
    await user.paste(JSON.stringify({ ...BARE, name: 42 }));
    await user.click(within(dialog).getByRole('button', { name: 'Importar' }));
    const alert = await within(dialog).findByRole('alert');
    expect(alert).toHaveTextContent('Um problema impede a importação');
    expect(alert).toHaveTextContent('nome do sistema: Entrada inválida: esperava um texto');
    expect(await services.catalog.get('fate-acelerado')).toBeUndefined();
  });
});
