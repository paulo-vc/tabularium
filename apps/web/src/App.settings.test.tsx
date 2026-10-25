import { DexieTrackRepository, TabulaDatabase } from '@tabula/storage';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { App } from './App';
import { createServices, type Services } from './app/services';

let db: TabulaDatabase;
let services: Services;

beforeEach(() => {
  window.location.hash = '#/configuracoes';
  localStorage.clear();
  document.documentElement.classList.remove('dark');
  db = new TabulaDatabase(`ui-configuracoes-${crypto.randomUUID()}`);
  services = createServices(db);
});

afterEach(async () => {
  cleanup();
  db.close();
  await db.delete();
});

function renderSettings() {
  const user = userEvent.setup();
  render(<App services={services} />);
  return user;
}

describe('configurações', () => {
  it('reúne as preferências do aparelho, numa página do cabeçalho', async () => {
    window.location.hash = '#/';
    const user = renderSettings();
    await user.click(await screen.findByRole('link', { name: 'Configurações' }));
    expect(await screen.findByRole('heading', { name: 'Configurações' })).toBeInTheDocument();
    for (const section of [
      'Você',
      'Aparência',
      'Sons e avisos',
      'Dados 3D',
      'Música da mesa',
      'Conexão',
    ]) {
      expect(await screen.findByRole('heading', { name: section })).toBeInTheDocument();
    }
    expect(screen.getByRole('heading', { name: 'Armazenamento' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Privacidade' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /política de privacidade/ })).toBeInTheDocument();
  });

  it('o escuro é o padrão; claro e "do sistema" valem na hora e ficam guardados', async () => {
    const user = renderSettings();
    const themes = await screen.findByRole('radiogroup', { name: 'Tema' });
    expect(within(themes).getByRole('radio', { name: /Escuro/ })).toHaveAttribute(
      'aria-checked',
      'true',
    );
    await user.click(within(themes).getByRole('radio', { name: /Claro/ }));
    expect(document.documentElement).not.toHaveClass('dark');
    expect(localStorage.getItem('tabula:tema')).toBe('claro');

    await user.click(within(themes).getByRole('radio', { name: /Escuro/ }));
    expect(document.documentElement).toHaveClass('dark');
    expect(localStorage.getItem('tabula:tema')).toBeNull();

    await user.click(within(themes).getByRole('radio', { name: /Do sistema/ }));
    expect(localStorage.getItem('tabula:tema')).toBe('sistema');
  });

  it('o nome salvo vem preenchido nas próximas campanhas', async () => {
    const user = renderSettings();
    const name = await screen.findByLabelText('Seu nome');
    await user.type(name, 'Ana');
    await user.click(screen.getByRole('button', { name: 'Salvar' }));
    await waitFor(async () => expect(await services.device.getDisplayName()).toBe('Ana'));
  });

  it('dados 3D: cor e animação; desligar esconde as opções', async () => {
    const user = renderSettings();
    await user.click(await screen.findByRole('radio', { name: 'Safira' }));
    await user.click(screen.getByRole('checkbox', { name: /Animar os dados/ }));
    await waitFor(async () =>
      expect(await services.sounds.settings()).toMatchObject({
        diceColor: '#1d4ed8',
        diceMotion: false,
      }),
    );
    await user.click(screen.getByRole('checkbox', { name: /Dados 3D nas rolagens/ }));
    await waitFor(() => expect(screen.queryByRole('radio', { name: 'Safira' })).toBeNull());
  });

  it('apaga as músicas recebidas', async () => {
    const data = new Uint8Array(1000);
    data.set([0x49, 0x44, 0x33], 0);
    await services.music.add('c1', new File([data], 'Taverna.mp3', { type: 'audio/mpeg' }));
    // Guardada como recebida (a do Mestre não conta).
    const [library] = await services.music.list('c1');
    if (!library) throw new Error('trilha não guardada');
    const track = await services.music.get('c1', library.id);
    if (!track) throw new Error('trilha não guardada');
    await new DexieTrackRepository(db).save('c2', {
      meta: { ...track.meta, id: 'r1', origin: 'recebida' },
      data: track.data,
    });

    const user = renderSettings();
    const storage = (await screen.findByRole('heading', { name: 'Armazenamento' })).closest(
      '[data-slot="card"]',
    ) as HTMLElement;
    await waitFor(() => expect(storage).toHaveTextContent('Músicas recebidas'));
    await waitFor(() =>
      expect(within(storage).getByRole('button', { name: /Apagar/ })).toBeEnabled(),
    );
    await user.click(within(storage).getByRole('button', { name: /Apagar/ }));
    await waitFor(() => expect(storage).toHaveTextContent('Nenhuma guardada.'));
    expect(await services.music.list('c1')).toHaveLength(1);
  });
});
