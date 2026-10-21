import { CampaignInviteSchema, type CampaignInvite } from '@tabula/domain';
import { ed25519 } from '@noble/curves/ed25519.js';
import { sha256 } from '@noble/hashes/sha2.js';
import { fromBase64Url, toBase64Url, type GmKeyPair } from './identity';
import type { SyncTransport } from './transport';

/**
 * Convite curto: 20 letras e números ("K7QM-2XPA-9DFR-WB3N"), para ditar ou digitar no
 * celular. Não cabe o convite inteiro: o código abre uma sala de espera em que o Mestre,
 * com a sessão aberta, entrega o convite completo.
 *
 * O código leva 100 bits: 40 tirados do segredo da campanha e 60 da chave pública do Mestre
 * (com os 40 primeiros como sal). Quem recebe confere os dois no convite entregue e a
 * assinatura do Mestre sobre ele, então quem só tem o código não consegue se passar pelo
 * Mestre: precisaria de uma chave com os mesmos 60 bits (2^60 tentativas) ou da chave dele.
 */

const CONTEXT = 'tabula/convite-curto/1';
const CODE_BYTES = 13; // 100 bits, nos 13 bytes (os 4 últimos bits ficam em zero)
const SALT_BYTES = 5;
/** Base32 de Crockford: sem I, L, O e U, que se confundem ao ditar ou digitar. */
const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

const REQUEST = 0xc8;
const RESPONSE = 0xc9;

const text = (value: string) => new TextEncoder().encode(value);

function concat(...parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0));
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

/** Os 100 bits do código, de um segredo e de uma chave do Mestre. */
function codeBytes(secret: string, gmKey: string): Uint8Array | null {
  const key = fromBase64Url(gmKey);
  if (key?.length !== 32) return null;
  const salt = sha256(concat(text(`${CONTEXT}\nsegredo\n`), text(secret))).slice(0, SALT_BYTES);
  const print = sha256(concat(text(`${CONTEXT}\nmestre\n`), salt, key));
  const out = concat(salt, print.slice(0, CODE_BYTES - SALT_BYTES));
  out[CODE_BYTES - 1] = (out[CODE_BYTES - 1] as number) & 0xf0;
  return out;
}

