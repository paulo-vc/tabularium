/** O app está rodando instalado (Tauri), no computador ou no Android. */
export const isTauriApp = () => '__TAURI_INTERNALS__' in window;

/** O app instalado no Android: sem atualização automática nem aviso na barra de tarefas. */
export const isAndroidApp = () => isTauriApp() && /Android/i.test(navigator.userAgent);

/** O app instalado no computador (Windows, Linux, macOS). */
export const isDesktopApp = () => isTauriApp() && !isAndroidApp();

/**
 * Abre um endereço externo no navegador do usuário. No app desktop, links comuns não
 * saem da janela do app: o plugin `opener` do Tauri entrega o endereço ao sistema.
 */
export async function openExternal(url: string): Promise<void> {
  if (isTauriApp()) {
    const { openUrl } = await import('@tauri-apps/plugin-opener');
    await openUrl(url);
    return;
  }
  window.open(url, '_blank', 'noopener,noreferrer');
}
