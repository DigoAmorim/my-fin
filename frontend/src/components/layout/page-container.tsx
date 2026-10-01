import type { ComponentProps } from 'react';
import { cn } from '../../lib/utils';

type PageContainerProps = ComponentProps<'div'>;

// Mantem largura, espacamento e comportamento mobile iguais entre as paginas.
export function PageContainer({ className, ...props }: PageContainerProps) {
  return (
    <div
      className={cn(
        'mx-auto flex w-[min(1180px,calc(100%-48px))] flex-col gap-5 pb-10 pt-8 max-md:w-[calc(100%-32px)] max-md:gap-4 max-md:pb-8 max-md:pt-4',
        className,
      )}
      {...props}
    />
  );
}