function toBase32(bytes: Uint8Array): string {
  let out = '';
  let buffer = 0;
  let bits = 0;
  for (const byte of bytes) {
    buffer = (buffer << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += ALPHABET[(buffer >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  return out.slice(0, 20);
}

/** Código curto do convite, em grupos de 4. `null` sem a chave do Mestre (campanha antiga). */
export function shortInviteCode(invite: CampaignInvite): string | null {
  if (invite.gmKey === undefined) return null;
  const bytes = codeBytes(invite.secret, invite.gmKey);
  return bytes ? (toBase32(bytes).match(/.{4}/g) ?? []).join('-') : null;
}

/**
 * Lê um código digitado: aceita minúsculas, espaços e hífens, e troca O por 0 e I/L por 1.
 * @returns o código normalizado, ou `null` se não for um código curto.
 */
export function parseShortInviteCode(input: string): string | null {
  const clean = input.toUpperCase().replace(/[\s-]/g, '').replace(/O/g, '0').replace(/[IL]/g, '1');
  if (clean.length !== 20 || ![...clean].every((char) => ALPHABET.includes(char))) return null;
  return (clean.match(/.{4}/g) ?? []).join('-');
}

/** A sala de espera do código: o nome e a senha saem do código (quem não o tem, não acha). */
export function inviteLobbyRoom(code: string): { roomId: string; secret: string } {
  const digest = (purpose: string) => sha256(text(`${CONTEXT}\n${purpose}\n${code}`));
  return {
    roomId: `convite-${toBase64Url(digest('sala').slice(0, 16))}`,
    secret: toBase64Url(digest('senha')),
  };
}

const signed = (code: string, invite: string) => text(`${CONTEXT}\nconvite\n${code}\n${invite}`);

/** Quantas vezes cada participante pode pedir o convite (contra quem insiste sem parar). */
const MAX_REQUESTS = 3;

/**
 * O Mestre na sala de espera: entrega o convite assinado a quem pede. Fica até `leave()`.
 * @returns função que fecha a sala.
 */
export function serveInviteLobby(
  transport: SyncTransport,
  invite: CampaignInvite,
  identity: GmKeyPair,
): () => Promise<void> {
  const code = shortInviteCode(invite);
  const secretKey = fromBase64Url(identity.secretKey);
  if (!code || secretKey?.length !== 32) return () => transport.leave();
  const body = JSON.stringify(invite);
  const signature = toBase64Url(ed25519.sign(signed(code, body), secretKey));
  const reply = concat(Uint8Array.of(RESPONSE), text(JSON.stringify({ invite: body, signature })));
  const asked = new Map<string, number>();
  transport.setHandlers({
    onPeerJoin: () => {},
    onPeerLeave: (peerId) => asked.delete(peerId),
    onMessage: (peerId, data) => {
      if (data.length !== 1 || data[0] !== REQUEST) return;
      const count = (asked.get(peerId) ?? 0) + 1;
      asked.set(peerId, count);
      if (count <= MAX_REQUESTS) transport.send(peerId, reply);
    },
  });
  return () => transport.leave();
}

export type InviteLobbyResult =
  | { ok: true; invite: CampaignInvite }
  | { ok: false; reason: 'mestre-ausente' | 'falha-de-conexao' | 'cancelado' };

/** Confere o convite entregue: o código bate com o segredo e a chave, e o Mestre assinou. */
function verifiedInvite(code: string, data: Uint8Array): CampaignInvite | null {
  if (data.length < 2 || data.length > 8192 || data[0] !== RESPONSE) return null;
  try {
    const message = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(data.slice(1))) as {
      invite?: unknown;
      signature?: unknown;
    };
    if (typeof message.invite !== 'string' || typeof message.signature !== 'string') return null;
    const parsed = CampaignInviteSchema.safeParse(JSON.parse(message.invite));
    if (!parsed.success || parsed.data.gmKey === undefined) return null;
    const invite = parsed.data;
    if (shortInviteCode(invite) !== code) return null;
    const key = fromBase64Url(invite.gmKey as string);
    const signature = fromBase64Url(message.signature);
    if (key?.length !== 32 || signature?.length !== 64) return null;
    return ed25519.verify(signature, signed(code, message.invite), key) ? invite : null;
  } catch {
    return null;
  }
}

/** Busca o convite completo com o Mestre, pela sala de espera do código. */
export function fetchInviteByCode(
  transport: SyncTransport,
  code: string,
  { timeoutMs = 30_000, signal }: { timeoutMs?: number; signal?: AbortSignal } = {},
): Promise<InviteLobbyResult> {
  return new Promise((resolve) => {
    let failures = 0;
    let done = false;
    const finish = (result: InviteLobbyResult) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      signal?.removeEventListener('abort', onAbort);
      void transport.leave();
      resolve(result);
    };
    const onAbort = () => finish({ ok: false, reason: 'cancelado' });
    const timer = setTimeout(
      () => finish({ ok: false, reason: failures > 0 ? 'falha-de-conexao' : 'mestre-ausente' }),
      timeoutMs,
    );
    if (signal?.aborted) return onAbort();
    signal?.addEventListener('abort', onAbort);

    transport.setHandlers({
      onPeerJoin: (peerId) => transport.send(peerId, Uint8Array.of(REQUEST)),
      onPeerLeave: () => {},
      onConnectionFailure: () => failures++,
      onMessage: (_peerId, data) => {
        const invite = verifiedInvite(code, data);
        if (invite) finish({ ok: true, invite });
      },
    });
  });
}
