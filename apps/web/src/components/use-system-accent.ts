import type { SystemAccent } from '@tabula/domain';
import { useEffect } from 'react';

/**
 * Enquanto a tela de um sistema está aberta (ficha, campanha), o app usa a cor de destaque
 * dele: botões, abas e foco, também nas janelas e menus. Ao sair, volta ao cobalto.
 */
export function useSystemAccent(accent: SystemAccent | undefined) {
  useEffect(() => {
    if (!accent || accent === 'cobalto') return;
    const root = document.documentElement;
    root.dataset.destaque = accent;
    return () => {
      if (root.dataset.destaque === accent) delete root.dataset.destaque;
    };
  }, [accent]);
}
