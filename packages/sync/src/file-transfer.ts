import { sha256 } from '@noble/hashes/sha2.js';
import { bytesToHex } from '@noble/hashes/utils.js';
import { IMAGE_CHUNK_BYTES } from '@tabula/domain';

/** Tamanho de cada parte enviada (uma mensagem da sessão tem até 512 KB). */
export const CHUNK_BYTES = IMAGE_CHUNK_BYTES;

/** SHA-256 em hexadecimal: identifica um arquivo (imagem, trilha) pelo conteúdo. */
export function hashBytes(bytes: Uint8Array): string {
  return bytesToHex(sha256(bytes));
}

/** Quantas partes um arquivo desse tamanho tem. */
export const chunkCount = (size: number) => Math.max(1, Math.ceil(size / CHUNK_BYTES));

/** Divide o arquivo em partes que cabem numa mensagem da sessão. */
export function chunkBytes(bytes: Uint8Array): Uint8Array[] {
  const total = chunkCount(bytes.byteLength);
  return Array.from({ length: total }, (_, index) =>
    bytes.subarray(index * CHUNK_BYTES, (index + 1) * CHUNK_BYTES),
  );
}

/**
 * Junta as partes de UM arquivo esperado. Tudo é conferido: índice, total de partes, tamanho
 * de cada uma e, no fim, tamanho, hash e o que `genuine` exigir do conteúdo (ex.: o tipo real
 * pelos primeiros bytes). Partes de outro arquivo, repetidas ou fora do esperado são ignoradas.
 */
export class FileAssembler {
  private readonly parts: (Uint8Array | undefined)[];
  private received = 0;
  private done = false;

  constructor(
    private readonly expected: { hash: string; size: number },
    private readonly genuine: (bytes: Uint8Array) => boolean,
  ) {
    this.parts = new Array<Uint8Array | undefined>(chunkCount(expected.size));
  }

  get hash(): string {
    return this.expected.hash;
  }

  /** Quantas partes já chegaram, de quantas (para mostrar o progresso). */
  progress(): { received: number; total: number } {
    return { received: this.received, total: this.parts.length };
  }

  /**
   * Acrescenta uma parte. Devolve o arquivo quando ele fica completo e confere; `null`
   * enquanto falta algo (ou se a parte foi recusada).
   */
  add(hash: string, index: number, total: number, data: Uint8Array): Uint8Array | null {
    if (this.done || hash !== this.expected.hash || total !== this.parts.length) return null;
    if (!Number.isInteger(index) || index < 0 || index >= total || this.parts[index]) return null;
    const last = index === total - 1;
    const expectedSize = last ? this.expected.size - CHUNK_BYTES * (total - 1) : CHUNK_BYTES;
    if (data.byteLength !== expectedSize) return null;
    this.parts[index] = data.slice();
    if (++this.received < total) return null;

    this.done = true;
    const bytes = new Uint8Array(this.expected.size);
    let offset = 0;
    for (const part of this.parts as Uint8Array[]) {
      bytes.set(part, offset);
      offset += part.byteLength;
    }
    return hashBytes(bytes) === this.expected.hash && this.genuine(bytes) ? bytes : null;
  }
}
