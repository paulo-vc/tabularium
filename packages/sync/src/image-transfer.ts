import { MAX_IMAGE_BYTES, sniffImageMime, type Cutscene } from '@tabula/domain';
import { chunkBytes, FileAssembler, hashBytes } from './file-transfer';

/** SHA-256 em hexadecimal: identifica uma imagem pelo conteúdo. */
export const hashImage = hashBytes;

/** Divide a imagem em partes que cabem numa mensagem da sessão. */
export const chunkImage = chunkBytes;

/**
 * Junta as partes de UMA imagem esperada (a da cutscene atual): além do hash e do tamanho,
 * o tipo real do conteúdo precisa ser o declarado (só PNG, JPEG ou WebP).
 */
export class ImageAssembler extends FileAssembler {
  constructor(expected: Pick<Cutscene, 'hash' | 'mime' | 'size'>) {
    super(
      expected,
      (bytes) => bytes.byteLength <= MAX_IMAGE_BYTES && sniffImageMime(bytes) === expected.mime,
    );
  }
}
