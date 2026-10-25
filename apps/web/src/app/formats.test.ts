import { shortInviteCode } from '@tabula/sync';
import { describe, expect, it } from 'vitest';
import { decodeInvite, encodeInvite } from './invite-link';

/**
 * Formatos estáveis da 1.0 (ver `docs/formatos.md`): estes testes travam os bytes. Se um
 * deles quebrar, o formato mudou, e convites, cópias ou arquivos já espalhados deixariam de
 * valer. Mudar de propósito exige uma versão nova do formato (com leitura da antiga).
 */
const INVITE = {
  v: 1 as const,
  campaignId: '0f2b66ff-bfe0-4dcf-9aab-4a41735e4dda',
  name: 'A Mina Perdida',
  gmId: '9432713f-6279-4fe1-9336-df960c138b6f',
  gmName: 'Paulo',
  gmKey: 'Ag9ALeNmNhdKoLpMKdFI3PGv2r5_xr3jvhPh0Klu4cs',
  templateRef: { id: 'dnd5e-srd', version: '1.6.0', source: 'builtin' as const },
  templateName: 'D&D 5ª Edição (SRD 5.1)',
  secret: 'Ag8V6kBCFS9DPqWfPLmWrA',
};

const CODE =
  'Ag8PK2b_v-BNz5qrSkFzXk3alDJxP2J5T-GTNt-WDBOLbwIPFepAQhUvQz6lnzy5lqwCD0At42Y2F0qgukwp0Ujc8a_avn_GveO-E-HQqW7hywAJZG5kNWUtc3JkAQYADkEgTWluYSBQZXJkaWRhBVBhdWxvGkQmRCA1wqogRWRpw6fDo28gKFNSRCA1LjEp';

describe('formatos estáveis', () => {
  it('convite: os mesmos dados dão sempre o mesmo código, e o código lê os mesmos dados', () => {
    expect(encodeInvite(INVITE)).toBe(CODE);
    expect(decodeInvite(CODE)).toEqual({ ok: true, value: INVITE });
  });

  it('código curto: o mesmo convite dá sempre o mesmo código', () => {
    expect(shortInviteCode(INVITE)).toBe('RDK7-74KZ-S31Z-5Z9V-A8P3');
  });
});
