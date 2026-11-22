import { TabulaDatabase } from '@tabula/storage';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { App } from './App';
import { createServices, type Services } from './app/services';
import { clickSquare } from './oneshot/OneShotSheet';
import { buildPack } from './oneshot/pacote';

/** Um pacote de mentira (o de verdade fica fora do Git): dois personagens. */
const pack = buildPack(
  {
    id: 'teste',
    nome: 'Noite de Teste',
    descricao: 'Dois personagens prontos.',
    personagens: [
      {
        id: 'ana',
        nome: 'Ana',
        classe: 'Analista',
        ocupacao: 'Artista',
        nivel: 2,
        cor: '#4a7fd0',
        ficha: 'ana-ficha.jpg',
        historico: 'ana-historico.jpg',
        retrato: 'ana-retrato.jpg',
        pv: 4,
        pd: 3,
        quadrados: {
          pv: [
            [0.1, 0.1, 0.01, 0.01],
            [0.12, 0.1, 0.01, 0.01],
            [0.14, 0.1, 0.01, 0.01],
            [0.16, 0.1, 0.01, 0.01],
          ],
          pd: [
            [0.3, 0.1, 0.01, 0.01],
            [0.32, 0.1, 0.01, 0.01],
            [0.34, 0.1, 0.01, 0.01],
          ],
        },
      },
      {
        id: 'beto',
        nome: 'Beto',
        classe: 'Executor',
        ocupacao: 'Operário',
        nivel: 2,
        cor: '#d0442a',
        ficha: 'beto-ficha.jpg',
        historico: 'beto-historico.jpg',
        retrato: 'beto-retrato.jpg',
        pv: 6,
        pd: 2,
        quadrados: { pv: [], pd: [] },
      },
    ],
  },
  (file) => `data:image/gif;base64,R0lGODlhAQABAAAAACw=#${file}`,
);

let db: TabulaDatabase;
let services: Services;

beforeEach(() => {
  window.location.hash = '';
  db = new TabulaDatabase(`ui-oneshot-${crypto.randomUUID()}`);
  services = createServices(db, { oneShots: [pack] });
});

afterEach(async () => {
  cleanup();
  db.close();
  await db.delete();
});

describe('one-shot com personagens prontos', () => {
  it('o sistema da one-shot entra no catálogo', async () => {
    expect(await services.catalog.get('oneshot-teste')).toMatchObject({ name: 'Noite de Teste' });
  });

  it('escolhe o personagem, vê a ficha em imagem e mexe só no PV e no PD', async () => {
    const sheet = await services.sheets.create({ name: 'Mesa', templateId: 'oneshot-teste' });
    window.location.hash = `#/fichas/${sheet.id}`;
    const user = userEvent.setup();
    render(<App services={services} />);

    await user.click(await screen.findByRole('button', { name: /^Ana:/ }));
    // Depois da revelação, a ficha do personagem.
    expect(
      await screen.findByRole('img', { name: 'Ficha de Ana' }, { timeout: 4000 }),
    ).toBeInTheDocument();
    await waitFor(async () =>
      expect((await db.sheets.get(sheet.id))?.values).toMatchObject({
        personagem: 'ana',
        pv: { current: 4, max: 4 },
        pd: { current: 3, max: 3 },
      }),
    );
    expect((await db.sheets.get(sheet.id))?.name).toBe('Ana');

    // Perde 2 PV (marca o 2º quadradinho) e 1 PD.
    await user.click(screen.getByRole('button', { name: 'PV 2' }));
    await user.click(screen.getByRole('button', { name: 'PD 1' }));
    await waitFor(async () =>
      expect((await db.sheets.get(sheet.id))?.values).toMatchObject({
        pv: { current: 2 },
        pd: { current: 2 },
      }),
    );
    expect(screen.getByRole('group', { name: 'PV: 2 de 4' })).toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: 'Histórico' }));
    expect(screen.getByRole('img', { name: 'Histórico de Ana' })).toBeInTheDocument();
    // Nada além de PV e PD para editar.
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('marcar e desmarcar os quadradinhos', () => {
    const full = { current: 4, max: 4 };
    expect(clickSquare(full, 4, 1)).toMatchObject({ current: 2 });
    // Clicar num já marcado desmarca dele em diante.
    expect(clickSquare({ current: 2, max: 4 }, 4, 1)).toMatchObject({ current: 3 });
    expect(clickSquare({ current: 2, max: 4 }, 4, 0)).toMatchObject({ current: 4 });
  });
});
