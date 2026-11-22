import type { FieldValue, SheetValues } from '@tabula/domain';
import { ArrowLeftIcon } from 'lucide-react';
import { Link } from 'wouter';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CharacterPicker } from './CharacterPicker';
import { chosenCharacter, OneShotSheet } from './OneShotSheet';
import type { OneShotCharacter, OneShotPack } from './pacote';

/**
 * Página da ficha numa one-shot: a escolha do personagem (se ainda não houver) ou a ficha em
 * imagem dele. `onPick` ausente: quem vê não escolhe (o Mestre olhando a ficha do jogador).
 */
export function OneShotPage({
  pack,
  values,
  onChange,
  back,
  backLabel,
  subtitle,
  onPick,
}: {
  pack: OneShotPack;
  values: SheetValues;
  onChange: (fieldId: string, value: FieldValue) => void;
  back: string;
  backLabel: string;
  subtitle?: string | undefined;
  onPick?: ((character: OneShotCharacter) => void | Promise<void>) | undefined;
}) {
  const character = chosenCharacter(pack, values);
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" asChild>
          <Link href={back} aria-label={backLabel}>
            <ArrowLeftIcon />
          </Link>
        </Button>
        <span className="text-muted-foreground text-sm tracking-widest uppercase">{pack.nome}</span>
        {subtitle && <Badge variant="secondary">{subtitle}</Badge>}
      </div>
      {character ? (
        <OneShotSheet character={character} values={values} onChange={onChange} />
      ) : onPick ? (
        <CharacterPicker pack={pack} onPick={onPick} />
      ) : (
        <p className="text-muted-foreground py-12 text-center">
          O jogador ainda não escolheu o personagem.
        </p>
      )}
    </div>
  );
}
