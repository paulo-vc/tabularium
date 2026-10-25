import type { SystemTemplate } from '@tabula/domain';
import { CheckIcon, XIcon } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

const KEY = 'tabula:editor-etapas';

function hidden(): boolean {
  try {
    return localStorage.getItem(KEY) !== null;
  } catch {
    return false;
  }
}

type Tab = 'estrutura' | 'informacoes' | 'previa';

/**
 * O caminho de quem cria um sistema, no topo do editor: cada etapa se marca sozinha conforme
 * o sistema avança, e leva à aba certa. Some ao fechar (e não volta neste aparelho).
 */
export function EditorSteps({
  template,
  saved,
  onGo,
}: {
  template: SystemTemplate;
  /** Já foi salvo alguma vez (a versão instalada existe). */
  saved: boolean;
  onGo: (tab: Tab) => void;
}) {
  const [closed, setClosed] = useState(hidden);
  if (closed) return null;

  const sections = template.layouts.full.filter((node) => node.kind === 'section').length;
  const steps: { title: string; detail: string; done: boolean; tab: Tab }[] = [
    {
      title: 'Nome e dado',
      detail: 'Na aba Informações: nome, dado dos testes e dados próprios, se houver.',
      done: template.name.trim() !== '' && template.checkDice !== undefined,
      tab: 'informacoes',
    },
    {
      title: 'Campos',
      detail: 'Na aba Estrutura: atributos, recursos, listas e fórmulas.',
      done: template.fields.length >= 3,
      tab: 'estrutura',
    },
    {
      title: 'Seções',
      detail: 'Agrupe os campos em seções (e abas, se a ficha for grande).',
      done: sections >= 2,
      tab: 'estrutura',
    },
    {
      title: 'Prévia e salvar',
      detail: 'Confira a ficha na prévia e salve: o sistema fica pronto para usar.',
      done: saved,
      tab: 'previa',
    },
  ];

  return (
    <nav aria-label="Etapas do sistema" className="rounded-lg border p-3">
      <div className="flex items-start gap-2">
        <ol className="grid flex-1 gap-2 sm:grid-cols-4">
          {steps.map((step, index) => (
            <li key={step.title}>
              <button
                type="button"
                title={step.detail}
                className="hover:bg-accent flex w-full items-start gap-2 rounded-md p-1.5 text-left"
                onClick={() => onGo(step.tab)}
              >
                <span
                  className={cn(
                    'grid size-6 shrink-0 place-items-center rounded-full border text-xs tabular-nums',
                    step.done
                      ? 'bg-primary border-primary text-primary-foreground'
                      : 'text-muted-foreground',
                  )}
                >
                  {step.done ? <CheckIcon className="size-3.5" /> : index + 1}
                  <span className="sr-only">{step.done ? ' (feito)' : ''}</span>
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-medium">{step.title}</span>
                  <span className="text-muted-foreground block text-xs">{step.detail}</span>
                </span>
              </button>
            </li>
          ))}
        </ol>
        <Button
          size="icon"
          variant="ghost"
          className="size-7 shrink-0"
          aria-label="Fechar as etapas"
          onClick={() => {
            setClosed(true);
            try {
              localStorage.setItem(KEY, '1');
            } catch {
              // sem armazenamento: só fecha agora
            }
          }}
        >
          <XIcon />
        </Button>
      </div>
    </nav>
  );
}
