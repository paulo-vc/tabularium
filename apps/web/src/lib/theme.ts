/**
 * Tema do app neste aparelho: escuro (o padrão, a "Noite arcana"), claro, ou o do sistema
 * operacional.
 */
export type ThemeChoice = 'sistema' | 'claro' | 'escuro';

/**
 * Fica no `localStorage` (não no banco): é lido antes de o app abrir, para não piscar o tema
 * errado. Se o armazenamento falhar, vale o escuro.
 */
const KEY = 'tabula:tema';

const systemQuery = () =>
  typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-color-scheme: dark)')
    : undefined;

export function storedTheme(): ThemeChoice {
  try {
    const value = localStorage.getItem(KEY);
    return value === 'claro' || value === 'sistema' ? value : 'escuro';
  } catch {
    return 'escuro';
  }
}

export function applyTheme(choice: ThemeChoice = storedTheme()): void {
  const dark = choice === 'escuro' || (choice === 'sistema' && systemQuery()?.matches === true);
  document.documentElement.classList.toggle('dark', dark);
}

export function setTheme(choice: ThemeChoice): void {
  try {
    if (choice === 'escuro') localStorage.removeItem(KEY);
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
