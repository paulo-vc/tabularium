import { diagnoseNetwork, type NatType } from '@tabula/sync/network';
import { CircleCheckIcon, LoaderCircleIcon, TriangleAlertIcon, WifiIcon } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

type Tone = 'ok' | 'aviso' | 'erro';

/** O resultado do diagnóstico em linguagem de mesa: o que esperar e o que fazer. */
const RESULT: Record<NatType, { tone: Tone; title: string; detail: string }> = {
  aberto: {
    tone: 'ok',
    title: 'Sua rede conecta direto.',
    detail: 'A mesa deve se conectar sem problema.',
  },
  cone: {
    tone: 'ok',
    title: 'Sua rede conecta direto.',
    detail: 'É o tipo de rede mais comum, e a mesa deve se conectar sem problema.',
  },
  simetrico: {
    tone: 'aviso',
    title: 'Sua rede é restritiva.',
    detail:
      'Comum no 4G. Você conecta com quem está numa rede comum, mas pode não conectar com outra pessoa numa rede restritiva. Se falhar, tente um Wi-Fi.',
  },
  'udp-bloqueado': {
    tone: 'erro',
    title: 'Esta rede bloqueia a conexão direta.',
    detail:
      'Acontece em redes de empresa, faculdade ou escola. Para jogar, use outra rede (o Wi-Fi de casa ou o 4G).',
  },
  indeterminado: {
    tone: 'aviso',
    title: 'Não deu para saber.',
    detail: 'Só um dos servidores de teste respondeu. Tente de novo daqui a pouco.',
  },
};

type State =
  | { kind: 'parado' }
  | { kind: 'testando' }
  | { kind: 'pronto'; natType: NatType }
  | { kind: 'falhou' };

/** Testa, sem conectar a ninguém, se a rede deste aparelho deixa a conexão direta abrir. */
export function NetworkSection() {
  const [state, setState] = useState<State>({ kind: 'parado' });
  const test = async () => {
    setState({ kind: 'testando' });
    try {
      const { natType } = await diagnoseNetwork();
      setState({ kind: 'pronto', natType });
    } catch {
      setState({ kind: 'falhou' });
    }
  };
  const result = state.kind === 'pronto' ? RESULT[state.natType] : null;
  const Icon = result?.tone === 'ok' ? CircleCheckIcon : TriangleAlertIcon;
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2>Conexão</h2>
        </CardTitle>
        <CardDescription>
          Os aparelhos da mesa se conectam direto. Teste se a rede em que você está deixa.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button variant="outline" disabled={state.kind === 'testando'} onClick={() => void test()}>
          {state.kind === 'testando' ? <LoaderCircleIcon className="animate-spin" /> : <WifiIcon />}
          {state.kind === 'testando'
            ? 'Testando…'
            : state.kind === 'parado'
              ? 'Testar minha rede'
              : 'Testar de novo'}
        </Button>
        <div aria-live="polite">
          {result && (
            <div
              className={cn(
                'flex gap-2.5 rounded-lg border px-3 py-2.5 text-sm',
                result.tone === 'ok' &&
                  'border-emerald-600/40 text-emerald-700 dark:text-emerald-400',
                result.tone === 'aviso' && 'border-amber-600/40 text-amber-700 dark:text-amber-400',
                result.tone === 'erro' && 'border-destructive/50 text-destructive',
              )}
            >
              <Icon className="mt-0.5 size-4 shrink-0" />
              <p>
                <span className="font-medium">{result.title}</span>{' '}
                <span className="text-foreground/80">{result.detail}</span>
              </p>
            </div>
          )}
          {state.kind === 'falhou' && (
            <p className="text-muted-foreground text-sm">
              Não deu para testar neste aparelho. Tente de novo.
            </p>
          )}
        </div>
        <p className="text-muted-foreground text-xs">
          O teste pergunta a dois servidores públicos (Google e Cloudflare) qual é o seu endereço na
          internet. Leva alguns segundos.
        </p>
      </CardContent>
    </Card>
  );
}
