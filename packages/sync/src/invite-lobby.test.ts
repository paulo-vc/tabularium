import type { CampaignInvite } from '@tabula/domain';
import { describe, expect, it } from 'vitest';
import { generateGmKeyPair, toBase64Url } from './identity';
import {
  fetchInviteByCode,
  parseShortInviteCode,
  serveInviteLobby,
  shortInviteCode,
} from './invite-lobby';
import { MemoryNetwork } from './memory-transport';
import { decodeMessage } from './protocol';

const gm = generateGmKeyPair();
const secret = () => toBase64Url(crypto.getRandomValues(new Uint8Array(16)));

const invite = (change: Partial<CampaignInvite> = {}): CampaignInvite => ({
  v: 1,
  campaignId: 'campanha',
  name: 'A Mina Perdida',
  gmId: 'mestre',
  gmName: 'Paulo',
  gmKey: gm.publicKey,
  templateRef: { id: 'dnd5e-srd', version: '1.6.0', source: 'builtin' },
  templateName: 'D&D 5e',
  secret: secret(),
  ...change,
});

describe('código curto do convite', () => {
  it('tem 20 caracteres fáceis de ditar, e muda com o segredo e com a chave', () => {
    const base = invite();
    const code = shortInviteCode(base);
    expect(code).toMatch(/^[0-9A-HJKMNP-TV-Z]{4}(-[0-9A-HJKMNP-TV-Z]{4}){4}$/);
    expect(shortInviteCode(base)).toBe(code);
    expect(shortInviteCode({ ...base, secret: secret() })).not.toBe(code);
    expect(shortInviteCode({ ...base, gmKey: generateGmKeyPair().publicKey })).not.toBe(code);
  });

  it('aceita o código digitado de qualquer jeito', () => {
    const code = shortInviteCode(invite()) as string;
    const typed = code.toLowerCase().replace(/-/g, ' ').replace(/0/g, 'o').replace(/1/g, 'l');
    expect(parseShortInviteCode(typed)).toBe(code);
    expect(parseShortInviteCode('ABCD-EFGH')).toBeNull();
    expect(parseShortInviteCode('https://exemplo.com/#/convite/abc')).toBeNull();
  });

  it('a jogadora busca o convite completo com o Mestre', async () => {
    const network = new MemoryNetwork();
    const original = invite();
    const code = shortInviteCode(original) as string;
    serveInviteLobby(network.join(), original, gm);
    const result = fetchInviteByCode(network.join(), code, { timeoutMs: 1000 });
    await network.settle();
    expect(await result).toEqual({ ok: true, invite: original });
  });

  it('quem só tem o código não se passa pelo Mestre', async () => {
    const network = new MemoryNetwork();
    const original = invite();
    const code = shortInviteCode(original) as string;
    // Um impostor na sala, com outra chave (ou com a pública do Mestre, sem a privada).
    const impostor = generateGmKeyPair();
    serveInviteLobby(network.join(), { ...original, gmKey: impostor.publicKey }, impostor);
    serveInviteLobby(
      network.join(),
      { ...original, gmName: 'Falso' },
      {
        publicKey: gm.publicKey,
        secretKey: impostor.secretKey,
      },
    );
    const result = fetchInviteByCode(network.join(), code, { timeoutMs: 200 });
    await network.settle();
    expect(await result).toEqual({ ok: false, reason: 'mestre-ausente' });
  });

  it('a sala de espera não atrapalha a sessão (o protocolo ignora as mensagens dela)', () => {
    expect(decodeMessage(Uint8Array.of(0xc8))).toBeNull();
  });
});
