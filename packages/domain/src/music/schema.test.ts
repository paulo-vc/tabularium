import { describe, expect, it } from 'vitest';
import { MAX_TRACK_BYTES, MusicStateSchema, sniffAudioMime } from './schema';

const bytes = (...values: number[]) => Uint8Array.from(values);
const track = {
  hash: 'a'.repeat(64),
  mime: 'audio/mpeg' as const,
  size: 1000,
  title: 'Taverna',
};

describe('sniffAudioMime', () => {
  it('reconhece MP3 (ID3 ou quadro MPEG) e OGG pelos primeiros bytes', () => {
    expect(sniffAudioMime(bytes(0x49, 0x44, 0x33, 4))).toBe('audio/mpeg');
    expect(sniffAudioMime(bytes(0xff, 0xfb, 0x90))).toBe('audio/mpeg');
    expect(sniffAudioMime(bytes(0x4f, 0x67, 0x67, 0x53))).toBe('audio/ogg');
  });

  it('recusa o resto (imagem, texto, vazio)', () => {
    expect(sniffAudioMime(bytes(0x89, 0x50, 0x4e, 0x47))).toBeNull();
    expect(sniffAudioMime(Uint8Array.from('<svg', (c) => c.charCodeAt(0)))).toBeNull();
    expect(sniffAudioMime(bytes())).toBeNull();
  });
});

describe('MusicStateSchema', () => {
  it('aceita o estado da música e recusa trilha grande demais ou posição negativa', () => {
    const state = { track, playing: true, loop: false, position: 12.5 };
    expect(MusicStateSchema.safeParse(state).success).toBe(true);
    expect(
      MusicStateSchema.safeParse({ ...state, track: { ...track, size: MAX_TRACK_BYTES + 1 } })
        .success,
    ).toBe(false);
    expect(MusicStateSchema.safeParse({ ...state, position: -1 }).success).toBe(false);
    expect(
      MusicStateSchema.safeParse({ ...state, track: { ...track, mime: 'audio/wav' } }).success,
    ).toBe(false);
  });
});
