import { TabulaDatabase } from '@tabula/storage';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { App } from './App';
import { createServices, type Services } from './app/services';
import { fakePng, fakeProcessImage } from './testing/fake-images';

let db: TabulaDatabase;
let services: Services;

beforeEach(() => {
  window.location.hash = '';
  db = new TabulaDatabase(`ui-editor-dados-${crypto.randomUUID()}`);
  services = createServices(db, { processImage: fakeProcessImage });
});

afterEach(async () => {
  cleanup();
  db.close();
  await db.delete();
});

async function openInfo() {
  const draft = await services.editor.createBlank('Fate Acelerado');
  window.location.hash = `#/sistemas/editor/${draft.id}`;
  const user = userEvent.setup();
  render(<App services={services} />);
  await screen.findByRole('heading', { name: 'Fate Acelerado' });
  await user.click(screen.getByRole('tab', { name: 'Informações' }));
  const saved = async () => (await services.editor.get(draft.id))?.template;
  return { user, saved };
}

describe('editor: dados do sistema e ícone', () => {
  it('cria o dado Fate pelo modelo pronto e ajusta uma face', async () => {
    const { user, saved } = await openInfo();
    await user.click(screen.getByRole('button', { name: /Dado Fate \(dF\)/ }));
    const die = await screen.findByRole('group', { name: 'Dado Dado Fate' });
    const face = within(die).getByLabelText('Face 1: o que aparece');
    await user.clear(face);
    await user.type(face, '-');
    await waitFor(async () => {
      const dice = (await saved())?.dice;
      expect(dice?.[0]).toMatchObject({ id: 'F', name: 'Dado Fate' });
      expect(dice?.[0]?.faces[0]).toEqual({ label: '-', value: -1 });
    });
  });

  it('Esperança e Medo entram com cores fixas; mudar as faces e remover funcionam', async () => {
    const { user, saved } = await openInfo();
    await user.click(screen.getByRole('button', { name: /Esperança e Medo/ }));
    await waitFor(async () =>
      expect((await saved())?.dice?.map((d) => [d.id, d.color, d.faces.length])).toEqual([
        ['Esperanca', '#d4a017', 12],
        ['Medo', '#5b21b6', 12],
      ]),
    );
    await user.click(screen.getByRole('button', { name: 'Remover o dado Medo' }));
    await waitFor(async () => expect((await saved())?.dice).toHaveLength(1));
  });

  it('Esperança e Medo já vêm comparados: o maior dá o resultado da rolagem', async () => {
    const { user, saved } = await openInfo();
    await user.click(screen.getByRole('button', { name: /Esperança e Medo/ }));
    await waitFor(async () =>
      expect((await saved())?.dice?.map((d) => d.duel)).toEqual([
        { against: 'Medo', win: 'com Esperança', tie: 'crítico' },
        { against: 'Esperanca', win: 'com Medo', tie: 'crítico' },
      ]),
    );
  });

  it('comparar um dado com outro liga a comparação de volta no outro', async () => {
    const { user, saved } = await openInfo();
    const blank = screen.getByRole('button', { name: /Em branco/ });
    await user.click(blank);
    await user.click(blank);
    const first = await screen.findAllByRole('group', { name: 'Dado Novo dado' });
    await user.click(
      within(first[0] as HTMLElement).getByRole('combobox', { name: 'Comparar com' }),
    );
    await user.click(await screen.findByRole('option', { name: 'Novo dado (dX2)' }));
    await waitFor(async () =>
      expect((await saved())?.dice?.map((d) => [d.id, d.duel?.against, d.duel?.win])).toEqual([
        ['X', 'X2', 'com Novo dado'],
        ['X2', 'X', 'com Novo dado'],
      ]),
    );
  });

  it('o ícone é escolhido, aparece e sai', async () => {
    const { user, saved } = await openInfo();
    await user.upload(
      screen.getByLabelText('Imagem do ícone'),
      new File([fakePng(20_000)], 'icone.png', { type: 'image/png' }),
    );
    await waitFor(async () => expect((await saved())?.icon?.width).toBe(128));
    await user.click(screen.getByRole('button', { name: 'Remover' }));
    await waitFor(async () => expect((await saved())?.icon).toBeUndefined());
  });
});
