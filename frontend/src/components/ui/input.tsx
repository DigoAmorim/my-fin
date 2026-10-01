import type { ComponentProps } from 'react';

type InputProps = ComponentProps<'input'>;

export function Input({ className = '', ...props }: InputProps) {
  return (
    <input
      className={`h-9 w-full min-w-0 rounded-md border border-border bg-card px-[0.7rem] text-[0.82rem] text-foreground outline-none placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20 disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground ${className}`.trim()}
      {...props}
    />
  );
}