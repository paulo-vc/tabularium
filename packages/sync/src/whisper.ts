import { ChatMessageSchema, type ChatMessage } from '@tabula/domain';
import { x25519 } from '@noble/curves/ed25519.js';
import { hkdf } from '@noble/hashes/hkdf.js';
import { sha256 } from '@noble/hashes/sha2.js';
import { z } from 'zod';
import { fromBase64Url, toBase64Url } from './identity';

/**
 * Sussurro entre jogadores, cifrado de ponta a ponta. Cada jogador cria um par de chaves
 * X25519 por sessão e anuncia a pública no HELLO; o Mestre repassa as chaves e as mensagens
 * cifradas, mas não tem como lê-las. A chave de cada par de jogadores sai de ECDH + HKDF, e
 * a mensagem vai em AES-GCM, amarrada a quem manda, a quem recebe, ao ID e à hora.
 *
 * Limite honesto: as chaves passam pelo Mestre. Um app do Mestre adulterado poderia trocá-las
 * e ler; o app normal só repassa.
 */

/** Chave pública X25519, base64url (43 caracteres). */
export const WhisperKeySchema = z.string().regex(/^[A-Za-z0-9_-]{43}$/);

export interface WhisperKeys {
  publicKey: string;
  secretKey: Uint8Array;
}

export function generateWhisperKeys(): WhisperKeys {
  const { secretKey, publicKey } = x25519.keygen();
  return { publicKey: toBase64Url(publicKey), secretKey };
}

/** O que viaja pelo Mestre: quem, para quem e quando às claras; o conteúdo, cifrado. */
export const SealedWhisperSchema = z.object({
  id: ChatMessageSchema.shape.id,
  at: ChatMessageSchema.shape.at,
  authorId: ChatMessageSchema.shape.authorId,
  authorName: ChatMessageSchema.shape.authorName,
  to: ChatMessageSchema.shape.id,
  toName: ChatMessageSchema.shape.authorName,
  /** 96 bits, base64url. */
  iv: z.string().regex(/^[A-Za-z0-9_-]{16}$/),
  box: z
    .string()
    .regex(/^[A-Za-z0-9_-]+$/)
    .max(16_000),
});
export type SealedWhisper = z.infer<typeof SealedWhisperSchema>;

const CONTEXT = new TextEncoder().encode('tabula/sussurro/1');

const toBuffer = (bytes: Uint8Array) => Uint8Array.from(bytes) as Uint8Array<ArrayBuffer>;

async function pairKey(secretKey: Uint8Array, peerKey: string): Promise<CryptoKey | null> {
  const peer = fromBase64Url(peerKey);
  if (peer?.length !== 32) return null;
  try {
    const shared = x25519.getSharedSecret(secretKey, peer);
    const raw = hkdf(sha256, shared, undefined, CONTEXT, 32);
    return await crypto.subtle.importKey('raw', toBuffer(raw), 'AES-GCM', false, [
      'encrypt',
      'decrypt',
    ]);
  } catch {
    return null; // chave pública inválida (ponto fraco da curva)
  }
}

/** Os dados às claras entram como "dados adicionais": mudá-los no caminho invalida a mensagem. */
const additionalData = (w: Pick<SealedWhisper, 'id' | 'at' | 'authorId' | 'to'>) =>
  new TextEncoder().encode(JSON.stringify([w.id, w.at, w.authorId, w.to]));

/** @returns `null` se a chave de quem recebe for inválida. */
export async function sealWhisper(
  keys: WhisperKeys,
  peerKey: string,
  message: ChatMessage & { to: string; toName: string },
): Promise<SealedWhisper | null> {
  const key = await pairKey(keys.secretKey, peerKey);
  if (!key) return null;
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const content = { kind: message.kind, character: message.character, text: message.text };
  const box = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv, additionalData: additionalData(message) },
    key,
    new TextEncoder().encode(JSON.stringify(content)),
  );
  return {
    id: message.id,
    at: message.at,
    authorId: message.authorId,
    authorName: message.authorName,
    to: message.to,
    toName: message.toName,
    iv: toBase64Url(iv),
    box: toBase64Url(new Uint8Array(box)),
  };
}

/** @returns a mensagem, ou `null` se não abrir (chave errada, adulterada ou malformada). */
export async function openWhisper(
  keys: WhisperKeys,
  peerKey: string,
  sealed: SealedWhisper,
): Promise<ChatMessage | null> {
  const key = await pairKey(keys.secretKey, peerKey);
  const iv = fromBase64Url(sealed.iv);
  const box = fromBase64Url(sealed.box);
  if (!key || !iv || !box) return null;
  try {
    const plain = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: toBuffer(iv), additionalData: additionalData(sealed) },
      key,
      toBuffer(box),
    );
    const content = JSON.parse(new TextDecoder().decode(plain)) as Record<string, unknown>;
    const parsed = ChatMessageSchema.safeParse({
      id: sealed.id,
      at: sealed.at,
      authorId: sealed.authorId,
      authorName: sealed.authorName,
      to: sealed.to,
      toName: sealed.toName,
      kind: content.kind,
      character: content.character,
      text: content.text,
    });
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}
