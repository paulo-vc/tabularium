import { TabulaDatabase } from '@tabula/storage';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { App } from './App';
import { createServices, type Services } from './app/services';

let db: TabulaDatabase;
let services: Services;

beforeEach(() => {
  window.location.hash = '#/sistemas';
  db = new TabulaDatabase(`ui-editor-modelos-${crypto.randomUUID()}`);
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

async function createFromStarter(user: ReturnType<typeof userEvent.setup>, name: string) {
  await user.click(await screen.findByRole('button', { name: 'Criar sistema' }));
  const dialog = await screen.findByRole('dialog');
  // O modelo d20 é o padrão.
  expect(dialog).toHaveTextContent('Seis atributos com modificador');
  await user.type(within(dialog).getByLabelText('Nome do sistema'), name);
  await user.click(within(dialog).getByRole('button', { name: 'Começar a editar' }));
  await screen.findByRole('heading', { name });
}

describe('criador mais fácil', () => {
  it('um modelo pronto já vem com atributos, perícias e combate funcionando', async () => {
    const user = renderApp();
    await createFromStarter(user, 'Minha Fantasia');
    const preview = screen.getByRole('region', { name: 'Prévia da ficha' });
    expect(within(preview).getByText('Atletismo')).toBeInTheDocument();
    expect(within(preview).getByText('Classe de Armadura')).toBeInTheDocument();
    const [draft] = await services.editor.list();
    expect(draft?.template).toMatchObject({ checkDice: '1d20', initiative: 'iniciativa' });
  });

  it('as etapas se marcam sozinhas e levam à aba certa', async () => {
    localStorage.removeItem('tabula:editor-etapas');
    const user = renderApp();
    await createFromStarter(user, 'Minha Fantasia');
    const steps = screen.getByRole('navigation', { name: 'Etapas do sistema' });
    // O modelo já tem nome, dado, campos e seções; falta salvar.
    expect(within(steps).getAllByText(/\(feito\)/)).toHaveLength(3);
    await user.click(within(steps).getByRole('button', { name: /Nome e dado/ }));
    expect(screen.getByRole('tab', { name: 'Informações' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    await user.click(within(steps).getByRole('button', { name: 'Fechar as etapas' }));
    await waitFor(() =>
      expect(screen.queryByRole('navigation', { name: 'Etapas do sistema' })).toBeNull(),
    );
  });

  it('os exemplos de fórmula já usam os campos do sistema', async () => {
    const draft = await services.editor.createBlank('Minha Fantasia');
    window.location.hash = `#/sistemas/editor/${draft.id}`;
    const user = renderApp();
    await screen.findByRole('heading', { name: 'Minha Fantasia' });
    const add = async (label: string, type: string) => {
      await user.click(screen.getByRole('button', { name: 'Campo' }));
      const dialog = await screen.findByRole('dialog', { name: 'Novo campo' });
      await user.type(within(dialog).getByLabelText('Nome na ficha'), label);
      await user.click(within(dialog).getByText(type));
      await user.click(within(dialog).getByRole('button', { name: 'Adicionar' }));
      return screen.findByRole('dialog', { name: label });
    };
    let dialog = await add('Força', 'Número');
    await user.click(within(dialog).getByRole('button', { name: 'Aplicar' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    dialog = await add('Mod Força', 'Calculado (fórmula)');
    await user.click(within(dialog).getByRole('button', { name: 'Modificador (d20)' }));
    expect(within(dialog).getByLabelText('Fórmula')).toHaveValue('floor((@forca - 10) / 2)');
  });
});
