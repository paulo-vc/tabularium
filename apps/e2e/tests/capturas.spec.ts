import { expect, test, type Page } from '@playwright/test';
import { createCampaign, inviteLink, joinWithInvite, newDevice, startTable } from './helpers';

/**
 * Capturas de tela do guia (docs/imagens), com o app de verdade. Não roda nos testes normais:
 *
 *   CAPTURAS=1 corepack pnpm --filter @tabula/e2e e2e capturas
 *
 * Grava por cima das imagens de docs/imagens. Mestre e jogadora em aparelhos separados.
 */
const OUT = new URL('../../../docs/imagens/', import.meta.url);
const shot = (page: Page, name: string) =>
  page.screenshot({ path: new URL(name, OUT).pathname.replace(/^\/([A-Za-z]:)/, '$1') });

test.skip(!process.env.CAPTURAS, 'Só com CAPTURAS=1 (gera as imagens do guia).');
test.use({ viewport: { width: 1280, height: 720 } });

/** Espera as fontes e as transições assentarem antes de fotografar. */
async function settle(page: Page) {
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(600);
}

test('boas-vindas, ficha de exemplo e celular', async ({ browser }) => {
  const page = await newDevice(browser);
  await page.goto('');
  await expect(page.getByRole('button', { name: 'Ver uma ficha de exemplo' })).toBeVisible();
  await settle(page);
  await shot(page, 'boas-vindas.png');

  await page.getByRole('button', { name: 'Ver uma ficha de exemplo' }).click();
  await expect(page.getByRole('region', { name: 'Resumo do personagem' })).toBeVisible();
  await settle(page);
  await shot(page, 'ficha.png');

  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  await expect(page.getByRole('toolbar', { name: 'Ações rápidas' })).toBeVisible();
  await settle(page);
  await shot(page, 'celular.png');
});

test('convite, sessão do Mestre, combate, campanha da jogadora, dados e chat', async ({
  browser,
}) => {
  const gm = await newDevice(browser);
  const player = await newDevice(browser);
  await createCampaign(gm);
  await settle(gm);
  await shot(gm, 'convite.png');

  await joinWithInvite(player, await inviteLink(gm), 'Ana', 'Lia');
  await startTable(gm, player, 'Ana');
  await settle(gm);
  await shot(gm, 'mestre-sessao.png');

  // Combate: a jogadora e um Orc do bestiário, já com a ordem rodando.
  await gm.getByRole('button', { name: 'Iniciar combate' }).click();
  await gm.getByRole('textbox', { name: 'Iniciativa de Lia' }).fill('14');
  await gm.getByRole('textbox', { name: 'Criatura' }).fill('Orc');
  // O Orc age primeiro: a captura da jogadora fica sem o aviso de "É a sua vez!".
  await gm.getByRole('textbox', { name: 'Iniciativa', exact: true }).fill('17');
  await gm.getByRole('button', { name: 'Adicionar', exact: true }).click();
  await gm.getByRole('button', { name: 'Começar' }).click();
  await settle(gm);
  await shot(gm, 'combate.png');

  await expect(player.getByRole('list', { name: 'Ordem de turno' })).toContainText('Lia');
  await settle(player);
  await shot(player, 'jogador-campanha.png');

  // Chat: uma fala de cada lado.
  await gm.getByRole('button', { name: /Abrir chat/ }).click();
  await gm.getByPlaceholder(/Mensagem, \/me/).fill('A porta da mina range. Quem entra primeiro?');
  await gm.keyboard.press('Enter');
  await player.getByRole('button', { name: /Abrir chat/ }).click();
  await player.getByPlaceholder(/Mensagem, \/me/).fill('/me acende a lanterna e vai na frente');
  await player.keyboard.press('Enter');
  await expect(gm.getByText('acende a lanterna')).toBeVisible();
  await settle(gm);
  await shot(gm, 'chat.png');
  await gm.getByRole('button', { name: 'Fechar chat' }).click();
  await player.getByRole('button', { name: 'Fechar chat' }).click();

  // Dados: a jogadora rola um teste pela ficha; o resultado aparece à direita.
  await player.getByRole('link', { name: 'Abrir ficha' }).click();
  // Sem o aviso "É a sua vez!" na frente.
  const turn = player.getByRole('alert').filter({ hasText: 'É a sua vez!' });
  if (await turn.isVisible()) {
    // O aviso pulsa (nunca fica "estável" para o Playwright): clique forçado.
    await turn.getByRole('button', { name: 'Fechar aviso' }).click({ force: true });
  }
  await player.getByRole('button', { name: 'Rolar Mod. Força' }).first().click();
  await player.waitForTimeout(2500);
  await shot(player, 'dados.png');
});

test('criador de sistemas', async ({ browser }) => {
  const page = await newDevice(browser);
  await page.goto('#/sistemas');
  await page.getByRole('button', { name: 'Criar sistema' }).click();
  await page.getByLabel('Nome do sistema').fill('Minha Fantasia');
  await page.getByRole('button', { name: 'Começar a editar' }).click();
  await expect(page).toHaveURL(/#\/sistemas\/editor\//);
  await settle(page);
  await shot(page, 'criador.png');
});
