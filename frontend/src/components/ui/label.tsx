import type { ComponentProps } from 'react';

type LabelProps = ComponentProps<'label'>;

export function Label({ className = '', ...props }: LabelProps) {
  return <label className={`block text-[0.78rem] font-medium text-foreground/80 ${className}`.trim()} {...props} />;
}