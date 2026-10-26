import { inviteFor } from '@tabula/domain';
import { TabulaDatabase } from '@tabula/storage';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { App } from './App';
import { createServices, type Services } from './app/services';

const databases: TabulaDatabase[] = [];

function device(name: string): Services {
  const db = new TabulaDatabase(`ui-volta-${name}-${crypto.randomUUID()}`);
  databases.push(db);
  return createServices(db);
}

afterEach(async () => {
  cleanup();
  for (const db of databases.splice(0)) {
    db.close();
    await db.delete();
  }
});

describe('voltar à mesa na semana seguinte', () => {
  it('quem só mestra abre o app e acha a campanha na tela inicial', async () => {
    const gm = device('mestre');
    const campaign = await gm.campaigns.create({
      name: 'A Mina Perdida',
      templateId: 'dnd5e-srd',
      gmName: 'Ana',
    });
    window.location.hash = '#/';
    const user = userEvent.setup();
    render(<App services={gm} />);
    await user.click(await screen.findByRole('link', { name: 'A Mina Perdida' }));
    expect(window.location.hash).toBe(`#/campanhas/${campaign.id}`);
  });

  it('a ficha da jogadora volta para a campanha, não para a lista de fichas', async () => {
    const gm = device('mestre');
    const player = device('jogadora');
    const campaign = await gm.campaigns.create({
      name: 'A Mina Perdida',
      templateId: 'dnd5e-srd',
      gmName: 'Ana',
    });
    await player.campaigns.join(inviteFor(campaign), 'Bruno');
    const created = await player.campaigns.createLinkedSheet(campaign.id, 'Lyra');
    if (!created.ok) throw new Error(created.error.message);
    const solo = await player.sheets.create({ name: 'Avulsa', templateId: 'dnd5e-srd' });

    window.location.hash = `#/fichas/${created.value.id}`;
    render(<App services={player} />);
    expect(await screen.findByRole('link', { name: 'Voltar à campanha' })).toHaveAttribute(
      'href',
      `#/campanhas/${campaign.id}`,
    );
    cleanup();

    window.location.hash = `#/fichas/${solo.id}`;
    render(<App services={player} />);
    expect(await screen.findByRole('link', { name: 'Voltar às fichas' })).toHaveAttribute(
      'href',
      '#/',
    );
  });
});
