/** Tema do app neste aparelho: acompanha o sistema operacional, ou sempre claro ou escuro. */
export type ThemeChoice = 'sistema' | 'claro' | 'escuro';

/**
 * Fica no `localStorage` (não no banco): é lido antes de o app abrir, para não piscar o tema
 * errado. Se o armazenamento falhar, vale o do sistema.
 */
const KEY = 'tabula:tema';

const systemQuery = () =>
  typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-color-scheme: dark)')
    : undefined;

export function storedTheme(): ThemeChoice {
  try {
    const value = localStorage.getItem(KEY);
    return value === 'claro' || value === 'escuro' ? value : 'sistema';
  } catch {
    return 'sistema';
  }
}

export function applyTheme(choice: ThemeChoice = storedTheme()): void {
  const dark = choice === 'escuro' || (choice === 'sistema' && systemQuery()?.matches === true);
  document.documentElement.classList.toggle('dark', dark);
}

export function setTheme(choice: ThemeChoice): void {
  try {
    if (choice === 'sistema') localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, choice);
  } catch {
    // Sem armazenamento: o tema vale até fechar o app.
  }
  applyTheme(choice);
}

/** Aplica o tema e acompanha o sistema operacional (quando o tema é "sistema"). */
export function startTheme(): void {
  applyTheme();
  systemQuery()?.addEventListener('change', () => applyTheme());
}
