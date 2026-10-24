import { LightbulbIcon, XIcon } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';

const KEY = 'tabula:dicas-vistas';

function seen(): string[] {
  try {
    const value = JSON.parse(localStorage.getItem(KEY) ?? '[]') as unknown;
    return Array.isArray(value) ? value.filter((item) => typeof item === 'string') : [];
  } catch {
    return [];
  }
}

/**
 * Dica curta para quem está começando, numa tela do app. Some ao fechar e não volta neste
 * aparelho (fica no `localStorage`; se ele for limpo, a dica reaparece, sem problema).
 */
export function Tip({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  const [hidden, setHidden] = useState(() => seen().includes(id));
  if (hidden) return null;
  return (
    <aside
      aria-label={title}
      className="bg-primary/5 border-primary/20 flex gap-3 rounded-lg border px-4 py-3 text-sm"
    >
      <LightbulbIcon className="text-primary mt-0.5 size-4 shrink-0" />
      <div className="min-w-0 flex-1 space-y-1">
        <p className="font-medium">{title}</p>
        <div className="text-muted-foreground space-y-1">{children}</div>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="-my-1 size-7 shrink-0"
        aria-label="Entendi, fechar a dica"
        onClick={() => {
          setHidden(true);
          try {
            localStorage.setItem(KEY, JSON.stringify([...seen(), id]));
          } catch {
            // sem armazenamento: só esconde agora
          }
        }}
      >
        <XIcon />
      </Button>
    </aside>
  );
}
