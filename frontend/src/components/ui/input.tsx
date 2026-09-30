import type { ComponentProps } from 'react';

type InputProps = ComponentProps<'input'>;

export function Input({ className = '', ...props }: InputProps) {
  return (
    <input
      className={`h-9 w-full min-w-0 rounded-md border border-[#e3e7ed] bg-white px-[0.7rem] text-[0.82rem] text-[#172033] outline-none placeholder:text-[#a0a9b8] focus-visible:border-[#827aff] focus-visible:ring-2 focus-visible:ring-primary/20 disabled:cursor-not-allowed disabled:bg-[#f5f6f8] disabled:text-[#818b9a] ${className}`.trim()}
      {...props}
    />
  );
}