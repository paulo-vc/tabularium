import { useSyncExternalStore } from 'react';

/** A consulta de mídia vale agora (ex.: tela larga), acompanhando mudanças de tamanho. */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const list = window.matchMedia(query);
      list.addEventListener?.('change', onChange);
      return () => list.removeEventListener?.('change', onChange);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}
