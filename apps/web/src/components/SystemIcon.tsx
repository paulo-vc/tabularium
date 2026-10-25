import type { SystemIcon as Icon } from '@tabula/domain';
import { cn } from '@/lib/utils';

/**
 * Ícone do sistema, nas listas de sistemas, fichas e campanhas. Sem ícone, a inicial do nome
 * num quadrado com o destaque do app, para cada sistema ter uma marca reconhecível.
 */
export function SystemIcon({
  icon,
  name,
  className,
}: {
  icon: Icon | undefined;
  name: string;
  className?: string;
}) {
  if (icon) {
    return (
      <img
        src={icon.src}
        alt=""
        width={icon.width}
        height={icon.height}
        className={cn('size-6 shrink-0 rounded-md object-cover', className)}
      />
    );
  }
  return (
    <span
      aria-hidden
      className={cn(
        'bg-primary/15 text-primary font-heading grid size-6 shrink-0 place-items-center rounded-md text-sm font-bold uppercase',
        className,
      )}
    >
      {name.trim().charAt(0) || '?'}
    </span>
  );
}
