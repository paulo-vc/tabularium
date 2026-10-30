import { CrownIcon, DoorOpenIcon, ScrollTextIcon, SparklesIcon } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import { useLocation } from 'wouter';
import { useServices } from '@/app/services-context';
import { NewSheetDialog } from '@/components/NewSheetDialog';
import { Button } from '@/components/ui/button';
import { JoinDialog, NewCampaignDialog } from './CampaignsPage';

const SEEN_KEY = 'tabula:boas-vindas';

/** Já passou pelas boas-vindas neste aparelho? (Some com os dados do navegador: sem problema.) */
export function welcomeSeen(): boolean {
  try {
    return localStorage.getItem(SEEN_KEY) !== null;
  } catch {
    return false;
  }
}

function markSeen(): void {
  try {
    localStorage.setItem(SEEN_KEY, '1');
  } catch {
    // sem armazenamento: as boas-vindas aparecem de novo enquanto o aparelho estiver vazio
  }
}

/**
 * Boas-vindas, na primeira vez (aparelho sem fichas nem campanhas): o que é o app e três
 * caminhos — mestrar, jogar ou só fazer uma ficha. Cada caminho abre a janela de sempre.
 */
export function Welcome({ onSkip }: { onSkip: () => void }) {
  const { sheets } = useServices();
  const [, navigate] = useLocation();
  const [busy, setBusy] = useState(false);

  const example = async () => {
    setBusy(true);
    try {
      const sheet = await sheets.createExample();
      if (!sheet) return;
      markSeen();
      navigate(`/fichas/${sheet.id}`);
    } catch (error) {
      console.error('Falha ao criar a ficha de exemplo', error);
      toast.error('Não foi possível criar a ficha de exemplo');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section aria-labelledby="boas-vindas" className="mx-auto max-w-3xl space-y-8 py-4 sm:py-8">
      <div className="space-y-3 text-center">
        <h1 id="boas-vindas" className="text-3xl font-bold tracking-tight sm:text-4xl">
          Boas-vindas ao Tabularium
        </h1>
        <p className="text-muted-foreground mx-auto max-w-xl text-balance">
          Fichas de RPG que ficam no seu aparelho e uma mesa online em que o Mestre acompanha as
          fichas de todos ao vivo. Sem conta, sem servidor e de graça.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <NewCampaignDialog
          trigger={
            <Choice icon={<CrownIcon />} title="Vou mestrar" onOpen={markSeen}>
              Crie a campanha, mande o convite e abra a sessão quando o jogo começar.
            </Choice>
          }
        />
        <JoinDialog
          trigger={
            <Choice icon={<DoorOpenIcon />} title="Vou jogar" onOpen={markSeen}>
              Entre com o código que o Mestre mandou e crie a sua ficha.
            </Choice>
          }
        />
        <NewSheetDialog
          trigger={
            <Choice icon={<ScrollTextIcon />} title="Só quero uma ficha" onOpen={markSeen}>
              Monte o personagem agora; dá para levá-lo a uma campanha depois.
            </Choice>
          }
        />
      </div>

      <div className="flex flex-col items-center gap-2 text-sm">
        <Button variant="link" disabled={busy} onClick={() => void example()}>
          <SparklesIcon /> Ver uma ficha de exemplo
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground"
          onClick={() => {
            markSeen();
            onSkip();
          }}
        >
          Pular
        </Button>
      </div>
    </section>
  );
}

/** Um dos caminhos: um cartão grande que abre a janela correspondente. */
function Choice({
  icon,
  title,
  children,
  onOpen,
  ...props
}: {
  icon: ReactNode;
  title: string;
  children: ReactNode;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      {...props}
      onClickCapture={onOpen}
      className="bg-card hover:border-primary/60 hover:bg-accent/40 focus-visible:ring-ring/50 flex h-full flex-col items-start gap-3 rounded-xl border p-5 text-left shadow-sm transition-colors focus-visible:ring-3 focus-visible:outline-none"
    >
      <span className="bg-primary/10 text-primary grid size-10 place-items-center rounded-lg [&_svg]:size-5">
        {icon}
      </span>
      <span className="text-base font-semibold">{title}</span>
      <span className="text-muted-foreground text-sm">{children}</span>
    </button>
  );
}
