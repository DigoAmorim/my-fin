import type { ComponentProps } from 'react';
import { cn } from '../../lib/utils';

type ContentSectionProps = ComponentProps<'section'>;

// Superficie comum para listas e tabelas, com borda, raio e fundo do tema.
export function ContentSection({ className, ...props }: ContentSectionProps) {
  return (
    <section
      className={cn('min-w-0 overflow-hidden rounded-xl border border-border bg-card shadow-sm', className)}
      {...props}
    />
  );
}