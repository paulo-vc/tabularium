import './testing/structured-clone';
import '@testing-library/jest-dom/vitest';
import 'fake-indexeddb/auto';
import { configure } from '@testing-library/react';
import { beforeEach } from 'vitest';

// Esperas da tela (`findBy…`, `waitFor`): 1 s ficava apertado com a suíte em paralelo.
configure({ asyncUtilTimeout: 3000 });

// Boas-vindas e dicas da primeira vez: os testes partem de um app já conhecido (os testes
// delas limpam isto).
beforeEach(() => {
  localStorage.setItem('tabula:boas-vindas', '1');
  localStorage.setItem('tabula:dicas-vistas', JSON.stringify(['mestre-sessao', 'jogador-sessao']));
  localStorage.setItem('tabula:editor-etapas', '1');
});

// APIs ausentes no jsdom e usadas pelos componentes Radix (Select, Dialog…).
Element.prototype.scrollIntoView ??= function scrollIntoView() {};
Element.prototype.hasPointerCapture ??= () => false;
Element.prototype.releasePointerCapture ??= function releasePointerCapture() {};
globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
};
window.matchMedia ??= (query: string) =>
  ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  }) as MediaQueryList;

// Endereços locais de imagens (galeria e cutscene): o jsdom não os implementa.
let objectUrls = 0;
URL.createObjectURL ??= () => `blob:teste/${++objectUrls}`;
URL.revokeObjectURL ??= () => {};

// O jsdom não toca áudio: tocar e pausar só mudam o estado (a música da mesa usa <audio>).
Object.defineProperty(HTMLMediaElement.prototype, 'play', {
  configurable: true,
  value(this: HTMLMediaElement) {
    Object.defineProperty(this, 'paused', { configurable: true, value: false });
    return Promise.resolve();
  },
});
Object.defineProperty(HTMLMediaElement.prototype, 'pause', {
  configurable: true,
  value(this: HTMLMediaElement) {
    Object.defineProperty(this, 'paused', { configurable: true, value: true });
  },
});
