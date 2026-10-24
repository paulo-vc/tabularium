import { inviteFor } from '@tabula/domain';
import { TabulaDatabase } from '@tabula/storage';
import { MemoryNetwork } from '@tabula/sync';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { App } from './App';
import { createServices, type Services } from './app/services';

let network: MemoryNetwork;
const dbs: TabulaDatabase[] = [];
const all: Services[] = [];

function device(name: string, now = () => Date.now()): Services {
  const db = new TabulaDatabase(`ui-copia-${name}-${crypto.randomUUID()}`);
  dbs.push(db);
  const services = createServices(db, {
    createTransport: () => network.join(),
    clock: { now },
  });
  all.push(services);
  return services;
}

beforeEach(() => {
  window.location.hash = '';
  network = new MemoryNetwork();
});

afterEach(async () => {
  cleanup();
  for (const services of all.splice(0)) await services.session.stop();
  await network.settle();
  for (const db of dbs.splice(0)) {
    db.close();
    await db.delete();
  }
});

const until = (assertion: () => void | Promise<void>) =>
  waitFor(
    async () => {
      await network.settle();
      await assertion();
    },
    { timeout: 4000 },
  );

describe('cópia de segurança', () => {
  it('o Mestre leva a campanha para outro aparelho e abre a sessão lá', async () => {
    const old = device('antigo');
    const campaign = await old.campaigns.create({
      name: 'A Mina Perdida',
      templateId: 'dnd5e-srd',
      gmName: 'Paulo',
    });
    // A chave do Mestre nasce na primeira sessão.
    await old.session.startAsGameMaster(campaign.id);
    await old.session.stop();
    const file = await old.backup.create(false);

    const fresh = device('novo');
    const inspected = await fresh.backup.inspect(new File([file.content], file.filename));
    if (!inspected.ok) throw new Error(inspected.error.message);
    expect(inspected.value.summary).toMatchObject({ campaigns: 1 });
    await fresh.backup.restore(inspected.value.backup);
    expect(await fresh.device.getDeviceId()).toBe(await old.device.getDeviceId());

    // No aparelho novo, ele continua sendo o Mestre: a jogadora entra e reconhece a chave.
    const restored = await fresh.campaignRepository.get(campaign.id);
    if (!restored) throw new Error('campanha não restaurada');
    const player = device('jogadora');
    await player.campaigns.join(inviteFor(restored), 'Ana');
    const sheet = await player.campaigns.createLinkedSheet(campaign.id, 'Lia');
    if (!sheet.ok) throw new Error(sheet.error.message);
    const started = await fresh.session.startAsGameMaster(campaign.id);
    expect(started.ok).toBe(true);
    await player.session.joinAsPlayer(campaign.id);
    await until(() =>
      expect(player.session.getSnapshot()).toMatchObject({
        status: { state: 'conectado' },
        gmIdentity: 'verificada',
      }),
    );
  });

  it('lembra de fazer a cópia quando há o que perder; "Fazer cópia" leva às Configurações', async () => {
    const services = device('lembrete');
    window.location.hash = '#/';
    const user = userEvent.setup();
    render(<App services={services} />);
    await screen.findByRole('heading', { name: 'Minhas fichas' });
    // Sem fichas nem campanhas, nada a lembrar.
    expect(screen.queryByRole('note')).toBeNull();
    cleanup();

    await services.sheets.create({ name: 'Lia', templateId: 'dnd5e-srd' });
    render(<App services={services} />);
    const note = await screen.findByRole('note');
    expect(note).toHaveTextContent('Faça uma cópia de segurança');
    await user.click(screen.getByRole('link', { name: 'Fazer cópia' }));
    expect(await screen.findByRole('heading', { name: 'Cópia de segurança' })).toBeInTheDocument();
    expect(screen.getByText('Nenhuma cópia feita neste aparelho ainda.')).toBeInTheDocument();
  });

  it('"Lembrar depois" esconde o lembrete por um mês', async () => {
    let now = Date.parse('2026-10-24T12:00:00Z');
    const services = device('adiar', () => now);
    await services.sheets.create({ name: 'Lia', templateId: 'dnd5e-srd' });
    window.location.hash = '#/';
    const user = userEvent.setup();
    render(<App services={services} />);
    await user.click(await screen.findByRole('button', { name: 'Lembrar depois' }));
    expect(screen.queryByRole('note')).toBeNull();
    expect(await services.backup.shouldRemind()).toBe(false);
    now += 31 * 24 * 60 * 60 * 1000;
    expect(await services.backup.shouldRemind()).toBe(true);
  });
});
