import { SettingsIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link, useRoute } from 'wouter';
import { cn } from '@/lib/utils';
import { ChatDock } from './live/ChatDock';
import { CutsceneOverlay } from './live/CutsceneOverlay';
import { DiceTray } from './live/DiceTray';
import { MusicPlayer } from './live/MusicPlayer';
import { GmChangeNotice } from './live/GmChangeNotice';
import { LiveSessionIndicator } from './live/LiveSessionIndicator';
import { RollNotice } from './live/RollNotice';
import { SessionNotices } from './live/SessionNotices';
import { useLiveSession } from './live/use-live-session';
import { UpdateNotice } from './UpdateNotice';
import { guideUrl, newIssueUrl } from '@/app/updates';
import { openExternal } from '@/lib/open-external';

/** `also`: outras rotas que pertencem à mesma seção (ex.: uma ficha pertence a "Fichas"). */
/** Engrenagem no cabeçalho: abre as Configurações (som, dados, música, tema…). */
function SettingsLink() {
  const [active] = useRoute('/configuracoes');
  return (
    <Link
      href="/configuracoes"
      aria-label="Configurações"
      title="Configurações"
      aria-current={active ? 'page' : undefined}
      className={cn(
        'hover:bg-accent grid size-8 shrink-0 pointer-coarse:size-9 place-items-center rounded-md transition-colors',
        active && 'bg-accent',
      )}
    >
      <SettingsIcon className="size-4" />
    </Link>
  );
}

function NavLink({ href, also, children }: { href: string; also?: string; children: ReactNode }) {
  const [exact] = useRoute(href);
  const [nested] = useRoute(also ?? href);
  const active = exact || nested;
  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={cn(
        // Aba ativa: texto em ouro e um traço dourado embaixo, colado no filete do cabeçalho.
        'relative px-1.5 py-1.5 text-sm font-medium tracking-wide transition-colors pointer-coarse:py-2.5 sm:px-3',
        'after:absolute after:inset-x-2 after:-bottom-[calc(0.75rem+1px)] after:h-0.5 after:rounded-full after:transition-opacity',
        active
          ? 'text-primary after:bg-primary after:opacity-100 after:shadow-[0_0_10px_var(--primary)]'
          : 'text-muted-foreground hover:text-foreground after:opacity-0',
      )}
    >
      {children}
    </Link>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  // Na sessão, o botão do chat fica fixo no canto: o rodapé ganha espaço para não ficar embaixo dele.
  const inSession = useLiveSession().kind !== 'nenhuma';
  return (
    <div className="bg-background text-foreground min-h-dvh print:bg-white">
      <header className="cabecalho sticky top-0 z-10 backdrop-blur print:hidden">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-1.5 px-4 sm:gap-5">
          <Link
            href="/"
            aria-label="Tabularium RPG"
            className="group flex shrink-0 items-center gap-2.5 font-semibold"
          >
            <img
              src="icon.svg"
              alt=""
              className="size-8 rounded-lg shadow-[0_0_14px_-2px_color-mix(in_oklch,var(--primary)_45%,transparent)] transition-transform group-hover:rotate-[-8deg]"
            />
            {/* Em telas estreitas, só o ícone: o menu e o indicador de sessão precisam do espaço. */}
            <span className="font-brand marca hidden text-2xl leading-none font-bold tracking-[0.14em] uppercase sm:inline">
              Tabularium RPG
            </span>
          </Link>
          <nav aria-label="Principal" className="flex min-w-0 gap-0.5 sm:gap-1">
            <NavLink href="/" also="/fichas/*">
              Fichas
            </NavLink>
            <NavLink href="/campanhas" also="/campanhas/*">
              Campanhas
            </NavLink>
            <NavLink href="/sistemas" also="/sistemas/*">
              Sistemas
            </NavLink>
          </nav>
          <div className="ml-auto flex shrink-0 items-center gap-1 sm:gap-2">
            <LiveSessionIndicator />
            <SettingsLink />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6 print:max-w-none print:p-0">{children}</main>
      <footer
        className={cn(
          'text-muted-foreground mx-auto flex max-w-7xl flex-wrap gap-x-4 gap-y-1 px-4 pb-6 text-xs print:hidden',
          inSession && 'pb-20',
        )}
      >
        <span>Tabularium RPG {__APP_VERSION__}</span>
        <a
          href={guideUrl}
          className="hover:text-foreground underline-offset-2 hover:underline"
          onClick={(event) => {
            event.preventDefault();
            void openExternal(guideUrl);
          }}
        >
          Guia de uso
        </a>
        <a
          href={newIssueUrl}
          className="hover:text-foreground underline-offset-2 hover:underline"
          onClick={(event) => {
            event.preventDefault();
            void openExternal(newIssueUrl);
          }}
        >
          Reportar um problema
        </a>
      </footer>
      {/* Avisos e o chat não saem na impressão. */}
      <div className="print:hidden">
        <UpdateNotice />
        <GmChangeNotice />
        <ChatDock />
        <CutsceneOverlay />
        <MusicPlayer />
        <RollNotice />
        <DiceTray />
        <SessionNotices />
      </div>
    </div>
  );
}
